import { useEffect, useMemo, useState } from 'react';
import { Download, FolderOpen, ImageIcon, ShieldCheck } from 'lucide-react';

import type { BaseOperationResult, PdfImageFormat, PdfToImagePayload, WorkerTaskProgress } from '@services/contracts';

import { DropZone } from './components/shared/DropZone';
import { ProgressBanner } from './components/shared/ProgressBanner';
import { basename, dirname } from './utils/paths';

interface NoticeState {
  kind: 'success' | 'error';
  text: string;
}

const DEFAULT_FORM: PdfToImagePayload = {
  pdfPaths: [],
  outputDir: '',
  format: 'png',
  pageSelection: 'all',
  dpi: 144,
  quality: 82,
};

function App() {
  const [form, setForm] = useState<PdfToImagePayload>(DEFAULT_FORM);
  const [progress, setProgress] = useState<WorkerTaskProgress | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [result, setResult] = useState<BaseOperationResult | null>(null);

  useEffect(() => {
    if (!window.pdfToolkit) {
      setNotice({ kind: 'error', text: 'Electron bridge is unavailable. Please restart the app.' });
      return;
    }

    const unsubscribe = window.pdfToolkit.onTaskProgress((nextProgress) => {
      setProgress(nextProgress);
    });

    const onError = (event: ErrorEvent) => {
      if (event.message) {
        setNotice({ kind: 'error', text: event.message });
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
      setNotice({ kind: 'error', text: message || 'Unhandled promise rejection.' });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      unsubscribe();
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const selectedCount = useMemo(() => form.pdfPaths.length, [form.pdfPaths.length]);

  const updateFiles = (paths: string[]) => {
    setNotice(null);
    setResult(null);
    setForm((current) => ({
      ...current,
      pdfPaths: paths,
      outputDir: current.outputDir || dirname(paths[0]),
    }));
  };

  const choosePdfs = async () => {
    const response = await window.pdfToolkit.pickPath({
      title: 'Choose PDF files',
      type: 'file',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (response.filePaths.length > 0) {
      updateFiles(response.filePaths);
    }
  };

  const chooseOutputFolder = async () => {
    const response = await window.pdfToolkit.pickPath({
      title: 'Choose output folder',
      type: 'directory',
      properties: ['openDirectory'],
    });
    if (response.filePaths[0]) {
      setForm((current) => ({ ...current, outputDir: response.filePaths[0] }));
    }
  };

  const runConversion = async () => {
    setNotice(null);
    setResult(null);

    if (form.pdfPaths.length === 0) {
      setNotice({ kind: 'error', text: 'Add at least one PDF first.' });
      return;
    }

    if (!form.outputDir.trim()) {
      setNotice({ kind: 'error', text: 'Choose an output folder first.' });
      return;
    }

    setProgress({
      taskId: 'queued',
      progress: 2,
      stage: 'Queued',
      detail: 'Preparing conversion...',
    });

    try {
      const nextResult = await window.pdfToolkit.runOperation('pdf-to-image', form);
      setResult(nextResult);
      setNotice({ kind: 'success', text: nextResult.summary });
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Conversion failed.',
      });
    } finally {
      window.setTimeout(() => setProgress(null), 400);
    }
  };

  return (
    <main className="single-app">
      <section className="hero">
        <div>
          <span className="eyebrow">Offline PDF to Image</span>
          <h1>Convert PDF pages to PNG, JPG, or WebP with drag and drop.</h1>
          <p>No cloud upload, no account, no extra tools in the UI. Just local conversion.</p>
        </div>
        <div className="hero__badges">
          <div>
            <ShieldCheck size={18} />
            <span>100% local</span>
          </div>
          <div>
            <ImageIcon size={18} />
            <span>{selectedCount} file{selectedCount === 1 ? '' : 's'} selected</span>
          </div>
        </div>
      </section>

      <ProgressBanner progress={progress} />

      {notice ? <div className={`notice notice--${notice.kind}`}>{notice.text}</div> : null}

      <section className="card">
        <div className="card__header">
          <div>
            <h2>1. Add PDFs</h2>
            <p>Drop one or more PDF files here, or use the file picker.</p>
          </div>
        </div>

        <DropZone
          title="Add PDFs"
          description="Drag and drop PDF files for local image conversion."
          cta="Choose PDFs"
          onPick={() => {
            void choosePdfs();
          }}
          onFilesDropped={updateFiles}
        />

        {form.pdfPaths.length > 0 ? (
          <div className="file-list">
            {form.pdfPaths.map((filePath) => (
              <div key={filePath} className="file-pill">
                <strong>{basename(filePath)}</strong>
                <span>{filePath}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="card__header">
          <div>
            <h2>2. Configure Output</h2>
            <p>Choose the image format, page selection, quality, and destination folder.</p>
          </div>
        </div>

        <div className="fields">
          <label className="field">
            <span>Image format</span>
            <select
              value={form.format}
              onChange={(event) =>
                setForm((current) => ({ ...current, format: event.target.value as PdfImageFormat }))
              }
            >
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WebP</option>
            </select>
          </label>

          <label className="field">
            <span>Page selection</span>
            <input
              value={form.pageSelection}
              onChange={(event) => setForm((current) => ({ ...current, pageSelection: event.target.value }))}
              placeholder="all or 1-3,5"
            />
          </label>

          <label className="field">
            <span>DPI</span>
            <input
              type="number"
              min={72}
              max={400}
              value={form.dpi}
              onChange={(event) => setForm((current) => ({ ...current, dpi: Number(event.target.value) }))}
            />
          </label>

          <label className="field">
            <span>Quality</span>
            <input
              type="range"
              min={40}
              max={100}
              value={form.quality}
              onChange={(event) => setForm((current) => ({ ...current, quality: Number(event.target.value) }))}
            />
            <small>{form.quality}%</small>
          </label>
        </div>

        <div className="folder-row">
          <input
            value={form.outputDir}
            onChange={(event) => setForm((current) => ({ ...current, outputDir: event.target.value }))}
            placeholder="Choose output folder"
          />
          <button type="button" className="button button--secondary" onClick={() => void chooseOutputFolder()}>
            <FolderOpen size={16} />
            Choose folder
          </button>
        </div>

        <button type="button" className="button" onClick={() => void runConversion()}>
          <Download size={16} />
          Convert PDF to Images
        </button>
      </section>

      {result ? (
        <section className="card">
          <div className="card__header">
            <div>
              <h2>3. Results</h2>
              <p>{result.summary}</p>
            </div>
          </div>

          <div className="file-list">
            {result.outputPaths.map((outputPath) => (
              <button
                key={outputPath}
                type="button"
                className="file-pill file-pill--button"
                onClick={() => void window.pdfToolkit.revealInFolder(outputPath)}
              >
                <strong>{basename(outputPath)}</strong>
                <span>{outputPath}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

export default App;
