import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import type { BaseOperationResult, PdfMergePayload } from './contracts';
import { assertPdfFile, ensureDirectory } from './file-utils';
import { loadPdf, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';

export async function mergePdfs(
  payload: PdfMergePayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const target = await PDFDocument.create();

  for (let index = 0; index < payload.pdfPaths.length; index += 1) {
    const pdfPath = payload.pdfPaths[index];
    assertPdfFile(pdfPath);
    const source = await loadPdf(pdfPath);
    const pages = await target.copyPages(source, source.getPageIndices());
    pages.forEach((page) => target.addPage(page));

    reporter.report(
      ((index + 1) / payload.pdfPaths.length) * 100,
      'Merging files',
      `Added ${source.getPageCount()} pages from file ${index + 1}`,
    );
  }

  await ensureDirectory(path.dirname(payload.outputPath));
  await savePdf(payload.outputPath, target);
  return {
    outputPaths: [payload.outputPath],
    summary: `Merged ${payload.pdfPaths.length} PDF files into one document.`,
  };
}
