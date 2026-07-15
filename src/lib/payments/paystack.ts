import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { appConfig, paymentConfig } from "@/lib/config";
import type {
  SignupCheckout,
  SubscriptionCheckout,
} from "@/lib/payments/types";
import type { SubscriptionPlan } from "@/lib/subscriptions/plans";

const initializeResponseSchema = z.object({
  status: z.literal(true),
  data: z.object({
    authorization_url: z.string().url(),
    reference: z.string().min(1),
  }),
});

const verifyResponseSchema = z.object({
  status: z.literal(true),
  data: z.unknown(),
});

function secretKey() {
  if (!paymentConfig.secretKey) {
    throw new Error("Payment provider is not configured.");
  }
  return paymentConfig.secretKey;
}

async function paystackRequest(path: string, init?: RequestInit) {
  return fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export async function initializeSignupCheckout({
  userId,
  email,
  origin,
}: {
  userId: string;
  email: string;
  origin: string;
}): Promise<SignupCheckout> {
  const response = await paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: String(appConfig.signupFeeAmountMinor),
      currency: appConfig.signupFeeCurrency,
      channels: ["mobile_money", "card"],
      callback_url: `${origin}/api/payments/paystack/callback`,
      metadata: JSON.stringify({
        purpose: "instant_seeker_signup",
        user_id: userId,
      }),
    }),
  });

  if (!response.ok) throw new Error("Payment checkout could not be started.");
  const parsed = initializeResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Payment provider returned an invalid response.");
  }

  return {
    authorizationUrl: parsed.data.data.authorization_url,
    reference: parsed.data.data.reference,
  };
}

export async function initializeSubscriptionCheckout({
  userId,
  email,
  origin,
  plan,
}: {
  userId: string;
  email: string;
  origin: string;
  plan: SubscriptionPlan;
}): Promise<SubscriptionCheckout> {
  const response = await paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: String(plan.amountMinor),
      currency: plan.currency,
      channels: ["mobile_money", "card"],
      callback_url: `${origin}/api/payments/paystack/subscription/callback`,
      metadata: JSON.stringify({
        purpose: "instant_seeker_ai_subscription",
        user_id: userId,
        plan_code: plan.code,
      }),
    }),
  });

  if (!response.ok) throw new Error("Plan checkout could not be started.");
  const parsed = initializeResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Payment provider returned an invalid response.");
  }

  return {
    authorizationUrl: parsed.data.data.authorization_url,
    reference: parsed.data.data.reference,
  };
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  if (!response.ok) throw new Error("Payment could not be verified.");
  const parsed = verifyResponseSchema.safeParse(await response.json());
  if (!parsed.success)
    throw new Error("Invalid payment verification response.");
  return parsed.data.data;
}

export function hasValidPaystackSignature(
  rawBody: string,
  signature: string | null,
) {
  if (!signature || !paymentConfig.secretKey) return false;
  const expected = createHmac("sha512", paymentConfig.secretKey)
    .update(rawBody)
    .digest("hex");
  const suppliedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}
