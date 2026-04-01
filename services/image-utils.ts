import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';
import { PDFDocument, rgb } from 'pdf-lib';

import type { OrientationMode } from './contracts';
import type { PageDimensions } from './pdf-utils';

export function fitWithinBounds(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: sourceWidth * ratio,
    height: sourceHeight * ratio,
  };
}

export function resolvePageDimensions(
  pageSize: PageDimensions,
  orientation: OrientationMode,
  imageWidth: number,
  imageHeight: number,
): PageDimensions {
  const wantsLandscape =
    orientation === 'landscape' || (orientation === 'auto' && imageWidth > imageHeight);

  return wantsLandscape
    ? { width: pageSize.height, height: pageSize.width }
    : { width: pageSize.width, height: pageSize.height };
}

export async function embedImageIntoPdf(
  pdf: PDFDocument,
  imagePath: string,
): Promise<{
  image: Awaited<ReturnType<PDFDocument['embedPng']>>;
  width: number;
  height: number;
}> {
  const ext = path.extname(imagePath).toLowerCase();
  const inputBytes = await fs.readFile(imagePath);

  if (ext === '.jpg' || ext === '.jpeg') {
    const image = await pdf.embedJpg(inputBytes);
    return {
      image,
      width: image.width,
      height: image.height,
    };
  }

  if (ext === '.png') {
    const image = await pdf.embedPng(inputBytes);
    return {
      image,
      width: image.width,
      height: image.height,
    };
  }

  const normalized = await sharp(inputBytes).png().toBuffer();
  const image = await pdf.embedPng(normalized);
  return {
    image,
    width: image.width,
    height: image.height,
  };
}

export function hexToRgb(color: string): ReturnType<typeof rgb> {
  const normalized = color.replace('#', '').trim();
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((item) => `${item}${item}`)
          .join('')
      : normalized;

  const red = Number.parseInt(expanded.slice(0, 2), 16) / 255;
  const green = Number.parseInt(expanded.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(expanded.slice(4, 6), 16) / 255;

  return rgb(red, green, blue);
}
