export function canAccessPrivateRecord(
  actor: { id: string; role: "user" | "admin" } | null,
  ownerId: string,
): boolean {
  return Boolean(actor && (actor.id === ownerId || actor.role === "admin"));
}

export function canModerate(actor: { role: "user" | "admin" } | null): boolean {
  return actor?.role === "admin";
}
