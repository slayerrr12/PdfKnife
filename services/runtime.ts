import fs from 'node:fs/promises';
import path from 'node:path';

import type { WorkerRuntimeContext } from './contracts';
import { MissingBinaryError } from './errors';

export function resolveAssetsRoot(runtime: WorkerRuntimeContext): string {
  return runtime.isPackaged
    ? path.join(runtime.resourcesPath, 'assets')
    : path.join(runtime.appPath, 'assets');
}

export function resolveUnpackedNodeModule(runtime: WorkerRuntimeContext, ...segments: string[]): string {
  if (runtime.isPackaged) {
    return path.join(runtime.resourcesPath, 'app.asar.unpacked', 'node_modules', ...segments);
  }

  return path.join(runtime.appPath, 'node_modules', ...segments);
}

export async function resolveBinary(
  runtime: WorkerRuntimeContext,
  binaryName: string,
  candidates: string[],
): Promise<string> {
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep searching.
    }
  }

  throw new MissingBinaryError(
    binaryName,
    `Expected one of: ${candidates.map((item) => `"${item}"`).join(', ')}`,
  );
}
