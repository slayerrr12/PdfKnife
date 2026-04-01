import { ValidationError } from './errors';

export function parsePageSelection(selection: string, pageCount: number): number[] {
  if (pageCount < 1) {
    return [];
  }

  const normalized = selection.trim().toLowerCase();
  if (!normalized || normalized === 'all' || normalized === '*') {
    return Array.from({ length: pageCount }, (_, index) => index);
  }

  const pages = new Set<number>();

  for (const part of normalized.split(',').map((item) => item.trim()).filter(Boolean)) {
    if (part.includes('-')) {
      const [rawStart, rawEnd] = part.split('-', 2);
      const start = rawStart ? Number(rawStart) : 1;
      const end = rawEnd ? Number(rawEnd) : pageCount;

      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > pageCount) {
        throw new ValidationError(`Invalid page range "${part}".`);
      }

      for (let page = start; page <= end; page += 1) {
        pages.add(page - 1);
      }
      continue;
    }

    const page = Number(part);
    if (!Number.isInteger(page) || page < 1 || page > pageCount) {
      throw new ValidationError(`Invalid page number "${part}".`);
    }

    pages.add(page - 1);
  }

  return Array.from(pages).sort((left, right) => left - right);
}

export function describePageSelection(selection: number[]): string {
  if (selection.length === 0) {
    return '0 pages';
  }

  return `${selection.length} page${selection.length === 1 ? '' : 's'}`;
}
