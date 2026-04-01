import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type { PdfImageFormat, WorkerRuntimeContext } from './contracts';
import { runWithConcurrency } from './concurrency';
import { createTempWorkspace, ensureDirectory, safeCleanup } from './file-utils';
import { cloneSelectedPages, loadPdf, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';

type PdfPopplerModule = typeof import('pdf-poppler');

async function getPdfPoppler(): Promise<PdfPopplerModule['default']> {
  const imported = await import('pdf-poppler');
  return imported.default ?? imported;
}

function mapFormat(format: PdfImageFormat): keyof sharp.FormatEnum {
  if (format === 'jpg') {
    return 'jpeg';
  }
  return format;
}

function naturalSort(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

export async function rasterizePdfToImages(options: {
  runtime: WorkerRuntimeContext;
  pdfPath: string;
  pageIndexes: number[];
  dpi: number;
  quality: number;
  outputDir: string;
  outputPrefix: string;
  format: PdfImageFormat;
  reporter: ProgressReporter;
}): Promise<string[]> {
  const {
    pdfPath,
    pageIndexes,
    dpi,
    quality,
    outputDir,
    outputPrefix,
    format,
    reporter,
  } = options;

  const pdf = await loadPdf(pdfPath);
  const pageDimensions = pageIndexes.map((index) => {
    const page = pdf.getPage(index);
    return {
      width: page.getWidth(),
      height: page.getHeight(),
      pageNumber: index + 1,
    };
  });

  const workspace = await createTempWorkspace('pdf-rasterize-');
  const rasterPdfPath = path.join(workspace, 'subset.pdf');
  const rawOutputDir = path.join(workspace, 'raw');
  await ensureDirectory(rawOutputDir);

  try {
    const subset = await cloneSelectedPages(pdfPath, pageIndexes);
    await savePdf(rasterPdfPath, subset);
    reporter.report(15, 'Rasterizing pages', 'Preparing conversion job');

    const pdfPoppler = await getPdfPoppler();
    await pdfPoppler.convert(rasterPdfPath, {
      format: 'png',
      out_dir: rawOutputDir,
      out_prefix: 'page',
      page: null,
    });

    const generated = (await fs.readdir(rawOutputDir))
      .filter((entry) => entry.toLowerCase().endsWith('.png'))
      .sort(naturalSort)
      .map((entry) => path.join(rawOutputDir, entry));

    await ensureDirectory(outputDir);
    const targetFormat = mapFormat(format);

    const outputs = await runWithConcurrency(generated, 3, async (sourceImage, index) => {
      const page = pageDimensions[index];
      const width = Math.max(1, Math.round((page.width / 72) * dpi));
      const height = Math.max(1, Math.round((page.height / 72) * dpi));
      const targetPath = path.join(outputDir, `${outputPrefix}-page-${page.pageNumber}.${format}`);

      let pipeline = sharp(sourceImage).resize({
        width,
        height,
        fit: 'fill',
      });

      if (targetFormat === 'jpeg') {
        pipeline = pipeline.jpeg({
          quality,
          mozjpeg: true,
        });
      } else if (targetFormat === 'webp') {
        pipeline = pipeline.webp({
          quality,
        });
      } else {
        pipeline = pipeline.png({
          compressionLevel: Math.max(1, Math.min(9, Math.round((100 - quality) / 10))),
        });
      }

      await pipeline.toFile(targetPath);
      reporter.report(
        30 + ((index + 1) / generated.length) * 70,
        'Encoding images',
        `Saved page ${page.pageNumber}`,
      );
      return targetPath;
    });

    return outputs;
  } finally {
    await safeCleanup(workspace);
  }
}
