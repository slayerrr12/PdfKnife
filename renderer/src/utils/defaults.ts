import type {
  CompressionLevel,
  ImageToPdfPayload,
  MetadataPayload,
  PasswordPayload,
  PdfCompressionPayload,
  PdfMergePayload,
  PdfReorderPayload,
  PdfRotatePayload,
  PdfSplitPayload,
  PdfToImagePayload,
  TextExtractPayload,
  ThemeMode,
  ToolId,
  WatermarkPayload,
} from '@services/contracts';
import { DEFAULT_DPI, DEFAULT_FONT_SIZE, DEFAULT_MARGIN, DEFAULT_QUALITY } from '@services/constants';

export interface ToolForms {
  pdfToImage: PdfToImagePayload;
  imageToPdf: ImageToPdfPayload;
  merge: PdfMergePayload;
  split: PdfSplitPayload;
  compress: PdfCompressionPayload;
  rotate: PdfRotatePayload;
  reorder: PdfReorderPayload;
  metadata: MetadataPayload;
  watermark: WatermarkPayload;
  password: PasswordPayload;
  extractText: TextExtractPayload;
}

export const DEFAULT_THEME: ThemeMode = 'dark';
export const DEFAULT_TOOL: ToolId = 'dashboard';
export const DEFAULT_COMPRESSION_LEVEL: CompressionLevel = 'medium';

export function createDefaultToolForms(): ToolForms {
  return {
    pdfToImage: {
      pdfPaths: [],
      outputDir: '',
      format: 'png',
      pageSelection: 'all',
      dpi: DEFAULT_DPI,
      quality: DEFAULT_QUALITY,
    },
    imageToPdf: {
      imagePaths: [],
      outputPath: '',
      pageSize: 'A4',
      margins: DEFAULT_MARGIN,
      orientation: 'auto',
    },
    merge: {
      pdfPaths: [],
      outputPath: '',
    },
    split: {
      pdfPath: '',
      outputDir: '',
      mode: 'range',
      ranges: [
        { label: 'Part 1', range: '1-3' },
        { label: 'Part 2', range: '4-' },
      ],
      pageSelection: '1',
    },
    compress: {
      pdfPath: '',
      outputPath: '',
      level: DEFAULT_COMPRESSION_LEVEL,
      grayscale: false,
    },
    rotate: {
      pdfPath: '',
      outputPath: '',
      pageSelection: 'all',
      angle: 90,
    },
    reorder: {
      pdfPath: '',
      outputPath: '',
      pageOrder: [],
    },
    metadata: {
      pdfPath: '',
      outputPath: '',
      title: '',
      author: '',
      subject: '',
      keywords: '',
      producer: '',
      creator: '',
      clearAll: false,
    },
    watermark: {
      pdfPath: '',
      outputPath: '',
      type: 'text',
      pageSelection: 'all',
      text: 'CONFIDENTIAL',
      imagePath: '',
      opacity: 0.2,
      rotation: -35,
      position: 'center',
      fontSize: DEFAULT_FONT_SIZE,
      color: '#2563eb',
      scale: 0.42,
    },
    password: {
      pdfPath: '',
      outputPath: '',
      mode: 'add',
      password: '',
      ownerPassword: '',
    },
    extractText: {
      pdfPath: '',
      outputPath: '',
      format: 'txt',
      useOcr: false,
      ocrLanguage: 'eng',
    },
  };
}
