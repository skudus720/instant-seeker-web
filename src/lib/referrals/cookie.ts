import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export interface ReferralCookiePayload {
  attributionId: string;
  visitorToken: string;
  expiresAt: number;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{32,128}$/;

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createVisitorToken() {
  return randomBytes(32).toString("base64url");
}

export function hashVisitorToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function signReferralCookie(
  payload: ReferralCookiePayload,
  secret: string,
) {
  if (secret.length < 32) {
    throw new Error(
      "Referral attribution secret must be at least 32 characters.",
    );
  }
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyReferralCookie(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): ReferralCookiePayload | null {
  if (!value || secret.length < 32) return null;
  const [encoded, supplied] = value.split(".");
  if (!encoded || !supplied) return null;
  const expected = signature(encoded, secret);
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<ReferralCookiePayload>;
    if (
      typeof parsed.attributionId !== "string" ||
      !uuidPattern.test(parsed.attributionId) ||
      typeof parsed.visitorToken !== "string" ||
      !tokenPattern.test(parsed.visitorToken) ||
      typeof parsed.expiresAt !== "number" ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      parsed.expiresAt <= Math.floor(now / 1000)
    ) {
      return null;
    }
    return parsed as ReferralCookiePayload;
  } catch {
    return null;
  }
}

export function webhookEventFingerprint(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}
