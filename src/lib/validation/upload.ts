import { z } from "zod";
import { appConfig } from "@/lib/config";

const uploadMetadataSchema = z.object({
  name: z.string().min(1, "Choose an image file."),
  size: z
    .number()
    .positive("The selected file is empty.")
    .max(
      appConfig.maxUploadBytes,
      `Images must be ${appConfig.maxUploadBytes / 1024 / 1024} MB or smaller.`,
    ),
  type: z.enum(appConfig.supportedImageTypes, {
    error: "Use a JPG, PNG, or WebP image.",
  }),
});

export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;

export function validateUploadMetadata(metadata: {
  name: string;
  size: number;
  type: string;
}) {
  return uploadMetadataSchema.safeParse(metadata);
}

export const allowedDetectedMimeTypes = new Set<string>(
  appConfig.supportedImageTypes,
);
