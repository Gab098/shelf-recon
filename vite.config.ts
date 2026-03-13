import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { vercelPreset } from "@vercel/remix/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals();

const isVercelBuild =
  process.env.VERCEL === "1" || process.env.VERCEL === "true" || process.env.VERCEL === "yes";

export default defineConfig({
  plugins: [
    remix({
      // Shopify templates typically opt into the route config system.
      // We'll keep to file-based routes; Vite handles it either way.
      // Only enable the Vercel preset on Vercel builds. Locally we want the normal Remix build
      // output so `npm run start` works and you can debug production builds without Vercel.
      presets: isVercelBuild ? [vercelPreset()] : [],
    }),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
    strictPort: true,
  },
  ssr: {
    // Polaris and App Bridge ship ESM that should be bundled for SSR.
    noExternal: [
      "@shopify/polaris",
      "@shopify/polaris-icons",
      "@shopify/app-bridge-react",
      "@shopify/shopify-app-remix",
    ],
  },
});
