import { ReconRunKind, type ProductReconStatus } from "@prisma/client";
import { db } from "~/db.server";

export function monthWindow(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start, end };
}

export async function countReconRunsThisMonth(shop: string, kind: ReconRunKind) {
  const { start, end } = monthWindow();
  return db.reconRun.count({
    where: { shop, kind, createdAt: { gte: start, lt: end } },
  });
}

export async function recordReconRun(shop: string, kind: ReconRunKind) {
  return db.reconRun.create({ data: { shop, kind } });
}

export async function upsertShopSettings(
  shop: string,
  data: { detectedNiche?: string; detectedSubniches?: string; personalitySarcasmOn?: boolean },
) {
  return db.shopSettings.upsert({
    where: { shop },
    update: { ...data },
    create: { shop, ...data },
  });
}

export async function getShopSettings(shop: string) {
  return db.shopSettings.findUnique({ where: { shop } });
}

export type SaveProductReconInput = {
  shop: string;
  productId: string;
  title: string;
  price?: string | null;
  stock?: number | null;
  aiCategory?: string | null;
  score?: number | null;
  status?: ProductReconStatus | null;
  suggestion?: string | null;
  rawJson?: any;
};

export async function saveProductRecons(inputs: SaveProductReconInput[]) {
  if (inputs.length === 0) return { count: 0 };
  // Keep it simple/robust: create rows (history). Latest is last row by createdAt.
  const created = await db.productRecon.createMany({
    data: inputs.map((i) => ({
      shop: i.shop,
      productId: i.productId,
      title: i.title,
      price: i.price ?? null,
      stock: i.stock ?? null,
      aiCategory: i.aiCategory ?? null,
      score: i.score ?? null,
      status: i.status ?? null,
      suggestion: i.suggestion ?? null,
      rawJson: i.rawJson ?? undefined,
    })),
  });
  return created;
}

export async function latestProductReconsForShop(shop: string, productIds: string[]) {
  if (productIds.length === 0) return new Map<string, any>();

  const rows = await db.productRecon.findMany({
    where: { shop, productId: { in: productIds } },
    orderBy: { createdAt: "desc" },
  });

  const m = new Map<string, any>();
  for (const r of rows) {
    if (!m.has(r.productId)) m.set(r.productId, r);
  }
  return m;
}
