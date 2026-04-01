import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { IMAGE_EXTENSIONS, PDF_EXTENSIONS } from './constants';
import { ValidationError } from './errors';

export async function ensureDirectory(targetPath: string): Promise<string> {
  await fs.mkdir(targetPath, { recursive: true });
  return targetPath;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, ' ').trim();
}

export function replaceExtension(filePath: string, extension: string): string {
  return path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}.${extension.replace(/^\./, '')}`,
  );
}

export function buildOutputPath(inputPath: string, suffix: string, extension?: string): string {
  const safeBase = sanitizeFileName(path.basename(inputPath, path.extname(inputPath)));
  const ext = extension ?? path.extname(inputPath).replace(/^\./, '');
  return path.join(path.dirname(inputPath), `${safeBase}${suffix}.${ext}`);
}

export async function createTempWorkspace(prefix = 'offline-pdf-toolkit-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function safeCleanup(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
}

export function assertPdfFile(filePath: string): void {
  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();
  if (!PDF_EXTENSIONS.includes(ext)) {
    throw new ValidationError(`Expected a PDF file, received "${filePath}".`);
  }
}

export function assertImageFile(filePath: string): void {
  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(ext)) {
    throw new ValidationError(`Expected an image file, received "${filePath}".`);
  }
}

export async function assertReadable(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new ValidationError(`Unable to read "${filePath}".`);
  }
}

export async function writeJson(targetPath: string, data: unknown): Promise<void> {
  await ensureDirectory(path.dirname(targetPath));
  await fs.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf8');
}
