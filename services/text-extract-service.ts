import fs from 'node:fs/promises';
import path from 'node:path';

import type { BaseOperationResult, TextExtractPayload, WorkerRuntimeContext } from './contracts';
import { createTempWorkspace, ensureDirectory, safeCleanup, writeJson } from './file-utils';
import { loadPdf } from './pdf-utils';
import type { ProgressReporter } from './progress';
import { rasterizePdfToImages } from './rasterize-service';
import { resolveAssetsRoot, resolveUnpackedNodeModule } from './runtime';

async function extractSelectableText(pdfPath: string, reporter: ProgressReporter): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: await fs.readFile(pdfPath),
    useSystemFonts: true,
    isEvalSupported: false,
  });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push(text);
    reporter.report((index / document.numPages) * 55, 'Extracting embedded text', `Read page ${index}`);
  }

  return pages;
}

async function runOcr(
  runtime: WorkerRuntimeContext,
  pdfPath: string,
  language: string,
  reporter: ProgressReporter,
): Promise<string[]> {
  const workspace = await createTempWorkspace('pdf-ocr-');
  const ocrDir = path.join(workspace, 'images');

  try {
    const pdf = await loadPdf(pdfPath);
    const pageIndexes = pdf.getPageIndices();
    await ensureDirectory(ocrDir);
    const images = await rasterizePdfToImages({
      runtime,
      pdfPath,
      pageIndexes,
      dpi: 180,
      quality: 92,
      outputDir: ocrDir,
      outputPrefix: 'ocr',
      format: 'png',
      reporter,
    });

    const assetsRoot = resolveAssetsRoot(runtime);
    const tesseract = await import('tesseract.js');
    const worker = await tesseract.createWorker(language, 1, {
      langPath: path.join(assetsRoot, 'binaries', 'tesseract', 'tessdata') + path.sep,
      workerPath: path.join(resolveUnpackedNodeModule(runtime, 'tesseract.js', 'dist'), 'worker.min.js'),
      corePath: resolveUnpackedNodeModule(runtime, 'tesseract.js-core'),
      cachePath: path.join(runtime.userDataPath, 'ocr-cache'),
      gzip: true,
      logger(message) {
        if (message.status) {
          reporter.report(55 + message.progress * 45, 'Running OCR', message.status);
        }
      },
    });

    const extracted: string[] = [];
    for (let index = 0; index < images.length; index += 1) {
      const { data } = await worker.recognize(images[index]);
      extracted.push(data.text.trim());
      reporter.report(55 + ((index + 1) / images.length) * 45, 'Running OCR', `Recognized page ${index + 1}`);
    }
    await worker.terminate();
    return extracted;
  } finally {
    await safeCleanup(workspace);
  }
}

export async function extractText(
  runtime: WorkerRuntimeContext,
  payload: TextExtractPayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const embedded = await extractSelectableText(payload.pdfPath, reporter);
  const usefulText = embedded.join(' ').replace(/\s+/g, '').length > 20;
  const pages =
    usefulText || !payload.useOcr
      ? embedded
      : await runOcr(runtime, payload.pdfPath, payload.ocrLanguage, reporter);
  const joined = pages.map((text, index) => `--- Page ${index + 1} ---\n${text}`).join('\n\n');

  await ensureDirectory(path.dirname(payload.outputPath));
  if (payload.format === 'json') {
    await writeJson(payload.outputPath, {
      source: payload.pdfPath,
      pages: pages.map((text, index) => ({
        page: index + 1,
        text,
      })),
    });
  } else {
    await fs.writeFile(payload.outputPath, joined, 'utf8');
  }

  reporter.report(100, 'Text extraction complete');
  return {
    outputPaths: [payload.outputPath],
    summary: usefulText
      ? 'Extracted text directly from the PDF.'
      : payload.useOcr
        ? 'Extracted text using offline OCR.'
        : 'Saved the embedded text that was available in the PDF.',
  };
}
