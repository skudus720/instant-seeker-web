import { describe, expect, it } from "vitest";
import {
  createVisitorToken,
  hashVisitorToken,
  signReferralCookie,
  verifyReferralCookie,
} from "@/lib/referrals/cookie";

const secret = "referral-test-secret-that-is-longer-than-thirty-two-characters";
const payload = {
  attributionId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  visitorToken: createVisitorToken(),
  expiresAt: 2_000_000_000,
};

describe("signed referral attribution cookie", () => {
  it("round-trips a valid server-signed first-touch token", () => {
    const cookie = signReferralCookie(payload, secret);
    expect(verifyReferralCookie(cookie, secret, 1_900_000_000_000)).toEqual(
      payload,
    );
  });

  it("rejects tampering", () => {
    const cookie = signReferralCookie(payload, secret);
    expect(
      verifyReferralCookie(
        `${cookie.slice(0, -2)}aa`,
        secret,
        1_900_000_000_000,
      ),
    ).toBeNull();
  });

  it("expires attribution at the configured boundary", () => {
    const cookie = signReferralCookie(payload, secret);
    expect(verifyReferralCookie(cookie, secret, 2_000_000_000_000)).toBeNull();
  });

  it("creates anonymous tokens whose stored representation is a one-way hash", () => {
    const token = createVisitorToken();
    const hash = hashVisitorToken(token);
    expect(token).not.toBe(hash);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("requires a sufficiently strong signing secret", () => {
    expect(() => signReferralCookie(payload, "short")).toThrow(
      /at least 32 characters/i,
    );
  });
});
