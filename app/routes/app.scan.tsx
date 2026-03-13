import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useOutletContext, useSearchParams } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  IndexTable,
  InlineStack,
  Modal,
  Page,
  List,
  Text,
  Thumbnail,
} from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { ImageIcon } from "@shopify/polaris-icons";

import type { AppOutletContext } from "~/routes/app-context";
import { authenticate } from "~/shopify.server";
import { PRODUCTS_LIST_QUERY } from "~/graphql/admin";
import { latestProductReconsForShop, getShopSettings } from "~/models/recon.server";
import { puterChatJson } from "~/ai/puter.client";
import {
  MODEL_FOR_NICHE,
  MODEL_FOR_PRODUCT_ANALYSIS,
  promptAnalyzeProduct,
  promptDetectNiche,
} from "~/ai/prompts";
import { NicheDetectSchema, ProductAnalysisSchema } from "~/ai/schemas";
import { ReconLoading } from "~/components/ReconLoading";

async function adminGraphql<T>(admin: any, query: string, variables?: any): Promise<T> {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data as T;
}

type ProductRow = {
  id: string;
  title: string;
  price: string | null;
  stock: number | null;
  productType: string | null;
  tags: string[];
  imageUrl: string | null;
  description: string | null;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  const data = await adminGraphql<{
    products: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<{
        node: {
          id: string;
          title: string;
          productType: string | null;
          tags: string[];
          totalInventory: number | null;
          featuredImage: { url: string; altText: string | null } | null;
          variants: { edges: Array<{ node: { price: string; inventoryQuantity: number | null } }> };
          description: string | null;
        };
      }>;
    };
  }>(admin, PRODUCTS_LIST_QUERY, { first: 50, after: null });

  const products: ProductRow[] = data.products.edges.map(({ node }) => {
    const v = node.variants.edges[0]?.node;
    return {
      id: node.id,
      title: node.title,
      price: v?.price ?? null,
      stock: v?.inventoryQuantity ?? node.totalInventory ?? null,
      productType: node.productType,
      tags: node.tags ?? [],
      imageUrl: node.featuredImage?.url ?? null,
      description: node.description ?? null,
    };
  });

  const latest = await latestProductReconsForShop(
    session.shop,
    products.map((p) => p.id),
  );

  const settings = await getShopSettings(session.shop);

  return json({
    products,
    latestRecon: Object.fromEntries(Array.from(latest.entries()).map(([k, v]) => [k, v])),
    niche: settings?.detectedNiche ?? null,
  });
}

type LocalRecon = {
  aiCategory: string;
  score: number;
  status: "good" | "attention" | "problem";
  suggestion: string;
  topFixes: string[];
  priceNotes?: string | null;
  seoNotes?: string | null;
};

export default function Scan() {
  const { products, latestRecon, niche } = useLoaderData<typeof loader>();
  const { activePlan } = useOutletContext<AppOutletContext>();
  const [sp] = useSearchParams();

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: products.length, label: "" });
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; productId: string | null }>({ open: false, productId: null });

  const [localRecon, setLocalRecon] = useState<Record<string, LocalRecon>>(() => {
    const init: Record<string, LocalRecon> = {};
    for (const p of products) {
      const r = (latestRecon as any)[p.id];
      if (r?.aiCategory && r?.score != null && r?.status) {
        init[p.id] = {
          aiCategory: r.aiCategory,
          score: r.score,
          status: r.status,
          suggestion: r.suggestion ?? "",
          topFixes: Array.isArray(r.rawJson?.topFixes) ? r.rawJson.topFixes : [],
          priceNotes: r.rawJson?.priceNotes ?? null,
          seoNotes: r.rawJson?.seoNotes ?? null,
        };
      }
    }
    return init;
  });

  const selectedProduct = useMemo(() => {
    if (!modal.productId) return null;
    return products.find((p) => p.id === modal.productId) ?? null;
  }, [modal.productId, products]);

  async function startFullScan() {
    setError(null);
    setRunning(true);
    setProgress({ done: 0, total: products.length, label: "Sto annusando la nicchia..." });

    try {
      // 1) Record run (and enforce Free limits server-side)
      const runRes = await fetch("/app/api/recon-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "full_scan" }),
      });
      if (!runRes.ok) {
        const j = await runRes.json().catch(() => ({}));
        throw new Error(j.error ?? "Impossibile avviare la recon.");
      }

      // 2) Detect niche
      const nicheResult = await puterChatJson(
        promptDetectNiche(
          products.map((p) => ({ title: p.title, productType: p.productType, tags: p.tags, price: p.price })),
        ),
        MODEL_FOR_NICHE,
        NicheDetectSchema,
      );

      await fetch("/app/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detectedNiche: nicheResult.niche,
          detectedSubniches: nicheResult.subniches.join(", "),
        }),
      });

      // 3) Product-by-product analysis
      const batch: any[] = [];
      for (let i = 0; i < products.length; i++) {
        const p = products[i]!;
        setProgress({ done: i, total: products.length, label: `Analizzo: ${p.title}` });

        const analysis = await puterChatJson(
          promptAnalyzeProduct({
            title: p.title,
            description: p.description,
            price: p.price,
            stock: p.stock,
            productType: p.productType,
            tags: p.tags,
            niche: nicheResult.niche,
          }),
          MODEL_FOR_PRODUCT_ANALYSIS,
          ProductAnalysisSchema,
        );

        setLocalRecon((prev) => ({
          ...prev,
          [p.id]: analysis,
        }));

        batch.push({
          productId: p.id,
          title: p.title,
          price: p.price,
          stock: p.stock,
          aiCategory: analysis.aiCategory,
          score: analysis.score,
          status: analysis.status,
          suggestion: analysis.suggestion,
          rawJson: analysis,
        });

        // Persist in small batches to keep memory stable.
        if (batch.length >= 10 || i === products.length - 1) {
          await fetch("/app/api/product-recons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(batch.splice(0, batch.length)),
          });
        }
      }

      setProgress({ done: products.length, total: products.length, label: "Scan completato. Recon approva 🦝" });
    } catch (e: any) {
      setError(e?.message ?? "Errore durante la recon.");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (sp.get("launch") === "1") {
      // Auto-launch once when requested.
      startFullScan();
    }
    // Only on first mount when launch=1.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function statusBadge(status?: "good" | "attention" | "problem") {
    if (status === "good") return <Badge tone="success">Buono</Badge>;
    if (status === "attention") return <Badge tone="warning">Attenzione</Badge>;
    if (status === "problem") return <Badge tone="critical">Problema</Badge>;
    return <Badge tone="info">Non analizzato</Badge>;
  }

  return (
    <Page fullWidth>
      <div className="mx-auto max-w-6xl py-6">
        <BlockStack gap="400">
          <div className="sr-panel p-6">
            <InlineStack align="space-between" blockAlign="center" gap="300">
              <div>
                <Text as="h1" variant="heading2xl">
                  Store Scan & Analysis
                </Text>
                <Text as="p" tone="subdued">
                  {niche ? (
                    <>
                      Nicchia attuale: <span className="sr-neonText">{niche}</span> 🦝
                    </>
                  ) : (
                    <>Recon non ha ancora identificato la tua nicchia. Facciamolo ora 🦝</>
                  )}
                </Text>
              </div>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone={activePlan === "Free" ? "warning" : "success"}>{activePlan}</Badge>
                <Button variant="primary" onClick={startFullScan} loading={running}>
                  Analizza Tutto il Catalogo
                </Button>
              </InlineStack>
            </InlineStack>
          </div>

          {running ? (
            <ReconLoading
              label="🦝 Recon sta frugando tra i dati..."
              detail={`${progress.done}/${progress.total} • ${progress.label}`}
            />
          ) : null}
          {error ? (
            <Card>
              <Text as="p" tone="critical">
                {error}
              </Text>
              <Text as="p" tone="subdued">
                Se l’errore parla di Puter, assicurati di avere Puter.js disponibile e autorizzato nel browser 🦝
              </Text>
            </Card>
          ) : null}

          <Card>
            <IndexTable
              itemCount={products.length}
              selectable={false}
              headings={[
                { title: "Immagine" },
                { title: "Titolo" },
                { title: "Prezzo" },
                { title: "Stock" },
                { title: "Categoria AI" },
                { title: "Score" },
                { title: "Suggerimento" },
                { title: "Stato" },
                { title: "Azioni" },
              ]}
            >
              {products.map((p, idx) => {
                const r = localRecon[p.id];
                return (
                  <IndexTable.Row
                    id={p.id}
                    key={p.id}
                    position={idx}
                    onClick={() => setModal({ open: true, productId: p.id })}
                  >
                    <IndexTable.Cell>
                      <Thumbnail source={p.imageUrl ?? ImageIcon} alt={p.title} />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {p.title}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{p.price ? `$${p.price}` : "—"}</IndexTable.Cell>
                    <IndexTable.Cell>{p.stock ?? "—"}</IndexTable.Cell>
                    <IndexTable.Cell>{r?.aiCategory ?? "—"}</IndexTable.Cell>
                    <IndexTable.Cell>{r?.score ?? "—"}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" tone="subdued">
                        {r?.suggestion ? r.suggestion.slice(0, 72) : "—"}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{statusBadge(r?.status)}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Button size="micro" onClick={() => setModal({ open: true, productId: p.id })}>
                          Dettagli
                        </Button>
                      </div>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                );
              })}
            </IndexTable>
          </Card>

          <Modal
            open={modal.open}
            onClose={() => setModal({ open: false, productId: null })}
            title={selectedProduct?.title ?? "Dettagli prodotto"}
            primaryAction={{
              content: "Chiudi",
              onAction: () => setModal({ open: false, productId: null }),
            }}
          >
            <Modal.Section>
              {selectedProduct ? (
                <BlockStack gap="300">
                  <Text as="p" tone="subdued">
                    Qui Recon ti dice cosa pensa davvero. Tieni stretta la dignita' 🦝
                  </Text>
                  <div className="sr-panel p-4">
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd">
                        Prezzo: <span className="sr-mono">{selectedProduct.price ?? "—"}</span> • Stock:{" "}
                        <span className="sr-mono">{selectedProduct.stock ?? "—"}</span>
                      </Text>
                      {localRecon[selectedProduct.id] ? (
                        <>
                          <Text as="p">
                            Categoria AI:{" "}
                            <span className="sr-neonText">{localRecon[selectedProduct.id]!.aiCategory}</span>
                          </Text>
                          <Text as="p">Score: {localRecon[selectedProduct.id]!.score}</Text>
                          <Text as="p">Suggerimento: {localRecon[selectedProduct.id]!.suggestion}</Text>
                          <Text as="p" tone="subdued">
                            Top fix:
                          </Text>
                          <List type="bullet">
                            {localRecon[selectedProduct.id]!.topFixes.map((f) => (
                              <List.Item key={f}>{f}</List.Item>
                            ))}
                          </List>
                        </>
                      ) : (
                        <Text as="p" tone="subdued">
                          Non ancora analizzato. Premi "Analizza Tutto il Catalogo" 🦝
                        </Text>
                      )}
                    </BlockStack>
                  </div>
                </BlockStack>
              ) : null}
            </Modal.Section>
          </Modal>
        </BlockStack>
      </div>
    </Page>
  );
}
