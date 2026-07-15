import {
  AlertTriangle,
  Clock3,
  FileSearch,
  Gauge,
  ScanText,
} from "lucide-react";
import { ConfidenceBadge, RiskBadge } from "@/components/ui/risk-badge";
import type { AnalysisResult, MatchSource } from "@/lib/types";
import { cn } from "@/lib/utils";

function probabilityDisplay(probability: number) {
  return Math.max(0, Math.min(100, Math.round(probability * 20) * 5));
}

const matchSourceLabel: Record<MatchSource, string> = {
  "model-extracted": "Model-extracted",
  "user-provided": "User-provided context",
  demo: "Demo sample",
};

export function AnalysisResultCard({
  result,
  compact = false,
}: {
  result: AnalysisResult;
  compact?: boolean;
}) {
  return (
    <article
      className="overflow-hidden rounded-lg border border-black/12 bg-white"
      aria-labelledby={`analysis-${result.id}`}
    >
      <header
        className={cn(
          "border-b border-black/8 bg-ink text-white",
          compact ? "p-5" : "p-6 sm:p-8",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span
              className={
                result.label === "Demonstration analysis"
                  ? "inline-flex rounded-full border border-signal/45 bg-signal/10 px-3 py-1 text-xs font-black text-signal"
                  : "inline-flex rounded-full border border-emerald-300/45 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200"
              }
            >
              {result.label}
            </span>
            <h2
              id={`analysis-${result.id}`}
              className="mt-4 text-2xl font-black"
            >
              Analysis report
            </h2>
          </div>
          <p className="flex items-center gap-2 text-xs text-white/45">
            <Clock3 className="size-4" aria-hidden="true" />
            <time dateTime={result.createdAt}>
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(result.createdAt))}
            </time>
          </p>
        </div>
        {result.label === "Demonstration analysis" ? (
          <p className="mt-5 border-l-2 border-signal pl-4 text-sm leading-6 text-white/65">
            This output demonstrates the report format. It did not read or
            predict fixtures from your screenshot.
          </p>
        ) : null}
      </header>
      <div className={compact ? "p-5" : "p-6 sm:p-8"}>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-black/48">
          <span className="inline-flex items-center gap-2">
            <FileSearch className="size-4" aria-hidden="true" />
            {result.detectedMatches.length} detected row
            {result.detectedMatches.length === 1 ? "" : "s"}
          </span>
          <span>
            Screenshot quality:{" "}
            <strong className="text-black capitalize">
              {result.screenshotQuality}
            </strong>
          </span>
        </div>
        {result.summary ? (
          <div className="mt-6 grid gap-px overflow-hidden rounded-md border border-black/10 bg-black/10 sm:grid-cols-3">
            <div className="bg-paper p-4">
              <p className="flex items-center gap-2 text-xs font-black text-black/42 uppercase">
                <Gauge className="size-4" aria-hidden="true" />
                Risk posture
              </p>
              <p className="mt-2 font-black text-ink capitalize">
                {result.summary.riskPosture}
              </p>
            </div>
            <div className="bg-paper p-4 sm:col-span-2">
              <p className="text-xs font-black text-black/42 uppercase">
                Report signal
              </p>
              <p className="mt-2 text-sm leading-6 font-semibold text-black/62">
                {result.summary.overallSignal}. {result.summary.decisionNote}
              </p>
            </div>
          </div>
        ) : null}
        <div className="mt-6 grid gap-4">
          {result.detectedMatches.map((match) => {
            const probability = probabilityDisplay(match.estimatedProbability);
            return (
              <section
                key={match.id}
                className="rounded-md border border-black/10 bg-paper p-5"
                aria-label={match.fixture}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-ink">{match.fixture}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-black/44">
                        {match.visibleMarket}
                      </p>
                      {match.source ? (
                        <span className="rounded-full border border-black/12 bg-white px-2 py-0.5 text-[11px] font-black text-black/48">
                          {matchSourceLabel[match.source]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ConfidenceBadge level={match.confidence} />
                    <RiskBadge level={match.risk} />
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-black/42 uppercase">
                        Estimated probability
                      </p>
                      <p className="mt-1 text-sm font-black text-ink">
                        {match.predictedCategory}
                      </p>
                    </div>
                    <p className="text-xl font-black text-ink tabular-nums">
                      ~{probability}%
                    </p>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-black/8"
                    role="img"
                    aria-label={`Estimated probability approximately ${probability} percent`}
                  >
                    <div
                      className="h-full rounded-full bg-signal-ink"
                      style={{ width: `${probability}%` }}
                    />
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-black/58">
                  {match.explanation}
                </p>
              </section>
            );
          })}
        </div>
        {result.parsingWarnings.length > 0 ? (
          <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <p className="flex items-center gap-2 text-sm font-black">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Parsing and quality notes
            </p>
            <ul className="mt-3 grid gap-2 text-sm leading-5">
              {result.parsingWarnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {result.extractedVisibleText.length > 0 ? (
          <details className="mt-6 border-t border-black/10 pt-5">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-ink">
              <ScanText className="size-4" aria-hidden="true" />
              Extracted visible text
            </summary>
            <ul className="mt-3 grid gap-2 text-sm text-black/55">
              {result.extractedVisibleText.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </details>
        ) : null}
        <p className="mt-7 border-t border-black/10 pt-5 text-xs leading-5 font-semibold text-black/48">
          {result.disclaimer}
        </p>
      </div>
    </article>
  );
}
