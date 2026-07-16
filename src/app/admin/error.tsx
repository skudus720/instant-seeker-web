"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-lg rounded-lg border border-rose-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-md bg-rose-50 text-alert">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-black">Admin data could not load</h1>
        <p className="mt-3 text-sm leading-6 text-black/52">
          The request failed without exposing private diagnostic detail. Retry
          the server-rendered view or inspect System Health.
        </p>
        {error.message &&
        /^(Unable to load|The server-side Supabase|Supabase is not configured)/i.test(
          error.message,
        ) ? (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 font-mono text-xs break-words text-rose-800">
            {error.message}
          </p>
        ) : null}
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-black/35">
            Reference {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> Retry
        </button>
      </div>
    </div>
  );
}
