import { describe, expect, it } from "vitest";
import {
  parseSportyBetVirtualsText,
  selectWinningTeam,
} from "@/lib/analysis/sportybet-virtuals-parser";

const sampleOcr = `
mci vs wu {J 1.74 3.38 5.58
ESP vs ALA 2.70 2.92 2.97
ovl vs ELC 1.88 3.36 4.52
BIL vs ver 3.17 2.76 2.68
GET vsRMA 3.75 2.57 2.54
sev vs rso 2.69 3.00 2.90
`;

describe("parseSportyBetVirtualsText", () => {
  it("extracts Instant Virtuals fixtures and favorite win picks", () => {
    const matches = parseSportyBetVirtualsText(sampleOcr);
    expect(matches.map((match) => match.fixture)).toEqual([
      "MCI vs WHU",
      "ESP vs ALA",
      "OVI vs ELC",
      "BIL vs VCF",
      "GET vs RMA",
      "SEV vs RSO",
    ]);
    expect(matches.map((match) => match.selectedTeam)).toEqual([
      "MCI",
      "ESP",
      "OVI",
      "VCF",
      "RMA",
      "SEV",
    ]);
  });

  it("selects the lower-priced 1/2 side", () => {
    expect(selectWinningTeam("MCI", "WHU", 1.74, 5.58)).toBe("MCI");
    expect(selectWinningTeam("BIL", "VCF", 3.17, 2.68)).toBe("VCF");
  });

  it("parses multiline SportyBet OCR with odds on following lines", () => {
    const matches = parseSportyBetVirtualsText(`
mci vs wu {J
1.74
3.38
5.58
ESP vs ALA
2.70
2.92
2.97
ovl vs ELC
1.88
3.36
4.52
BIL vs ver
3.17
2.76
2.68
GET vsRMA
3.75
2.57
2.54
sev vs rso
2.69
3.00
2.90
`);
    expect(matches.map((match) => match.selectedTeam)).toEqual([
      "MCI",
      "ESP",
      "OVI",
      "VCF",
      "RMA",
      "SEV",
    ]);
  });
});
