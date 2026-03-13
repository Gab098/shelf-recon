import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";

import { authenticate } from "~/shopify.server";
import { upsertShopSettings } from "~/models/recon.server";

const Schema = z.object({
  detectedNiche: z.string().min(1).nullable().optional(),
  detectedSubniches: z.string().nullable().optional(),
  personalitySarcasmOn: z.boolean().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return json({ ok: false as const, error: "Invalid payload" }, { status: 400 });

  await upsertShopSettings(session.shop, {
    detectedNiche: parsed.data.detectedNiche ?? undefined,
    detectedSubniches: parsed.data.detectedSubniches ?? undefined,
    ...(typeof parsed.data.personalitySarcasmOn === "boolean"
      ? { personalitySarcasmOn: parsed.data.personalitySarcasmOn }
      : {}),
  });

  return json({ ok: true as const });
}
