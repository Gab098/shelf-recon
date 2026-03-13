export const PLAN_FREE = "Free" as const;
export const PLAN_GROWTH = "Growth" as const;
export const PLAN_PRO = "Pro" as const;
export const PLAN_AGENCY = "Agency" as const;

export const ALL_PAID_PLANS = [PLAN_GROWTH, PLAN_PRO, PLAN_AGENCY] as const;

export type PlanName = typeof PLAN_FREE | typeof PLAN_GROWTH | typeof PLAN_PRO | typeof PLAN_AGENCY;

