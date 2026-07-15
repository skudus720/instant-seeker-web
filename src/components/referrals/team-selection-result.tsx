import { Check, RotateCcw } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";

export function TeamSelectionResult({
  result,
  onReset,
}: {
  result: AnalysisResult;
  onReset?: () => void;
}) {
  const isDemo = result.label === "Demonstration analysis";
  const selections = result.detectedMatches.flatMap((match) =>
    match.selectedTeam ? [match.selectedTeam] : [],
  );

  return (
    <article aria-labelledby={`team-selections-${result.id}`}>
      <header className="border-b border-white/10 pb-5">
        <span
          className={
            isDemo
              ? "inline-flex rounded-full border border-signal/35 bg-signal/8 px-3 py-1 text-[11px] font-black text-signal"
              : "inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/8 px-3 py-1 text-[11px] font-black text-emerald-200"
          }
        >
          {result.label}
        </span>
        <h2
          id={`team-selections-${result.id}`}
          className="mt-3 text-2xl font-black text-white sm:text-3xl"
        >
          Matches to win
        </h2>
        {isDemo ? (
          <p className="mt-3 text-sm font-bold text-white/55">
            Demonstration selections — format preview only.
          </p>
        ) : (
          <p className="mt-3 text-sm font-bold text-white/55">
            AI-chosen teams from the analyzed screenshot.
          </p>
        )}
      </header>

      {selections.length ? (
        <ol className="virtuals-ai-team-list mt-2 divide-y divide-white/8">
          {selections.map((team, index) => (
            <li
              key={`${team}-${index}`}
              className="flex min-h-20 items-center gap-4 py-5"
            >
              <span className="text-xs font-black text-white/32 tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-signal text-ink">
                <Check className="size-4" aria-hidden="true" />
              </span>
              <strong className="min-w-0 text-lg font-black break-words text-white">
                {team}
              </strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 text-sm font-bold text-white/55">
          {isDemo
            ? "No demonstration selections were generated for this preview."
            : "No team met the analysis threshold."}
        </p>
      )}

      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="referral-interactive mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-xs font-black text-white/72 hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Analyze another screenshot
        </button>
      ) : null}
    </article>
  );
}