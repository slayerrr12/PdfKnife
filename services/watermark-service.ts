import path from 'node:path';

import { degrees } from 'pdf-lib';

import type { BaseOperationResult, WatermarkPayload } from './contracts';
import { ensureDirectory } from './file-utils';
import { embedImageIntoPdf, fitWithinBounds, hexToRgb } from './image-utils';
import { parsePageSelection } from './page-range';
import { loadPdf, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';

function resolvePosition(
  position: WatermarkPayload['position'],
  pageWidth: number,
  pageHeight: number,
  markWidth: number,
  markHeight: number,
): { x: number; y: number }[] {
  const margin = 24;
  switch (position) {
    case 'top-left':
      return [{ x: margin, y: pageHeight - markHeight - margin }];
    case 'top-right':
      return [{ x: pageWidth - markWidth - margin, y: pageHeight - markHeight - margin }];
    case 'bottom-left':
      return [{ x: margin, y: margin }];
    case 'bottom-right':
      return [{ x: pageWidth - markWidth - margin, y: margin }];
    case 'tile': {
      const items: { x: number; y: number }[] = [];
      const stepX = markWidth + 36;
      const stepY = markHeight + 36;
      for (let y = margin; y < pageHeight; y += stepY) {
        for (let x = margin; x < pageWidth; x += stepX) {
          items.push({ x, y });
        }
      }
      return items;
    }
    case 'center':
    default:
      return [{ x: (pageWidth - markWidth) / 2, y: (pageHeight - markHeight) / 2 }];
  }
}

export async function addWatermark(
  payload: WatermarkPayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const pdf = await loadPdf(payload.pdfPath);
  const selectedPages = parsePageSelection(payload.pageSelection, pdf.getPageCount());
  const color = hexToRgb(payload.color);
  let embeddedImage:
    | Awaited<ReturnType<typeof embedImageIntoPdf>>
    | null = null;

  if (payload.type === 'image' && payload.imagePath) {
    embeddedImage = await embedImageIntoPdf(pdf, payload.imagePath);
  }

  selectedPages.forEach((pageIndex, index) => {
    const page = pdf.getPage(pageIndex);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    if (payload.type === 'text') {
      const textWidth = payload.text.length * payload.fontSize * 0.55;
      const textHeight = payload.fontSize;
      const positions = resolvePosition(payload.position, pageWidth, pageHeight, textWidth, textHeight);
      positions.forEach(({ x, y }) => {
        page.drawText(payload.text || 'CONFIDENTIAL', {
          x,
          y,
          size: payload.fontSize,
          color,
          opacity: payload.opacity,
          rotate: degrees(payload.rotation),
        });
      });
    } else if (embeddedImage) {
      const maxWidth = pageWidth * payload.scale;
      const maxHeight = pageHeight * payload.scale;
      const fitted = fitWithinBounds(embeddedImage.width, embeddedImage.height, maxWidth, maxHeight);
      const positions = resolvePosition(payload.position, pageWidth, pageHeight, fitted.width, fitted.height);
      positions.forEach(({ x, y }) => {
        page.drawImage(embeddedImage.image, {
          x,
          y,
          width: fitted.width,
          height: fitted.height,
          opacity: payload.opacity,
          rotate: degrees(payload.rotation),
        });
      });
    }

    reporter.report(
      ((index + 1) / selectedPages.length) * 100,
      'Applying watermark',
      `Updated page ${pageIndex + 1}`,
    );
  });

  await ensureDirectory(path.dirname(payload.outputPath));
  await savePdf(payload.outputPath, pdf);
  return {
    outputPaths: [payload.outputPath],
    summary: `Applied watermark to ${selectedPages.length} page${selectedPages.length === 1 ? '' : 's'}.`,
  };
}
