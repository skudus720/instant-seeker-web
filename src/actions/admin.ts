"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const moderationSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

const verificationSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
});

export async function moderateReviewAction(formData: FormData) {
  await requireAdmin();
  const parsed = moderationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createServerSupabaseClient();
  await supabase
    ?.from("reviews")
    .update({
      moderation_status: parsed.data.decision,
      published_at:
        parsed.data.decision === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function verifyWinAction(formData: FormData) {
  await requireAdmin();
  const parsed = verificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createServerSupabaseClient();
  await supabase
    ?.from("win_records")
    .update({
      verification_status: parsed.data.decision,
      verified_at:
        parsed.data.decision === "verified" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id);
  revalidatePath("/admin");
  revalidatePath("/");
}
