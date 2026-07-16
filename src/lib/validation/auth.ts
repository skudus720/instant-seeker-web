import { z } from "zod";

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use no more than 72 characters.")
  .regex(/[A-Z]/, "Add at least one uppercase letter.")
  .regex(/[a-z]/, "Add at least one lowercase letter.")
  .regex(/[0-9]/, "Add at least one number.");

export function normalizeGhanaMomoNumber(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^[25]\d{8}$/.test(compact)) return `+233${compact}`;
  if (/^0[25]\d{8}$/.test(compact)) return `+233${compact.slice(1)}`;
  if (/^233[25]\d{8}$/.test(compact)) return `+${compact}`;
  return compact;
}

const momoNumber = z
  .string()
  .trim()
  .refine(
    (value) => /^\+233[25]\d{8}$/.test(normalizeGhanaMomoNumber(value)),
    "Enter a valid Ghana Mobile Money number.",
  );

export const signupSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Enter at least 2 characters.")
      .max(60, "Use no more than 60 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    momoNumber,
    password,
    confirmPassword: z.string(),
    ageConfirmed: z.literal(true, {
      error: "You must confirm that you are at least 18.",
    }),
    termsAccepted: z.literal(true, {
      error: "Accept the Terms and Privacy Policy to continue.",
    }),
    feeAccepted: z.literal(true, {
      error: "Confirm that you understand the one-time access fee.",
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Enter your email address or username.")
    .max(254)
    .refine(
      (value) =>
        z.string().email().safeParse(value).success ||
        /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/.test(value),
      "Enter a valid email address or username.",
    ),
  password: z.string().min(1, "Enter your password.").max(72),
  remember: z.boolean().optional(),
  redirectTo: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
