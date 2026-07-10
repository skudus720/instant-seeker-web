import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.demo || user.role !== "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { data: record } = await supabase
    .from("win_records")
    .select("ticket_image_path")
    .eq("id", id)
    .maybeSingle();
  if (!record?.ticket_image_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("win-records")
    .download(record.ticket_image_path);
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": data.type || "image/webp",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'",
    },
  });
}
