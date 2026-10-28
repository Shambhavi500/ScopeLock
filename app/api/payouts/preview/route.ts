import { z } from "zod";
import { parseBody } from "@/lib/app/http";
import { previewPayout } from "@/lib/app/payouts";
import { route } from "@/lib/app/route";

export const dynamic = "force-dynamic";

const Body = z.object({ invoiceId: z.string().min(1) });

export const POST = route(async (req) => {
  const { invoiceId } = await parseBody(req, Body);
  return previewPayout(invoiceId);
});
