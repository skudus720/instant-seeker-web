"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { adminMutationAction } from "@/actions/admin";
import { cn } from "@/lib/utils";

export type AdminActionKind =
  | "user_suspend"
  | "user_suspend_until"
  | "user_reactivate"
  | "user_change_role"
  | "user_reset_rate_limit"
  | "user_request_anonymization"
  | "user_request_deletion"
  | "analysis_retry"
  | "analysis_rerun"
  | "analysis_flag"
  | "analysis_confirm"
  | "analysis_false_positive"
  | "analysis_parsing_error"
  | "analysis_correction"
  | "analysis_remove_image"
  | "analysis_mark_stale_failed"
  | "review_approve"
  | "review_reject"
  | "review_hide"
  | "review_restore"
  | "review_redact"
  | "win_begin_review"
  | "win_verify"
  | "win_reject"
  | "win_request_evidence"
  | "win_publish"
  | "win_unpublish"
  | "win_revoke"
  | "win_redact"
  | "content_publish"
  | "ai_config_activate";

export function AdminActionDialog({
  kind,
  targetId,
  label,
  title,
  description,
  tone = "default",
  valueLabel,
  valueType = "text",
  valueOptions,
  valuePlaceholder,
}: {
  kind: AdminActionKind;
  targetId: string;
  label: string;
  title: string;
  description: string;
  tone?: "default" | "danger" | "success";
  valueLabel?: string;
  valueType?: "text" | "datetime-local" | "textarea";
  valueOptions?: Array<{ label: string; value: string }>;
  valuePlaceholder?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  const buttonClass = {
    default: "border-black/12 bg-white text-ink hover:bg-black/5",
    danger: "border-alert/25 bg-alert/5 text-alert hover:bg-alert/10",
    success:
      "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
  }[tone];
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(
          "admin-interactive inline-flex min-h-9 items-center justify-center rounded-full border px-3 text-xs font-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          buttonClass,
        )}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="admin-dialog m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-black/12 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/65"
      >
        <form action={adminMutationAction}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="targetId" value={targetId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5">
            <div>
              <h2 className="text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-black/52">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="admin-interactive grid size-9 shrink-0 place-items-center rounded-full hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              aria-label="Close confirmation"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-4 p-5">
            {valueLabel ? (
              <div>
                <label
                  htmlFor={`${kind}-${targetId}-value`}
                  className="text-xs font-black"
                >
                  {valueLabel}
                </label>
                {valueOptions ? (
                  <select
                    id={`${kind}-${targetId}-value`}
                    name="value"
                    required
                    className="mt-2 min-h-11 w-full rounded-md border border-black/12 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {valueOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : valueType === "textarea" ? (
                  <textarea
                    id={`${kind}-${targetId}-value`}
                    name="value"
                    required
                    maxLength={12000}
                    rows={5}
                    placeholder={valuePlaceholder}
                    className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  />
                ) : (
                  <input
                    id={`${kind}-${targetId}-value`}
                    name="value"
                    type={valueType}
                    required
                    placeholder={valuePlaceholder}
                    className="mt-2 min-h-11 w-full rounded-md border border-black/12 px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  />
                )}
              </div>
            ) : null}
            <div>
              <label
                htmlFor={`${kind}-${targetId}-reason`}
                className="text-xs font-black"
              >
                Required administrative reason
              </label>
              <textarea
                id={`${kind}-${targetId}-reason`}
                name="reason"
                required
                minLength={5}
                maxLength={1000}
                rows={4}
                placeholder="Record the evidence and reason for this action."
                className="mt-2 w-full rounded-md border border-black/12 px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
              <p className="mt-2 text-xs text-black/42">
                The reason is stored in append-only audit history.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-black/10 bg-black/[0.02] p-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="admin-interactive min-h-10 rounded-full border border-black/12 bg-white px-4 text-sm font-bold hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(
                "admin-interactive min-h-10 rounded-full px-4 text-sm font-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                tone === "danger" ? "bg-alert text-white" : "bg-ink text-white",
              )}
            >
              Confirm action
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function AdminNotice({
  result,
  message,
}: {
  result?: string;
  message?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (!result || !message) return null;
  const success = result === "success";
  const dismiss = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("admin_result");
    next.delete("admin_message");
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
  };
  return (
    <div
      role={success ? "status" : "alert"}
      className={cn(
        "admin-notice mt-5 flex items-start gap-3 rounded-lg border p-4 text-sm",
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900",
      )}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <p className="flex-1 font-bold">{message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="admin-interactive grid size-7 place-items-center rounded-full hover:bg-black/5"
        aria-label="Dismiss status message"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function AdminExportDialog({
  action,
  label,
  title,
  description,
}: {
  action: string;
  label: string;
  title: string;
  description: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fieldId = `export-reason-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="admin-interactive inline-flex min-h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-black hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="admin-dialog m-auto w-[min(30rem,calc(100%-2rem))] rounded-lg border border-black/12 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/65"
      >
        <form action={action} method="get">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5">
            <div>
              <h2 className="text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-black/52">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close export dialog"
              className="admin-interactive grid size-9 shrink-0 place-items-center rounded-full hover:bg-black/5"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="p-5">
            <label className="text-xs font-black" htmlFor={fieldId}>
              Required export reason
            </label>
            <textarea
              id={fieldId}
              name="reason"
              required
              minLength={5}
              maxLength={1000}
              rows={4}
              className="mt-2 w-full rounded-md border border-black/12 p-3 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-black/10 p-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="admin-interactive min-h-10 rounded-full border border-black/10 bg-white px-4 text-sm font-bold hover:bg-black/5"
            >
              Cancel
            </button>
            <button className="admin-interactive min-h-10 rounded-full bg-ink px-4 text-sm font-black text-white hover:bg-graphite">
              Generate export
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
