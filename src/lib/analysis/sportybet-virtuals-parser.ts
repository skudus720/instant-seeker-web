export interface ParsedVirtualMatch {
  home: string;
  away: string;
  fixture: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  selectedTeam: string;
  estimatedProbability: number;
}

const LEAGUE_WORDS = new Set([
  "SPAIN",
  "ENGLAND",
  "ITALY",
  "FRANCE",
  "GERMANY",
  "PORTUGAL",
  "NETHERLANDS",
  "TURKEY",
  "BRAZIL",
  "MEXICO",
  "USA",
  "UCL",
  "UEL",
  "LIVE",
  "DRAW",
  "HOME",
  "AWAY",
  "ODDS",
  "PLUS",
  "VS",
]);

/** Common Instant Virtuals OCR repairs for short club codes. */
const TEAM_CODE_CORRECTIONS: Record<string, string> = {
  MCL: "MCI",
  MCl: "MCI",
  WU: "WHU",
  WH: "WHU",
  WHV: "WHU",
  OVL: "OVI",
  OVIY: "OVI",
  VER: "VCF",
  VCE: "VCF",
  VCR: "VCF",
  RSOO: "RSO",
  RSQ: "RSO",
};

function clampProbability(value: number) {
  return Math.min(0.72, Math.max(0.42, value));
}

function impliedWinProbability(
  homeOdds: number,
  awayOdds: number,
  pick: "home" | "away",
) {
  const homeImplied = 1 / homeOdds;
  const awayImplied = 1 / awayOdds;
  const total = homeImplied + awayImplied;
  const raw = pick === "home" ? homeImplied / total : awayImplied / total;
  return clampProbability(raw);
}

export function selectWinningTeam(
  home: string,
  away: string,
  homeOdds: number,
  awayOdds: number,
) {
  return homeOdds <= awayOdds ? home : away;
}

export function normalizeOcrText(rawText: string) {
  return rawText
    .replace(/\r/g, "\n")
    .replace(/([A-Za-z]{2,4})vs([A-Za-z]{2,4})/gi, "$1 vs $2")
    .replace(/vs(?=[A-Za-z])/gi, "vs ")
    .replace(/([A-Za-z])vs\b/gi, "$1 vs")
    .replace(/[|{}()[\]@&§©®™’'·—–_]+/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function correctTeamCode(code: string) {
  const upper = code.toUpperCase();
  return TEAM_CODE_CORRECTIONS[upper] || upper;
}

function isPlausibleTeamCode(code: string) {
  return (
    /^[A-Z]{2,4}$/.test(code) &&
    !LEAGUE_WORDS.has(code) &&
    !/^K{2,}$/.test(code) &&
    !/^H{2,}$/.test(code) &&
    !/^A{2,}$/.test(code)
  );
}

function isPlausibleOdds(value: number) {
  return Number.isFinite(value) && value >= 1.01 && value <= 80;
}

function pushMatch(
  matches: ParsedVirtualMatch[],
  seen: Set<string>,
  homeRaw: string,
  awayRaw: string,
  homeOdds: number,
  drawOdds: number,
  awayOdds: number,
) {
  const home = correctTeamCode(homeRaw);
  const away = correctTeamCode(awayRaw);
  if (!isPlausibleTeamCode(home) || !isPlausibleTeamCode(away) || home === away) {
    return;
  }
  if (
    !isPlausibleOdds(homeOdds) ||
    !isPlausibleOdds(drawOdds) ||
    !isPlausibleOdds(awayOdds)
  ) {
    return;
  }
  const fixture = `${home} vs ${away}`;
  const key = fixture.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  const selectedTeam = selectWinningTeam(home, away, homeOdds, awayOdds);
  matches.push({
    home,
    away,
    fixture,
    homeOdds,
    drawOdds,
    awayOdds,
    selectedTeam,
    estimatedProbability: impliedWinProbability(
      homeOdds,
      awayOdds,
      selectedTeam === home ? "home" : "away",
    ),
  });
}

/**
 * Parse SportyBet Instant Virtuals OCR / typed text into fixtures + win picks.
 */
export function parseSportyBetVirtualsText(rawText: string): ParsedVirtualMatch[] {
  const normalized = normalizeOcrText(rawText);
  if (!normalized) return [];

  const matches: ParsedVirtualMatch[] = [];
  const seen = new Set<string>();
  const upper = normalized.toUpperCase();

  // Allow odds on the same or following lines after "HOME vs AWAY".
  const vsPattern =
    /\b([A-Z]{2,4})\s+VS\.?\s+([A-Z]{2,4})\b[\s\S]{0,90}?(\d{1,2}\.\d{2})\s+(\d{1,2}\.\d{2})\s+(\d{1,2}\.\d{2})/g;
  for (const hit of upper.matchAll(vsPattern)) {
    pushMatch(
      matches,
      seen,
      hit[1] || "",
      hit[2] || "",
      Number(hit[3]),
      Number(hit[4]),
      Number(hit[5]),
    );
  }

  if (matches.length >= 2) return matches.slice(0, 20);

  const flatPattern =
    /\b([A-Z]{2,4})\b(?:\s+[^\dA-Z]{0,16})?\b([A-Z]{2,4})\b(?:[^\d]{0,28})(\d{1,2}\.\d{2})\s+(\d{1,2}\.\d{2})\s+(\d{1,2}\.\d{2})/g;
  for (const hit of upper.matchAll(flatPattern)) {
    pushMatch(
      matches,
      seen,
      hit[1] || "",
      hit[2] || "",
      Number(hit[3]),
      Number(hit[4]),
      Number(hit[5]),
    );
  }

  return matches.slice(0, 20);
}
