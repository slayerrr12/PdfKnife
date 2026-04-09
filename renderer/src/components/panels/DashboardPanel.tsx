import {
  ArrowDownToLine,
  FileImage,
  FileMinus2,
  FileOutput,
  Files,
  FolderClock,
  History,
  KeyRound,
  Languages,
  Layers3,
  PencilRuler,
  ScissorsLineDashed,
  ShieldCheck,
  Tag,
  Type,
} from 'lucide-react';

import type { AppHistoryEntry, ToolId } from '@services/contracts';
import { TOOL_TITLES } from '@services/constants';

import { basename } from '../../utils/paths';

const PRIMARY_TOOLS: Array<{
  id: ToolId;
  icon: typeof Files;
  description: string;
  accent: string;
}> = [
  {
    id: 'merge',
    icon: Files,
    description: 'Combine multiple PDFs into one clean document with drag-and-drop ordering.',
    accent: '#7c69ff',
  },
  {
    id: 'compress',
    icon: ArrowDownToLine,
    description: 'Reduce file size locally with balanced, low, or high compression presets.',
    accent: '#ff5e47',
  },
  {
    id: 'remove-pages',
    icon: FileMinus2,
    description: 'Preview page thumbnails, mark pages for removal, and export a cleaner PDF.',
    accent: '#1fb7c8',
  },
  {
    id: 'image-to-pdf',
    icon: FileOutput,
    description: 'Convert JPG, PNG, WebP, BMP, and TIFF images into a single PDF.',
    accent: '#f3a311',
  },
];

const SECONDARY_TOOLS: Array<{
  id: ToolId;
  icon: typeof Files;
  description: string;
}> = [
  { id: 'pdf-to-image', icon: FileImage, description: 'Export PDF pages to PNG, JPG, or WebP.' },
  { id: 'split', icon: ScissorsLineDashed, description: 'Split PDFs by range, selection, or individual pages.' },
  { id: 'reorder', icon: Layers3, description: 'Rearrange pages into a new order and save a new copy.' },
  { id: 'rotate', icon: PencilRuler, description: 'Rotate selected pages without leaving your device.' },
  { id: 'password', icon: KeyRound, description: 'Add or remove PDF passwords with local binaries only.' },
  { id: 'metadata', icon: Tag, description: 'Edit title, author, subject, and privacy metadata.' },
  { id: 'watermark', icon: Type, description: 'Apply text or image watermarks with opacity control.' },
  { id: 'extract-text', icon: Languages, description: 'Extract selectable text with optional OCR fallback.' },
];

interface DashboardPanelProps {
  history: AppHistoryEntry[];
  recentFiles: string[];
  onSelectTool: (tool: ToolId) => void;
}

export function DashboardPanel({ history, recentFiles, onSelectTool }: DashboardPanelProps) {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div>
          <span className="eyebrow">Offline PDF Workspace</span>
          <h1>Choose a PDF operation to begin.</h1>
          <p>
            Nothing uploads automatically. Pick a tool first, then the app opens only the controls
            that workflow needs.
          </p>
        </div>
        <div className="landing-hero__stats">
          <div>
            <ShieldCheck size={18} />
            <strong>100% local</strong>
            <span>Files stay on this device</span>
          </div>
          <div>
            <History size={18} />
            <strong>{history.length}</strong>
            <span>Jobs this session</span>
          </div>
          <div>
            <FolderClock size={18} />
            <strong>{recentFiles.length}</strong>
            <span>Tracked files</span>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__header">
          <div>
            <span className="eyebrow">Core workflows</span>
            <h2>Most popular PDF tools</h2>
          </div>
        </div>
        <div className="tool-card-grid">
          {PRIMARY_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                className="tool-card tool-card--primary"
                onClick={() => onSelectTool(tool.id)}
                style={{ ['--tool-accent' as string]: tool.accent }}
              >
                <div className="tool-card__icon">
                  <Icon size={22} />
                </div>
                <div className="tool-card__copy">
                  <strong>{TOOL_TITLES[tool.id]}</strong>
                  <p>{tool.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__header">
          <div>
            <span className="eyebrow">More offline tools</span>
            <h2>Everything else already built in</h2>
          </div>
        </div>
        <div className="tool-card-grid tool-card-grid--compact">
          {SECONDARY_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button key={tool.id} type="button" className="tool-card" onClick={() => onSelectTool(tool.id)}>
                <div className="tool-card__icon">
                  <Icon size={20} />
                </div>
                <div className="tool-card__copy">
                  <strong>{TOOL_TITLES[tool.id]}</strong>
                  <p>{tool.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="landing-columns">
        <div className="landing-panel">
          <div className="landing-panel__header">
            <History size={18} />
            <strong>Recent activity</strong>
          </div>
          {history.length === 0 ? (
            <div className="panel-empty">Completed jobs will appear here after your first export.</div>
          ) : (
            <div className="history-list">
              {history.slice(0, 6).map((entry) => (
                <div key={entry.id} className="history-item">
                  <div>
                    <strong>{TOOL_TITLES[entry.operation]}</strong>
                    <p>{entry.summary}</p>
                  </div>
                  <span>{new Date(entry.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="landing-panel">
          <div className="landing-panel__header">
            <FolderClock size={18} />
            <strong>Recent files</strong>
          </div>
          {recentFiles.length === 0 ? (
            <div className="panel-empty">Files you work with in this session will appear here.</div>
          ) : (
            <div className="recent-list">
              {recentFiles.slice(0, 8).map((filePath) => (
                <div key={filePath} className="recent-list__item">
                  <span>{basename(filePath)}</span>
                  <small>{filePath}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
