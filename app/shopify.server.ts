import "@shopify/shopify-app-remix/server/adapters/node";

import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

import { db } from "~/db.server";
import { PLAN_AGENCY, PLAN_GROWTH, PLAN_PRO } from "~/consts/plans";

const requiredEnv = ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SHOPIFY_APP_URL", "DATABASE_URL"] as const;
const missingEnv = requiredEnv.filter((k) => !process.env[k] || String(process.env[k]).trim().length === 0) as string[];

const scopesRaw = (process.env.SHOPIFY_SCOPES ?? process.env.SCOPES ?? "").trim();
if (!scopesRaw) missingEnv.push("SHOPIFY_SCOPES");

const scopes = scopesRaw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function envError() {
  return new Error(
    `[Shelf Recon] Missing required env vars: ${missingEnv.join(
      ", ",
    )}. Set them in your deployment (Vercel/Railway) and redeploy.`,
  );
}

// Avoid crashing the serverless function at import time on Vercel when env vars are missing.
// Consumers will get a clear error only when they actually call into Shopify helpers.
function stubShopify() {
  const err = envError();
  // We keep `default export` as a stub for debugging, but we *must not* access properties
  // on it at import-time, otherwise it would still crash the app on Vercel.
  return { __error: err } as any;
}

const shopify =
  missingEnv.length > 0
    ? stubShopify()
    : shopifyApp({
        apiKey: process.env.SHOPIFY_API_KEY!,
        apiSecretKey: process.env.SHOPIFY_API_SECRET!,
        appUrl: process.env.SHOPIFY_APP_URL!,
        apiVersion: ApiVersion.July25,
        scopes,
        authPathPrefix: "/auth",
        sessionStorage: new PrismaSessionStorage(db),
        distribution: AppDistribution.AppStore,
        isEmbeddedApp: true,
        future: {
          unstable_newEmbeddedAuthStrategy: true,
        },
        billing: {
          [PLAN_GROWTH]: {
            lineItems: [
              {
                amount: 19.99,
                currencyCode: "USD",
                interval: BillingInterval.Every30Days,
              },
            ],
          },
          [PLAN_PRO]: {
            lineItems: [
              {
                amount: 49.99,
                currencyCode: "USD",
                interval: BillingInterval.Every30Days,
              },
            ],
          },
          [PLAN_AGENCY]: {
            lineItems: [
              {
                amount: 99.99,
                currencyCode: "USD",
                interval: BillingInterval.Every30Days,
              },
            ],
          },
        },
        webhooks: {
          APP_UNINSTALLED: {
            deliveryMethod: DeliveryMethod.Http,
            callbackUrl: "/webhooks/app/uninstalled",
          },
          APP_SCOPES_UPDATE: {
            deliveryMethod: DeliveryMethod.Http,
            callbackUrl: "/webhooks/app/scopes-update",
          },
        },
        hooks: {
          afterAuth: async ({ session }) => {
            await shopify.registerWebhooks({ session });
          },
        },
      });

export default shopify;

export const apiVersion = ApiVersion.July25;

const missingEnvError = missingEnv.length > 0 ? envError() : null;

const stubAuthenticate = {
  admin: async () => {
    throw missingEnvError;
  },
  public: async () => {
    throw missingEnvError;
  },
  webhook: async () => {
    throw missingEnvError;
  },
} as any;

export const addDocumentResponseHeaders =
  missingEnv.length > 0 ? (() => {}) : (shopify as any).addDocumentResponseHeaders;
export const authenticate = missingEnv.length > 0 ? stubAuthenticate : (shopify as any).authenticate;
export const unauthenticated = missingEnv.length > 0 ? ({} as any) : (shopify as any).unauthenticated;
export const registerWebhooks =
  missingEnv.length > 0
    ? (async () => {
        throw missingEnvError;
      })
    : (shopify as any).registerWebhooks;
export const sessionStorage = missingEnv.length > 0 ? ({} as any) : (shopify as any).sessionStorage;
