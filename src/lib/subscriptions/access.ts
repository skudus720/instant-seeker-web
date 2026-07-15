import type { ActiveAiSubscription } from "@/lib/types";

export function isSubscriptionActive(
  subscription: ActiveAiSubscription | null,
  now = new Date(),
) {
  if (!subscription || subscription.status !== "active") return false;
  const startsAt = Date.parse(subscription.startsAt);
  const expiresAt = Date.parse(subscription.expiresAt);
  return (
    Number.isFinite(startsAt) &&
    Number.isFinite(expiresAt) &&
    startsAt <= now.getTime() &&
    expiresAt > now.getTime()
  );
}
