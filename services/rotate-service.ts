import path from 'node:path';

import { degrees } from 'pdf-lib';

import type { BaseOperationResult, PdfRotatePayload } from './contracts';
import { ensureDirectory } from './file-utils';
import { parsePageSelection } from './page-range';
import { loadPdf, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';

export async function rotatePdf(
  payload: PdfRotatePayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const pdf = await loadPdf(payload.pdfPath);
  const pages = parsePageSelection(payload.pageSelection, pdf.getPageCount());

  pages.forEach((pageIndex, index) => {
    pdf.getPage(pageIndex).setRotation(degrees(payload.angle));
    reporter.report(
      ((index + 1) / pages.length) * 100,
      'Rotating pages',
      `Rotated page ${pageIndex + 1}`,
    );
  });

  await ensureDirectory(path.dirname(payload.outputPath));
  await savePdf(payload.outputPath, pdf);
  return {
    outputPaths: [payload.outputPath],
    summary: `Rotated ${pages.length} page${pages.length === 1 ? '' : 's'} by ${payload.angle} degrees.`,
  };
}
