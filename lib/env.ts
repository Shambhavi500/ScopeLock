import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const EnvSchema = z.object({
  PAYPAL_CLIENT_ID: optional,
  PAYPAL_CLIENT_SECRET: optional,
  PAYPAL_API_BASE: z
    .string()
    .url()
    .default("https://api-m.sandbox.paypal.com")
    .refine((v) => v.includes("sandbox"), "PAYPAL_API_BASE must be a sandbox URL (sandbox only)"),
  NEXT_PUBLIC_PAYPAL_SDK_URL: z
    .string()
    .url()
    .default("https://www.sandbox.paypal.com/web-sdk/v6/core"),

  DEMO_CLIENT_EMAIL: z.string().email().default("client@example.com"),
  DEMO_CONTRACTOR_EMAILS: z
    .string()
    .default("designer@example.com,frontend@example.com,backend@example.com")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
  DEMO_BUYER_EMAIL: optional,
  DEMO_BUYER_PASSWORD: optional,

  GEMINI_API_KEY: optional,
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  DATABASE_PATH: z.string().default("./data/scopelock.db"),
  PAYOUT_CAP_CENTS: z.coerce.number().int().positive().default(500000),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof EnvSchema> & { paypalMode: "sandbox" | "simulated" };

function load(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}\nSee .env.example.`);
  }
  const e = parsed.data;
  if (!!e.PAYPAL_CLIENT_ID !== !!e.PAYPAL_CLIENT_SECRET) {
    throw new Error("Set both PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET, or neither (simulator).");
  }
  return { ...e, paypalMode: e.PAYPAL_CLIENT_ID ? "sandbox" : "simulated" };
}

export const env: Env = load();
