"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ReferralError({ reset }: { reset: () => void }) {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white"
    >
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-md border border-rose-400/20 bg-rose-400/10 text-rose-300">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-black">
          Referral data could not load
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/50">
          Your accounting records were not changed. Retry the secure dashboard
          request.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-signal px-5 text-sm font-black text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> Retry
        </button>
      </div>
    </main>
  );
}
