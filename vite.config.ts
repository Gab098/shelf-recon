import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      // Shopify templates typically opt into the route config system.
      // We'll keep to file-based routes; Vite handles it either way.
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

