export type ThemeMode = 'dark' | 'light';

export type ToolId =
  | 'dashboard'
  | 'pdf-to-image'
  | 'image-to-pdf'
  | 'merge'
  | 'split'
  | 'compress'
  | 'rotate'
  | 'reorder'
  | 'metadata'
  | 'watermark'
  | 'password'
  | 'extract-text';

export type PdfImageFormat = 'jpg' | 'png' | 'webp';
export type PageSizePreset = 'A4' | 'Letter';
export type OrientationMode = 'portrait' | 'landscape' | 'auto';
export type CompressionLevel = 'low' | 'medium' | 'high';
export type WatermarkType = 'text' | 'image';
export type OutputFormat = 'txt' | 'json';

export interface BaseOperationResult {
  outputPaths: string[];
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface PdfToImagePayload {
  pdfPaths: string[];
  outputDir: string;
  format: PdfImageFormat;
  pageSelection: string;
  dpi: number;
  quality: number;
}

export interface ImageToPdfPayload {
  imagePaths: string[];
  outputPath: string;
  pageSize: PageSizePreset;
  margins: number;
  orientation: OrientationMode;
}

export interface PdfMergePayload {
  pdfPaths: string[];
  outputPath: string;
}

export interface SplitRange {
  label: string;
  range: string;
}

export interface PdfSplitPayload {
  pdfPath: string;
  outputDir: string;
  mode: 'range' | 'extract' | 'individual';
  ranges: SplitRange[];
  pageSelection: string;
}

export interface PdfCompressionPayload {
  pdfPath: string;
  outputPath: string;
  level: CompressionLevel;
  grayscale: boolean;
}

export interface PdfRotatePayload {
  pdfPath: string;
  outputPath: string;
  pageSelection: string;
  angle: 90 | 180 | 270;
}

export interface PdfReorderPayload {
  pdfPath: string;
  outputPath: string;
  pageOrder: number[];
}

export interface MetadataPayload {
  pdfPath: string;
  outputPath: string;
  title: string;
  author: string;
  subject: string;
  keywords: string;
  producer: string;
  creator: string;
  clearAll: boolean;
}

export interface WatermarkPayload {
  pdfPath: string;
  outputPath: string;
  type: WatermarkType;
  pageSelection: string;
  text: string;
  imagePath: string;
  opacity: number;
  rotation: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tile';
  fontSize: number;
  color: string;
  scale: number;
}

export interface PasswordPayload {
  pdfPath: string;
  outputPath: string;
  mode: 'add' | 'remove';
  password: string;
  ownerPassword: string;
}

export interface TextExtractPayload {
  pdfPath: string;
  outputPath: string;
  format: OutputFormat;
  useOcr: boolean;
  ocrLanguage: string;
}

export type OperationPayloadMap = {
  'pdf-to-image': PdfToImagePayload;
  'image-to-pdf': ImageToPdfPayload;
  merge: PdfMergePayload;
  split: PdfSplitPayload;
  compress: PdfCompressionPayload;
  rotate: PdfRotatePayload;
  reorder: PdfReorderPayload;
  metadata: MetadataPayload;
  watermark: WatermarkPayload;
  password: PasswordPayload;
  'extract-text': TextExtractPayload;
};

export type OperationKind = keyof OperationPayloadMap;

export interface OperationRequest<K extends OperationKind = OperationKind> {
  taskId: string;
  operation: K;
  payload: OperationPayloadMap[K];
}

export interface WorkerRuntimeContext {
  appPath: string;
  resourcesPath: string;
  userDataPath: string;
  isPackaged: boolean;
}

export interface WorkerTaskRequest<K extends OperationKind = OperationKind>
  extends OperationRequest<K> {
  runtime: WorkerRuntimeContext;
}

export interface WorkerTaskProgress {
  taskId: string;
  progress: number;
  stage: string;
  detail?: string;
}

export interface WorkerTaskSuccess {
  taskId: string;
  status: 'success';
  result: BaseOperationResult;
}

export interface WorkerTaskFailure {
  taskId: string;
  status: 'error';
  error: string;
}

export type WorkerTaskEvent =
  | {
      type: 'progress';
      payload: WorkerTaskProgress;
    }
  | {
      type: 'done';
      payload: WorkerTaskSuccess;
    }
  | {
      type: 'error';
      payload: WorkerTaskFailure;
    };

export interface FileDialogOptions {
  title: string;
  type: 'file' | 'directory' | 'save';
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  defaultPath?: string;
}

export interface FileDialogResult {
  canceled: boolean;
  filePaths: string[];
  filePath?: string;
}

export interface PdfInfo {
  filePath: string;
  pageCount: number;
  title: string;
  author: string;
  subject: string;
  encrypted: boolean;
}

export interface AppHistoryEntry {
  id: string;
  operation: OperationKind;
  sourcePaths: string[];
  outputPaths: string[];
  summary: string;
  createdAt: string;
}

export interface DesktopBridge {
  pickPath: (options: FileDialogOptions) => Promise<FileDialogResult>;
  runOperation: <K extends OperationKind>(
    operation: K,
    payload: OperationPayloadMap[K],
  ) => Promise<BaseOperationResult>;
  onTaskProgress: (listener: (progress: WorkerTaskProgress) => void) => () => void;
  getPdfInfo: (filePath: string) => Promise<PdfInfo>;
  readFileBuffer: (filePath: string) => Promise<ArrayBuffer>;
  getUserDataPath: () => Promise<string>;
  exportJson: (defaultPath: string, payload: unknown) => Promise<string | null>;
  revealInFolder: (targetPath: string) => Promise<void>;
}
