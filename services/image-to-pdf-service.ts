import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import type { BaseOperationResult, ImageToPdfPayload } from './contracts';
import { assertImageFile, ensureDirectory } from './file-utils';
import { embedImageIntoPdf, fitWithinBounds, resolvePageDimensions } from './image-utils';
import { PAGE_SIZES, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';

export async function convertImagesToPdf(
  payload: ImageToPdfPayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const pdf = await PDFDocument.create();

  for (let index = 0; index < payload.imagePaths.length; index += 1) {
    const imagePath = payload.imagePaths[index];
    assertImageFile(imagePath);

    const { image, width, height } = await embedImageIntoPdf(pdf, imagePath);
    const pageSize = resolvePageDimensions(PAGE_SIZES[payload.pageSize], payload.orientation, width, height);
    const page = pdf.addPage([pageSize.width, pageSize.height]);
    const availableWidth = pageSize.width - payload.margins * 2;
    const availableHeight = pageSize.height - payload.margins * 2;
    const fitted = fitWithinBounds(width, height, availableWidth, availableHeight);

    page.drawImage(image, {
      x: (pageSize.width - fitted.width) / 2,
      y: (pageSize.height - fitted.height) / 2,
      width: fitted.width,
      height: fitted.height,
    });

    reporter.report(
      ((index + 1) / payload.imagePaths.length) * 100,
      'Embedding images',
      `Placed ${index + 1} of ${payload.imagePaths.length}`,
    );
  }

  await ensureDirectory(path.dirname(payload.outputPath));
  await savePdf(payload.outputPath, pdf);
  return {
    outputPaths: [payload.outputPath],
    summary: `Created a PDF with ${payload.imagePaths.length} page${payload.imagePaths.length === 1 ? '' : 's'}.`,
  };
}
