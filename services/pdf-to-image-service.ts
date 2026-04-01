import path from 'node:path';

import type { BaseOperationResult, PdfToImagePayload, WorkerRuntimeContext } from './contracts';
import { runWithConcurrency } from './concurrency';
import { assertPdfFile, ensureDirectory, sanitizeFileName } from './file-utils';
import { parsePageSelection } from './page-range';
import { loadPdf } from './pdf-utils';
import type { ProgressReporter } from './progress';
import { rasterizePdfToImages } from './rasterize-service';

export async function convertPdfToImages(
  runtime: WorkerRuntimeContext,
  payload: PdfToImagePayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  await ensureDirectory(payload.outputDir);
  const results = await runWithConcurrency(payload.pdfPaths, 2, async (pdfPath, index) => {
    assertPdfFile(pdfPath);
    const pdf = await loadPdf(pdfPath);
    const pageIndexes = parsePageSelection(payload.pageSelection, pdf.getPageCount());
    const outputPrefix = sanitizeFileName(path.basename(pdfPath, path.extname(pdfPath)));

    reporter.report(
      (index / Math.max(payload.pdfPaths.length, 1)) * 100,
      'Queued PDF',
      `Processing ${outputPrefix}`,
    );

    return rasterizePdfToImages({
      runtime,
      pdfPath,
      pageIndexes,
      dpi: payload.dpi,
      quality: payload.quality,
      outputDir: payload.outputDir,
      outputPrefix,
      format: payload.format,
      reporter,
    });
  });

  const outputPaths = results.flat();
  return {
    outputPaths,
    summary: `Converted ${payload.pdfPaths.length} PDF file${payload.pdfPaths.length === 1 ? '' : 's'} into ${outputPaths.length} image${outputPaths.length === 1 ? '' : 's'}.`,
    metadata: {
      count: outputPaths.length,
      format: payload.format,
    },
  };
}
