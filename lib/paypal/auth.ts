import "server-only";
import { env } from "@/lib/env";
import { PayPalError } from "./errors";

const g = globalThis as unknown as { __paypalToken?: { token: string; expiresAt: number } };

function basicAuth(): string {
  return Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(`${env.PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw PayPalError.fromResponse(res.status, body, res.headers.get("paypal-debug-id"));
  return body as { access_token: string; expires_in: number };
}

/** Server access token, cached in memory until 60 s before it expires. */
export async function getAccessToken(): Promise<string> {
  const cached = g.__paypalToken;
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const body = await tokenRequest({ grant_type: "client_credentials" });
  g.__paypalToken = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  };
  return body.access_token;
}

/** Browser-safe token for JS SDK v6 `createInstance({ clientToken })`. */
export async function getClientToken(): Promise<string> {
  const body = await tokenRequest({
    grant_type: "client_credentials",
    response_type: "client_token",
    intent: "sdk_init",
  });
  return body.access_token;
}
