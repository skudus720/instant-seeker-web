import { NextResponse } from "next/server";
import { getPublicWins } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const wins = await getPublicWins();
  return NextResponse.json(
    { wins },
    {
      headers: {
        "Cache-Control": "public, max-age=15, stale-while-revalidate=45",
      },
    },
  );
}
