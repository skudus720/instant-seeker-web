import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requirePermission("analyses:view");
  if (user.demo)
    return NextResponse.json(
      { error: "No demo evidence exists." },
      { status: 404 },
    );
  const parsed = z
    .string()
    .uuid()
    .safeParse(request.nextUrl.searchParams.get("id"));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid analysis identifier." },
      { status: 400 },
    );
  const admin = createAdminSupabaseClient();
  if (!admin)
    return NextResponse.json(
      { error: "Storage is not configured." },
      { status: 503 },
    );
  const { data: analysis } = await admin
    .from("analyses")
    .select("private_image_path")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!analysis?.private_image_path)
    return NextResponse.json(
      { error: "Private image not found." },
      { status: 404 },
    );
  const configuredTtl = Number(process.env.ADMIN_SIGNED_URL_TTL_SECONDS || 300);
  const ttl = Number.isFinite(configuredTtl)
    ? Math.min(600, Math.max(30, configuredTtl))
    : 300;
  const { data, error } = await admin.storage
    .from("analysis-screenshots")
    .createSignedUrl(analysis.private_image_path, ttl);
  if (error || !data?.signedUrl)
    return NextResponse.json(
      { error: "Unable to sign private image." },
      { status: 500 },
    );
  const response = NextResponse.redirect(data.signedUrl, { status: 307 });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
