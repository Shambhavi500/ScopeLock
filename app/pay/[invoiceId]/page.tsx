import type { Metadata } from "next";
import { PayPage } from "@/components/checkout/PayPage";

export const metadata: Metadata = { title: "Pay invoice · ScopeLock" };

export default async function Page({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const sdkUrl = process.env.NEXT_PUBLIC_PAYPAL_SDK_URL || "https://www.sandbox.paypal.com/web-sdk/v6/core";
  return <PayPage invoiceId={invoiceId} sdkUrl={sdkUrl} />;
}
