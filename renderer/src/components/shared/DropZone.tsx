import { useMemo, useState } from 'react';
import { FolderOpen, UploadCloud } from 'lucide-react';

interface DropZoneProps {
  title: string;
  description: string;
  cta: string;
  allowMultiple?: boolean;
  onPick: () => void;
  onFilesDropped: (paths: string[]) => void;
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
  onPick,
  onFilesDropped,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const helperText = useMemo(
    () => (allowMultiple ? 'Drop one or more files here' : 'Drop a single file here'),
    [allowMultiple],
  );

  return (
    <div
      className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const paths = extractPaths(event.dataTransfer.files);
        if (paths.length > 0) {
          onFilesDropped(allowMultiple ? paths : [paths[0]]);
        }
      }}
    >
      <div className="dropzone__icon">
        <UploadCloud size={24} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <small>{helperText}</small>
      </div>
      <button type="button" className="button button--secondary" onClick={onPick}>
        <FolderOpen size={16} />
        {cta}
      </button>
    </div>
  );
}
