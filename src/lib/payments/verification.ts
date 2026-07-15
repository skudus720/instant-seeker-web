import { z } from "zod";
import { appConfig } from "@/lib/config";
import type {
  VerifiedSignupPayment,
  VerifiedPaymentReversal,
  VerifiedSubscriptionPayment,
} from "@/lib/payments/types";
import { getSubscriptionPlan, planCodeSchema } from "@/lib/subscriptions/plans";

const transactionSchema = z.object({
  id: z.union([z.string(), z.number().int()]).optional(),
  status: z.string(),
  reference: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  paid_at: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  metadata: z.unknown(),
});

const processedRefundSchema = z.object({
  status: z.literal("processed"),
  transaction_reference: z.string().min(1),
  refund_reference: z.string().nullable().optional(),
  id: z.union([z.string(), z.number().int()]).optional(),
  amount: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  currency: z.string().length(3),
});

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseVerifiedSignupPayment(
  value: unknown,
  expectedReference?: string,
): VerifiedSignupPayment | null {
  const parsed = transactionSchema.safeParse(value);
  if (!parsed.success || parsed.data.status !== "success") return null;
  if (expectedReference && parsed.data.reference !== expectedReference) {
    return null;
  }

  const metadata = parseMetadata(parsed.data.metadata);
  const userId = metadata?.user_id;
  const paidAt = parsed.data.paid_at || parsed.data.paidAt;
  if (
    metadata?.purpose !== "instant_seeker_signup" ||
    typeof userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    ) ||
    parsed.data.amount !== appConfig.signupFeeAmountMinor ||
    parsed.data.currency !== appConfig.signupFeeCurrency ||
    !paidAt ||
    Number.isNaN(Date.parse(paidAt))
  ) {
    return null;
  }

  return {
    userId,
    reference: parsed.data.reference,
    amountMinor: parsed.data.amount,
    currency: parsed.data.currency,
    paidAt,
    ...(parsed.data.id !== undefined
      ? { providerTransactionId: String(parsed.data.id) }
      : {}),
  };
}

export function parseVerifiedSubscriptionPayment(
  value: unknown,
  expectedReference?: string,
): VerifiedSubscriptionPayment | null {
  const parsed = transactionSchema.safeParse(value);
  if (!parsed.success || parsed.data.status !== "success") return null;
  if (expectedReference && parsed.data.reference !== expectedReference) {
    return null;
  }

  const metadata = parseMetadata(parsed.data.metadata);
  const userId = metadata?.user_id;
  const parsedPlanCode = planCodeSchema.safeParse(metadata?.plan_code);
  const paidAt = parsed.data.paid_at || parsed.data.paidAt;
  if (
    metadata?.purpose !== "instant_seeker_ai_subscription" ||
    typeof userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    ) ||
    !parsedPlanCode.success ||
    !paidAt ||
    Number.isNaN(Date.parse(paidAt))
  ) {
    return null;
  }

  const plan = getSubscriptionPlan(parsedPlanCode.data);
  if (
    !plan ||
    parsed.data.amount !== plan.amountMinor ||
    parsed.data.currency !== plan.currency
  ) {
    return null;
  }

  return {
    userId,
    planCode: plan.code,
    reference: parsed.data.reference,
    amountMinor: parsed.data.amount,
    currency: parsed.data.currency,
    paidAt,
    ...(parsed.data.id !== undefined
      ? { providerTransactionId: String(parsed.data.id) }
      : {}),
  };
}

export function parseProcessedRefund(
  value: unknown,
): VerifiedPaymentReversal | null {
  const parsed = processedRefundSchema.safeParse(value);
  if (!parsed.success) return null;
  const amountMinor = Number(parsed.data.amount);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  return {
    paymentReference: parsed.data.transaction_reference,
    amountMinor,
    currency: parsed.data.currency,
    ...(parsed.data.refund_reference || parsed.data.id !== undefined
      ? {
          providerRecordId: String(
            parsed.data.refund_reference || parsed.data.id,
          ),
        }
      : {}),
  };
}

export function parseAcceptedDispute(
  value: unknown,
): VerifiedPaymentReversal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.resolution !== "merchant-accepted") return null;
  const transaction =
    record.transaction &&
    typeof record.transaction === "object" &&
    !Array.isArray(record.transaction)
      ? (record.transaction as Record<string, unknown>)
      : null;
  const paymentReference =
    typeof record.transaction_reference === "string"
      ? record.transaction_reference
      : typeof transaction?.reference === "string"
        ? transaction.reference
        : typeof record.reference === "string"
          ? record.reference
          : null;
  const rawAmount = record.refund_amount ?? record.amount;
  const amountMinor =
    typeof rawAmount === "string" || typeof rawAmount === "number"
      ? Number(rawAmount)
      : Number.NaN;
  const currency =
    typeof record.currency === "string"
      ? record.currency
      : typeof transaction?.currency === "string"
        ? transaction.currency
        : null;
  if (
    !paymentReference ||
    !currency ||
    currency.length !== 3 ||
    !Number.isSafeInteger(amountMinor) ||
    amountMinor <= 0
  ) {
    return null;
  }
  const id = record.id ?? record.dispute_id;
  return {
    paymentReference,
    amountMinor,
    currency,
    ...(typeof id === "string" || typeof id === "number"
      ? { providerRecordId: String(id) }
      : {}),
  };
}
