import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import type { BaseOperationResult, PdfSplitPayload } from './contracts';
import { ensureDirectory, sanitizeFileName } from './file-utils';
import { parsePageSelection } from './page-range';
import { loadPdf, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';

export async function splitPdf(
  payload: PdfSplitPayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const source = await loadPdf(payload.pdfPath);
  const outputPaths: string[] = [];
  await ensureDirectory(payload.outputDir);

  if (payload.mode === 'individual') {
    for (let index = 0; index < source.getPageCount(); index += 1) {
      const target = await PDFDocument.create();
      const [page] = await target.copyPages(source, [index]);
      target.addPage(page);
      const targetPath = path.join(payload.outputDir, `page-${index + 1}.pdf`);
      await savePdf(targetPath, target);
      outputPaths.push(targetPath);
      reporter.report(((index + 1) / source.getPageCount()) * 100, 'Splitting pages', `Saved page ${index + 1}`);
    }
  } else if (payload.mode === 'extract') {
    const pageIndexes = parsePageSelection(payload.pageSelection, source.getPageCount());
    const target = await PDFDocument.create();
    const pages = await target.copyPages(source, pageIndexes);
    pages.forEach((page) => target.addPage(page));
    const targetPath = path.join(payload.outputDir, 'extracted-pages.pdf');
    await savePdf(targetPath, target);
    outputPaths.push(targetPath);
    reporter.report(100, 'Extracting pages', `Saved ${pageIndexes.length} pages`);
  } else {
    for (let index = 0; index < payload.ranges.length; index += 1) {
      const range = payload.ranges[index];
      const pageIndexes = parsePageSelection(range.range, source.getPageCount());
      const target = await PDFDocument.create();
      const pages = await target.copyPages(source, pageIndexes);
      pages.forEach((page) => target.addPage(page));
      const targetPath = path.join(
        payload.outputDir,
        `${sanitizeFileName(range.label || `part-${index + 1}`)}.pdf`,
      );
      await savePdf(targetPath, target);
      outputPaths.push(targetPath);
      reporter.report(
        ((index + 1) / payload.ranges.length) * 100,
        'Creating split ranges',
        `${range.label || `Part ${index + 1}`} ready`,
      );
    }
  }

  return {
    outputPaths,
    summary: `Created ${outputPaths.length} split document${outputPaths.length === 1 ? '' : 's'}.`,
  };
}
