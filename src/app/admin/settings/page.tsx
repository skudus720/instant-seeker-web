import type { Metadata } from "next";
import { LockKeyhole, Settings2, ToggleLeft } from "lucide-react";
import { updateFeatureFlagAction, updateSettingAction } from "@/actions/admin";
import { AdminNotice } from "@/components/admin/admin-actions";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin/admin-ui";
import { getSettingsData } from "@/lib/admin/data";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

const categories = [
  ["general", "General"],
  ["safety", "Safety"],
  ["privacy", "Privacy"],
  ["limits", "Limits"],
  ["security", "Security"],
] as const;

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ admin_result?: string; admin_message?: string }>;
}) {
  const [params, data, actor] = await Promise.all([
    searchParams,
    getSettingsData(),
    requirePermission("settings:view"),
  ]);
  return (
    <>
      <AdminPageHeader
        eyebrow="Platform controls"
        title="Settings"
        description="Manage categorized operational defaults. Security-sensitive settings and production feature flags require super-admin authorization and explicit confirmation."
      />
      <AdminNotice
        result={params.admin_result}
        message={params.admin_message}
      />
      <div className="mt-6 space-y-4">
        {categories.map(([category, label]) => {
          const settings = data.settings.filter(
            (setting) => setting.category === category,
          );
          if (!settings.length) return null;
          return (
            <AdminPanel
              key={category}
              title={label}
              description={
                category === "safety"
                  ? "18+, responsible-gaming, independent-service, uncertainty, and support-resource notices."
                  : category === "privacy"
                    ? "Structured-report retention, account deletion, consent defaults, and signed evidence lifetime."
                    : category === "limits"
                      ? "Upload validation, allowed image types, daily analysis, retries, and rate limits."
                      : undefined
              }
            >
              {settings.length ? (
                <div className="grid gap-4 p-4 lg:grid-cols-2">
                  {settings.map((setting) => (
                    <form
                      action={updateSettingAction}
                      key={setting.key}
                      className="rounded-lg border border-black/10 p-4"
                    >
                      <input
                        type="hidden"
                        name="returnTo"
                        value="/admin/settings"
                      />
                      <input type="hidden" name="key" value={setting.key} />
                      <input
                        type="hidden"
                        name="category"
                        value={setting.category}
                      />
                      <input
                        type="hidden"
                        name="isSensitive"
                        value={String(setting.is_sensitive)}
                      />
                      <input
                        type="hidden"
                        name="description"
                        value={setting.description || ""}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-black">
                            {setting.key}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-black/42">
                            {setting.description}
                          </p>
                        </div>
                        {setting.is_sensitive ? (
                          <AdminStatusBadge status="security" />
                        ) : null}
                      </div>
                      <label className="mt-4 block">
                        <span className="text-xs font-black">JSON value</span>
                        <textarea
                          name="value"
                          required
                          maxLength={12000}
                          rows={4}
                          defaultValue={JSON.stringify(setting.value, null, 2)}
                          className="mt-2 w-full rounded-md border border-black/12 bg-[#111] p-3 font-mono text-xs leading-5 text-white/75"
                        />
                      </label>
                      <label className="mt-3 block">
                        <span className="text-xs font-black">
                          Change reason
                        </span>
                        <input
                          name="reason"
                          required
                          minLength={5}
                          maxLength={1000}
                          className="mt-2 min-h-10 w-full rounded-md border border-black/12 px-3 text-xs"
                        />
                      </label>
                      {setting.is_sensitive ? (
                        <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-black/55">
                          <input
                            type="checkbox"
                            name="confirmSecurity"
                            value="confirmed"
                            required
                            className="mt-1"
                          />{" "}
                          I confirm this security-sensitive production change.
                        </label>
                      ) : null}
                      <button className="mt-4 min-h-10 rounded-full bg-ink px-4 text-xs font-black text-white">
                        Save setting
                      </button>
                    </form>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  icon={Settings2}
                  title={`No ${label.toLowerCase()} settings`}
                  description="No settings are defined in this category."
                />
              )}
            </AdminPanel>
          );
        })}
        <AdminPanel
          title="Production feature flags"
          description="Feature availability changes are security-sensitive and available only to super administrators."
        >
          {actor.role === "super_admin" && data.flags.length ? (
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {data.flags.map((flag) => (
                <form
                  action={updateFeatureFlagAction}
                  key={flag.key}
                  className="rounded-lg border border-black/10 p-4"
                >
                  <input
                    type="hidden"
                    name="returnTo"
                    value="/admin/settings"
                  />
                  <input type="hidden" name="key" value={flag.key} />
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-md bg-ink text-signal">
                      <ToggleLeft className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-black">{flag.key}</p>
                      <p className="mt-1 text-xs text-black/42">
                        {flag.description}
                      </p>
                    </div>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs font-black">State</span>
                    <select
                      name="enabled"
                      defaultValue={String(flag.enabled)}
                      className="mt-2 min-h-10 w-full rounded-md border border-black/12 bg-white px-3 text-xs"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </label>
                  <label className="mt-3 block">
                    <span className="text-xs font-black">Required reason</span>
                    <input
                      name="reason"
                      required
                      minLength={5}
                      maxLength={1000}
                      className="mt-2 min-h-10 w-full rounded-md border border-black/12 px-3 text-xs"
                    />
                  </label>
                  <button className="mt-4 min-h-10 rounded-full bg-ink px-4 text-xs font-black text-white">
                    Update feature flag
                  </button>
                </form>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              icon={LockKeyhole}
              title="Super-admin access required"
              description="Production feature flags are hidden from standard administrators."
            />
          )}
        </AdminPanel>
      </div>
    </>
  );
}
