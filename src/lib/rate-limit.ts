import { headers } from "next/headers";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export async function checkRateLimit(
  scope: string,
  limit = 8,
  windowMs = 60_000,
): Promise<boolean> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwarded || headerStore.get("x-real-ip") || "local";

  if (
    process.env.RATE_LIMIT_PROVIDER === "external" &&
    process.env.RATE_LIMIT_API_URL &&
    process.env.RATE_LIMIT_API_TOKEN
  ) {
    const response = await fetch(process.env.RATE_LIMIT_API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RATE_LIMIT_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ key: `${scope}:${clientKey}`, limit, windowMs }),
      cache: "no-store",
    });
    return response.ok;
  }

  const now = Date.now();
  const key = `${scope}:${clientKey}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
