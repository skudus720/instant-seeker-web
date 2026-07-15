import { z } from "zod";
import { decimalToMinorString } from "@/lib/referrals/money";

export const referralCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{10,32}$/)
  .transform((value) => value.toUpperCase());

export const referralListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  status: z
    .enum(["", "pending", "available", "paid", "reversed", "adjusted"])
    .optional()
    .default(""),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const referralAdminListQuerySchema = referralListQuerySchema.extend({
  partnerStatus: z
    .enum(["", "active", "suspended", "disabled"])
    .optional()
    .default(""),
  sort: z
    .enum(["created", "name", "clicks", "transactions", "activity"])
    .optional()
    .default("created"),
  direction: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const referralProfileActionSchema = z.object({
  referralProfileId: z.string().uuid(),
  operation: z.enum(["enable", "disable", "regenerate_code"]),
  reason: z.string().trim().min(5).max(1000),
  returnTo: z.string().startsWith("/admin/referrals").max(300),
});

const positiveMoneySchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const minor = decimalToMinorString(value);
    if (!minor || BigInt(minor) <= BigInt(0)) {
      context.addIssue({
        code: "custom",
        message: "Enter a positive amount with no more than two decimals.",
      });
      return z.NEVER;
    }
    return minor;
  });

const signedMoneySchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const minor = decimalToMinorString(value, { allowNegative: true });
    if (!minor || BigInt(minor) === BigInt(0)) {
      context.addIssue({
        code: "custom",
        message: "Enter a non-zero amount with no more than two decimals.",
      });
      return z.NEVER;
    }
    return minor;
  });

export const referralPayoutSchema = z.object({
  referralProfileId: z.string().uuid(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/),
  amount: positiveMoneySchema,
  paymentMethod: z.string().trim().min(2).max(80),
  externalReference: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(2000).optional().default(""),
  payoutDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
      "Enter a valid UTC date and time.",
    ),
  reason: z.string().trim().min(5).max(1000),
  returnTo: z.string().startsWith("/admin/referrals").max(300),
});

export const referralAdjustmentSchema = z.object({
  referralProfileId: z.string().uuid(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/),
  amount: signedMoneySchema,
  reason: z.string().trim().min(5).max(1000),
  returnTo: z.string().startsWith("/admin/referrals").max(300),
});

export const referralPayoutCancellationSchema = z.object({
  payoutId: z.string().uuid(),
  reason: z.string().trim().min(5).max(1000),
  returnTo: z.string().startsWith("/admin/referrals").max(300),
});
