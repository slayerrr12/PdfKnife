import type {
  PdfCompressionPayload,
  PdfReorderPayload,
  PdfRotatePayload,
  PdfSplitPayload,
} from '@services/contracts';

import { PdfThumbnailGrid } from '../shared/PdfThumbnailGrid';
import { DropZone } from '../shared/DropZone';
import { Field, OutputPathRow, Section } from '../shared/FormBits';

interface SplitPanelProps {
  form: PdfSplitPayload;
  onPatch: (partial: Partial<PdfSplitPayload>) => void;
  onPickPdf: () => void;
  onSelectPdf: (path: string) => void;
  onPickDirectory: () => void;
  onRun: () => void;
}

export function SplitPanel({
  form,
  onPatch,
  onPickPdf,
  onSelectPdf,
  onPickDirectory,
  onRun,
}: SplitPanelProps) {
  return (
    <div className="tool-layout tool-layout--preview">
      <div className="tool-layout__content">
        <Section title="Source PDF">
          <DropZone
            title="Choose a PDF"
            description="Split by ranges, extract selected pages, or export every page separately."
            cta="Choose PDF"
            allowMultiple={false}
            onPick={onPickPdf}
            onFilesDropped={(paths) => onSelectPdf(paths[0])}
          />
        </Section>
        <Section title="Split Settings">
          <div className="fields fields--three">
            <Field label="Mode">
              <select
                value={form.mode}
                onChange={(event) => onPatch({ mode: event.target.value as 'range' | 'extract' | 'individual' })}
              >
                <option value="range">Range groups</option>
                <option value="extract">Extract selection</option>
                <option value="individual">Every page</option>
              </select>
            </Field>
            <Field label="Output folder">
              <OutputPathRow
                value={form.outputDir}
                placeholder="Choose a folder"
                onChange={(value) => onPatch({ outputDir: value })}
                onPick={onPickDirectory}
                saveLabel="Choose folder"
              />
            </Field>
            <Field label="Extract pages" hint="Used in extract mode">
              <input value={form.pageSelection} onChange={(event) => onPatch({ pageSelection: event.target.value })} />
            </Field>
          </div>
          {form.mode === 'range' ? (
            <div className="range-list">
              {form.ranges.map((range, index) => (
                <div key={`${range.label}-${index}`} className="range-list__row">
                  <input
                    value={range.label}
                    onChange={(event) => {
                      const next = form.ranges.slice();
                      next[index] = { ...next[index], label: event.target.value };
                      onPatch({ ranges: next });
                    }}
                    placeholder="Label"
                  />
                  <input
                    value={range.range}
                    onChange={(event) => {
                      const next = form.ranges.slice();
                      next[index] = { ...next[index], range: event.target.value };
                      onPatch({ ranges: next });
                    }}
                    placeholder="1-3"
                  />
                </div>
              ))}
              <button
                type="button"
                className="button button--ghost"
                onClick={() => onPatch({ ranges: [...form.ranges, { label: `Part ${form.ranges.length + 1}`, range: '' }] })}
              >
                Add range
              </button>
            </div>
          ) : null}
          <button type="button" className="button" onClick={onRun}>
            Split PDF
          </button>
        </Section>
      </div>
      <div className="tool-layout__preview">
        <Section title="Page Preview">
          {form.pdfPath ? <PdfThumbnailGrid filePath={form.pdfPath} /> : <div className="panel-empty">Choose a PDF to preview its pages.</div>}
        </Section>
      </div>
    </div>
  );
}

interface CompressPanelProps {
  form: PdfCompressionPayload;
  onPatch: (partial: Partial<PdfCompressionPayload>) => void;
  onPickPdf: () => void;
  onSelectPdf: (path: string) => void;
  onPickOutput: () => void;
  onRun: () => void;
}

export function CompressPanel({
  form,
  onPatch,
  onPickPdf,
  onSelectPdf,
  onPickOutput,
  onRun,
}: CompressPanelProps) {
  return (
    <div className="tool-layout">
      <Section title="Compression">
        <DropZone
          title="Choose a PDF"
          description="Rebuild the PDF with optimized page images to reduce file size."
          cta="Choose PDF"
          allowMultiple={false}
          onPick={onPickPdf}
          onFilesDropped={(paths) => onSelectPdf(paths[0])}
        />
        <div className="fields fields--three">
          <Field label="Compression level">
            <select value={form.level} onChange={(event) => onPatch({ level: event.target.value as 'low' | 'medium' | 'high' })}>
              <option value="low">Low compression</option>
              <option value="medium">Balanced</option>
              <option value="high">High compression</option>
            </select>
          </Field>
          <Field label="Grayscale pages">
            <label className="toggle">
              <input type="checkbox" checked={form.grayscale} onChange={(event) => onPatch({ grayscale: event.target.checked })} />
              <span>Enable</span>
            </label>
          </Field>
          <Field label="Output PDF">
            <OutputPathRow value={form.outputPath} placeholder="Save compressed PDF as..." onChange={(value) => onPatch({ outputPath: value })} onPick={onPickOutput} />
          </Field>
        </div>
        <button type="button" className="button" onClick={onRun}>
          Compress PDF
        </button>
      </Section>
    </div>
  );
}

interface RotatePanelProps {
  form: PdfRotatePayload;
  highlightedPages: number[];
  onPatch: (partial: Partial<PdfRotatePayload>) => void;
  onPickPdf: () => void;
  onSelectPdf: (path: string) => void;
  onPickOutput: () => void;
  onRun: () => void;
}

export function RotatePanel({
  form,
  highlightedPages,
  onPatch,
  onPickPdf,
  onSelectPdf,
  onPickOutput,
  onRun,
}: RotatePanelProps) {
  return (
    <div className="tool-layout tool-layout--preview">
      <div className="tool-layout__content">
        <Section title="Rotate Pages">
          <DropZone
            title="Choose a PDF"
            description="Rotate selected pages while keeping the document local."
            cta="Choose PDF"
            allowMultiple={false}
            onPick={onPickPdf}
            onFilesDropped={(paths) => onSelectPdf(paths[0])}
          />
          <div className="fields fields--three">
            <Field label="Pages">
              <input value={form.pageSelection} onChange={(event) => onPatch({ pageSelection: event.target.value })} />
            </Field>
            <Field label="Angle">
              <select value={form.angle} onChange={(event) => onPatch({ angle: Number(event.target.value) as 90 | 180 | 270 })}>
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </Field>
            <Field label="Output PDF">
              <OutputPathRow value={form.outputPath} placeholder="Save rotated PDF as..." onChange={(value) => onPatch({ outputPath: value })} onPick={onPickOutput} />
            </Field>
          </div>
          <button type="button" className="button" onClick={onRun}>
            Apply rotation
          </button>
        </Section>
      </div>
      <div className="tool-layout__preview">
        <Section title="Selected Pages">
          {form.pdfPath ? <PdfThumbnailGrid filePath={form.pdfPath} highlightedPages={highlightedPages} /> : <div className="panel-empty">Choose a PDF to preview its pages.</div>}
        </Section>
      </div>
    </div>
  );
}

interface ReorderPanelProps {
  form: PdfReorderPayload;
  onPatch: (partial: Partial<PdfReorderPayload>) => void;
  onPickPdf: () => void;
  onSelectPdf: (path: string) => void;
  onPickOutput: () => void;
  onRun: () => void;
}

export function ReorderPanel({
  form,
  onPatch,
  onPickPdf,
  onSelectPdf,
  onPickOutput,
  onRun,
}: ReorderPanelProps) {
  return (
    <div className="tool-layout tool-layout--preview">
      <div className="tool-layout__content">
        <Section title="Reorder Pages">
          <DropZone
            title="Choose a PDF"
            description="Drag page thumbnails into a new order, then export a reordered copy."
            cta="Choose PDF"
            allowMultiple={false}
            onPick={onPickPdf}
            onFilesDropped={(paths) => onSelectPdf(paths[0])}
          />
          <Field label="Output PDF">
            <OutputPathRow value={form.outputPath} placeholder="Save reordered PDF as..." onChange={(value) => onPatch({ outputPath: value })} onPick={onPickOutput} />
          </Field>
          <button type="button" className="button" onClick={onRun}>
            Export reordered PDF
          </button>
        </Section>
      </div>
      <div className="tool-layout__preview">
        <Section title="Drag Pages">
          {form.pdfPath ? (
            <PdfThumbnailGrid filePath={form.pdfPath} pageOrder={form.pageOrder} onOrderChange={(pageOrder) => onPatch({ pageOrder })} />
          ) : (
            <div className="panel-empty">Choose a PDF to arrange its pages.</div>
          )}
        </Section>
      </div>
    </div>
  );
}
