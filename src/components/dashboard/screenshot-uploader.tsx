"use client";

import {
  AlertCircle,
  ClipboardList,
  ImagePlus,
  LoaderCircle,
  Replace,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnalysisResultCard } from "@/components/analysis/analysis-result-card";
import { normalizeForTransientAnalysis } from "@/lib/analysis/client-image";
import type { AnalysisResult, RiskPreference } from "@/lib/types";
import { cn } from "@/lib/utils";
import { validateUploadMetadata } from "@/lib/validation/upload";

type Stage =
  "idle" | "ready" | "preparing" | "analyzing" | "complete" | "error";

const riskOptions: Array<{
  value: RiskPreference;
  label: string;
  description: string;
}> = [
  {
    value: "conservative",
    label: "Conservative",
    description: "Favor steadier signals",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Mix signal and caution",
  },
  {
    value: "opportunistic",
    label: "Opportunistic",
    description: "Review wider variance",
  },
];

export function ScreenshotUploader({
  demoMode = false,
}: {
  demoMode?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [riskPreference, setRiskPreference] =
    useState<RiskPreference>("balanced");
  const [visibleFixtureNotes, setVisibleFixtureNotes] = useState("");
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
      setStage("error");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError(null);
    setResult(null);
    setProgress(0);
    setStage("ready");
  };

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyze = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    setStage("preparing");
    setProgress(12);
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(value + 4, 68)),
      250,
    );
    const abortController = new AbortController();
    const abortTimer = window.setTimeout(
      () => abortController.abort(),
      45_000,
    );
    try {
      const uploadFile = await normalizeForTransientAnalysis(file).catch(
        () => file,
      );
      const { extractVisibleTextFromScreenshot } = await import(
        "@/lib/analysis/client-ocr"
      );
      const extractedVisibleText = await extractVisibleTextFromScreenshot(
        uploadFile,
      ).catch(() => "");
      const formData = new FormData();
      formData.append("screenshot", uploadFile);
      formData.append("riskPreference", riskPreference);
      if (visibleFixtureNotes.trim()) {
        formData.append("visibleFixtureNotes", visibleFixtureNotes);
      }
      if (extractedVisibleText) {
        formData.append("extractedVisibleText", extractedVisibleText);
      }
      setStage("analyzing");
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });
      const payload = (await response.json()) as {
        result?: AnalysisResult;
        error?: string;
      };
      if (!response.ok || !payload.result)
        throw new Error(payload.error || "Analysis failed.");
      setProgress(100);
      setResult(payload.result);
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      setStage("complete");
      window.setTimeout(() => resultRef.current?.focus(), 50);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name === "AbortError"
          ? "Analysis timed out. Try a clearer crop of the match list."
          : reason instanceof Error
            ? reason.message
            : "Analysis failed safely. Try again.",
      );
      setStage("error");
    } finally {
      window.clearTimeout(abortTimer);
      window.clearInterval(timer);
    }
  };

  const busy = stage === "preparing" || stage === "analyzing";
  return (
    <div>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border-2 border-dashed bg-white transition-colors",
          dragging ? "border-signal-ink bg-signal-soft" : "border-black/18",
          busy && "pointer-events-none opacity-75",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          className="sr-only"
          id="screenshot"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        {preview && file ? (
          <div className="grid md:grid-cols-[0.85fr_1.15fr]">
            <div className="relative min-h-72 border-b border-black/10 bg-graphite md:border-r md:border-b-0">
              <Image
                src={preview}
                alt="Selected virtual-match screenshot preview"
                fill
                sizes="(max-width: 768px) 100vw, 420px"
                unoptimized
                className="object-contain p-4"
              />
            </div>
            <div className="flex min-h-72 flex-col justify-between p-6 sm:p-8">
              <div>
                <p className="text-xs font-black text-black/42 uppercase">
                  Ready to analyze
                </p>
                <p className="mt-3 font-black break-all text-ink">
                  {file.name}
                </p>
                <p className="mt-2 text-sm text-black/48">
                  {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                  {file.type.replace("image/", "").toUpperCase()}
                </p>
                <div className="mt-6 grid gap-5">
                  <fieldset disabled={busy}>
                    <legend className="flex items-center gap-2 text-xs font-black text-black/52 uppercase">
                      <SlidersHorizontal
                        className="size-4"
                        aria-hidden="true"
                      />
                      Analysis posture
                    </legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {riskOptions.map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "min-h-20 cursor-pointer rounded-md border p-3 transition-colors",
                            riskPreference === option.value
                              ? "border-signal-ink bg-signal-soft text-ink"
                              : "border-black/12 bg-white text-black/58 hover:border-black/35",
                          )}
                        >
                          <input
                            className="sr-only"
                            type="radio"
                            name="riskPreference"
                            value={option.value}
                            checked={riskPreference === option.value}
                            onChange={() => setRiskPreference(option.value)}
                          />
                          <span className="block text-sm font-black">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-xs leading-4">
                            {option.description}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div>
                    <label
                      htmlFor="visible-fixture-notes"
                      className="flex items-center gap-2 text-xs font-black text-black/52 uppercase"
                    >
                      <ClipboardList className="size-4" aria-hidden="true" />
                      Visible fixture notes
                    </label>
                    <textarea
                      id="visible-fixture-notes"
                      value={visibleFixtureNotes}
                      onChange={(event) =>
                        setVisibleFixtureNotes(event.target.value)
                      }
                      maxLength={1200}
                      rows={3}
                      disabled={busy}
                      placeholder="Optional: add visible team names or market labels from the screenshot."
                      aria-describedby="visible-fixture-notes-help"
                      className="mt-3 w-full resize-y rounded-md border border-black/14 bg-white px-3 py-3 text-sm leading-6 text-ink placeholder:text-black/35 focus:border-signal-ink focus:outline-2 focus:outline-offset-2 focus:outline-signal"
                    />
                    <p
                      id="visible-fixture-notes-help"
                      className="mt-2 text-xs leading-5 text-black/45"
                    >
                      {demoMode
                        ? "Demo mode treats these as user-provided context and still does not read the screenshot."
                        : "Only include match text visible in the screenshot; do not include personal details."}{" "}
                      {visibleFixtureNotes.length}/1200
                    </p>
                  </div>
                </div>
              </div>
              {busy ? (
                <div className="mt-8" aria-live="polite">
                  <div className="flex items-center justify-between text-xs font-bold text-black/55">
                    <span>
                      {stage === "preparing"
                        ? "Reading screenshot fixtures"
                        : "Generating analysis"}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
                    <div
                      className="h-full rounded-full bg-signal-ink transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={analyze}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white hover:bg-black/82 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <UploadCloud
                      className="size-4 text-signal"
                      aria-hidden="true"
                    />
                    Analyze screenshot
                  </button>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="grid size-11 place-items-center rounded-md border border-black/18 text-black/65 hover:border-black hover:text-black"
                    aria-label="Replace screenshot"
                    title="Replace screenshot"
                  >
                    <Replace className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="grid size-11 place-items-center rounded-md border border-black/18 text-rose-700 hover:border-rose-400"
                    aria-label="Remove screenshot"
                    title="Remove screenshot"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <label
            htmlFor="screenshot"
            className="grid min-h-80 cursor-pointer place-items-center px-6 py-12 text-center focus-within:outline-2 focus-within:outline-offset-[-4px] focus-within:outline-ink"
          >
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-md bg-ink text-signal">
                <ImagePlus className="size-6" aria-hidden="true" />
              </span>
              <span className="mt-5 block text-lg font-black text-ink">
                Drop a match screenshot here
              </span>
              <span className="mt-2 block text-sm leading-6 text-black/48">
                or choose a JPG, PNG, or WebP image up to 10 MB
              </span>
              <span className="mt-2 block text-xs font-semibold text-black/42">
                Processed once and discarded after analysis
              </span>
              <span className="mt-5 inline-flex rounded-md border border-black/18 px-4 py-2 text-sm font-bold text-ink">
                Choose image
              </span>
            </div>
          </label>
        )}
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-black/48">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-emerald-700"
          aria-hidden="true"
        />
        The screenshot is not saved to your account. Only the structured
        analysis report remains in your history.
      </p>
      {error ? (
        <div
          className="mt-4 flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}
      {busy ? (
        <p
          className="mt-4 flex items-center gap-2 text-sm font-semibold text-black/52"
          role="status"
        >
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Keep this page open while the screenshot is processed and discarded.
        </p>
      ) : null}
      {result ? (
        <div ref={resultRef} tabIndex={-1} className="mt-8 outline-none">
          <AnalysisResultCard result={result} />
        </div>
      ) : null}
    </div>
  );
}
