import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useOutletContext } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
  Toast,
} from "@shopify/polaris";
import { useMemo, useState } from "react";

import type { AppOutletContext } from "~/routes/app-context";
import { authenticate } from "~/shopify.server";
import { requireAtLeastPlan } from "~/models/plans.server";
import { PRODUCTS_LIST_QUERY } from "~/graphql/admin";
import { puterChatText } from "~/ai/puter.client";
import { MODEL_FOR_LANDING, promptGenerateLandingHtml } from "~/ai/prompts";
import { ReconLoading } from "~/components/ReconLoading";

async function adminGraphql<T>(admin: any, query: string, variables?: any): Promise<T> {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data as T;
}

type ProductRow = { id: string; title: string; description: string | null };

export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, admin } = await authenticate.admin(request);
  await requireAtLeastPlan({ billing, minPlan: "Pro", returnTo: "/app/landing" });

  const data = await adminGraphql<{
    products: { edges: Array<{ node: { id: string; title: string; description: string | null } }> };
  }>(admin, PRODUCTS_LIST_QUERY, { first: 50, after: null });

  const products: ProductRow[] = data.products.edges.map((e) => e.node);
  return json({ products });
}

export default function Landing() {
  const { products } = useLoaderData<typeof loader>();
  const { activePlan } = useOutletContext<AppOutletContext>();

  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const selected = useMemo(() => products.find((p) => p.id === selectedId) ?? null, [products, selectedId]);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string>("");
  const [pageTitle, setPageTitle] = useState<string>("Landing Page");
  const [publish, setPublish] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; content: string; error?: boolean }>({ show: false, content: "" });

  async function generate() {
    setError(null);
    setRunning(true);
    try {
      if (!selected) throw new Error("Seleziona un prodotto.");
      const res = await puterChatText(
        promptGenerateLandingHtml({
          productTitle: selected.title,
          productDescription: selected.description ?? "",
        }),
        MODEL_FOR_LANDING,
      );
      setHtml(res);
      setPageTitle(`Landing: ${selected.title}`);
    } catch (e: any) {
      setError(e?.message ?? "Errore durante la generazione HTML.");
    } finally {
      setRunning(false);
    }
  }

  async function publishPage() {
    setError(null);
    try {
      if (!html.trim()) throw new Error("Genera prima l’HTML 🦝");
      const runRes = await fetch("/app/api/recon-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "landing_generator" }),
      });
      if (!runRes.ok) {
        const j = await runRes.json().catch(() => ({}));
        throw new Error(j.error ?? "Impossibile avviare il Landing Generator.");
      }

      const r = await fetch("/app/api/page-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: pageTitle, body: html, isPublished: publish }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error ?? "pageCreate failed");

      setToast({ show: true, content: `Pubblicata pagina: ${j.page.title} 🦝` });
      window.open(j.page.adminUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setToast({ show: true, content: e?.message ?? "Errore", error: true });
    }
  }

  const options = products.map((p) => ({ label: p.title, value: p.id }));

  return (
    <Page fullWidth>
      <div className="mx-auto max-w-6xl py-6">
        <BlockStack gap="500">
          <div className="sr-panel p-6">
            <InlineStack align="space-between" blockAlign="center">
              <div>
                <Text as="h1" variant="heading2xl">
                  Landing Page Generator
                </Text>
                <Text as="p" tone="subdued">
                  HTML completo, preview live, pubblicazione su Shopify con 1 click 🦝
                </Text>
              </div>
              <Badge tone="success">{activePlan}</Badge>
            </InlineStack>
          </div>

          <Layout>
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="300">
                  <Select label="Seleziona prodotto" options={options} value={selectedId} onChange={setSelectedId} />
                  <Button variant="primary" onClick={generate} loading={running}>
                    Genera HTML Landing
                  </Button>
                  <TextField label="Titolo pagina" value={pageTitle} onChange={setPageTitle} autoComplete="off" />
                  <Checkbox label="Pubblica subito (altrimenti draft)" checked={publish} onChange={setPublish} />
                  <Button onClick={publishPage} disabled={!html.trim()}>
                    Pubblica come Page su Shopify
                  </Button>
                  <Text as="p" tone="subdued">
                    Recon tip: pubblica in draft, dai un’occhiata, poi attiva. Non siamo animali. Ok, io si' 🦝
                  </Text>
                </BlockStack>
              </Card>

              {running ? <ReconLoading detail="Sto impaginando come un designer caffeinato..." /> : null}
              {error ? (
                <Card>
                  <Text as="p" tone="critical">
                    {error}
                  </Text>
                </Card>
              ) : null}
            </Layout.Section>

            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Preview live
                  </Text>
                  {html.trim() ? (
                    <div className="sr-panel p-2">
                      <iframe
                        title="Landing preview"
                        className="h-[720px] w-full rounded-xl"
                        sandbox="allow-same-origin"
                        srcDoc={html}
                      />
                    </div>
                  ) : (
                    <Text as="p" tone="subdued">
                      Genera l’HTML per vedere la preview 🦝
                    </Text>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </div>

      {toast.show ? (
        <Toast content={toast.content} error={toast.error} onDismiss={() => setToast({ show: false, content: "" })} />
      ) : null}
    </Page>
  );
}
