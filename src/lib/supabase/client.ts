"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/config";

export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured || !supabaseConfig.url || !supabaseConfig.anonKey) {
    return null;
  }

  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey);
}
