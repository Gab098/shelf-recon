import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  // When scopes change, Shopify may ask us to re-auth.
  await authenticate.webhook(request);
  return new Response("OK");
}

