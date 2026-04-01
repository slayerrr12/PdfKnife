import type { WorkerTaskProgress } from '@services/contracts';

interface ProgressBannerProps {
  progress: WorkerTaskProgress | null;
}

export function ProgressBanner({ progress }: ProgressBannerProps) {
  if (!progress) {
    return (
      <div className="progress-banner progress-banner--idle">
        <div>
          <strong>Offline mode active</strong>
          <span>All processing stays on this device.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-banner">
      <div className="progress-banner__copy">
        <strong>{progress.stage}</strong>
        <span>{progress.detail ?? 'Working on your document…'}</span>
      </div>
      <div className="progress-banner__bar">
        <div style={{ width: `${Math.max(4, Math.round(progress.progress))}%` }} />
      </div>
      <span className="progress-banner__value">{Math.round(progress.progress)}%</span>
    </div>
  );
}
