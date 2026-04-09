import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import { ValidationError } from './errors';
import type { BaseOperationResult, PdfRemovePagesPayload } from './contracts';
import { ensureDirectory } from './file-utils';
import { loadPdf, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';

export async function removePdfPages(
  payload: PdfRemovePagesPayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const source = await loadPdf(payload.pdfPath);
  const totalPages = source.getPageCount();
  const removedPages = Array.from(new Set(payload.removedPages)).sort((left, right) => left - right);

  if (removedPages.some((pageIndex) => pageIndex < 0 || pageIndex >= totalPages)) {
    throw new ValidationError('One or more removed pages are outside the PDF page range.');
  }

  const keptPages = source.getPageIndices().filter((pageIndex) => !removedPages.includes(pageIndex));
  if (keptPages.length === 0) {
    throw new ValidationError('At least one page must remain in the PDF.');
  }

  const target = await PDFDocument.create();
  const copiedPages = await target.copyPages(source, keptPages);
  copiedPages.forEach((page, index) => {
    target.addPage(page);
    reporter.report(
      ((index + 1) / copiedPages.length) * 100,
      'Removing selected pages',
      `Keeping page ${keptPages[index] + 1} of ${totalPages}`,
    );
  });

  await ensureDirectory(path.dirname(payload.outputPath));
  await savePdf(payload.outputPath, target);

  return {
    outputPaths: [payload.outputPath],
    summary: `Removed ${removedPages.length} page${removedPages.length === 1 ? '' : 's'} and saved ${keptPages.length} remaining page${keptPages.length === 1 ? '' : 's'}.`,
    metadata: {
      removedPages,
      keptPages,
      totalPages,
    },
  };
}
