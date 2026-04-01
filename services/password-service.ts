import path from 'node:path';

import type { BaseOperationResult, PasswordPayload, WorkerRuntimeContext } from './contracts';
import { ensureDirectory } from './file-utils';
import { runExecFile } from './process-utils';
import type { ProgressReporter } from './progress';
import { resolveAssetsRoot } from './runtime';

async function resolveQpdfCommand(runtime: WorkerRuntimeContext): Promise<string> {
  const assetsRoot = resolveAssetsRoot(runtime);
  const candidates = [
    path.join(assetsRoot, 'binaries', 'qpdf', 'windows', 'qpdf.exe'),
    path.join(assetsRoot, 'binaries', 'qpdf', 'qpdf.exe'),
    'qpdf',
  ];

  for (const candidate of candidates) {
    try {
      await runExecFile(candidate, ['--version']);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    'QPDF binary is missing. Add qpdf.exe under assets/binaries/qpdf/windows or install qpdf on the system PATH.',
  );
}

export async function handlePasswordProtection(
  runtime: WorkerRuntimeContext,
  payload: PasswordPayload,
  reporter: ProgressReporter,
): Promise<BaseOperationResult> {
  const qpdf = await resolveQpdfCommand(runtime);
  await ensureDirectory(path.dirname(payload.outputPath));
  reporter.report(20, 'Resolving encryption engine');

  if (payload.mode === 'add') {
    await runExecFile(qpdf, [
      '--encrypt',
      payload.password,
      payload.ownerPassword || payload.password,
      '256',
      '--',
      payload.pdfPath,
      payload.outputPath,
    ]);
  } else {
    await runExecFile(qpdf, [
      `--password=${payload.password}`,
      '--decrypt',
      payload.pdfPath,
      payload.outputPath,
    ]);
  }

  reporter.report(100, payload.mode === 'add' ? 'Password added' : 'Password removed');
  return {
    outputPaths: [payload.outputPath],
    summary:
      payload.mode === 'add'
        ? 'Applied PDF password protection.'
        : 'Removed PDF password protection.',
  };
}
