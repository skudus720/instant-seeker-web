import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "instant_seeker_sub_admin_preview";
const SESSION_SECONDS = 12 * 60 * 60;

function config() {
  const enabled =
    process.env.NODE_ENV !== "production" &&
    process.env.LOCAL_SUB_ADMIN_PREVIEW === "true";
  const username = process.env.LOCAL_SUB_ADMIN_USERNAME?.trim() || "";
  const password = process.env.LOCAL_SUB_ADMIN_PASSWORD || "";
  const secret = process.env.LOCAL_SUB_ADMIN_SESSION_SECRET || "";
  return {
    enabled:
      enabled &&
      username.length >= 3 &&
      password.length >= 1 &&
      secret.length >= 32,
    username,
    password,
    secret,
  };
}

function equalText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSessionValue(secret: string) {
  const payload = Buffer.from(
    JSON.stringify({
      version: 1,
      expiresAt: Date.now() + SESSION_SECONDS * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

function validSessionValue(value: string | undefined, secret: string) {
  if (!value) return false;
  const [payload, suppliedSignature] = value.split(".");
  if (!payload || !suppliedSignature) return false;
  if (!equalText(suppliedSignature, signature(payload, secret))) return false;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { version?: unknown; expiresAt?: unknown };
    return (
      parsed.version === 1 &&
      typeof parsed.expiresAt === "number" &&
      Number.isFinite(parsed.expiresAt) &&
      parsed.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export function isLocalSubAdminLogin(identifier: string) {
  const preview = config();
  return (
    preview.enabled &&
    identifier.trim().toLowerCase() === preview.username.toLowerCase()
  );
}

export function authenticateLocalSubAdmin(
  identifier: string,
  password: string,
) {
  const preview = config();
  return (
    preview.enabled &&
    equalText(
      identifier.trim().toLowerCase(),
      preview.username.toLowerCase(),
    ) &&
    equalText(password, preview.password)
  );
}

export async function createLocalSubAdminSession() {
  const preview = config();
  if (!preview.enabled) return false;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionValue(preview.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return true;
}

export async function hasLocalSubAdminSession() {
  const preview = config();
  if (!preview.enabled) return false;
  const cookieStore = await cookies();
  return validSessionValue(cookieStore.get(COOKIE_NAME)?.value, preview.secret);
}

export async function clearLocalSubAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function localSubAdminUsername() {
  const preview = config();
  return preview.enabled ? preview.username : "subadmin";
}
