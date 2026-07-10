"use client";

import {
  AlertCircle,
  ImagePlus,
  LoaderCircle,
  Replace,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnalysisResultCard } from "@/components/analysis/analysis-result-card";
import type { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { validateUploadMetadata } from "@/lib/validation/upload";

type Stage =
  "idle" | "ready" | "uploading" | "analyzing" | "complete" | "error";

async function normalizeForPrivateUpload(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2_000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.86),
    );
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "screenshot";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export function ScreenshotUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
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
    setStage("uploading");
    setProgress(12);
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(value + 4, 68)),
      250,
    );
    try {
      const uploadFile = await normalizeForPrivateUpload(file).catch(
        () => file,
      );
      const formData = new FormData();
      formData.append("screenshot", uploadFile);
      setStage("analyzing");
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        result?: AnalysisResult;
        error?: string;
      };
      if (!response.ok || !payload.result)
        throw new Error(payload.error || "Analysis failed.");
      setProgress(100);
      setResult(payload.result);
      setStage("complete");
      window.setTimeout(() => resultRef.current?.focus(), 50);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Analysis failed safely. Try again.",
      );
      setStage("error");
    } finally {
      window.clearInterval(timer);
    }
  };

  const busy = stage === "uploading" || stage === "analyzing";
  return (
    <div>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border-2 border-dashed bg-white transition-colors",
          dragging ? "border-[#b89500] bg-[#fff9d9]" : "border-black/18",
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
            <div className="relative min-h-72 border-b border-black/10 bg-[#111] md:border-r md:border-b-0">
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
                <p className="mt-3 font-black break-all text-[#090909]">
                  {file.name}
                </p>
                <p className="mt-2 text-sm text-black/48">
                  {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                  {file.type.replace("image/", "").toUpperCase()}
                </p>
              </div>
              {busy ? (
                <div className="mt-8" aria-live="polite">
                  <div className="flex items-center justify-between text-xs font-bold text-black/55">
                    <span>
                      {stage === "uploading"
                        ? "Uploading securely"
                        : "Generating analysis"}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
                    <div
                      className="h-full rounded-full bg-[#d2ae00] transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={analyze}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#090909] px-5 py-3 font-black text-white hover:bg-black/82 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909]"
                  >
                    <UploadCloud
                      className="size-4 text-[#ffd400]"
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
            className="grid min-h-80 cursor-pointer place-items-center px-6 py-12 text-center focus-within:outline-2 focus-within:outline-offset-[-4px] focus-within:outline-[#090909]"
          >
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-md bg-[#090909] text-[#ffd400]">
                <ImagePlus className="size-6" aria-hidden="true" />
              </span>
              <span className="mt-5 block text-lg font-black text-[#090909]">
                Drop a match screenshot here
              </span>
              <span className="mt-2 block text-sm leading-6 text-black/48">
                or choose a JPG, PNG, or WebP image up to 10 MB
              </span>
              <span className="mt-5 inline-flex rounded-md border border-black/18 px-4 py-2 text-sm font-bold text-[#090909]">
                Choose image
              </span>
            </div>
          </label>
        )}
      </div>
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
          Keep this page open while the screenshot is processed.
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
