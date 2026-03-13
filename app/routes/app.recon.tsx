import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useOutletContext } from "@remix-run/react";
import { BlockStack, Button, Card, InlineStack, Layout, Page, Text } from "@shopify/polaris";
import { useMemo, useState } from "react";

import type { AppOutletContext } from "~/routes/app-context";
import { authenticate } from "~/shopify.server";
import { db } from "~/db.server";
import { getShopSettings } from "~/models/recon.server";
import { getActivePlan } from "~/models/plans.server";
import { puterChatJson } from "~/ai/puter.client";
import { MODEL_FOR_MARKET_RECON, promptMarketRecon } from "~/ai/prompts";
import { MarketReconSchema } from "~/ai/schemas";
import { InsightCard } from "~/components/InsightCard";
import { ReconLoading } from "~/components/ReconLoading";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, billing } = await authenticate.admin(request);
  const { activePlan } = await getActivePlan(billing);

  const settings = await getShopSettings(session.shop);
  const niche = settings?.detectedNiche ?? null;

  const insights = await db.marketInsight.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return json({
    activePlan,
    niche,
    insights: insights.map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      detail: i.detail,
      niche: i.niche,
      sources: i.sources,
      createdAt: i.createdAt,
    })),
  });
}

export default function MarketRecon() {
  const { activePlan, niche, insights } = useLoaderData<typeof loader>();
  const { activePlan: outletPlan } = useOutletContext<AppOutletContext>();
  const navigate = useNavigate();

  // Prefer loader's plan (fresh from billing), but keep outlet for consistency.
  const plan = activePlan ?? outletPlan;

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const pain = insights.filter((i) => i.kind === "pain_point");
    const trends = insights.filter((i) => i.kind === "trend");
    const opp = insights.filter((i) => i.kind === "opportunity");
    return { pain, trends, opp };
  }, [insights]);

  const creatorEnabled = plan === "Pro" || plan === "Agency";
  const reconEnabled = plan !== "Free";

  async function runRecon() {
    setError(null);
    setRunning(true);
    try {
      if (!niche) throw new Error("Prima serve una nicchia. Vai su Store Scan e fai partire una recon 🦝");

      const runRes = await fetch("/app/api/recon-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "market_recon" }),
      });
      if (!runRes.ok) {
        const j = await runRes.json().catch(() => ({}));
        throw new Error(j.error ?? "Impossibile avviare il Market Recon.");
      }

      const result = await puterChatJson(promptMarketRecon(niche), MODEL_FOR_MARKET_RECON, MarketReconSchema);

      const payload = [
        ...result.painPoints.map((x) => ({ niche, kind: "pain_point" as const, ...x, rawJson: x })),
        ...result.trends.map((x) => ({ niche, kind: "trend" as const, ...x, rawJson: x })),
        ...result.opportunities.map((x) => ({ niche, kind: "opportunity" as const, ...x, rawJson: x })),
      ];

      await fetch("/app/api/market-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Soft refresh
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Errore durante Market Recon.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Page fullWidth>
      <div className="mx-auto max-w-6xl py-6">
        <BlockStack gap="500">
          <div className="sr-panel p-6">
            <InlineStack align="space-between" blockAlign="center" gap="300">
              <div>
                <Text as="h1" variant="heading2xl">
                  Market Recon
                </Text>
                <Text as="p" tone="subdued">
                  Trend & pain points dal web (Reddit incluso). Recon: "Ho letto cosi' tanto che ora mi serve un caffe'." 🦝
                </Text>
              </div>
              <Button variant="primary" onClick={runRecon} disabled={!reconEnabled} loading={running}>
                Esegui Market Recon
              </Button>
            </InlineStack>
            {!reconEnabled ? (
              <Text as="p" tone="subdued">
                Market Recon e' disponibile da Growth in su. In Free, Recon fa il minimalista 🦝
              </Text>
            ) : niche ? (
              <Text as="p" tone="subdued">
                Nicchia: <span className="sr-neonText">{niche}</span>
              </Text>
            ) : (
              <Text as="p" tone="subdued">
                Nessuna nicchia rilevata. Vai su Store Scan prima 🦝
              </Text>
            )}
          </div>

          {running ? <ReconLoading detail="Sto cercando su Reddit e compagnia..." /> : null}
          {error ? (
            <Card>
              <Text as="p" tone="critical">
                {error}
              </Text>
            </Card>
          ) : null}

          <Layout>
            <Layout.Section variant="oneThird">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Pain Points
                </Text>
                {grouped.pain.length ? (
                  grouped.pain.slice(0, 8).map((i) => (
                    <InsightCard
                      key={i.id}
                      title={i.title}
                      detail={i.detail}
                      badge={{ label: "Red flag", tone: "critical" }}
                      actionLabel="Trasforma in Prodotto"
                      onAction={() => navigate(`/app/creator?seed=${encodeURIComponent(i.title + " - " + i.detail)}`)}
                      disabled={!creatorEnabled}
                    />
                  ))
                ) : (
                  <Card>
                    <Text as="p" tone="subdued">
                      Nessun pain point salvato ancora. Premi "Esegui Market Recon" 🦝
                    </Text>
                  </Card>
                )}
              </BlockStack>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Trend in crescita
                </Text>
                {grouped.trends.length ? (
                  grouped.trends.slice(0, 8).map((i) => (
                    <InsightCard
                      key={i.id}
                      title={i.title}
                      detail={i.detail}
                      badge={{ label: "Trend", tone: "success" }}
                      actionLabel="Trasforma in Prodotto"
                      onAction={() => navigate(`/app/creator?seed=${encodeURIComponent(i.title + " - " + i.detail)}`)}
                      disabled={!creatorEnabled}
                    />
                  ))
                ) : (
                  <Card>
                    <Text as="p" tone="subdued">
                      Nessun trend salvato ancora 🦝
                    </Text>
                  </Card>
                )}
              </BlockStack>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Opportunita' di prodotto
                </Text>
                {grouped.opp.length ? (
                  grouped.opp.slice(0, 8).map((i) => (
                    <InsightCard
                      key={i.id}
                      title={i.title}
                      detail={i.detail}
                      badge={{ label: "Opportunity", tone: "info" }}
                      actionLabel="Trasforma in Prodotto"
                      onAction={() => navigate(`/app/creator?seed=${encodeURIComponent(i.title + " - " + i.detail)}`)}
                      disabled={!creatorEnabled}
                    />
                  ))
                ) : (
                  <Card>
                    <Text as="p" tone="subdued">
                      Nessuna opportunita' salvata ancora 🦝
                    </Text>
                  </Card>
                )}
              </BlockStack>
            </Layout.Section>
          </Layout>

          {!creatorEnabled ? (
            <Card>
              <Text as="p" tone="subdued">
                "Trasforma in Prodotto" richiede Pro o Agency. Recon non e' avido: sono i server che costano 🦝
              </Text>
              <Button url="/app/plans" variant="primary">
                Upgrade piano
              </Button>
            </Card>
          ) : null}
        </BlockStack>
      </div>
    </Page>
  );
}
