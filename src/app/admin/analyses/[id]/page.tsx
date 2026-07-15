import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, FileJson, ImageOff } from "lucide-react";
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
import { getAnalysisDetails } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Analysis details" };

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="border-b border-black/8 last:border-b-0">
      <summary className="cursor-pointer px-5 py-4 text-sm font-black hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink">
        {label}
      </summary>
      <pre className="max-h-[32rem] overflow-auto border-t border-black/8 bg-[#111] p-5 text-xs leading-6 text-white/75">
        {JSON.stringify(value ?? null, null, 2)}
      </pre>
    </details>
  );
}

export default async function AdminAnalysisDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin_result?: string; admin_message?: string }>;
}) {
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const details = await getAnalysisDetails(id);
  if (!details) notFound();
  const analysis = details.analysis;
  const profile = Array.isArray(analysis.profiles)
    ? analysis.profiles[0]
    : analysis.profiles;
  return (
    <>
      <Link
        href="/admin/analyses"
        className="mb-5 inline-flex items-center gap-2 text-xs font-black text-black/55 hover:text-black"
      >
        <ArrowLeft className="size-4" /> Back to analyses
      </Link>
      <AdminPageHeader
        eyebrow="Analysis inspection"
        title={`Analysis ${String(analysis.id).slice(0, 8)}`}
        description="Original provider output, validated results, processing telemetry, quality review, and an immutable administrative timeline. Corrections never replace the original result."
        actions={
          <>
            <a
              href={`/api/admin/evidence/analysis?id=${analysis.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-black hover:bg-black/5"
            >
              <ExternalLink className="size-4" /> View signed screenshot
            </a>
            <AdminExportDialog
              action={`/api/admin/analyses/${analysis.id}/diagnostic`}
              label="Sanitized diagnostic"
              title="Generate diagnostic export"
              description="Export redacted processing data without private paths, account details, tokens, or provider credentials. The export is audited."
            />
          </>
        }
      />
      <AdminNotice
        result={notice.admin_result}
        message={notice.admin_message}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <AdminPanel title="Processing overview">
            <dl className="grid gap-5 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-bold text-black/42">User</dt>
                <dd className="mt-1 font-black">
                  {String(profile?.display_name || "Member")}
                </dd>
                <dd className="mt-1 text-xs text-black/40">
                  {String(profile?.email || "")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Status</dt>
                <dd className="mt-1">
                  <AdminStatusBadge status={String(analysis.status)} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">
                  Admin review
                </dt>
                <dd className="mt-1">
                  <AdminStatusBadge
                    status={String(analysis.admin_review_status)}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">
                  Confidence band
                </dt>
                <dd className="mt-1">
                  {analysis.overall_confidence_band ? (
                    <AdminStatusBadge
                      status={String(analysis.overall_confidence_band)}
                    />
                  ) : (
                    "Not recorded"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Provider</dt>
                <dd className="mt-1 font-black">
                  {String(analysis.provider || "unknown")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Model</dt>
                <dd className="mt-1 font-black break-all">
                  {String(analysis.model_identifier || "Not recorded")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Created</dt>
                <dd className="mt-1 font-black">
                  {new Date(String(analysis.created_at)).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-black/42">Duration</dt>
                <dd className="mt-1 font-black">
                  {analysis.processing_duration_ms == null
                    ? "Not recorded"
                    : `${Number(analysis.processing_duration_ms)} ms`}
                </dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel
            title="Analysis data"
            description="Expand only the record needed for review."
          >
            <JsonBlock
              label="Upload metadata"
              value={analysis.upload_metadata}
            />
            <JsonBlock
              label="Extracted visible matches"
              value={analysis.extracted_matches}
            />
            <JsonBlock
              label="Original provider response"
              value={analysis.original_provider_response}
            />
            <JsonBlock
              label="Parsed and validated result"
              value={analysis.result}
            />
            <JsonBlock
              label="Separate administrator correction"
              value={analysis.admin_correction}
            />
          </AdminPanel>

          <AdminPanel
            title="User-visible result preview"
            description="This is a structural preview of the stored result; it remains probability-based and uncertain."
          >
            {analysis.result ? (
              <div className="p-5">
                <div className="rounded-lg border border-signal/40 bg-signal-soft p-4">
                  <p className="text-xs font-black text-signal-ink uppercase">
                    Estimate, not a guarantee
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/62">
                    Instant Seeker organizes visible screenshot information into
                    probability, confidence, explanation, and risk fields.
                    Outcomes remain uncertain and the member makes their own
                    responsible decision.
                  </p>
                </div>
                <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-ink p-4 text-xs leading-6 text-white/72">
                  {JSON.stringify(
                    analysis.admin_correction || analysis.result,
                    null,
                    2,
                  )}
                </pre>
              </div>
            ) : (
              <AdminEmptyState
                icon={FileJson}
                title="No validated result"
                description="A parsed user-visible result is not stored for this analysis."
              />
            )}
          </AdminPanel>

          <AdminPanel title="Errors and validation failures">
            {analysis.error_code || analysis.error_message_redacted ? (
              <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold text-black/42">
                    Error code
                  </dt>
                  <dd className="mt-1 font-mono font-black text-alert">
                    {String(analysis.error_code || "Unclassified")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-black/42">
                    Redacted detail
                  </dt>
                  <dd className="mt-1 leading-6 text-black/60">
                    {String(analysis.error_message_redacted || "No detail")}
                  </dd>
                </div>
              </dl>
            ) : (
              <AdminEmptyState
                title="No recorded errors"
                description="No redacted provider or validation failure is attached to this record."
              />
            )}
          </AdminPanel>

          <AdminPanel title="Audit timeline">
            {details.audit.length || details.retries.length ? (
              <ol className="divide-y divide-black/8">
                {[...details.audit, ...details.retries]
                  .sort(
                    (a, b) =>
                      Date.parse(String(b.created_at)) -
                      Date.parse(String(a.created_at)),
                  )
                  .map((item) => (
                    <li key={item.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black">
                          {"action" in item
                            ? String(item.action)
                            : `Retry ${String(item.status)}`}
                        </p>
                        {"status" in item ? (
                          <AdminStatusBadge status={String(item.status)} />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-black/48">
                        {String(item.reason || "Recorded operation")}
                      </p>
                      <p className="mt-2 text-[11px] text-black/35">
                        {new Date(String(item.created_at)).toLocaleString()}
                      </p>
                    </li>
                  ))}
              </ol>
            ) : (
              <AdminEmptyState
                title="No audit activity"
                description="Retries and quality actions will appear here."
              />
            )}
          </AdminPanel>

          <AdminPanel
            title="Preserved retry outputs"
            description="Retry results are stored on the retry attempt and never silently replace the original analysis output."
          >
            {details.retries.length ? (
              <div className="divide-y divide-black/8">
                {details.retries.map((retry) => (
                  <article key={retry.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-black">
                          {retry.id}
                        </p>
                        <p className="mt-2 text-xs text-black/45">
                          {retry.provider || "Provider not recorded"} ·{" "}
                          {retry.model_identifier || "Model not recorded"} ·{" "}
                          {retry.processing_duration_ms == null
                            ? "No duration"
                            : `${retry.processing_duration_ms} ms`}
                        </p>
                      </div>
                      <AdminStatusBadge status={retry.status} />
                    </div>
                    {retry.error_message_redacted ? (
                      <p className="mt-4 rounded-md bg-rose-50 p-3 text-xs text-rose-800">
                        {retry.error_message_redacted}
                      </p>
                    ) : null}
                    {retry.result ? (
                      <details className="mt-4 rounded-lg border border-black/10">
                        <summary className="cursor-pointer px-4 py-3 text-xs font-black">
                          View retry result
                        </summary>
                        <pre className="max-h-80 overflow-auto border-t border-black/10 bg-[#111] p-4 text-xs leading-6 text-white/72">
                          {JSON.stringify(retry.result, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <AdminEmptyState
                title="No retry attempts"
                description="A duplicate-safe retry or current-configuration re-run will appear here."
              />
            )}
          </AdminPanel>
        </div>

        <aside className="space-y-4">
          <AdminPanel
            title="Quality actions"
            description="Actions are reasoned, rate-limited, and audited."
          >
            <div className="flex flex-wrap gap-2 p-4">
              {analysis.private_image_path ? (
                <>
                  <AdminActionDialog
                    kind="analysis_retry"
                    targetId={analysis.id}
                    label="Retry original"
                    title="Retry failed analysis"
                    description="Queue one legacy retry, then permanently discard the retained screenshot."
                  />
                  <AdminActionDialog
                    kind="analysis_rerun"
                    targetId={analysis.id}
                    label="Re-run current model"
                    title="Re-run with active configuration"
                    description="Run the legacy screenshot with the active configuration, then permanently discard it."
                  />
                </>
              ) : (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-black/10 px-3 text-xs text-black/45">
                  <ImageOff className="size-3.5" /> Retry requires a new upload
                </span>
              )}
              <AdminActionDialog
                kind="analysis_flag"
                targetId={analysis.id}
                label="Flag"
                title="Flag for quality review"
                description="Mark this analysis for further quality review."
              />
              <AdminActionDialog
                kind="analysis_confirm"
                targetId={analysis.id}
                label="Confirm review"
                title="Confirm reviewed analysis"
                description="Record that the analysis has been manually reviewed."
                tone="success"
              />
              <AdminActionDialog
                kind="analysis_false_positive"
                targetId={analysis.id}
                label="False positive"
                title="Mark false positive"
                description="Record a quality classification without overwriting the user's original result."
                tone="danger"
              />
              <AdminActionDialog
                kind="analysis_parsing_error"
                targetId={analysis.id}
                label="Parsing error"
                title="Mark parsing error"
                description="Record a visible-text extraction or validation issue."
                tone="danger"
              />
              <AdminActionDialog
                kind="analysis_correction"
                targetId={analysis.id}
                label="Add correction"
                title="Add separate correction"
                description="Store a structured correction beside the original result. The original model output is never overwritten."
                valueLabel="Correction JSON object"
                valueType="textarea"
                valuePlaceholder={'{"summary":"Corrected parsing note"}'}
              />
              {analysis.private_image_path ? (
                <AdminActionDialog
                  kind="analysis_remove_image"
                  targetId={analysis.id}
                  label="Remove image"
                  title="Remove private screenshot"
                  description="Use only for a valid privacy request. The database reference is removed and the private storage object is deleted."
                  tone="danger"
                />
              ) : (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-black/10 px-3 text-xs text-black/45">
                  <ImageOff className="size-3.5" /> Screenshot not retained
                </span>
              )}
            </div>
          </AdminPanel>
          <AdminPanel title="Private quality note">
            <form action={addAdminNoteAction} className="p-4">
              <input type="hidden" name="targetType" value="analysis" />
              <input type="hidden" name="targetId" value={analysis.id} />
              <input
                type="hidden"
                name="returnTo"
                value={`/admin/analyses/${analysis.id}`}
              />
              <label htmlFor="analysis-note" className="text-xs font-black">
                Internal note
              </label>
              <textarea
                id="analysis-note"
                name="body"
                required
                minLength={2}
                maxLength={4000}
                rows={5}
                placeholder="Private quality-review context."
                className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm"
              />
              <button className="mt-3 min-h-10 w-full rounded-full bg-ink px-4 text-sm font-black text-white">
                Add private note
              </button>
            </form>
          </AdminPanel>
          <AdminPanel title="Quality notes">
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
                title="No quality notes"
                description="Private review notes will appear here."
              />
            )}
          </AdminPanel>
        </aside>
      </div>
    </>
  );
}
