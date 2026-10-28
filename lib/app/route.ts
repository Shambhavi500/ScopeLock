import "server-only";
import { NextResponse } from "next/server";
import { ensureBooted } from "./boot";
import { errorResponse } from "./http";

type Ctx<P> = { params: Promise<P> };

/** Wrap a route handler: make sure the demo is seeded, and turn errors into `{ error, code }`. */
export function route<P = Record<string, never>>(
  fn: (req: Request, params: P) => Promise<unknown>,
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      await ensureBooted();
      const result = await fn(req, await ctx.params);
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (e) {
      return errorResponse(e);
    }
  };
}
