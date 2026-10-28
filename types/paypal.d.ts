// Minimal typings for the PayPal JS SDK v6 surface ScopeLock uses.
// Verify against https://www.sandbox.paypal.com/web-sdk/v6/core when upgrading.

import type { DetailedHTMLProps, HTMLAttributes } from "react";

export interface PayPalOneTimePaymentSession {
  start(
    options: { presentationMode: "auto" | "popup" | "modal" | "redirect" },
    createOrder: Promise<{ orderId: string }>,
  ): Promise<void>;
}

export interface PayPalSdkInstance {
  findEligibleMethods(opts: { currencyCode: string }): Promise<{ isEligible(method: string): boolean }>;
  createPayPalOneTimePaymentSession(handlers: {
    onApprove: (data: { orderId: string }) => Promise<void> | void;
    onCancel?: (data?: unknown) => void;
    onError?: (error: unknown) => void;
  }): PayPalOneTimePaymentSession;
}

declare global {
  interface Window {
    paypal?: {
      createInstance(opts: {
        clientToken?: string;
        clientId?: string;
        components: string[];
        pageType?: string;
      }): Promise<PayPalSdkInstance>;
    };
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { type?: string; hidden?: boolean };
    }
  }
}
