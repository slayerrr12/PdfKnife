import path from 'node:path';

import type { BaseOperationResult, MetadataPayload } from './contracts';
import { ensureDirectory } from './file-utils';
import { loadPdf, savePdf } from './pdf-utils';
import type { ProgressReporter } from './progress';

export async function updateMetadata(
  payload: MetadataPayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const pdf = await loadPdf(payload.pdfPath, { ignoreEncryption: true });

  if (payload.clearAll) {
    pdf.setTitle('');
    pdf.setAuthor('');
    pdf.setSubject('');
    pdf.setKeywords([]);
    pdf.setProducer('');
    pdf.setCreator('');
  } else {
    pdf.setTitle(payload.title);
    pdf.setAuthor(payload.author);
    pdf.setSubject(payload.subject);
    pdf.setKeywords(
      payload.keywords
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
    pdf.setProducer(payload.producer);
    pdf.setCreator(payload.creator);
  }

  reporter.report(70, 'Writing metadata');
  await ensureDirectory(path.dirname(payload.outputPath));
  await savePdf(payload.outputPath, pdf);
  reporter.report(100, 'Metadata updated');

  return {
    outputPaths: [payload.outputPath],
    summary: payload.clearAll
      ? 'Removed editable metadata fields from the PDF.'
      : 'Updated PDF metadata fields.',
  };
}
