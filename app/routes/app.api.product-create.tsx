import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";

import { authenticate } from "~/shopify.server";
import {
  PRODUCT_CREATE_MUTATION,
  PRODUCT_OPTIONS_CREATE_MUTATION,
  PRODUCT_VARIANTS_BULK_CREATE_MUTATION,
} from "~/graphql/admin";

const PayloadSchema = z.object({
  title: z.string().min(1),
  longDescriptionSeo: z.string().min(1),
  recommendedPrice: z.number().finite().nonnegative(),
  tags: z.array(z.string()).default([]),
  productType: z.string().min(1),
  variants: z
    .array(
      z.object({
        optionName: z.string().min(1),
        values: z.array(z.string().min(1)).min(1),
      }),
    )
    .default([]),
  publish: z.boolean().optional(),
});

async function adminGraphql<T>(admin: any, query: string, variables?: any): Promise<T> {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data as T;
}

function toAdminProductUrl(shop: string, productGid: string) {
  const id = productGid.split("/").pop();
  return `https://${shop}/admin/products/${id}`;
}

function cartesian(values: string[][], limit = 20): string[][] {
  let acc: string[][] = [[]];
  for (const arr of values) {
    const next: string[][] = [];
    for (const prefix of acc) {
      for (const v of arr) {
        next.push([...prefix, v]);
        if (next.length >= limit) return next;
      }
    }
    acc = next;
  }
  return acc;
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false as const, error: "Invalid payload" }, { status: 400 });

  const payload = parsed.data;

  const created = await adminGraphql<{
    productCreate: {
      product: { id: string; handle: string; title: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(admin, PRODUCT_CREATE_MUTATION, {
    input: {
      title: payload.title,
      descriptionHtml: payload.longDescriptionSeo,
      productType: payload.productType,
      tags: payload.tags,
      status: payload.publish ? "ACTIVE" : "DRAFT",
    },
  });

  const errs = created.productCreate.userErrors ?? [];
  if (errs.length) return json({ ok: false as const, error: errs[0]!.message }, { status: 400 });
  if (!created.productCreate.product) return json({ ok: false as const, error: "productCreate failed" }, { status: 500 });

  const product = created.productCreate.product;

  // Variants: create options + variants (best effort).
  if (payload.variants.length) {
    const options = payload.variants.slice(0, 2); // keep it sane for one-click UX
    await adminGraphql<any>(admin, PRODUCT_OPTIONS_CREATE_MUTATION, {
      productId: product.id,
      options: options.map((o) => ({
        name: o.optionName,
        values: o.values.slice(0, 10).map((v) => ({ name: v })),
      })),
    });

    const combos = cartesian(
      options.map((o) => o.values.slice(0, 6)),
      20,
    );

    if (combos.length) {
      await adminGraphql<any>(admin, PRODUCT_VARIANTS_BULK_CREATE_MUTATION, {
        productId: product.id,
        variants: combos.map((combo) => ({
          price: String(payload.recommendedPrice.toFixed(2)),
          optionValues: combo.map((v, idx) => ({
            optionName: options[idx]!.optionName,
            name: v,
          })),
        })),
      });
    }
  }

  return json({
    ok: true as const,
    product: {
      id: product.id,
      handle: product.handle,
      title: product.title,
      adminUrl: toAdminProductUrl(session.shop, product.id),
    },
  });
}

