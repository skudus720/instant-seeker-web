import "server-only";

import sharp from "sharp";
import { createWorker, PSM, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng", 1, {
        logger: () => undefined,
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: "1",
      });
      return worker;
    })();
  }
  return workerPromise;
}

async function preparePasses(bytes: Uint8Array) {
  const base = sharp(Buffer.from(bytes)).rotate().resize({
    width: 2000,
    withoutEnlargement: false,
  });
  const soft = await base
    .clone()
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
  const hard = await base
    .clone()
    .grayscale()
    .normalize()
    .linear(1.25, -20)
    .sharpen()
    .png()
    .toBuffer();
  return [soft, hard];
}

export async function extractVisibleTextFromImage(
  bytes: Uint8Array,
  _mimeType: string,
): Promise<string> {
  const worker = await getOcrWorker();
  const passes = await preparePasses(bytes);
  const texts: string[] = [];
  for (const pass of passes) {
    const result = await worker.recognize(pass);
    if (result.data.text?.trim()) texts.push(result.data.text);
  }
  // Keep both passes so fixtures and odds split across OCR styles can still match.
  return texts.join("\n");
}
