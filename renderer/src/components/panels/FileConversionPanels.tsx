import type { ImageToPdfPayload, PdfMergePayload, PdfToImagePayload } from '@services/contracts';

import { DropZone } from '../shared/DropZone';
import { Field, OutputPathRow, Section } from '../shared/FormBits';
import { SortablePathList } from '../shared/SortablePathList';

interface PdfToImagePanelProps {
  form: PdfToImagePayload;
  onPatch: (partial: Partial<PdfToImagePayload>) => void;
  onSelectFiles: (paths: string[]) => void;
  onPickFiles: () => void;
  onPickDirectory: () => void;
  onRun: () => void;
}

export function PdfToImagePanel({
  form,
  onPatch,
  onSelectFiles,
  onPickFiles,
  onPickDirectory,
  onRun,
}: PdfToImagePanelProps) {
  return (
    <div className="tool-layout">
      <Section title="Source PDFs" description="Convert one or more PDFs into image files.">
        <DropZone
          title="Add PDFs"
          description="Drag and drop PDF files for local raster conversion."
          cta="Choose PDFs"
          acceptedExtensions={['pdf']}
          onPick={onPickFiles}
          onFilesDropped={onSelectFiles}
        />
        {form.pdfPaths.length > 0 ? (
          <SortablePathList
            paths={form.pdfPaths}
            onReorder={(pdfPaths) => onPatch({ pdfPaths })}
            onRemove={(targetPath) => onPatch({ pdfPaths: form.pdfPaths.filter((item) => item !== targetPath) })}
          />
        ) : null}
      </Section>

      <Section title="Export Settings">
        <div className="fields fields--three">
          <Field label="Format">
            <select value={form.format} onChange={(event) => onPatch({ format: event.target.value as 'png' | 'jpg' | 'webp' })}>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WebP</option>
            </select>
          </Field>
          <Field label="Page selection" hint="Examples: all, 1-3, 5, 8-10">
            <input value={form.pageSelection} onChange={(event) => onPatch({ pageSelection: event.target.value })} />
          </Field>
          <Field label="DPI">
            <input type="number" min={72} max={400} value={form.dpi} onChange={(event) => onPatch({ dpi: Number(event.target.value) })} />
          </Field>
        </div>
        <div className="fields fields--two">
          <Field label="Quality">
            <input type="range" min={40} max={100} value={form.quality} onChange={(event) => onPatch({ quality: Number(event.target.value) })} />
            <small>{form.quality}%</small>
          </Field>
          <Field label="Output folder">
            <OutputPathRow
              value={form.outputDir}
              placeholder="Choose an output directory"
              onChange={(value) => onPatch({ outputDir: value })}
              onPick={onPickDirectory}
              saveLabel="Choose folder"
            />
          </Field>
        </div>
        <button type="button" className="button" onClick={onRun}>
          Convert to images
        </button>
      </Section>
    </div>
  );
}

interface ImageToPdfPanelProps {
  form: ImageToPdfPayload;
  onPatch: (partial: Partial<ImageToPdfPayload>) => void;
  onSelectFiles: (paths: string[]) => void;
  onPickFiles: () => void;
  onPickOutput: () => void;
  onRun: () => void;
}

export function ImageToPdfPanel({
  form,
  onPatch,
  onSelectFiles,
  onPickFiles,
  onPickOutput,
  onRun,
}: ImageToPdfPanelProps) {
  return (
    <div className="tool-layout">
      <Section title="Source Files" description="Convert supported image formats into a single PDF in your chosen order.">
        <DropZone
          title="Add files to convert"
          description="Supports JPG, PNG, WebP, TIFF, BMP, and JPEG."
          cta="Choose files"
          acceptedExtensions={['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tif', 'tiff']}
          onPick={onPickFiles}
          onFilesDropped={onSelectFiles}
        />
        {form.imagePaths.length > 0 ? (
          <SortablePathList
            paths={form.imagePaths}
            onReorder={(imagePaths) => onPatch({ imagePaths })}
            onRemove={(targetPath) => onPatch({ imagePaths: form.imagePaths.filter((item) => item !== targetPath) })}
          />
        ) : null}
      </Section>

      <Section title="Document Settings">
        <div className="fields fields--three">
          <Field label="Page size">
            <select value={form.pageSize} onChange={(event) => onPatch({ pageSize: event.target.value as 'A4' | 'Letter' })}>
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </select>
          </Field>
          <Field label="Margins (pt)">
            <input type="number" min={0} max={72} value={form.margins} onChange={(event) => onPatch({ margins: Number(event.target.value) })} />
          </Field>
          <Field label="Orientation">
            <select
              value={form.orientation}
              onChange={(event) => onPatch({ orientation: event.target.value as 'auto' | 'portrait' | 'landscape' })}
            >
              <option value="auto">Auto</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </Field>
        </div>
        <Field label="Output PDF">
          <OutputPathRow
            value={form.outputPath}
            placeholder="Save merged PDF as..."
            onChange={(value) => onPatch({ outputPath: value })}
            onPick={onPickOutput}
          />
        </Field>
        <button type="button" className="button" onClick={onRun}>
          Convert to PDF
        </button>
      </Section>
    </div>
  );
}

interface MergePanelProps {
  form: PdfMergePayload;
  onPatch: (partial: Partial<PdfMergePayload>) => void;
  onSelectFiles: (paths: string[]) => void;
  onPickFiles: () => void;
  onPickOutput: () => void;
  onRun: () => void;
}

export function MergePanel({
  form,
  onPatch,
  onSelectFiles,
  onPickFiles,
  onPickOutput,
  onRun,
}: MergePanelProps) {
  return (
    <div className="tool-layout">
      <Section title="PDF Order" description="Drag files to control the merge order.">
        <DropZone
          title="Add PDFs to merge"
          description="Drop multiple PDFs and arrange them before exporting."
          cta="Choose PDFs"
          acceptedExtensions={['pdf']}
          onPick={onPickFiles}
          onFilesDropped={onSelectFiles}
        />
        {form.pdfPaths.length > 0 ? (
          <SortablePathList
            paths={form.pdfPaths}
            onReorder={(pdfPaths) => onPatch({ pdfPaths })}
            onRemove={(targetPath) => onPatch({ pdfPaths: form.pdfPaths.filter((item) => item !== targetPath) })}
          />
        ) : null}
        <Field label="Output PDF">
          <OutputPathRow
            value={form.outputPath}
            placeholder="Save merged PDF as..."
            onChange={(value) => onPatch({ outputPath: value })}
            onPick={onPickOutput}
          />
        </Field>
        <button type="button" className="button" onClick={onRun}>
          Merge PDFs
        </button>
      </Section>
    </div>
  );
}
