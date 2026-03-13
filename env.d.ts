/// <reference types="@remix-run/node" />
/// <reference types="vite/client" />

type EnvVar = string | undefined;

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SHOPIFY_API_KEY: EnvVar;
      SHOPIFY_API_SECRET: EnvVar;
      SHOPIFY_APP_URL: EnvVar;
      SHOPIFY_SCOPES: EnvVar;
      SCOPES: EnvVar; // Shopify CLI sometimes uses SCOPES
      DATABASE_URL: EnvVar;
      DIRECT_URL: EnvVar;
      SHOPIFY_BILLING_TEST: EnvVar; // "1" to use test charges
    }
  }
}

export {};
