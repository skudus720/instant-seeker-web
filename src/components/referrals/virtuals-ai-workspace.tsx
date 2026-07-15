"use client";

import {
  AlertCircle,
  Plus,
  ScanSearch,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import {
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { TeamSelectionResult } from "@/components/referrals/team-selection-result";
import { normalizeForTransientAnalysis } from "@/lib/analysis/client-image";
import type { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { validateUploadMetadata } from "@/lib/validation/upload";

type WorkspaceStage = "idle" | "ready" | "preparing" | "analyzing" | "done";

const processingSteps = [
  "Preparing screenshot",
  "Reading visible fixtures",
  "Estimating outcome probabilities",
  "Selecting supported teams",
] as const;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) =>
    window.setTimeout(resolve, milliseconds),
  );
}

export function VirtualsAiWorkspace({ demoMode }: { demoMode: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<WorkspaceStage>("idle");
  const [progress, setProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const chooseFile = (selected?: File) => {
    if (!selected) return;
    const validation = validateUploadMetadata({
      name: selected.name,
      size: selected.size,
      type: selected.type,
    });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Choose a valid image.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
    setProgress(0);
    setProcessingStep(0);
    setStage("ready");
  };

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setProgress(0);
    setProcessingStep(0);
    setStage("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const resetWorkspace = () => {
    setResult(null);
    setProgress(0);
    setProcessingStep(0);
    setStage("idle");
    setError(null);
  };

  const analyze = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!file || stage === "preparing" || stage === "analyzing") return;

    const animationStartedAt = Date.now();
    setError(null);
    setResult(null);
    setStage("preparing");
    setProgress(10);
    setProcessingStep(0);

    const progressTimer = window.setInterval(
      () => setProgress((value) => Math.min(value + 4, 88)),
      220,
    );
    const stepTimer = window.setInterval(
      () =>
        setProcessingStep((value) =>
          Math.min(value + 1, processingSteps.length - 1),
        ),
      820,
    );

    try {
      const uploadFile = await normalizeForTransientAnalysis(file).catch(
        () => file,
      );
      const formData = new FormData();
      formData.append("screenshot", uploadFile);
      formData.append("riskPreference", "balanced");
      formData.append("responseMode", "team-selections");
      if (notes.trim()) formData.append("visibleFixtureNotes", notes.trim());

      setStage("analyzing");
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        result?: AnalysisResult;
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error || "Analysis could not be completed.");
      }

      const remainingSequenceTime = Math.max(
        0,
        3_200 - (Date.now() - animationStartedAt),
      );
      await delay(remainingSequenceTime);
      setProcessingStep(processingSteps.length - 1);
      setProgress(100);
      await delay(360);
      setResult(payload.result);
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
      setNotes("");
      if (inputRef.current) inputRef.current.value = "";
      setStage("done");
      window.setTimeout(() => resultRef.current?.focus(), 80);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Analysis failed safely. Try another screenshot.",
      );
      setStage("ready");
    } finally {
      window.clearInterval(progressTimer);
      window.clearInterval(stepTimer);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = Array.from(event.clipboardData.files).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!image) return;
    event.preventDefault();
    chooseFile(image);
  };

  const handleDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  };

  const busy = stage === "preparing" || stage === "analyzing";

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-73px)] w-full max-w-[760px] flex-col px-4 sm:px-7">
      <section
        className={cn(
          "flex flex-1 justify-center",
          result || busy
            ? "items-start py-7 sm:py-10"
            : "items-center py-10 sm:py-14",
        )}
        aria-live="polite"
      >
        {result ? (
          <div
            ref={resultRef}
            tabIndex={-1}
            className="virtuals-ai-result w-full max-w-xl scroll-mt-24 outline-none"
          >
            <TeamSelectionResult result={result} onReset={resetWorkspace} />
          </div>
        ) : busy && file && preview ? (
          <div className="virtuals-ai-processing w-full max-w-sm pt-2 sm:pt-6">
            <div className="virtuals-ai-processing-preview relative mx-auto aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-lg border border-signal/25 bg-[#111113] shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
              <Image
                src={preview}
                alt="Screenshot being analyzed"
                fill
                sizes="320px"
                unoptimized
                className="object-contain p-3 pb-11"
              />
              <div className="absolute inset-x-0 bottom-0 min-h-9 overflow-hidden bg-signal px-3 py-2 text-xs font-black text-ink">
                <span
                  className="virtuals-ai-progress-fill absolute inset-y-0 left-0 bg-white/28"
                  style={{ width: `${progress}%` }}
                  aria-hidden="true"
                />
                <span className="relative block truncate">{file.name}</span>
              </div>
            </div>

            <div className="mt-5 min-h-40" role="status">
              <p className="text-sm font-black text-white/72">
                Generating team selections...
              </p>
              <ol className="mt-4 grid gap-2.5">
                {processingSteps.slice(0, processingStep + 1).map((step) => (
                  <li
                    key={step}
                    className="virtuals-ai-status-line flex items-center gap-2 text-xs font-semibold text-white/46"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-signal shadow-[0_0_10px_rgba(255,202,39,0.5)]" />
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div className="virtuals-ai-intro max-w-2xl text-center">
            <span className="virtuals-ai-mark mx-auto grid size-14 place-items-center rounded-lg border border-white/12 bg-[#171719] text-signal sm:size-16">
              <ScanSearch className="size-6 sm:size-7" aria-hidden="true" />
            </span>
            <h1 className="mt-7 text-4xl leading-tight font-black text-white sm:text-6xl">
              What would you like to{" "}
              <span className="block text-signal sm:inline">analyze?</span>
            </h1>
            <p className="virtuals-ai-subtitle mx-auto mt-5 max-w-xl text-sm leading-7 text-white/55 sm:text-lg">
              {demoMode
                ? "Upload a virtual-match screenshot to preview the report format. Demo mode does not generate real team selections."
                : "Upload a screenshot of visible virtual matches. Virtuals AI will return concise probability-based team selections."}
            </p>
          </div>
        )}
      </section>

      {!result && !busy ? (
        <div className="sticky bottom-0 z-10 bg-[linear-gradient(to_top,#080808_76%,transparent)] pt-7 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <form
            className={cn(
              "virtuals-ai-composer mx-auto max-w-2xl rounded-[28px] border bg-[#171719] p-2.5",
              dragging ? "border-signal/70" : "border-white/12",
            )}
            onSubmit={analyze}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setDragging(false);
            }}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              id="virtuals-ai-screenshot"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Upload virtual-match screenshot"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />

            {file && preview ? (
              <div className="virtuals-ai-attachment mb-3 overflow-hidden rounded-[20px] border border-white/10 bg-black/22">
                <div className="relative h-44 bg-[#0d0d0f] sm:h-52">
                  <Image
                    src={preview}
                    alt="Selected virtual-match screenshot preview"
                    fill
                    sizes="(max-width: 640px) 90vw, 640px"
                    unoptimized
                    className="object-contain p-2"
                  />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="referral-interactive absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-rose-600 text-white shadow-[0_8px_22px_rgba(190,18,60,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    aria-label="Remove selected screenshot"
                    title="Remove selected screenshot"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="truncate text-xs font-black text-white/72">
                    {file.name}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-white/35">
                    Add optional visible fixture notes below, then send.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="referral-interactive grid size-12 shrink-0 place-items-center rounded-full text-signal hover:bg-white/7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                aria-label="Add screenshot"
                title="Add screenshot"
              >
                <Plus className="size-6" aria-hidden="true" />
              </button>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                onPaste={handlePaste}
                rows={1}
                maxLength={1200}
                placeholder={
                  file
                    ? "Add visible fixture notes"
                    : "Message or paste a screenshot"
                }
                aria-label="Visible fixture notes"
                aria-describedby="virtuals-ai-composer-help"
                className="max-h-28 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-1 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/35 sm:text-base"
              />
              <button
                type="submit"
                disabled={!file}
                className="referral-interactive grid size-12 shrink-0 place-items-center rounded-full bg-signal text-ink shadow-[0_8px_24px_rgba(255,202,39,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-white/25 disabled:shadow-none"
                aria-label="Analyze screenshot"
                title={file ? "Analyze screenshot" : "Add a screenshot first"}
              >
                <Send className="size-5" aria-hidden="true" />
              </button>
            </div>
          </form>

          <p
            id="virtuals-ai-composer-help"
            className="mx-auto mt-3 flex max-w-2xl items-start justify-center gap-2 px-4 text-center text-[11px] leading-5 text-white/38"
          >
            <ShieldCheck
              className="mt-0.5 size-3.5 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
            Processed once and discarded. Results are estimates, not guarantees.
          </p>

          {error ? (
            <div
              className="mx-auto mt-3 flex max-w-2xl items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
              role="alert"
            >
              <AlertCircle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
