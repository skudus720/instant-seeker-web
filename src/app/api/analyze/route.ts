import { createHash, randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { NextResponse } from "next/server";
import { getAnalysisProvider } from "@/lib/analysis";
import { getCurrentUser } from "@/lib/auth";
import { appConfig, isDemoMode } from "@/lib/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  allowedDetectedMimeTypes,
  validateUploadMetadata,
} from "@/lib/validation/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Sign in to analyze a screenshot.", 401);
  if (!(await checkRateLimit("analysis", 10, 60 * 60_000))) {
    return errorResponse(
      "Analysis limit reached. Please try again later.",
      429,
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > appConfig.maxUploadBytes + 1_000_000) {
    return errorResponse("The upload is larger than 10 MB.", 413);
  }

  const formData = await request.formData();
  const file = formData.get("screenshot");
  if (!(file instanceof File)) {
    return errorResponse("Choose a screenshot to analyze.", 400);
  }

  const metadata = validateUploadMetadata({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!metadata.success) {
    return errorResponse(
      metadata.error.issues[0]?.message || "Invalid image.",
      400,
    );
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const detectedType = await fileTypeFromBuffer(originalBuffer);
  if (!detectedType || !allowedDetectedMimeTypes.has(detectedType.mime)) {
    return errorResponse(
      "The file contents must be a JPG, PNG, or WebP image.",
      400,
    );
  }

  const imageHash = createHash("sha256").update(originalBuffer).digest("hex");
  let privateImagePath = `demo:${imageHash.slice(0, 24)}`;
  const supabase = await createServerSupabaseClient();
  const adminSupabase = createAdminSupabaseClient();

  if (!isDemoMode && supabase) {
    if (!adminSupabase) {
      return errorResponse("Server persistence is not fully configured.", 503);
    }
    privateImagePath = `${user.id}/${randomUUID()}.${detectedType.ext}`;
    const { error: uploadError } = await supabase.storage
      .from("analysis-screenshots")
      .upload(privateImagePath, originalBuffer, {
        contentType: detectedType.mime,
        upsert: false,
      });
    if (uploadError) {
      return errorResponse("Secure upload failed. Please try again.", 500);
    }
  }

  try {
    const provider = getAnalysisProvider();
    const result = await provider.analyze({
      authenticatedUserId: user.id,
      secureImageReference: privateImagePath,
      settings: { riskPreference: "balanced" },
    });

    if (!isDemoMode && supabase && adminSupabase) {
      const { error: insertError } = await adminSupabase
        .from("analyses")
        .insert({
          user_id: user.id,
          private_image_path: privateImagePath,
          extracted_matches: result.detectedMatches,
          result,
          provider: provider.name,
          status: "completed",
        });
      if (insertError) {
        await supabase.storage
          .from("analysis-screenshots")
          .remove([privateImagePath]);
        return errorResponse("The analysis could not be saved.", 500);
      }
    }

    return NextResponse.json({ result });
  } catch {
    if (!isDemoMode && supabase) {
      await supabase.storage
        .from("analysis-screenshots")
        .remove([privateImagePath]);
    }
    return errorResponse(
      "Analysis failed safely. Please try another screenshot.",
      500,
    );
  }
}
