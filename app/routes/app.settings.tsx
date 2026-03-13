import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useOutletContext } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineStack,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { z } from "zod";
import { useState } from "react";

import type { AppOutletContext } from "~/routes/app-context";
import { authenticate } from "~/shopify.server";
import { getShopSettings, upsertShopSettings } from "~/models/recon.server";

const Schema = z.object({
  detectedNiche: z.string().nullable().optional(),
  detectedSubniches: z.string().nullable().optional(),
  personalitySarcasmOn: z.union([z.literal("on"), z.literal("off")]).optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);

  return json({
    settings: {
      detectedNiche: settings?.detectedNiche ?? "",
      detectedSubniches: settings?.detectedSubniches ?? "",
      personalitySarcasmOn: settings?.personalitySarcasmOn ?? true,
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const fd = await request.formData();
  const raw = {
    detectedNiche: String(fd.get("detectedNiche") ?? ""),
    detectedSubniches: String(fd.get("detectedSubniches") ?? ""),
    personalitySarcasmOn: fd.get("personalitySarcasmOn") ? "on" : "off",
  };

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return json({ ok: false as const, error: "Invalid payload" }, { status: 400 });

  await upsertShopSettings(session.shop, {
    detectedNiche: parsed.data.detectedNiche?.trim() || undefined,
    detectedSubniches: parsed.data.detectedSubniches?.trim() || undefined,
    personalitySarcasmOn: parsed.data.personalitySarcasmOn === "on",
  });

  return redirect("/app/settings");
}

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const { activePlan } = useOutletContext<AppOutletContext>();
  const nav = useNavigation();
  const actionData = useActionData<typeof action>();

  const [detectedNiche, setDetectedNiche] = useState(settings.detectedNiche);
  const [detectedSubniches, setDetectedSubniches] = useState(settings.detectedSubniches);
  const [sarcasmOn, setSarcasmOn] = useState(settings.personalitySarcasmOn);

  return (
    <Page fullWidth>
      <div className="mx-auto max-w-4xl py-6">
        <BlockStack gap="500">
          <div className="sr-panel p-6">
            <InlineStack align="space-between" blockAlign="center">
              <div>
                <Text as="h1" variant="heading2xl">
                  Impostazioni
                </Text>
                <Text as="p" tone="subdued">
                  Personalita' di Recon, nicchia e preferenze. Si', e' un procione con opinioni 🦝
                </Text>
              </div>
              <Badge tone={activePlan === "Free" ? "warning" : "success"}>{activePlan}</Badge>
            </InlineStack>
          </div>

          {actionData && (actionData as any).ok === false ? (
            <Card>
              <Text as="p" tone="critical">
                {(actionData as any).error}
              </Text>
            </Card>
          ) : null}

          <Card>
            <Form method="post">
              <FormLayout>
                <TextField
                  label="Nicchia rilevata (override)"
                  name="detectedNiche"
                  value={detectedNiche}
                  onChange={setDetectedNiche}
                  autoComplete="off"
                  helpText="Se vuoi forzare la nicchia per Market Recon, puoi scriverla qui."
                />
                <TextField
                  label="Sottocategorie (testo)"
                  name="detectedSubniches"
                  value={detectedSubniches}
                  onChange={setDetectedSubniches}
                  autoComplete="off"
                />
                <Checkbox
                  label="Recon puo' essere sarcastico (consigliato) 🦝"
                  name="personalitySarcasmOn"
                  checked={sarcasmOn}
                  onChange={setSarcasmOn}
                />
                <Button submit variant="primary" loading={nav.state !== "idle"}>
                  Salva
                </Button>
              </FormLayout>
            </Form>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                AI Providers (Puter.js)
              </Text>
              <Text as="p" tone="subdued">
                Shelf Recon usa Puter.js per tutte le chiamate AI, con questi modelli:
              </Text>
              <Text as="p">
                <span className="sr-mono">anthropic/claude-sonnet-4</span> •{" "}
                <span className="sr-mono">perplexity/sonar-pro</span> •{" "}
                <span className="sr-mono">openai/gpt-4o</span>
              </Text>
            </BlockStack>
          </Card>
        </BlockStack>
      </div>
    </Page>
  );
}
