import { ArrowRight, Clock3, Files, FolderClock, LockKeyhole } from 'lucide-react';

import type { AppHistoryEntry, ToolId } from '@services/contracts';
import { TOOL_TITLES } from '@services/constants';

import { basename } from '../../utils/paths';

const FEATURED_TOOLS: ToolId[] = [
  'pdf-to-image',
  'image-to-pdf',
  'merge',
  'split',
  'compress',
  'reorder',
];

interface DashboardPanelProps {
  history: AppHistoryEntry[];
  recentFiles: string[];
  onSelectTool: (tool: ToolId) => void;
}

export function DashboardPanel({ history, recentFiles, onSelectTool }: DashboardPanelProps) {
  return (
    <div className="dashboard">
      <section className="hero-card">
        <div>
          <span className="eyebrow">100% Offline PDF Workspace</span>
          <h2>Conversion, editing, protection, and extraction without sending a file anywhere.</h2>
          <p>
            Use the left sidebar to jump into any module, or start with a common workflow below.
          </p>
        </div>
        <div className="hero-card__stats">
          <div>
            <strong>{history.length}</strong>
            <span>Recent jobs</span>
          </div>
          <div>
            <strong>{recentFiles.length}</strong>
            <span>Tracked files</span>
          </div>
          <div>
            <strong>Local</strong>
            <span>Privacy mode</span>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        {FEATURED_TOOLS.map((tool) => (
          <button key={tool} type="button" className="feature-card" onClick={() => onSelectTool(tool)}>
            <span className="feature-card__eyebrow">Tool</span>
            <strong>{TOOL_TITLES[tool]}</strong>
            <p>Open this workflow and configure its output locally.</p>
            <span className="feature-card__cta">
              Open tool
              <ArrowRight size={16} />
            </span>
          </button>
        ))}
      </section>

      <section className="dashboard-columns">
        <div className="dashboard-panel">
          <div className="dashboard-panel__header">
            <Files size={18} />
            <strong>Recent activity</strong>
          </div>
          {history.length === 0 ? (
            <div className="panel-empty">Your operation history will appear here after the first export.</div>
          ) : (
            <div className="history-list">
              {history.slice(0, 6).map((entry) => (
                <div key={entry.id} className="history-item">
                  <div>
                    <strong>{TOOL_TITLES[entry.operation]}</strong>
                    <p>{entry.summary}</p>
                  </div>
                  <span>{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__header">
            <FolderClock size={18} />
            <strong>Recent files</strong>
          </div>
          {recentFiles.length === 0 ? (
            <div className="panel-empty">No recent files yet.</div>
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

        <div className="dashboard-panel">
          <div className="dashboard-panel__header">
            <LockKeyhole size={18} />
            <strong>Workflow notes</strong>
          </div>
          <div className="notes-list">
            <div>
              <Clock3 size={16} />
              <span>Heavy operations run in worker threads to keep the UI responsive.</span>
            </div>
            <div>
              <Clock3 size={16} />
              <span>Password workflows use local `qpdf` binaries when bundled.</span>
            </div>
            <div>
              <Clock3 size={16} />
              <span>OCR stays offline when local Tesseract language packs are present.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
