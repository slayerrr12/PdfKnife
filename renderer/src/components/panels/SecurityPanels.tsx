import type {
  MetadataPayload,
  PasswordPayload,
  TextExtractPayload,
  WatermarkPayload,
} from '@services/contracts';

import { PdfThumbnailGrid } from '../shared/PdfThumbnailGrid';
import { DropZone } from '../shared/DropZone';
import { Field, OutputPathRow, Section } from '../shared/FormBits';

interface MetadataPanelProps {
  form: MetadataPayload;
  onPatch: (partial: Partial<MetadataPayload>) => void;
  onPickPdf: () => void;
  onSelectPdf: (path: string) => void;
  onPickOutput: () => void;
  onRun: () => void;
}

export function MetadataPanel({
  form,
  onPatch,
  onPickPdf,
  onSelectPdf,
  onPickOutput,
  onRun,
}: MetadataPanelProps) {
  return (
    <div className="tool-layout">
      <Section title="PDF Metadata">
        <DropZone
          title="Choose a PDF"
          description="Edit title, author, subject, and privacy-related metadata fields."
          cta="Choose PDF"
          allowMultiple={false}
          acceptedExtensions={['pdf']}
          onPick={onPickPdf}
          onFilesDropped={(paths) => onSelectPdf(paths[0])}
        />
        <div className="fields fields--three">
          <Field label="Title"><input value={form.title} onChange={(event) => onPatch({ title: event.target.value })} /></Field>
          <Field label="Author"><input value={form.author} onChange={(event) => onPatch({ author: event.target.value })} /></Field>
          <Field label="Subject"><input value={form.subject} onChange={(event) => onPatch({ subject: event.target.value })} /></Field>
        </div>
        <div className="fields fields--three">
          <Field label="Keywords"><input value={form.keywords} onChange={(event) => onPatch({ keywords: event.target.value })} placeholder="comma, separated, keywords" /></Field>
          <Field label="Producer"><input value={form.producer} onChange={(event) => onPatch({ producer: event.target.value })} /></Field>
          <Field label="Creator"><input value={form.creator} onChange={(event) => onPatch({ creator: event.target.value })} /></Field>
        </div>
        <Field label="Output PDF">
          <OutputPathRow value={form.outputPath} placeholder="Save updated PDF as..." onChange={(value) => onPatch({ outputPath: value })} onPick={onPickOutput} />
        </Field>
        <label className="toggle">
          <input type="checkbox" checked={form.clearAll} onChange={(event) => onPatch({ clearAll: event.target.checked })} />
          <span>Clear editable metadata for privacy</span>
        </label>
        <button type="button" className="button" onClick={onRun}>
          Save metadata
        </button>
      </Section>
    </div>
  );
}

interface WatermarkPanelProps {
  form: WatermarkPayload;
  highlightedPages: number[];
  onPatch: (partial: Partial<WatermarkPayload>) => void;
  onPickPdf: () => void;
  onSelectPdf: (path: string) => void;
  onPickOutput: () => void;
  onPickImage: () => void;
  onRun: () => void;
}

export function WatermarkPanel({
  form,
  highlightedPages,
  onPatch,
  onPickPdf,
  onSelectPdf,
  onPickOutput,
  onPickImage,
  onRun,
}: WatermarkPanelProps) {
  return (
    <div className="tool-layout tool-layout--preview">
      <div className="tool-layout__content">
        <Section title="Watermark">
        <DropZone
          title="Choose a PDF"
          description="Apply text or image watermarks with control over opacity and placement."
          cta="Choose PDF"
          allowMultiple={false}
          acceptedExtensions={['pdf']}
          onPick={onPickPdf}
          onFilesDropped={(paths) => onSelectPdf(paths[0])}
        />
          <div className="fields fields--three">
            <Field label="Type">
              <select value={form.type} onChange={(event) => onPatch({ type: event.target.value as 'text' | 'image' })}>
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
            </Field>
            <Field label="Pages"><input value={form.pageSelection} onChange={(event) => onPatch({ pageSelection: event.target.value })} /></Field>
            <Field label="Position">
              <select
                value={form.position}
                onChange={(event) =>
                  onPatch({
                    position: event.target.value as
                      | 'center'
                      | 'top-left'
                      | 'top-right'
                      | 'bottom-left'
                      | 'bottom-right'
                      | 'tile',
                  })
                }
              >
                <option value="center">Center</option>
                <option value="tile">Tile</option>
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </Field>
          </div>
          {form.type === 'text' ? (
            <div className="fields fields--three">
              <Field label="Text"><input value={form.text} onChange={(event) => onPatch({ text: event.target.value })} /></Field>
              <Field label="Font size"><input type="number" min={10} max={120} value={form.fontSize} onChange={(event) => onPatch({ fontSize: Number(event.target.value) })} /></Field>
              <Field label="Color"><input type="color" value={form.color} onChange={(event) => onPatch({ color: event.target.value })} /></Field>
            </div>
          ) : (
            <Field label="Watermark image">
              <OutputPathRow value={form.imagePath} placeholder="Choose an image..." onChange={(value) => onPatch({ imagePath: value })} onPick={onPickImage} saveLabel="Choose image" />
            </Field>
          )}
          <div className="fields fields--three">
            <Field label="Opacity"><input type="range" min={0.05} max={0.8} step={0.05} value={form.opacity} onChange={(event) => onPatch({ opacity: Number(event.target.value) })} /><small>{form.opacity.toFixed(2)}</small></Field>
            <Field label="Rotation"><input type="number" min={-180} max={180} value={form.rotation} onChange={(event) => onPatch({ rotation: Number(event.target.value) })} /></Field>
            <Field label="Scale"><input type="range" min={0.1} max={0.9} step={0.05} value={form.scale} onChange={(event) => onPatch({ scale: Number(event.target.value) })} /><small>{Math.round(form.scale * 100)}%</small></Field>
          </div>
          <Field label="Output PDF">
            <OutputPathRow value={form.outputPath} placeholder="Save watermarked PDF as..." onChange={(value) => onPatch({ outputPath: value })} onPick={onPickOutput} />
          </Field>
          <button type="button" className="button" onClick={onRun}>
            Apply watermark
          </button>
        </Section>
      </div>
      <div className="tool-layout__preview">
        <Section title="Target Pages">
          {form.pdfPath ? <PdfThumbnailGrid filePath={form.pdfPath} highlightedPages={highlightedPages} /> : <div className="panel-empty">Choose a PDF to preview target pages.</div>}
        </Section>
      </div>
    </div>
  );
}

interface PasswordPanelProps {
  form: PasswordPayload;
  onPatch: (partial: Partial<PasswordPayload>) => void;
  onPickPdf: () => void;
  onSelectPdf: (path: string) => void;
  onPickOutput: () => void;
  onRun: () => void;
}

export function PasswordPanel({
  form,
  onPatch,
  onPickPdf,
  onSelectPdf,
  onPickOutput,
  onRun,
}: PasswordPanelProps) {
  return (
    <div className="tool-layout">
      <Section title="Password Protection">
        <DropZone
          title="Choose a PDF"
          description="Add or remove PDF password protection using local binaries."
          cta="Choose PDF"
          allowMultiple={false}
          acceptedExtensions={['pdf']}
          onPick={onPickPdf}
          onFilesDropped={(paths) => onSelectPdf(paths[0])}
        />
        <div className="fields fields--three">
          <Field label="Mode">
            <select value={form.mode} onChange={(event) => onPatch({ mode: event.target.value as 'add' | 'remove' })}>
              <option value="add">Add password</option>
              <option value="remove">Remove password</option>
            </select>
          </Field>
          <Field label="Password"><input type="password" value={form.password} onChange={(event) => onPatch({ password: event.target.value })} /></Field>
          <Field label="Owner password" hint="Optional when adding"><input type="password" value={form.ownerPassword} onChange={(event) => onPatch({ ownerPassword: event.target.value })} /></Field>
        </div>
        <Field label="Output PDF">
          <OutputPathRow value={form.outputPath} placeholder="Save secured PDF as..." onChange={(value) => onPatch({ outputPath: value })} onPick={onPickOutput} />
        </Field>
        <button type="button" className="button" onClick={onRun}>
          Run password workflow
        </button>
      </Section>
    </div>
  );
}

interface ExtractTextPanelProps {
  form: TextExtractPayload;
  onPatch: (partial: Partial<TextExtractPayload>) => void;
  onPickPdf: () => void;
  onSelectPdf: (path: string) => void;
  onPickOutput: () => void;
  onRun: () => void;
}

export function ExtractTextPanel({
  form,
  onPatch,
  onPickPdf,
  onSelectPdf,
  onPickOutput,
  onRun,
}: ExtractTextPanelProps) {
  return (
    <div className="tool-layout">
      <Section title="Extract Text">
        <DropZone
          title="Choose a PDF"
          description="Extract selectable text, with optional offline OCR fallback for scanned pages."
          cta="Choose PDF"
          allowMultiple={false}
          acceptedExtensions={['pdf']}
          onPick={onPickPdf}
          onFilesDropped={(paths) => onSelectPdf(paths[0])}
        />
        <div className="fields fields--three">
          <Field label="Output format">
            <select value={form.format} onChange={(event) => onPatch({ format: event.target.value as 'txt' | 'json' })}>
              <option value="txt">TXT</option>
              <option value="json">JSON</option>
            </select>
          </Field>
          <Field label="Use OCR fallback">
            <label className="toggle">
              <input type="checkbox" checked={form.useOcr} onChange={(event) => onPatch({ useOcr: event.target.checked })} />
              <span>Enable OCR</span>
            </label>
          </Field>
          <Field label="OCR language"><input value={form.ocrLanguage} onChange={(event) => onPatch({ ocrLanguage: event.target.value })} placeholder="eng" /></Field>
        </div>
        <Field label="Output file">
          <OutputPathRow value={form.outputPath} placeholder="Save extracted text as..." onChange={(value) => onPatch({ outputPath: value })} onPick={onPickOutput} />
        </Field>
        <button type="button" className="button" onClick={onRun}>
          Extract text
        </button>
      </Section>
    </div>
  );
}
