import { z } from "zod";
import { parseBody } from "@/lib/app/http";
import { captureOrderForInvoice } from "@/lib/app/payments";
import { route } from "@/lib/app/route";

export const dynamic = "force-dynamic";

const Body = z.object({ simulateDecline: z.boolean().optional().default(false) });

export const POST = route<{ orderId: string }>(async (req, { orderId }) => {
  const { simulateDecline } = await parseBody(req, Body);
  return captureOrderForInvoice(orderId, simulateDecline);
});
