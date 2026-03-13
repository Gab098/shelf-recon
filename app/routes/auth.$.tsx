import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

function isMissingEnvError(err: unknown) {
  return String(err).includes("[Shelf Recon] Missing required env vars");
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) return redirect("/");

  try {
    await authenticate.admin(request);
    return null;
  } catch (err) {
    if (isMissingEnvError(err)) return redirect("/?error=missing_env");
    throw err;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) return redirect("/");

  try {
    await authenticate.admin(request);
    return null;
  } catch (err) {
    if (isMissingEnvError(err)) return redirect("/?error=missing_env");
    throw err;
  }
}
