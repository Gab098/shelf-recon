import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";

import { authenticate } from "~/shopify.server";
import { saveProductRecons } from "~/models/recon.server";

const Status = z.enum(["good", "attention", "problem"]);

const InputSchema = z.array(
  z.object({
    productId: z.string().min(1),
    title: z.string().min(1),
    price: z.string().nullable().optional(),
    stock: z.number().int().nullable().optional(),
    aiCategory: z.string().nullable().optional(),
    score: z.number().int().min(0).max(100).nullable().optional(),
    status: Status.nullable().optional(),
    suggestion: z.string().nullable().optional(),
    rawJson: z.any().optional(),
  }),
);

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const body = await request.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false as const, error: "Invalid payload" }, { status: 400 });
  }

  const created = await saveProductRecons(
    parsed.data.map((r) => ({
      shop: session.shop,
      productId: r.productId,
      title: r.title,
      price: r.price ?? null,
      stock: r.stock ?? null,
      aiCategory: r.aiCategory ?? null,
      score: r.score ?? null,
      status: r.status ?? null,
      suggestion: r.suggestion ?? null,
      rawJson: r.rawJson,
    })),
  );

  return json({ ok: true as const, count: created.count });
}

