import type { ToolId } from './contracts';

export const APP_NAME = 'Offline PDF Toolkit';
export const DEFAULT_DPI = 144;
export const DEFAULT_QUALITY = 82;
export const DEFAULT_MARGIN = 18;
export const DEFAULT_FONT_SIZE = 42;

export const PDF_EXTENSIONS = ['pdf'];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tif', 'tiff'];

export const TOOL_TITLES: Record<ToolId, string> = {
  dashboard: 'Overview',
  'pdf-to-image': 'PDF to Image',
  'image-to-pdf': 'Convert to PDF',
  'remove-pages': 'Remove Pages',
  merge: 'Merge PDFs',
  split: 'Split PDF',
  compress: 'Compress PDF',
  rotate: 'Rotate Pages',
  reorder: 'Reorder Pages',
  metadata: 'Metadata Editor',
  watermark: 'Watermark',
  password: 'Password Protection',
  'extract-text': 'Extract Text',
};
