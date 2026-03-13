import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useOutletContext, useNavigation } from "@remix-run/react";
import { Badge, BlockStack, Button, Card, InlineStack, Layout, Page, Text } from "@shopify/polaris";
import { z } from "zod";

import type { AppOutletContext } from "~/routes/app-context";
import { authenticate } from "~/shopify.server";
import { PLAN_AGENCY, PLAN_FREE, PLAN_GROWTH, PLAN_PRO } from "~/consts/plans";
import { billingIsTest, getActivePlan } from "~/models/plans.server";
import { countReconRunsThisMonth } from "~/models/recon.server";

const FREE_FULL_SCAN_LIMIT = 3;

const ActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("subscribe"), plan: z.enum([PLAN_GROWTH, PLAN_PRO, PLAN_AGENCY]) }),
  z.object({ intent: z.literal("cancel"), subscriptionId: z.string().min(1) }),
]);

export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  const { activePlan, subscriptions } = await getActivePlan(billing);

  const used = await countReconRunsThisMonth(session.shop, "full_scan" as any);

  return json({
    activePlan,
    subscriptions,
    isTest: billingIsTest(),
    free: { limit: FREE_FULL_SCAN_LIMIT, used },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { billing } = await authenticate.admin(request);
  const fd = await request.formData();
  const raw: any = Object.fromEntries(fd);
  const parsed = ActionSchema.safeParse(raw);
  if (!parsed.success) return json({ ok: false as const, error: "Invalid action" }, { status: 400 });

  const isTest = billingIsTest();

  if (parsed.data.intent === "subscribe") {
    // billing.request will redirect to Shopify confirmation.
    await billing.request({
      plan: parsed.data.plan as any,
      isTest,
      returnUrl: "/app/plans",
    });
    return redirect("/app/plans");
  }

  if (parsed.data.intent === "cancel") {
    await billing.cancel({
      subscriptionId: parsed.data.subscriptionId,
      isTest,
      prorate: true,
    });
    return redirect("/app/plans");
  }

  return json({ ok: true as const });
}

export default function Plans() {
  const { activePlan, subscriptions, free, isTest } = useLoaderData<typeof loader>();
  const { shopDomain } = useOutletContext<AppOutletContext>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();

  const busy = nav.state !== "idle";
  const activeSub = subscriptions[0] ?? null;

  const planCards = [
    {
      name: PLAN_FREE,
      price: "$0",
      badgeTone: "warning" as const,
      features: [`3 recon complete/mese`, "Dashboard + Store Scan (manuale)"],
    },
    {
      name: PLAN_GROWTH,
      price: "$19.99/mese",
      badgeTone: "info" as const,
      features: ["Analisi illimitate", "Market Recon (trend + pain points)"],
    },
    {
      name: PLAN_PRO,
      price: "$49.99/mese",
      badgeTone: "success" as const,
      features: ["Tutto Growth", "AI Product Creator", "Landing Page Generator"],
    },
    {
      name: PLAN_AGENCY,
      price: "$99.99/mese",
      badgeTone: "success" as const,
      features: ["Tutto Pro", "Export report (coming soon)", "Multi-store (coming soon)"],
    },
  ];

  return (
    <Page fullWidth>
      <div className="mx-auto max-w-6xl py-6">
        <BlockStack gap="500">
          <div className="sr-panel p-6">
            <InlineStack align="space-between" blockAlign="center">
              <div>
                <Text as="h1" variant="heading2xl">
                  Piani & Billing
                </Text>
                <Text as="p" tone="subdued">
                  Shop: <span className="sr-mono">{shopDomain}</span> • Modalita':{" "}
                  <span className="sr-mono">{isTest ? "TEST" : "LIVE"}</span> 🦝
                </Text>
              </div>
              <Badge tone={activePlan === PLAN_FREE ? "warning" : "success"}>{activePlan}</Badge>
            </InlineStack>
          </div>

          {activePlan === PLAN_FREE ? (
            <Card>
              <Text as="p" tone="subdued">
                Free usage questo mese: <span className="sr-mono">{free.used}</span> /{" "}
                <span className="sr-mono">{free.limit}</span> recon complete 🦝
              </Text>
            </Card>
          ) : null}

          {actionData && (actionData as any).ok === false ? (
            <Card>
              <Text as="p" tone="critical">
                {(actionData as any).error}
              </Text>
            </Card>
          ) : null}

          <Layout>
            {planCards.map((p) => {
              const isActive = p.name === activePlan;
              const isPaidPlan = p.name !== PLAN_FREE;

              return (
                <Layout.Section key={p.name} variant="oneHalf">
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h2" variant="headingMd">
                          {p.name}
                        </Text>
                        <Badge tone={p.badgeTone}>{p.price}</Badge>
                      </InlineStack>

                      <div className="sr-panel p-4">
                        <BlockStack gap="200">
                          {p.features.map((f) => (
                            <Text key={f} as="p">
                              {f}
                            </Text>
                          ))}
                        </BlockStack>
                      </div>

                      {isActive ? (
                        <Text as="p" tone="subdued">
                          Attivo. Recon annuisce approvando 🦝
                        </Text>
                      ) : null}

                      <InlineStack gap="200">
                        {isPaidPlan ? (
                          <Form method="post">
                            <input type="hidden" name="intent" value="subscribe" />
                            <input type="hidden" name="plan" value={p.name} />
                            <Button submit variant={isActive ? "secondary" : "primary"} disabled={isActive} loading={busy}>
                              {isActive ? "Attivo" : `Passa a ${p.name}`}
                            </Button>
                          </Form>
                        ) : (
                          <Button disabled>Free</Button>
                        )}

                        {isActive && activeSub?.id && activePlan !== PLAN_FREE ? (
                          <Form method="post">
                            <input type="hidden" name="intent" value="cancel" />
                            <input type="hidden" name="subscriptionId" value={activeSub.id} />
                            <Button submit tone="critical" loading={busy}>
                              Cancella abbonamento
                            </Button>
                          </Form>
                        ) : null}
                      </InlineStack>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              );
            })}
          </Layout>
        </BlockStack>
      </div>
    </Page>
  );
}
