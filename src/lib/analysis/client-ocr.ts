"use client";

import { createWorker, PSM, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getBrowserOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng", 1, {
        logger: () => undefined,
        workerPath:
          "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
        langPath: "https://tessdata.projectnaptha.com/4.0.0",
        corePath:
          "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core.wasm.js",
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: "1",
      });
      return worker;
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

/**
 * Read Instant Virtuals text in the browser so analysis never hangs on
 * serverless Tesseract workers.
 */
export async function extractVisibleTextFromScreenshot(
  file: Blob,
): Promise<string> {
  const worker = await getBrowserOcrWorker();
  const result = await worker.recognize(file);
  return result.data.text?.trim() || "";
}
