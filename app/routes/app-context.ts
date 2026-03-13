import type { ActivePlan } from "~/models/plans.server";

export type AppOutletContext = {
  shopName: string;
  shopDomain: string;
  activePlan: ActivePlan;
};

