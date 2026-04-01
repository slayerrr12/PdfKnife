import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import type { BaseOperationResult, PdfReorderPayload } from './contracts';
import { ensureDirectory } from './file-utils';
import { loadPdf, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';

export async function reorderPdf(
  payload: PdfReorderPayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const source = await loadPdf(payload.pdfPath);
  const target = await PDFDocument.create();
  const pages = await target.copyPages(source, payload.pageOrder);
  pages.forEach((page, index) => {
    target.addPage(page);
    reporter.report(
      ((index + 1) / pages.length) * 100,
      'Reordering pages',
      `Placed page ${payload.pageOrder[index] + 1}`,
    );
  });

  await ensureDirectory(path.dirname(payload.outputPath));
  await savePdf(payload.outputPath, target);
  return {
    outputPaths: [payload.outputPath],
    summary: `Saved a reordered PDF with ${payload.pageOrder.length} pages.`,
  };
}
