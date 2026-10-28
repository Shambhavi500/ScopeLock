import { route } from "@/lib/app/route";
import { env } from "@/lib/env";
import { getClientToken } from "@/lib/paypal/auth";

export const dynamic = "force-dynamic";

/** Browser-safe token for JS SDK v6. Secrets never leave the server. */
export const POST = route(async () => {
  if (env.paypalMode === "simulated") return { simulated: true, clientToken: null };
  return { simulated: false, clientToken: await getClientToken() };
});
