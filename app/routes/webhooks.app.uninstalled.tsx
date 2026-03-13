import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate, sessionStorage } from "~/shopify.server";
import { db } from "~/db.server";

export async function action({ request }: ActionFunctionArgs) {
  const { shop, session } = await authenticate.webhook(request);

  // App uninstalled: clean up sessions for this shop.
  if (session) {
    await sessionStorage.deleteSession(session.id);
  }

  if (shop) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response("OK");
}
