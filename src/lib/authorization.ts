import type { UserRole } from "@/lib/types";

export function canAccessPrivateRecord(
  actor: { id: string; role: UserRole } | null,
  ownerId: string,
): boolean {
  return Boolean(
    actor &&
    (actor.id === ownerId ||
      actor.role === "admin" ||
      actor.role === "super_admin"),
  );
}

export function canModerate(actor: { role: UserRole } | null): boolean {
  return actor?.role === "admin" || actor?.role === "super_admin";
}
