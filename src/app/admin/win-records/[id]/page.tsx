import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addAdminNoteAction } from "@/actions/admin";
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
import { getWinRecordDetails } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Win-record verification" };

export default async function AdminWinRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin_result?: string; admin_message?: string }>;
}) {
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const details = await getWinRecordDetails(id);
  if (!details) notFound();
  const record = details.record;
  const amount = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: String(record.currency),
    minimumFractionDigits: 2,
  }).format(Number(record.amount_minor || 0) / 100);
  return (
    <>
      <Link
        href="/admin/win-records"
        className="mb-5 inline-flex items-center gap-2 text-xs font-black text-black/55 hover:text-black"
      >
        <ArrowLeft className="size-4" /> Back to win records
      </Link>
      <AdminPageHeader
        eyebrow="Evidence review"
        title={amount}
        description="Claimed amounts remain unverified until an administrator completes evidence review. Public exposure requires separate verified status, explicit user consent, and a privacy-safe name."
        actions={
          record.ticket_image_path ? (
            <a
              href={`/api/admin/evidence/win-record?id=${record.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white"
            >
              <ExternalLink className="size-4" /> View signed evidence
            </a>
          ) : undefined
        }
      />
      <AdminNotice
        result={notice.admin_result}
        message={notice.admin_message}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <AdminPanel title="Verification record">
            <dl className="grid gap-5 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-bold text-black/42">User</dt>
                <dd className="mt-1 font-black">
                  {String(details.profile?.display_name || "Member")}
                </dd>
                <dd className="mt-1 text-xs text-black/40">
                  {String(details.profile?.email || "")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">
                  Claimed amount
                </dt>
                <dd className="mt-1 font-black">{amount}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Status</dt>
                <dd className="mt-1">
                  <AdminStatusBadge
                    status={String(record.verification_status)}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">
                  User consent
                </dt>
                <dd className="mt-1 font-black">
                  {record.consent_to_publish ? "Recorded" : "Not recorded"}
                </dd>
                <dd className="mt-1 text-xs text-black/40">
                  {record.consent_recorded_at
                    ? new Date(
                        String(record.consent_recorded_at),
                      ).toLocaleString()
                    : "Required before publication"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">
                  Privacy-safe public name
                </dt>
                <dd className="mt-1 font-black">
                  {String(record.privacy_safe_public_name || "Not set")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Evidence</dt>
                <dd className="mt-1 font-black">
                  {record.ticket_image_path
                    ? "Private ticket image"
                    : "Not supplied"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Won at</dt>
                <dd className="mt-1 font-black">
                  {new Date(String(record.won_at)).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Submitted</dt>
                <dd className="mt-1 font-black">
                  {new Date(String(record.created_at)).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Moderator</dt>
                <dd className="mt-1 font-black">
                  {String(details.moderator?.display_name || "Not assigned")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Verified</dt>
                <dd className="mt-1 font-black">
                  {record.verified_at
                    ? new Date(String(record.verified_at)).toLocaleString()
                    : "Not verified"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Published</dt>
                <dd className="mt-1 font-black">
                  {record.published_at
                    ? new Date(String(record.published_at)).toLocaleString()
                    : "Not public"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Sample/demo</dt>
                <dd className="mt-1 font-black">
                  {record.is_sample ? "Demo record — excluded" : "No"}
                </dd>
              </div>
            </dl>
          </AdminPanel>
          {details.analysis ? (
            <AdminPanel title="Connected analysis">
              <Link
                href={`/admin/analyses/${details.analysis.id}`}
                className="flex items-center justify-between gap-3 p-5 hover:bg-black/[0.02]"
              >
                <div>
                  <p className="font-mono text-xs font-black">
                    {details.analysis.id}
                  </p>
                  <p className="mt-2 text-xs text-black/45">
                    {details.analysis.provider} ·{" "}
                    {new Date(details.analysis.created_at).toLocaleString()}
                  </p>
                </div>
                <AdminStatusBadge status={details.analysis.status} />
              </Link>
            </AdminPanel>
          ) : null}
          <AdminPanel title="Moderator notes">
            <div className="p-5 text-sm leading-6 text-black/62">
              {String(
                record.moderator_notes ||
                  record.rejection_reason ||
                  "No moderator note recorded.",
              )}
            </div>
          </AdminPanel>
          <AdminPanel title="Status timeline">
            {details.moderation.length || details.audit.length ? (
              <ol className="divide-y divide-black/8">
                {[...details.moderation, ...details.audit]
                  .sort(
                    (a, b) =>
                      Date.parse(String(b.created_at)) -
                      Date.parse(String(a.created_at)),
                  )
                  .map((item) => (
                    <li key={item.id} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black">
                          {String(item.action).replaceAll("_", " ")}
                        </p>
                        {"new_status" in item && item.new_status ? (
                          <AdminStatusBadge status={String(item.new_status)} />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-black/48">
                        {String(item.reason)}
                      </p>
                      <p className="mt-2 text-[11px] text-black/35">
                        {new Date(String(item.created_at)).toLocaleString()}
                      </p>
                    </li>
                  ))}
              </ol>
            ) : (
              <AdminEmptyState
                title="No status changes"
                description="Verification and publication decisions will appear here."
              />
            )}
          </AdminPanel>
        </div>
        <aside className="space-y-4">
          <AdminPanel
            title="Verification actions"
            description="Every decision is audited and reputation-affecting actions require a reason."
          >
            <div className="flex flex-wrap gap-2 p-4">
              {record.verification_status === "pending" ? (
                <AdminActionDialog
                  kind="win_begin_review"
                  targetId={record.id}
                  label="Begin review"
                  title="Begin evidence review"
                  description="Assign this record to the operational review queue."
                />
              ) : null}
              {["pending", "under_review"].includes(
                record.verification_status,
              ) ? (
                <>
                  <AdminActionDialog
                    kind="win_verify"
                    targetId={record.id}
                    label="Verify evidence"
                    title="Verify win record"
                    description="Confirm the submitted evidence supports the claimed record. This does not publish it."
                    tone="success"
                  />
                  <AdminActionDialog
                    kind="win_request_evidence"
                    targetId={record.id}
                    label="Request evidence"
                    title="Request more evidence"
                    description="Keep the record private and mark it as requiring additional evidence."
                  />
                  <AdminActionDialog
                    kind="win_reject"
                    targetId={record.id}
                    label="Reject"
                    title="Reject win record"
                    description="Rejected records never contribute to public activity or statistics."
                    tone="danger"
                  />
                </>
              ) : null}
              {["verified", "unpublished"].includes(
                record.verification_status,
              ) ? (
                <AdminActionDialog
                  kind="win_publish"
                  targetId={record.id}
                  label="Publish"
                  title="Publish verified record"
                  description="Publication succeeds only when verification and explicit user consent are recorded."
                  tone="success"
                />
              ) : null}
              {record.verification_status === "published" ? (
                <AdminActionDialog
                  kind="win_unpublish"
                  targetId={record.id}
                  label="Unpublish"
                  title="Unpublish verified record"
                  description="Remove the record from public activity while preserving verification history."
                  tone="danger"
                />
              ) : null}
              {["verified", "published", "unpublished"].includes(
                record.verification_status,
              ) ? (
                <AdminActionDialog
                  kind="win_revoke"
                  targetId={record.id}
                  label="Revoke verification"
                  title="Revoke verification"
                  description="Return the record to evidence review and remove it from public activity."
                  tone="danger"
                />
              ) : null}
              <AdminActionDialog
                kind="win_redact"
                targetId={record.id}
                label="Set public name"
                title="Set privacy-safe public name"
                description="Store an anonymized display name. Email, username, account number, and ticket identifiers are never public."
                valueLabel="Privacy-safe name"
                valuePlaceholder="Verified member"
              />
            </div>
          </AdminPanel>
          <AdminPanel title="Private admin note">
            <form action={addAdminNoteAction} className="p-4">
              <input type="hidden" name="targetType" value="win_record" />
              <input type="hidden" name="targetId" value={record.id} />
              <input
                type="hidden"
                name="returnTo"
                value={`/admin/win-records/${record.id}`}
              />
              <label htmlFor="win-note" className="text-xs font-black">
                Internal note
              </label>
              <textarea
                id="win-note"
                name="body"
                required
                minLength={2}
                maxLength={4000}
                rows={5}
                className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm"
              />
              <button className="mt-3 min-h-10 w-full rounded-full bg-ink text-sm font-black text-white">
                Add private note
              </button>
            </form>
          </AdminPanel>
          <AdminPanel title="Internal notes">
            {details.notes.length ? (
              <div className="divide-y divide-black/8">
                {details.notes.map((note) => (
                  <div key={note.id} className="p-4">
                    <p className="text-xs leading-5 text-black/62">
                      {note.body}
                    </p>
                    <p className="mt-2 text-[11px] text-black/35">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState
                icon={FileText}
                title="No internal notes"
                description="Private verification notes will appear here."
              />
            )}
          </AdminPanel>
        </aside>
      </div>
    </>
  );
}
