import type {
  BaseOperationResult,
  ImageToPdfPayload,
  MetadataPayload,
  OperationKind,
  OperationPayloadMap,
  PasswordPayload,
  PdfCompressionPayload,
  PdfMergePayload,
  PdfReorderPayload,
  PdfRotatePayload,
  PdfSplitPayload,
  PdfToImagePayload,
  TextExtractPayload,
  WatermarkPayload,
  WorkerRuntimeContext,
} from './contracts';
import { compressPdf } from './compress-service';
import { extractText } from './text-extract-service';
import { convertImagesToPdf } from './image-to-pdf-service';
import { updateMetadata } from './metadata-service';
import { mergePdfs } from './merge-service';
import { handlePasswordProtection } from './password-service';
import { convertPdfToImages } from './pdf-to-image-service';
import { reorderPdf } from './reorder-service';
import { rotatePdf } from './rotate-service';
import { splitPdf } from './split-service';
import { addWatermark } from './watermark-service';
import type { ProgressReporter } from './progress';

export async function executeOperation<K extends OperationKind>(
  runtime: WorkerRuntimeContext,
  operation: K,
  payload: OperationPayloadMap[K],
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  switch (operation) {
    case 'pdf-to-image':
      return convertPdfToImages(runtime, payload as PdfToImagePayload, reporter);
    case 'image-to-pdf':
      return convertImagesToPdf(payload as ImageToPdfPayload, reporter);
    case 'merge':
      return mergePdfs(payload as PdfMergePayload, reporter);
    case 'split':
      return splitPdf(payload as PdfSplitPayload, reporter);
    case 'compress':
      return compressPdf(runtime, payload as PdfCompressionPayload, reporter);
    case 'rotate':
      return rotatePdf(payload as PdfRotatePayload, reporter);
    case 'reorder':
      return reorderPdf(payload as PdfReorderPayload, reporter);
    case 'metadata':
      return updateMetadata(payload as MetadataPayload, reporter);
    case 'watermark':
      return addWatermark(payload as WatermarkPayload, reporter);
    case 'password':
      return handlePasswordProtection(runtime, payload as PasswordPayload, reporter);
    case 'extract-text':
      return extractText(runtime, payload as TextExtractPayload, reporter);
    default:
      throw new Error(`Unsupported operation: ${String(operation)}`);
  }
}
