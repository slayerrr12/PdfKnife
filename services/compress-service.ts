import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

import type { BaseOperationResult, PdfCompressionPayload, WorkerRuntimeContext } from './contracts';
import { createTempWorkspace, safeCleanup } from './file-utils';
import { loadPdf, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';
import { rasterizePdfToImages } from './rasterize-service';

const COMPRESSION_PRESETS: Record<
  PdfCompressionPayload['level'],
  { dpi: number; quality: number }
> = {
  low: { dpi: 160, quality: 82 },
  medium: { dpi: 128, quality: 68 },
  high: { dpi: 96, quality: 52 },
};

export async function compressPdf(
  runtime: WorkerRuntimeContext,
  payload: PdfCompressionPayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const preset = COMPRESSION_PRESETS[payload.level];
  const workspace = await createTempWorkspace('pdf-compress-');
  const outputDir = path.join(workspace, 'images');

  try {
    const source = await loadPdf(payload.pdfPath);
    const originalSizes = source.getPages().map((page) => ({
      width: page.getWidth(),
      height: page.getHeight(),
    }));

    const images = await rasterizePdfToImages({
      runtime,
      pdfPath: payload.pdfPath,
      pageIndexes: source.getPageIndices(),
      dpi: preset.dpi,
      quality: 100,
      outputDir,
      outputPrefix: 'compressed',
      format: 'png',
      reporter,
    });

    const target = await PDFDocument.create();
    for (let index = 0; index < images.length; index += 1) {
      const size = originalSizes[index];
      const optimized = await sharp(images[index])
        .grayscale(payload.grayscale)
        .jpeg({
          quality: preset.quality,
          mozjpeg: true,
        })
        .toBuffer();
      const image = await target.embedJpg(optimized);
      const page = target.addPage([size.width, size.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: size.width,
        height: size.height,
      });
      reporter.report(
        60 + ((index + 1) / images.length) * 40,
        'Rebuilding compressed PDF',
        `Compressed page ${index + 1}`,
      );
    }

    await savePdf(payload.outputPath, target);
    const originalStat = await fs.stat(payload.pdfPath);
    const compressedStat = await fs.stat(payload.outputPath);
    return {
      outputPaths: [payload.outputPath],
      summary: `Compressed PDF from ${(originalStat.size / 1024 / 1024).toFixed(2)} MB to ${(compressedStat.size / 1024 / 1024).toFixed(2)} MB.`,
      metadata: {
        originalBytes: originalStat.size,
        compressedBytes: compressedStat.size,
        strategy: 'raster-rebuild',
      },
    };
  } finally {
    await safeCleanup(workspace);
  }
}
