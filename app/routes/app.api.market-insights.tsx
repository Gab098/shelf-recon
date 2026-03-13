import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";

import { authenticate } from "~/shopify.server";
import { db } from "~/db.server";

const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().optional(),
});

const InsightSchema = z.object({
  niche: z.string().min(1),
  kind: z.enum(["pain_point", "trend", "opportunity"]),
  title: z.string().min(1),
  detail: z.string().min(1),
  sources: z.array(SourceSchema).default([]),
  rawJson: z.any().optional(),
});

const PayloadSchema = z.array(InsightSchema);

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const body = await request.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false as const, error: "Invalid payload" }, { status: 400 });

  const created = await db.marketInsight.createMany({
    data: parsed.data.map((i) => ({
      shop: session.shop,
      niche: i.niche,
      kind: i.kind,
      title: i.title,
      detail: i.detail,
      sources: i.sources as any,
      rawJson: i.rawJson as any,
    })),
  });

  return json({ ok: true as const, count: created.count });
}

