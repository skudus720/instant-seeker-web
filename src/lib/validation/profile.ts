import { z } from "zod";
import { normalizeGhanaMomoNumber } from "@/lib/validation/auth";

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(60, "Use 60 characters or fewer."),
  momoNumber: z
    .string()
    .trim()
    .superRefine((value, context) => {
      if (!/^\+233[25]\d{8}$/.test(normalizeGhanaMomoNumber(value))) {
        context.addIssue({
          code: "custom",
          message: "Enter a valid Ghana Mobile Money number.",
        });
      }
    }),
});

export type ProfileInput = z.infer<typeof profileSchema>;
