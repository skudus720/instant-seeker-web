import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s | Instant Seeker Admin" },
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();
  let notificationCount = 0;
  if (!user.demo) {
    const admin = createAdminSupabaseClient();
    if (admin) {
      const { count } = await admin
        .from("system_events")
        .select("id", { count: "exact", head: true })
        .is("resolved_at", null)
        .in("severity", ["warning", "error", "critical"]);
      notificationCount = count || 0;
    }
  }
  return (
    <AdminShell user={user} notificationCount={notificationCount}>
      {children}
    </AdminShell>
  );
}
