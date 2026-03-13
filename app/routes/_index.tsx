import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation, useRouteLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Divider,
  FormLayout,
  List,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { z } from "zod";

import type { loader as rootLoader } from "~/root";
import { RaccoonReconLogo } from "~/components/RaccoonReconLogo";

const Schema = z.object({
  shop: z
    .string()
    .min(1, "Inserisci il tuo shop (es. mystore.myshopify.com)")
    .transform((s) => s.trim())
    .refine(
      (s) =>
        s.endsWith(".myshopify.com") ||
        /^[a-z0-9][a-z0-9-]*$/i.test(s), // allow "mystore" shortcut
      "Shop non valido. Usa mystore.myshopify.com oppure solo mystore",
    )
    .transform((s) => (s.includes(".") ? s : `${s}.myshopify.com`)),
});

export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData();
  const raw = { shop: String(fd.get("shop") ?? "") };
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Shop non valido" };
  }
  return redirect(`/auth?shop=${encodeURIComponent(parsed.data.shop)}`);
}

export default function Index() {
  const nav = useNavigation();
  const actionData = useActionData<typeof action>();
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const missingEnv = rootData?.missingEnv ?? [];

  return (
    <Page fullWidth>
      <div className="mx-auto max-w-5xl py-10">
        <div className="sr-panel sr-heroPanel p-8">
          <BlockStack gap="500">
            {missingEnv.length > 0 ? (
              <Banner title="Config mancante su server" tone="warning">
                <Text as="p" variant="bodyMd">
                  Recon non puo' partire: mancano queste variabili d'ambiente su Vercel.
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {missingEnv.join(", ")}
                </Text>
              </Banner>
            ) : null}

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="animate-glowPulse">
                  <RaccoonReconLogo size={56} />
                </div>
                <div>
                  <Text as="h1" variant="heading2xl">
                    Shelf Recon <span className="sr-neonText">Online</span>
                  </Text>
                  <Text as="p" tone="subdued">
                    Your AI Recon Agent for smarter selling 🦝
                  </Text>
                </div>
              </div>
              <div className="sr-panel px-4 py-3">
                <Text as="p" variant="bodySm" tone="subdued">
                  Recon tip: inizia con uno scan completo, poi vai di Market Recon. Oppure fai il ribelle 🦝
                </Text>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Cosa fa Recon (senza farti perdere tempo)
                  </Text>
                  <List type="bullet">
                    <List.Item>Identifica la nicchia del tuo store e le sottocategorie.</List.Item>
                    <List.Item>Scova prodotti sottoperformanti, prezzi strani, gap di catalogo.</List.Item>
                    <List.Item>Trova trend e lamentele dal web (soprattutto Reddit) per nuove idee.</List.Item>
                  </List>
                  <Divider />
                  <Text as="p" tone="subdued">
                    Free: 3 recon complete al mese. Se sfori, Recon chiede il piano Growth. Non e' cattivo: e'
                    solo affamato 🦝
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd">
                    Inserisci il tuo shop e lascia che Recon faccia il lavoro sporco (con stile) 🦝
                  </Text>
                  <Form method="post">
                    <FormLayout>
                      <TextField
                        label="Shop domain"
                        name="shop"
                        autoComplete="off"
                        placeholder="mystore.myshopify.com"
                        helpText="Puoi scrivere anche solo: mystore"
                        error={actionData && !actionData.ok ? actionData.error : undefined}
                      />
                      <Button submit variant="primary" loading={nav.state !== "idle"}>
                        Entra in Shelf Recon
                      </Button>
                    </FormLayout>
                  </Form>
                </BlockStack>
              </Card>
            </div>

            <Text as="p" tone="subdued">
              Tip: se hai un piano Free, Recon e' comunque gentile. Solo che conta quante volte gli fai fare
              straordinari 🦝
            </Text>
          </BlockStack>
        </div>
      </div>
    </Page>
  );
}
