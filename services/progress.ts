export interface ProgressReporter {
  report: (progress: number, stage: string, detail?: string) => void;
}

export function createWeightedReporter(
  reporter: ProgressReporter,
  start: number,
  end: number,
): ProgressReporter {
  return {
    report(progress, stage, detail) {
      const normalized = Math.min(100, Math.max(0, progress));
      const weighted = start + ((end - start) * normalized) / 100;
      reporter.report(weighted, stage, detail);
    },
  };
}
