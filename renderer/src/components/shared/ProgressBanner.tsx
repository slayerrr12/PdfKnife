import { useEffect, useState } from 'react';
import { LoaderCircle, Square } from 'lucide-react';

import type { WorkerTaskProgress } from '@services/contracts';

interface ProgressBannerProps {
  progress: WorkerTaskProgress | null;
  isCancelling?: boolean;
  onCancel?: () => void;
}

export function ProgressBanner({ progress, isCancelling = false, onCancel }: ProgressBannerProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (!progress) {
      setDisplayProgress(0);
      return;
    }

    let frame = 0;
    const target = Math.max(4, Math.min(100, progress.progress));

    const animate = () => {
      setDisplayProgress((current) => {
        const delta = target - current;
        if (Math.abs(delta) < 0.45) {
          return target;
        }

        frame = window.requestAnimationFrame(animate);
        return current + delta * 0.18;
      });
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [progress]);

  if (!progress) {
    if (isCancelling) {
      return (
        <div className="progress-banner progress-banner--active">
          <div className="progress-banner__copy">
            <strong>Stopping current job</strong>
            <span>Cleaning up local worker state before the next action.</span>
          </div>
          <div className="progress-banner__bar progress-banner__bar--indeterminate">
            <div />
          </div>
          <span className="progress-banner__value">...</span>
        </div>
      );
    }

    return (
      <div className="progress-banner progress-banner--idle">
        <div className="progress-banner__copy">
          <strong>Offline mode active</strong>
          <span>All processing stays on this device.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-banner progress-banner--active">
      <div className="progress-banner__copy">
        <strong>{progress.stage}</strong>
        <span>{progress.detail ?? 'Working on your document...'}</span>
      </div>
      <div className="progress-banner__bar">
        <div style={{ width: `${displayProgress}%` }} />
      </div>
      <span className="progress-banner__value">{Math.round(displayProgress)}%</span>
      {onCancel ? (
        <button type="button" className="button button--ghost progress-banner__action" onClick={onCancel} disabled={isCancelling}>
          {isCancelling ? <LoaderCircle size={16} className="spin" /> : <Square size={16} />}
          {isCancelling ? 'Stopping' : 'Cancel'}
        </button>
      ) : null}
    </div>
  );
}
