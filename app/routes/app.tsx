import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import polarisEn from "@shopify/polaris/locales/en.json";
import { Frame } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";

import { authenticate } from "~/shopify.server";
import { SHOP_QUERY } from "~/graphql/admin";
import { getActivePlan } from "~/models/plans.server";

async function adminGraphql<T>(admin: any, query: string, variables?: any): Promise<T> {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data as T;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, billing, session } = await authenticate.admin(request);

  const data = await adminGraphql<{ shop: { name: string; myshopifyDomain: string } }>(admin, SHOP_QUERY);
  const { activePlan } = await getActivePlan(billing);

  return json({
    apiKey: process.env.SHOPIFY_API_KEY!,
    shop: session.shop,
    shopName: data.shop.name,
    shopDomain: data.shop.myshopifyDomain,
    activePlan,
  });
}

export default function App() {
  const { apiKey, shopName, shopDomain, activePlan } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey} isEmbeddedApp i18n={polarisEn} theme="dark-experimental">
      <NavMenu>
        <Link to="/app">Dashboard</Link>
        <Link to="/app/scan">Store Scan</Link>
        <Link to="/app/recon">Market Recon</Link>
        <Link to="/app/creator">Product Creator</Link>
        <Link to="/app/landing">Landing Generator</Link>
        <Link to="/app/plans">Piani</Link>
        <Link to="/app/settings">Impostazioni</Link>
      </NavMenu>
      <Frame>
        <Outlet context={{ shopName, shopDomain, activePlan }} />
      </Frame>
    </AppProvider>
  );
}
