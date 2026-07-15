import type { Metadata } from "next";
import { BarChart3, FileJson, History } from "lucide-react";
import { saveContentDraftAction } from "@/actions/admin";
import {
  AdminActionDialog,
  AdminNotice,
} from "@/components/admin/admin-actions";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin/admin-ui";
import { getContentVersions } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Public content" };

const contentKeys = [
  ["homepage.hero", "Homepage hero"],
  ["homepage.cta", "Homepage call to action"],
  ["homepage.how_it_works", "How it works"],
  ["homepage.features", "Feature descriptions"],
  ["homepage.faq", "Frequently asked questions"],
  ["responsible_gaming", "Responsible-gaming content"],
  ["legal.disclaimers", "Legal disclaimers"],
  ["privacy.links", "Privacy links"],
  ["terms.links", "Terms links"],
  ["support.contact", "Support contact"],
  ["banner.maintenance", "Maintenance banner"],
  ["banner.announcement", "Announcement banner"],
  ["homepage.activity_ticker", "Activity ticker settings"],
  ["homepage.reviews", "Review-section visibility"],
  ["footer", "Footer content"],
] as const;

function metricNumber(value: unknown) {
  return Number(value || 0).toLocaleString();
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ admin_result?: string; admin_message?: string }>;
}) {
  const [params, data] = await Promise.all([
    searchParams,
    getContentVersions(),
  ]);
  return (
    <>
      <AdminPageHeader
        eyebrow="Versioned CMS"
        title="Public content"
        description="Create draft JSON content, preview each immutable version, publish deliberately, and restore earlier versions without losing history."
      />
      <AdminNotice
        result={params.admin_result}
        message={params.admin_message}
      />

      <section
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Calculated public metrics"
      >
        {[
          ["Registered users", metricNumber(data.metrics.registeredUsers)],
          [
            "Completed real analyses",
            metricNumber(data.metrics.completedRealAnalyses),
          ],
          [
            "Verified public wins",
            metricNumber(data.metrics.verifiedPublishedWins),
          ],
          ["Approved reviews", metricNumber(data.metrics.approvedReviewCount)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-black/10 bg-white p-5"
          >
            <BarChart3 className="size-4 text-signal-ink" />
            <p className="mt-5 text-xs font-bold text-black/42 uppercase">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black">{value}</p>
            <p className="mt-2 text-[11px] text-black/38">
              Calculated from eligible database records
            </p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-[24rem_1fr]">
        <AdminPanel
          title="Create content draft"
          description="Content must be a JSON object. Publishing is a separate audited action."
        >
          <form action={saveContentDraftAction} className="space-y-4 p-5">
            <input type="hidden" name="returnTo" value="/admin/content" />
            <label className="block">
              <span className="text-xs font-black">Content area</span>
              <select
                name="contentKey"
                className="mt-2 min-h-11 w-full rounded-md border border-black/12 bg-white px-3 text-sm"
              >
                {contentKeys.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black">Draft JSON</span>
              <textarea
                name="content"
                required
                minLength={2}
                maxLength={30000}
                rows={14}
                defaultValue={'{\n  "title": "",\n  "description": ""\n}'}
                className="mt-2 w-full rounded-md border border-black/12 bg-[#111] p-3 font-mono text-xs leading-6 text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black">Change reason</span>
              <textarea
                name="reason"
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                className="mt-2 w-full rounded-md border border-black/12 p-3 text-sm"
              />
            </label>
            <button className="min-h-11 w-full rounded-full bg-ink px-4 text-sm font-black text-white">
              Create draft version
            </button>
          </form>
        </AdminPanel>

        <AdminPanel
          title="Version history"
          description="Published content is public; draft and archived versions stay private."
        >
          {data.versions.length ? (
            <div className="divide-y divide-black/8">
              {data.versions.map((version) => (
                <article key={version.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-black">
                        {version.content_key}
                      </p>
                      <p className="mt-2 text-sm font-black">
                        Version {version.version_number}
                      </p>
                      <p className="mt-1 text-xs text-black/42">
                        {new Date(version.created_at).toLocaleString()} ·{" "}
                        {version.change_reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AdminStatusBadge status={version.status} />
                      {version.status !== "published" ? (
                        <AdminActionDialog
                          kind="content_publish"
                          targetId={version.id}
                          label={
                            version.status === "archived"
                              ? "Restore"
                              : "Publish"
                          }
                          title={
                            version.status === "archived"
                              ? "Restore previous version"
                              : "Publish content version"
                          }
                          description="This will archive the currently published version for the same content key and record an audit event."
                          tone="success"
                        />
                      ) : null}
                    </div>
                  </div>
                  <details className="mt-4 rounded-lg border border-black/10">
                    <summary className="cursor-pointer px-4 py-3 text-xs font-black">
                      Preview JSON
                    </summary>
                    <pre className="max-h-80 overflow-auto border-t border-black/10 bg-[#111] p-4 text-xs leading-6 text-white/72">
                      {JSON.stringify(version.content, null, 2)}
                    </pre>
                  </details>
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              icon={History}
              title="No content versions"
              description="Create the first draft to begin versioned content management."
            />
          )}
        </AdminPanel>
      </div>
      <AdminPanel
        className="mt-4"
        title="Verified amount snapshot"
        description="Amounts are calculated from non-demo, verified, consented, published records by currency."
      >
        {data.metrics.verifiedAmountsByCurrency &&
        Object.keys(data.metrics.verifiedAmountsByCurrency as object).length ? (
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {Object.entries(
              data.metrics.verifiedAmountsByCurrency as Record<string, unknown>,
            ).map(([currency, minor]) => (
              <div
                key={currency}
                className="rounded-lg border border-black/10 p-4"
              >
                <p className="text-xs font-black text-black/42">{currency}</p>
                <p className="mt-2 text-xl font-black">
                  {(Number(minor) / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            icon={FileJson}
            title="No verified public amounts"
            description="No eligible records contribute to this calculated metric."
          />
        )}
      </AdminPanel>
    </>
  );
}
