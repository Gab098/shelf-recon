import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useOutletContext, useSearchParams } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Collapsible,
  InlineStack,
  Layout,
  Page,
  Text,
  Toast,
} from "@shopify/polaris";
import { useState } from "react";

import type { AppOutletContext } from "~/routes/app-context";
import { authenticate } from "~/shopify.server";
import { requireAtLeastPlan } from "~/models/plans.server";
import { getShopSettings } from "~/models/recon.server";
import { puterChatJson } from "~/ai/puter.client";
import { MODEL_FOR_CREATOR, promptGenerateProductIdeas } from "~/ai/prompts";
import { ProductIdeasSchema } from "~/ai/schemas";
import { ReconLoading } from "~/components/ReconLoading";

export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  await requireAtLeastPlan({ billing, minPlan: "Pro", returnTo: "/app/creator" });

  const settings = await getShopSettings(session.shop);
  const niche = settings?.detectedNiche ?? null;

  return json({ niche });
}

export default function Creator() {
  const { niche } = useLoaderData<typeof loader>();
  const { activePlan } = useOutletContext<AppOutletContext>();
  const [sp] = useSearchParams();

  const seed = sp.get("seed");

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<any[] | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const [toast, setToast] = useState<{ show: boolean; content: string; error?: boolean }>({
    show: false,
    content: "",
  });

  const canUse = activePlan === "Pro" || activePlan === "Agency";

  async function generate() {
    setError(null);
    setRunning(true);
    try {
      if (!niche) throw new Error("Prima serve una nicchia. Vai su Store Scan e fai partire una recon 🦝");
      const res = await puterChatJson(
        promptGenerateProductIdeas({ niche, seed }),
        MODEL_FOR_CREATOR,
        ProductIdeasSchema,
      );
      setIdeas(res.ideas);
      setOpenIdx(0);
    } catch (e: any) {
      setError(e?.message ?? "Errore durante la generazione.");
    } finally {
      setRunning(false);
    }
  }

  async function createProduct(idea: any) {
    setError(null);
    try {
      const r = await fetch("/app/api/product-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: idea.title,
          longDescriptionSeo: idea.longDescriptionSeo,
          recommendedPrice: idea.recommendedPrice,
          tags: idea.tags ?? [],
          productType: idea.productType,
          variants: idea.variants ?? [],
          publish: false,
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error ?? "productCreate failed");

      setToast({
        show: true,
        content: `Creato: ${j.product.title} 🦝`,
      });

      window.open(j.product.adminUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setToast({ show: true, content: e?.message ?? "Errore", error: true });
    }
  }

  const heading = seed ? "AI Product Creator (seeded)" : "AI Product Creator";

  const seedHint = seed ? `Seed: ${seed.slice(0, 120)}${seed.length > 120 ? "…" : ""}` : null;

  return (
    <Page fullWidth>
      <div className="mx-auto max-w-6xl py-6">
        <BlockStack gap="500">
          <div className="sr-panel p-6">
            <InlineStack align="space-between" blockAlign="center" gap="300">
              <div>
                <Text as="h1" variant="heading2xl">
                  {heading}
                </Text>
                <Text as="p" tone="subdued">
                  Genera prodotti nuovi, descrizioni SEO e varianti. Poi 1 click e puff: su Shopify 🦝
                </Text>
                {seedHint ? (
                  <Text as="p" tone="subdued">
                    <span className="sr-mono">{seedHint}</span>
                  </Text>
                ) : null}
              </div>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="success">{activePlan}</Badge>
                <Button variant="primary" onClick={generate} loading={running}>
                  Genera suggerimenti
                </Button>
              </InlineStack>
            </InlineStack>
            {niche ? (
              <Text as="p" tone="subdued">
                Nicchia: <span className="sr-neonText">{niche}</span>
              </Text>
            ) : (
              <Text as="p" tone="subdued">
                Nessuna nicchia rilevata ancora. Vai su Store Scan 🦝
              </Text>
            )}
          </div>

          {running ? <ReconLoading detail="Sto cucinando idee prodotto..." /> : null}
          {error ? (
            <Card>
              <Text as="p" tone="critical">
                {error}
              </Text>
            </Card>
          ) : null}

          {ideas?.length ? (
            <Layout>
              {ideas.map((idea, idx) => {
                const open = openIdx === idx;
                return (
                  <Layout.Section key={idea.title + idx} variant="oneHalf">
                    <Card>
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center" gap="200">
                          <Text as="h3" variant="headingMd">
                            {idea.title}
                          </Text>
                          <Badge tone="info">{`$${Number(idea.recommendedPrice ?? 0).toFixed(2)}`}</Badge>
                        </InlineStack>

                        <Text as="p" tone="subdued">
                          Margine stimato:{" "}
                          <span className="sr-mono">{Number(idea.estimatedMarginPercent ?? 0).toFixed(0)}%</span>
                        </Text>

                        <InlineStack gap="200">
                          <Button onClick={() => setOpenIdx(open ? null : idx)}>{open ? "Nascondi" : "Dettagli"}</Button>
                          <Button variant="primary" onClick={() => createProduct(idea)} disabled={!canUse}>
                            Crea Prodotto su Shopify
                          </Button>
                        </InlineStack>

                        <Collapsible open={open} id={`idea-${idx}`} transition={{ duration: "150ms", timingFunction: "ease" }}>
                          <div className="mt-4 sr-panel p-4">
                            <BlockStack gap="200">
                              <Text as="p">
                                <span className="sr-neonText">Product type:</span> {idea.productType}
                              </Text>
                              <Text as="p" tone="subdued">
                                Tag: <span className="sr-mono">{(idea.tags ?? []).join(", ")}</span>
                              </Text>
                              <Text as="p" variant="bodyMd">
                                {idea.longDescriptionSeo}
                              </Text>
                              {Array.isArray(idea.variants) && idea.variants.length ? (
                                <Text as="p" tone="subdued">
                                  Varianti:{" "}
                                  <span className="sr-mono">
                                    {idea.variants.map((v: any) => `${v.optionName}: ${v.values.join("|")}`).join(" • ")}
                                  </span>
                                </Text>
                              ) : null}
                            </BlockStack>
                          </div>
                        </Collapsible>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                );
              })}
            </Layout>
          ) : (
            <Card>
              <Text as="p" tone="subdued">
                Premi "Genera suggerimenti" e lascia che Recon si inventi cose che vendono (e non solo carine) 🦝
              </Text>
              {!canUse ? (
                <Text as="p" tone="subdued">
                  Se vedi questa pagina ma non puoi creare, c’e’ qualcosa che non quadra col piano. Vai su Piani 🦝
                </Text>
              ) : null}
            </Card>
          )}

          {!canUse ? (
            <Card>
              <Text as="p" tone="subdued">
                Product Creator richiede Pro/Agency. Se sei qui in Growth, Recon e' confuso quanto te 🦝
              </Text>
              <Button url="/app/plans" variant="primary">
                Vai ai piani
              </Button>
            </Card>
          ) : null}
        </BlockStack>
      </div>

      {toast.show ? (
        <Toast content={toast.content} error={toast.error} onDismiss={() => setToast({ show: false, content: "" })} />
      ) : null}
    </Page>
  );
}
