import { useMemo, useRef, useState } from 'react';
import { FolderOpen, UploadCloud } from 'lucide-react';

interface DropZoneProps {
  title: string;
  description: string;
  cta: string;
  allowMultiple?: boolean;
  acceptedExtensions?: string[];
  disabled?: boolean;
  onPick: () => void;
  onFilesDropped: (paths: string[]) => void;
  onFilesRejected?: (paths: string[]) => void;
}

function extractPaths(files: FileList): string[] {
  return Array.from(files)
    .map((file) => (file as File & { path?: string }).path)
    .filter((item): item is string => Boolean(item));
}

export function DropZone({
  title,
  description,
  cta,
  allowMultiple = true,
  acceptedExtensions,
  disabled = false,
  onPick,
  onFilesDropped,
  onFilesRejected,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const dragDepthRef = useRef(0);
  const helperText = useMemo(
    () =>
      acceptedExtensions && acceptedExtensions.length > 0
        ? `Supports ${acceptedExtensions.map((extension) => extension.toUpperCase()).join(', ')}`
        : allowMultiple
          ? 'Drop one or more files here'
          : 'Drop a single file here',
    [acceptedExtensions, allowMultiple],
  );

  const emitAcceptedPaths = (paths: string[]) => {
    const normalized = Array.from(new Set(paths.filter(Boolean)));
    if (acceptedExtensions && acceptedExtensions.length > 0) {
      const accepted = normalized.filter((filePath) =>
        acceptedExtensions.includes(filePath.split('.').pop()?.toLowerCase() ?? ''),
      );
      const rejected = normalized.filter((filePath) => !accepted.includes(filePath));
      if (rejected.length > 0) {
        setRejectionMessage(`Ignored unsupported files. Supported: ${acceptedExtensions.map((extension) => extension.toUpperCase()).join(', ')}`);
        onFilesRejected?.(rejected);
      } else {
        setRejectionMessage('');
      }
      if (accepted.length > 0) {
        onFilesDropped(allowMultiple ? accepted : [accepted[0]]);
      }
      return;
    }

    if (normalized.length > 0) {
      setRejectionMessage('');
      onFilesDropped(allowMultiple ? normalized : [normalized[0]]);
    }
  };

  return (
    <div
      className={`dropzone ${isDragging ? 'dropzone--active' : ''} ${disabled ? 'dropzone--disabled' : ''}`}
      onDragOver={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragEnter={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDragging(true);
      }}
      onDragLeave={() => {
        if (disabled) {
          return;
        }
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
          setIsDragging(false);
        }
      }}
      onDrop={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDragging(false);
        const paths = extractPaths(event.dataTransfer.files);
        if (paths.length === 0) {
          setRejectionMessage('No valid files were dropped.');
          onFilesRejected?.([]);
          return;
        }
        emitAcceptedPaths(paths);
      }}
    >
      <div className="dropzone__icon">
        <UploadCloud size={24} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <small>{helperText}</small>
        {rejectionMessage ? <small className="dropzone__error">{rejectionMessage}</small> : null}
      </div>
      <button type="button" className="button button--secondary" onClick={onPick} disabled={disabled}>
        <FolderOpen size={16} />
        {cta}
      </button>
    </div>
  );
}
