"use client";

import { Check, Clipboard } from "lucide-react";
import { useState } from "react";

export function DiagnosticCopy({
  diagnostic,
}: {
  diagnostic: Record<string, unknown>;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-black hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
      {copied ? "Copied" : "Copy sanitized diagnostic"}
    </button>
  );
}
