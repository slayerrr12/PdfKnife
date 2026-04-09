import {
  ArrowDownToLine,
  FileImage,
  FileMinus2,
  FileOutput,
  Files,
  KeyRound,
  Languages,
  Layers3,
  Moon,
  PencilRuler,
  ScissorsLineDashed,
  Sparkles,
  Sun,
  Tag,
  Type,
} from 'lucide-react';
import clsx from 'clsx';

import type { ToolId } from '@services/contracts';
import { TOOL_TITLES } from '@services/constants';

const TOOL_ITEMS: Array<{
  id: ToolId;
  icon: typeof FileImage;
}> = [
  { id: 'dashboard', icon: Sparkles },
  { id: 'merge', icon: Files },
  { id: 'split', icon: ScissorsLineDashed },
  { id: 'compress', icon: ArrowDownToLine },
  { id: 'remove-pages', icon: FileMinus2 },
  { id: 'image-to-pdf', icon: FileOutput },
  { id: 'pdf-to-image', icon: FileImage },
  { id: 'rotate', icon: PencilRuler },
  { id: 'reorder', icon: Layers3 },
  { id: 'metadata', icon: Tag },
  { id: 'watermark', icon: Type },
  { id: 'password', icon: KeyRound },
  { id: 'extract-text', icon: Languages },
];

interface SidebarProps {
  activeTool: ToolId;
  theme: 'dark' | 'light';
  onSelect: (tool: ToolId) => void;
  onToggleTheme: () => void;
}

export function Sidebar({ activeTool, onSelect, theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">PDF</div>
        <div>
          <div className="sidebar__eyebrow">Offline Workspace</div>
          <h1>Toolkit</h1>
        </div>
      </div>

      <nav className="sidebar__nav">
        {TOOL_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={clsx('sidebar__item', activeTool === item.id && 'sidebar__item--active')}
              onClick={() => onSelect(item.id)}
            >
              <Icon size={18} />
              <span>{TOOL_TITLES[item.id]}</span>
            </button>
          );
        })}
      </nav>

      <button type="button" className="theme-toggle" onClick={onToggleTheme}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </button>
    </aside>
  );
}
