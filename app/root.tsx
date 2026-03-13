import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";

import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import tailwindStyles from "~/styles/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: tailwindStyles },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const required = ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SHOPIFY_APP_URL", "DATABASE_URL"] as const;
  const missingEnv = required.filter((k) => !process.env[k] || String(process.env[k]).trim().length === 0);

  return {
    // Useful for marketing-style pages too.
    canonical: url.origin,
    missingEnv,
  };
}

export default function App() {
  const { canonical } = useLoaderData<typeof loader>();

  return (
    <html lang="it" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content="#0F0F1A" />
        <meta name="color-scheme" content="dark" />
        <meta name="description" content="Shelf Recon: Your AI Recon Agent for smarter selling" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="canonical" href={canonical} />
        <Meta />
        <Links />
        {/* Puter.js (required for ALL AI calls) */}
        <script src="https://js.puter.com/v2/" />
      </head>
      <body>
        <div className="sr-grid min-h-screen">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
