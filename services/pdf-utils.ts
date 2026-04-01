import fs from 'node:fs/promises';

import { PDFDocument } from 'pdf-lib';

import type { PageSizePreset } from './contracts';

export interface PageDimensions {
  width: number;
  height: number;
}

export const PAGE_SIZES: Record<PageSizePreset, PageDimensions> = {
  A4: { width: 595.28, height: 841.89 },
  Letter: { width: 612, height: 792 },
};

export async function readPdfBytes(filePath: string): Promise<Uint8Array> {
  return new Uint8Array(await fs.readFile(filePath));
}

export async function loadPdf(filePath: string, options?: { ignoreEncryption?: boolean }): Promise<PDFDocument> {
  return PDFDocument.load(await readPdfBytes(filePath), {
    ignoreEncryption: options?.ignoreEncryption,
    updateMetadata: false,
    throwOnInvalidObject: false,
  });
}

export async function savePdf(filePath: string, document: PDFDocument): Promise<void> {
  const bytes = await document.save({
    useObjectStreams: false,
  });
  await fs.writeFile(filePath, bytes);
}

export async function cloneSelectedPages(
  sourcePath: string,
  pageIndexes: number[],
): Promise<PDFDocument> {
  const source = await loadPdf(sourcePath);
  const next = await PDFDocument.create();
  const pages = await next.copyPages(source, pageIndexes);
  pages.forEach((page) => next.addPage(page));
  return next;
}
