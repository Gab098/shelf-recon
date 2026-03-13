import { redirect } from "@remix-run/node";
import { PLAN_AGENCY, PLAN_FREE, PLAN_GROWTH, PLAN_PRO } from "~/consts/plans";

export type ActivePlan = typeof PLAN_FREE | typeof PLAN_GROWTH | typeof PLAN_PRO | typeof PLAN_AGENCY;

export function billingIsTest() {
  return process.env.SHOPIFY_BILLING_TEST === "1" || process.env.NODE_ENV !== "production";
}

const planRank: Record<ActivePlan, number> = {
  [PLAN_FREE]: 0,
  [PLAN_GROWTH]: 1,
  [PLAN_PRO]: 2,
  [PLAN_AGENCY]: 3,
};

export function maxPlan(plans: ActivePlan[]): ActivePlan {
  let best: ActivePlan = PLAN_FREE;
  for (const p of plans) {
    if (planRank[p] > planRank[best]) best = p;
  }
  return best;
}

export async function getActivePlan(billing: any): Promise<{
  activePlan: ActivePlan;
  subscriptions: Array<{ id: string; name: string }>;
}> {
  const isTest = billingIsTest();

  const r = await billing.check({ plans: [PLAN_GROWTH, PLAN_PRO, PLAN_AGENCY], isTest });

  const subs: Array<{ id: string; name: string }> = (r?.appSubscriptions ?? [])
    .filter((s: any) => typeof s?.id === "string" && typeof s?.name === "string")
    .map((s: any) => ({ id: s.id, name: s.name }));

  const active: ActivePlan[] = subs
    .map((s) => s.name)
    .filter((n): n is ActivePlan => n === PLAN_GROWTH || n === PLAN_PRO || n === PLAN_AGENCY);

  return { activePlan: maxPlan(active.length ? active : [PLAN_FREE]), subscriptions: subs };
}

export async function requireAtLeastPlan(args: {
  billing: any;
  minPlan: ActivePlan;
  returnTo?: string;
}) {
  const { activePlan } = await getActivePlan(args.billing);
  if (planRank[activePlan] < planRank[args.minPlan]) {
    const sp = new URLSearchParams();
    sp.set("required", args.minPlan);
    if (args.returnTo) sp.set("returnTo", args.returnTo);
    throw redirect(`/app/plans?${sp.toString()}`);
  }
  return { activePlan };
}
