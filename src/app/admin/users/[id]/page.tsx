import type { Metadata } from "next";
import { ArrowLeft, FileText, ShieldAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addAdminNoteAction } from "@/actions/admin";
import {
  AdminActionDialog,
  AdminExportDialog,
  AdminNotice,
} from "@/components/admin/admin-actions";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin/admin-ui";
import { getUserDetails } from "@/lib/admin/data";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "User details" };

export default async function AdminUserDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin_result?: string; admin_message?: string }>;
}) {
  const [{ id }, notice, actor] = await Promise.all([
    params,
    searchParams,
    requirePermission("users:view"),
  ]);
  const details = await getUserDetails(id);
  if (!details) notFound();
  const profile = details.profile;
  const isSelf = profile.id === actor.id;
  const canManageTarget =
    actor.role === "super_admin" || profile.role === "user";
  return (
    <>
      <Link
        href="/admin/users"
        className="mb-5 inline-flex items-center gap-2 text-xs font-black text-black/55 hover:text-black"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to users
      </Link>
      <AdminPageHeader
        eyebrow="User record"
        title={String(profile.display_name || "Member")}
        description="Account metadata, product activity, moderation history, security events, and privacy workflows. Sensitive credentials are intentionally unavailable."
        actions={
          <AdminExportDialog
            action={`/api/admin/users/${profile.id}/export`}
            label="Export user data"
            title="Generate privacy export"
            description="Create user-focused JSON without passwords, tokens, private object paths, or provider secrets. The export is audited."
          />
        }
      />
      <AdminNotice
        result={notice.admin_result}
        message={notice.admin_message}
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <AdminPanel title="Account profile">
            <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr]">
              <span className="grid size-16 place-items-center rounded-full bg-ink text-signal">
                <UserRound className="size-7" />
              </span>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs font-bold text-black/42">
                    Display name
                  </dt>
                  <dd className="mt-1 font-black">
                    {String(profile.display_name)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-black/42">Email</dt>
                  <dd className="mt-1 font-black break-all">
                    {String(profile.email)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-black/42">Role</dt>
                  <dd className="mt-1">
                    <AdminStatusBadge status={String(profile.role)} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-black/42">Status</dt>
                  <dd className="mt-1">
                    <AdminStatusBadge status={String(profile.account_status)} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-black/42">
                    18+ confirmation
                  </dt>
                  <dd className="mt-1 font-black">
                    {profile.age_confirmed_at
                      ? new Date(
                          String(profile.age_confirmed_at),
                        ).toLocaleString()
                      : "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-black/42">Signed up</dt>
                  <dd className="mt-1 font-black">
                    {new Date(String(profile.created_at)).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-black/42">
                    Last active
                  </dt>
                  <dd className="mt-1 font-black">
                    {profile.last_active_at
                      ? new Date(
                          String(profile.last_active_at),
                        ).toLocaleString()
                      : "No recorded activity"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-black/42">
                    Suspension ends
                  </dt>
                  <dd className="mt-1 font-black">
                    {profile.suspended_until
                      ? new Date(
                          String(profile.suspended_until),
                        ).toLocaleString()
                      : "Not applicable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-black/42">Analyses</dt>
                  <dd className="mt-1 font-black">
                    {details.analyses.length}
                    {details.analyses.length === 25 ? "+" : ""}
                  </dd>
                </div>
              </dl>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Analysis history"
            description="The 25 most recent analysis records."
          >
            {details.analyses.length ? (
              <div className="divide-y divide-black/8">
                {details.analyses.map((analysis) => (
                  <Link
                    href={`/admin/analyses/${analysis.id}`}
                    key={analysis.id}
                    className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-black/[0.02]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-bold">
                        {analysis.id}
                      </p>
                      <p className="mt-1 text-xs text-black/45">
                        {new Date(analysis.created_at).toLocaleString()} ·{" "}
                        {analysis.provider}
                      </p>
                    </div>
                    <AdminStatusBadge status={analysis.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <AdminEmptyState
                title="No analyses"
                description="This user has not submitted an analysis."
              />
            )}
          </AdminPanel>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminPanel title="Review history">
              {details.reviews.length ? (
                <div className="divide-y divide-black/8">
                  {details.reviews.map((review) => (
                    <div key={review.id} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black">
                          {review.rating} / 5
                        </p>
                        <AdminStatusBadge status={review.moderation_status} />
                      </div>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-black/52">
                        {review.original_body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="No reviews"
                  description="No review submissions are recorded."
                />
              )}
            </AdminPanel>
            <AdminPanel title="Win-record history">
              {details.wins.length ? (
                <div className="divide-y divide-black/8">
                  {details.wins.map((win) => (
                    <Link
                      href={`/admin/win-records?q=${win.id}`}
                      key={win.id}
                      className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-black/[0.02]"
                    >
                      <div>
                        <p className="font-black">
                          {win.currency}{" "}
                          {(Number(win.amount_minor || 0) / 100).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 },
                          )}
                        </p>
                        <p className="mt-1 text-xs text-black/45">
                          Consent{" "}
                          {win.consent_to_publish ? "recorded" : "not recorded"}
                        </p>
                      </div>
                      <AdminStatusBadge status={win.verification_status} />
                    </Link>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="No win records"
                  description="No success-record claims are recorded."
                />
              )}
            </AdminPanel>
          </div>

          <AdminPanel
            title="Account activity timeline"
            description="Audited administrative and moderation actions."
          >
            {details.audit.length || details.moderation.length ? (
              <ol className="divide-y divide-black/8">
                {[...details.audit, ...details.moderation]
                  .sort(
                    (a, b) =>
                      Date.parse(String(b.created_at)) -
                      Date.parse(String(a.created_at)),
                  )
                  .slice(0, 50)
                  .map((item) => (
                    <li key={item.id} className="flex gap-3 px-5 py-4">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-black/5">
                        <ShieldAlert className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-black">
                          {"action" in item
                            ? String(item.action).replaceAll("_", " ")
                            : "Administrative event"}
                        </p>
                        <p className="mt-1 text-xs text-black/48">
                          {String(item.reason || "Recorded operation")}
                        </p>
                        <p className="mt-2 text-[11px] text-black/35">
                          {new Date(String(item.created_at)).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
              </ol>
            ) : (
              <AdminEmptyState
                title="No administrative timeline"
                description="No account-specific staff action has been recorded."
              />
            )}
          </AdminPanel>

          {actor.role === "super_admin" ? (
            <AdminPanel
              title="Security events"
              description="Visible only to super administrators."
            >
              {details.security.length ? (
                <div className="divide-y divide-black/8">
                  {details.security.map((event) => (
                    <div key={event.id} className="px-5 py-4">
                      <div className="flex justify-between gap-3">
                        <p className="text-sm font-black">{event.scope}</p>
                        <AdminStatusBadge
                          status={event.blocked ? "warning" : "active"}
                        />
                      </div>
                      <p className="mt-2 text-xs text-black/45">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="No security events"
                  description="No rate-limit or security events are recorded for this user."
                />
              )}
            </AdminPanel>
          ) : null}
        </div>

        <aside className="space-y-4">
          <AdminPanel
            title="Account actions"
            description="Every sensitive action requires a reason and creates an audit event."
          >
            <div className="flex flex-wrap gap-2 p-4">
              {canManageTarget && profile.account_status === "active" ? (
                <>
                  <AdminActionDialog
                    kind="user_suspend"
                    targetId={profile.id}
                    label="Suspend"
                    title="Suspend account"
                    description="The user will immediately lose access until manually reactivated."
                    tone="danger"
                  />
                  <AdminActionDialog
                    kind="user_suspend_until"
                    targetId={profile.id}
                    label="Temporary suspension"
                    title="Temporarily suspend account"
                    description="Access resumes after the selected UTC date and time."
                    tone="danger"
                    valueLabel="Suspension end"
                    valueType="datetime-local"
                  />
                </>
              ) : null}
              {canManageTarget && profile.account_status === "suspended" ? (
                <AdminActionDialog
                  kind="user_reactivate"
                  targetId={profile.id}
                  label="Reactivate"
                  title="Reactivate account"
                  description="Restore account access after reviewing the suspension reason."
                  tone="success"
                />
              ) : null}
              {canManageTarget ? (
                <AdminActionDialog
                  kind="user_reset_rate_limit"
                  targetId={profile.id}
                  label="Reset rate limit"
                  title="Reset application rate limit"
                  description="Record a reset marker for this user's application-level limits."
                  valueLabel="Limit scope"
                  valuePlaceholder="all"
                />
              ) : null}
              {canManageTarget ? (
                <AdminActionDialog
                  kind="user_request_anonymization"
                  targetId={profile.id}
                  label="Request anonymization"
                  title="Request account anonymization"
                  description="Create a tracked privacy request. Retained integrity records are anonymized rather than silently removed."
                  tone="danger"
                />
              ) : null}
              {canManageTarget ? (
                <AdminActionDialog
                  kind="user_request_deletion"
                  targetId={profile.id}
                  label="Request deletion"
                  title="Request account deletion"
                  description="Create a formal deletion workflow with an audit trail."
                  tone="danger"
                />
              ) : null}
              {actor.role === "super_admin" && !isSelf ? (
                <AdminActionDialog
                  kind="user_change_role"
                  targetId={profile.id}
                  label="Change role"
                  title="Change staff role"
                  description="Only a super administrator can change roles. This may grant or remove administrative access immediately."
                  tone="danger"
                  valueLabel="New role"
                  valueOptions={[
                    { label: "User", value: "user" },
                    { label: "Sub-admin", value: "sub_admin" },
                    { label: "Administrator", value: "admin" },
                    { label: "Super administrator", value: "super_admin" },
                  ]}
                />
              ) : null}
              {!canManageTarget ? (
                <p className="text-xs leading-5 text-black/48">
                  Only a super administrator can manage another staff account.
                </p>
              ) : null}
              {isSelf ? (
                <p className="text-xs leading-5 text-black/48">
                  You cannot change your own role.
                </p>
              ) : null}
            </div>
          </AdminPanel>

          <AdminPanel title="Private admin note">
            <form action={addAdminNoteAction} className="p-4">
              <input type="hidden" name="targetType" value="user" />
              <input type="hidden" name="targetId" value={profile.id} />
              <input
                type="hidden"
                name="returnTo"
                value={`/admin/users/${profile.id}`}
              />
              <label htmlFor="admin-user-note" className="text-xs font-black">
                Internal note
              </label>
              <textarea
                id="admin-user-note"
                name="body"
                required
                minLength={2}
                maxLength={4000}
                rows={5}
                className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                placeholder="Operational context for other administrators."
              />
              <button className="mt-3 min-h-10 w-full rounded-full bg-ink px-4 text-sm font-black text-white">
                Add private note
              </button>
            </form>
          </AdminPanel>

          <AdminPanel title="Internal notes">
            {details.notes.length ? (
              <div className="divide-y divide-black/8">
                {details.notes.map((note) => (
                  <div key={note.id} className="px-4 py-4">
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
                description="Private account notes will appear here."
              />
            )}
          </AdminPanel>
        </aside>
      </div>
    </>
  );
}
