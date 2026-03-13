import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";

import { authenticate } from "~/shopify.server";
import { PAGE_CREATE_MUTATION } from "~/graphql/admin";

const PayloadSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  isPublished: z.boolean().default(false),
});

async function adminGraphql<T>(admin: any, query: string, variables?: any): Promise<T> {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data as T;
}

function toAdminPageUrl(shop: string, pageGid: string) {
  const id = pageGid.split("/").pop();
  return `https://${shop}/admin/pages/${id}`;
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false as const, error: "Invalid payload" }, { status: 400 });

  const created = await adminGraphql<{
    pageCreate: {
      page: { id: string; handle: string; title: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(admin, PAGE_CREATE_MUTATION, {
    input: {
      title: parsed.data.title,
      body: parsed.data.body,
      isPublished: parsed.data.isPublished,
    },
  });

  const errs = created.pageCreate.userErrors ?? [];
  if (errs.length) return json({ ok: false as const, error: errs[0]!.message }, { status: 400 });
  if (!created.pageCreate.page) return json({ ok: false as const, error: "pageCreate failed" }, { status: 500 });

  return json({
    ok: true as const,
    page: {
      id: created.pageCreate.page.id,
      handle: created.pageCreate.page.handle,
      title: created.pageCreate.page.title,
      adminUrl: toAdminPageUrl(session.shop, created.pageCreate.page.id),
    },
  });
}

