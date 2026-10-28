import { pollPayout } from "@/lib/app/payouts";
import { route } from "@/lib/app/route";

export const dynamic = "force-dynamic";

export const GET = route<{ batchId: string }>(async (_req, { batchId }) => pollPayout(batchId));
