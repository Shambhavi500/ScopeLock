import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import type { ApiError } from "@/lib/api-types";
import { isPayPalError } from "@/lib/paypal/errors";
import { NotFoundError } from "./project";

/** A failure the route should report as-is. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: Partial<ApiError> = {},
  ) {
    super(message);
  }
}

export function errorResponse(e: unknown): NextResponse<ApiError> {
  if (e instanceof AppError) {
    return NextResponse.json({ error: e.message, code: e.code, ...e.extra }, { status: e.status });
  }
  if (e instanceof NotFoundError) {
    return NextResponse.json({ error: e.message, code: "NOT_FOUND" }, { status: 404 });
  }
  if (isPayPalError(e)) {
    return NextResponse.json(
      { error: `PayPal: ${e.message}`, code: e.issue ?? e.paypalName, debugId: e.debugId, details: e.details },
      { status: 502 },
    );
  }
  console.error(e);
  return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    const text = await req.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body isn't valid JSON");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_REQUEST", "Request body failed validation", {
      details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return parsed.data;
}

// Simple in-memory per-IP limiter (protects the Gemini free-tier quota).
const g = globalThis as unknown as { __rate?: Map<string, number[]> };
export function rateLimit(req: Request, bucket: string, limit: number, windowMs: number): void {
  const map = (g.__rate ??= new Map<string, number[]>());
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const hits = (map.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    throw new AppError(429, "RATE_LIMITED", `Too many requests. Try again in a minute.`);
  }
  hits.push(now);
  map.set(key, hits);
}
