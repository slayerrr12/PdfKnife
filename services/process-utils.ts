import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function runExecFile(
  command: string,
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync(command, args, {
      cwd,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 32,
    });
  } catch (error) {
    const stderr =
      typeof error === 'object' && error && 'stderr' in error && typeof error.stderr === 'string'
        ? error.stderr.trim()
        : '';
    const stdout =
      typeof error === 'object' && error && 'stdout' in error && typeof error.stdout === 'string'
        ? error.stdout.trim()
        : '';
    const baseMessage = error instanceof Error ? error.message : 'Command execution failed.';
    const detail = stderr || stdout;

    throw new Error(detail ? `${baseMessage}\n${detail}` : baseMessage);
  }
}
