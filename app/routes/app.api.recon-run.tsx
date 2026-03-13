import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";

import type { ReconRunKind } from "@prisma/client";
import { authenticate } from "~/shopify.server";
import { PLAN_FREE } from "~/consts/plans";
import { getActivePlan } from "~/models/plans.server";
import { countReconRunsThisMonth, recordReconRun } from "~/models/recon.server";

const Schema = z.object({
  kind: z.enum(["full_scan", "market_recon", "product_creator", "landing_generator"]),
});

const FREE_FULL_SCAN_LIMIT = 3;

export async function action({ request }: ActionFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  const { activePlan } = await getActivePlan(billing);

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false as const, error: "Invalid payload" }, { status: 400 });
  }

  const kind = parsed.data.kind as ReconRunKind;

  if (activePlan === PLAN_FREE && kind === ("full_scan" as ReconRunKind)) {
    const used = await countReconRunsThisMonth(session.shop, kind);
    if (used >= FREE_FULL_SCAN_LIMIT) {
      return json(
        {
          ok: false as const,
          error: `Limite Free raggiunto: ${FREE_FULL_SCAN_LIMIT} recon complete/mese. Upgrade e fammi lavorare di piu' 🦝`,
        },
        { status: 402 },
      );
    }
  }

  const run = await recordReconRun(session.shop, kind);
  return json({ ok: true as const, runId: run.id });
}
