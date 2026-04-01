export function replaceExtension(filePath: string, extension: string): string {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) {
    return `${filePath}.${extension}`;
  }
  return `${filePath.slice(0, dotIndex)}.${extension}`;
}

export function withSuffix(filePath: string, suffix: string, extension?: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const separatorIndex = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  const basePath = separatorIndex === -1 ? '' : filePath.slice(0, separatorIndex + 1);
  const fileName = separatorIndex === -1 ? filePath : filePath.slice(separatorIndex + 1);
  const extIndex = fileName.lastIndexOf('.');
  const name = extIndex === -1 ? fileName : fileName.slice(0, extIndex);
  const ext = extension ?? (extIndex === -1 ? '' : fileName.slice(extIndex + 1));
  return `${basePath}${name}${suffix}${ext ? `.${ext}` : ''}`;
}

export function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

export function dirname(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  parts.pop();
  return parts.join('\\');
}
