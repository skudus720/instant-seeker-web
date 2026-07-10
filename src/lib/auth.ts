import "server-only";

import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/types";

const demoUser: SessionUser = {
  id: "demo-user",
  email: "demo@instantseeker.local",
  displayName: "Demo member",
  role: "user",
  demo: true,
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (isDemoMode) return demoUser;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email,
    displayName:
      typeof profile?.display_name === "string"
        ? profile.display_name
        : user.user_metadata.display_name || user.email.split("@")[0],
    role: profile?.role === "admin" ? "admin" : "user",
    demo: false,
  };
}

export async function requireUser(returnTo = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.demo || user.role !== "admin") {
    redirect("/dashboard?notice=admin-access-required");
  }
  return user;
}
