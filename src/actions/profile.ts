"use server";

import { revalidatePath } from "next/cache";
import { requirePaidUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeGhanaMomoNumber } from "@/lib/validation/auth";
import { profileSchema } from "@/lib/validation/profile";

export interface ProfileActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export async function updateProfileAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const user = await requirePaidUser("/profile");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted profile details.",
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).filter(
          (entry): entry is [string, string[]] => Boolean(entry[1]),
        ),
      ),
    };
  }

  if (!(await checkRateLimit(`profile-update:${user.id}`, 10, 30 * 60_000))) {
    return {
      ok: false,
      message: "Too many profile updates. Please wait and try again.",
    };
  }

  if (user.demo) {
    return {
      ok: true,
      message: "Demo preview validated your changes but did not store them.",
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Profile service is temporarily unavailable.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      momo_number: normalizeGhanaMomoNumber(parsed.data.momoNumber),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      message: "Your profile could not be updated. Please try again.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/plans");
  return { ok: true, message: "Your profile details have been updated." };
}
