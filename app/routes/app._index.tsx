import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useOutletContext } from "@remix-run/react";
import { Badge, BlockStack, Button, Card, InlineStack, Layout, Page, Text } from "@shopify/polaris";

import type { ReconRunKind } from "@prisma/client";
import { db } from "~/db.server";
import { PRODUCTS_COUNT_QUERY } from "~/graphql/admin";
import { authenticate } from "~/shopify.server";
import type { AppOutletContext } from "~/routes/app-context";
import { countReconRunsThisMonth, getShopSettings } from "~/models/recon.server";

async function adminGraphql<T>(admin: any, query: string, variables?: any): Promise<T> {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data as T;
}

const FREE_FULL_SCAN_LIMIT = 3;

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  const productsCount = await adminGraphql<{ productsCount: number }>(admin, PRODUCTS_COUNT_QUERY);
  const settings = await getShopSettings(session.shop);
  const usedThisMonth = await countReconRunsThisMonth(session.shop, "full_scan" as ReconRunKind);

  const recent = await db.reconRun.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return json({
    productsCount: productsCount.productsCount,
    niche: settings?.detectedNiche ?? null,
    usedThisMonth,
    freeLimit: FREE_FULL_SCAN_LIMIT,
    recent: recent.map((r) => ({ id: r.id, kind: r.kind, createdAt: r.createdAt })),
  });
}

export default function Dashboard() {
  const { shopName, activePlan } = useOutletContext<AppOutletContext>();
  const data = useLoaderData<typeof loader>();

  const insightsLabel =
    activePlan === "Free"
      ? `${Math.max(0, data.freeLimit - data.usedThisMonth)} rimaste questo mese`
      : "Illimitati";

  return (
    <Page fullWidth>
      <div className="mx-auto max-w-6xl py-6">
        <BlockStack gap="500">
          <div className="sr-panel p-6">
            <InlineStack align="space-between" blockAlign="center" gap="400">
              <div>
                <Text as="h1" variant="heading2xl">
                  Shelf Recon <span className="sr-neonText">Agent</span>
                </Text>
                <Text as="p" tone="subdued">
                  Benvenuto, {shopName}. Recon e' pronto a frugare nel tuo store 🦝
                </Text>
              </div>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone={activePlan === "Free" ? "warning" : "success"}>{activePlan}</Badge>
                <Button variant="primary" url="/app/scan?launch=1">
                  🚀 Lancia Nuova Recon Completa
                </Button>
              </InlineStack>
            </InlineStack>
          </div>

          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Nicchia rilevata
                  </Text>
                  <Text as="p" variant="bodyLg">
                    {data.niche ?? "Ancora sconosciuta (Recon deve annusare il catalogo 🦝)"}
                  </Text>
                  <InlineStack gap="200">
                    <Button url="/app/scan">Vai allo Scan</Button>
                    <Button url="/app/recon" variant="primary" disabled={activePlan === "Free"}>
                      Market Recon
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Stato store (veloce)
                  </Text>
                  <Text as="p" variant="bodyLg">
                    Prodotti: <span className="sr-mono">{data.productsCount}</span>
                  </Text>
                  <Text as="p" variant="bodyLg">
                    Insight questo mese: <span className="sr-mono">{insightsLabel}</span>
                  </Text>
                  {activePlan === "Free" ? (
                    <Text as="p" tone="subdued">
                      Free = {data.freeLimit} recon complete/mese. Recon non e' pigro: e' solo pragmatico 🦝
                    </Text>
                  ) : null}
                  <Button url="/app/plans" variant="primary">
                    Gestisci piani e billing
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>

          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Ultimi Recon
                </Text>
                <Button url="/app/scan">Apri Scan</Button>
              </InlineStack>
              {data.recent.length === 0 ? (
                <Text as="p" tone="subdued">
                  Nessuna recon ancora. Premi il bottone grande sopra e facciamola partire 🦝
                </Text>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {data.recent.map((r) => (
                    <div key={r.id} className="sr-panel p-4">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {r.kind}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {new Date(r.createdAt).toLocaleString("it-IT")}
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        ID: <span className="sr-mono">{r.id.slice(0, 10)}</span>
                      </Text>
                      <div className="mt-3">
                        <Button url="/app/scan">Rivedi</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Text as="p" tone="subdued">
                Suggerimento da Recon: prima scan, poi market recon. O viceversa. Sono un procione, non un
                poliziotto 🦝
              </Text>
            </BlockStack>
          </Card>
        </BlockStack>
      </div>
    </Page>
  );
}
