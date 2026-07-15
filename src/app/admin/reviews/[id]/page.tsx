import type { Metadata } from "next";
import { ArrowLeft, FileText } from "lucide-react";
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
import { getReviewDetails } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Review moderation" };

export default async function AdminReviewDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin_result?: string; admin_message?: string }>;
}) {
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const details = await getReviewDetails(id);
  if (!details) notFound();
  const review = details.review;
  return (
    <>
      <Link
        href="/admin/reviews"
        className="mb-5 inline-flex items-center gap-2 text-xs font-black text-black/55"
      >
        <ArrowLeft className="size-4" /> Back to reviews
      </Link>
      <AdminPageHeader
        eyebrow="Review moderation"
        title={`${Number(review.rating)} / 5 rating`}
        description="The original member submission and rating are immutable through moderation. Any privacy redaction is stored separately and clearly identified."
      />
      <AdminNotice
        result={notice.admin_result}
        message={notice.admin_message}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <AdminPanel title="Submitted review">
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black">
                    {String(details.profile?.display_name || "Member")}
                  </p>
                  <p className="mt-1 text-xs text-black/40">
                    {String(details.profile?.email || "")}
                  </p>
                </div>
                <AdminStatusBadge status={String(review.moderation_status)} />
              </div>
              <blockquote className="mt-6 border-l-4 border-signal pl-5 text-lg leading-8 font-bold text-black/72">
                {String(review.original_body)}
              </blockquote>
              <p className="mt-5 text-xs text-black/40">
                Submitted {new Date(String(review.created_at)).toLocaleString()}
              </p>
            </div>
          </AdminPanel>
          {review.redacted_body ? (
            <AdminPanel title="Separate privacy-redacted version">
              <div className="p-5 text-sm leading-7 text-black/62">
                {String(review.redacted_body)}
              </div>
            </AdminPanel>
          ) : null}
          {details.analysis ? (
            <AdminPanel title="Related analysis">
              <Link
                href={`/admin/analyses/${details.analysis.id}`}
                className="flex items-center justify-between p-5 hover:bg-black/[0.02]"
              >
                <div>
                  <p className="font-mono text-xs font-black">
                    {details.analysis.id}
                  </p>
                  <p className="mt-2 text-xs text-black/40">
                    {details.analysis.provider}
                  </p>
                </div>
                <AdminStatusBadge status={details.analysis.status} />
              </Link>
            </AdminPanel>
          ) : null}
          <AdminPanel title="Moderation context">
            <dl className="grid gap-4 p-5 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-black/40">Moderator</dt>
                <dd className="mt-1 font-black">
                  {String(details.moderator?.display_name || "Not assigned")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-black/40">Published</dt>
                <dd className="mt-1 font-black">
                  {review.published_at
                    ? new Date(String(review.published_at)).toLocaleString()
                    : "Not public"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-black/40">Reason</dt>
                <dd className="mt-1 font-black">
                  {String(review.moderation_reason || "Not recorded")}
                </dd>
              </div>
            </dl>
          </AdminPanel>
          <AdminPanel title="Moderation timeline">
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
                title="No moderation actions"
                description="Decisions will appear here without changing the original review."
              />
            )}
          </AdminPanel>
        </div>
        <aside className="space-y-4">
          <AdminPanel
            title="Moderation actions"
            description="Rating and original text cannot be changed."
          >
            <div className="flex flex-wrap gap-2 p-4">
              {review.moderation_status !== "approved" ? (
                <AdminActionDialog
                  kind="review_approve"
                  targetId={review.id}
                  label="Approve"
                  title="Approve genuine review"
                  description="Publish the original rating and submitted text unchanged."
                  tone="success"
                />
              ) : null}
              {review.moderation_status !== "rejected" ? (
                <AdminActionDialog
                  kind="review_reject"
                  targetId={review.id}
                  label="Reject"
                  title="Reject review"
                  description="Keep this submission private and record a moderation reason."
                  tone="danger"
                />
              ) : null}
              {review.moderation_status === "approved" ? (
                <AdminActionDialog
                  kind="review_hide"
                  targetId={review.id}
                  label="Hide"
                  title="Hide published review"
                  description="Remove the review from public display while preserving history."
                  tone="danger"
                />
              ) : null}
              {review.moderation_status === "hidden" ? (
                <AdminActionDialog
                  kind="review_restore"
                  targetId={review.id}
                  label="Restore"
                  title="Restore approved review"
                  description="Return the approved review to public display without editing text or rating."
                  tone="success"
                />
              ) : null}
              <AdminActionDialog
                kind="review_redact"
                targetId={review.id}
                label="Privacy redaction"
                title="Store privacy-redacted version"
                description="Create a separate redacted version for personally identifying information. Do not rewrite sentiment or rating."
                valueLabel="Redacted review text"
                valueType="textarea"
                valuePlaceholder="Review text with personal identifiers removed"
              />
            </div>
          </AdminPanel>
          <AdminPanel title="Private admin note">
            <form action={addAdminNoteAction} className="p-4">
              <input type="hidden" name="targetType" value="review" />
              <input type="hidden" name="targetId" value={review.id} />
              <input
                type="hidden"
                name="returnTo"
                value={`/admin/reviews/${review.id}`}
              />
              <label htmlFor="review-note" className="text-xs font-black">
                Internal note
              </label>
              <textarea
                id="review-note"
                name="body"
                required
                minLength={2}
                maxLength={4000}
                rows={5}
                className="mt-2 w-full rounded-md border border-black/12 p-3 text-sm"
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
                description="Private moderation notes will appear here."
              />
            )}
          </AdminPanel>
        </aside>
      </div>
    </>
  );
}
