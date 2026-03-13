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
const missingEnv = requiredEnv.filter((k) => !process.env[k] || String(process.env[k]).trim().length === 0);

const scopes = (process.env.SHOPIFY_SCOPES ?? process.env.SCOPES ?? "")
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
  const stub = new Proxy(
    {},
    {
      get() {
        throw err;
      },
    },
  );
  return stub as any;
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
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
