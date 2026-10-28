import { z } from "zod";
import { createChangeOrder } from "@/lib/app/changeOrders";
import { parseBody } from "@/lib/app/http";
import { route } from "@/lib/app/route";
import { ROLES } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  changeRequestId: z.string().min(1),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(80),
        description: z.string().max(300).default(""),
        role: z.enum(ROLES),
        hours: z.number().min(0.5).max(80),
      }),
    )
    .min(1)
    .max(10),
});

export const POST = route(async (req) => {
  const body = await parseBody(req, Body);
  return createChangeOrder(body);
});
