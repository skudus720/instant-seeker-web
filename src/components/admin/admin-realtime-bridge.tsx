"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AdminRealtimeBridge({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (disabled) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const tables = new Set<string>();
    if (pathname === "/admin" || pathname.startsWith("/admin/analyses")) {
      tables.add("analyses");
    }
    if (pathname === "/admin" || pathname.startsWith("/admin/reviews")) {
      tables.add("reviews");
    }
    if (pathname === "/admin" || pathname.startsWith("/admin/win-records")) {
      tables.add("win_records");
    }
    if (pathname === "/admin" || pathname.startsWith("/admin/system-health")) {
      tables.add("system_events");
    }
    if (!tables.size) return;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let channel = supabase.channel(`admin-operations:${pathname}`);
    const refresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        router.refresh();
      }, 750);
    };
    tables.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        refresh,
      );
    });
    channel.subscribe();
    const poller = window.setInterval(() => router.refresh(), 30_000);
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.clearInterval(poller);
      void supabase.removeChannel(channel);
    };
  }, [disabled, pathname, router]);

  return null;
}
