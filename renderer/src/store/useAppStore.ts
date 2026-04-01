import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AppHistoryEntry, ThemeMode, ToolId, WorkerTaskProgress } from '@services/contracts';

import { createDefaultToolForms, DEFAULT_THEME, DEFAULT_TOOL, type ToolForms } from '../utils/defaults';

interface SnapshotState {
  activeTool: ToolId;
  toolForms: ToolForms;
}

interface AppState {
  theme: ThemeMode;
  activeTool: ToolId;
  toolForms: ToolForms;
  currentProgress: WorkerTaskProgress | null;
  recentFiles: string[];
  history: AppHistoryEntry[];
  undoStack: SnapshotState[];
  redoStack: SnapshotState[];
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setActiveTool: (tool: ToolId) => void;
  patchToolForm: <K extends keyof ToolForms>(tool: K, partial: Partial<ToolForms[K]>, track?: boolean) => void;
  replaceToolForm: <K extends keyof ToolForms>(tool: K, next: ToolForms[K], track?: boolean) => void;
  addRecentFiles: (paths: string[]) => void;
  addHistory: (entry: AppHistoryEntry) => void;
  setCurrentProgress: (progress: WorkerTaskProgress | null) => void;
  undo: () => void;
  redo: () => void;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createSnapshot(state: Pick<AppState, 'activeTool' | 'toolForms'>): SnapshotState {
  return {
    activeTool: state.activeTool,
    toolForms: clone(state.toolForms),
  };
}

const HISTORY_LIMIT = 40;
const SNAPSHOT_LIMIT = 25;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      activeTool: DEFAULT_TOOL,
      toolForms: createDefaultToolForms(),
      currentProgress: null,
      recentFiles: [],
      history: [],
      undoStack: [],
      redoStack: [],
      setTheme(theme) {
        set({ theme });
      },
      toggleTheme() {
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }));
      },
      setActiveTool(activeTool) {
        set({ activeTool });
      },
      patchToolForm(tool, partial, track = true) {
        set((state) => {
          const snapshot = track ? createSnapshot(state) : null;
          const toolForms = clone(state.toolForms);
          toolForms[tool] = { ...toolForms[tool], ...partial } as ToolForms[typeof tool];
          return {
            toolForms,
            undoStack: snapshot ? [...state.undoStack.slice(-SNAPSHOT_LIMIT + 1), snapshot] : state.undoStack,
            redoStack: track ? [] : state.redoStack,
          };
        });
      },
      replaceToolForm(tool, next, track = true) {
        set((state) => {
          const snapshot = track ? createSnapshot(state) : null;
          const toolForms = clone(state.toolForms);
          toolForms[tool] = clone(next);
          return {
            toolForms,
            undoStack: snapshot ? [...state.undoStack.slice(-SNAPSHOT_LIMIT + 1), snapshot] : state.undoStack,
            redoStack: track ? [] : state.redoStack,
          };
        });
      },
      addRecentFiles(paths) {
        set((state) => ({
          recentFiles: [...new Set([...paths, ...state.recentFiles])].slice(0, 18),
        }));
      },
      addHistory(entry) {
        set((state) => ({
          history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
        }));
      },
      setCurrentProgress(currentProgress) {
        set({ currentProgress });
      },
      undo() {
        const { undoStack, redoStack, activeTool, toolForms } = get();
        const previous = undoStack[undoStack.length - 1];
        if (!previous) {
          return;
        }
        set({
          activeTool: previous.activeTool,
          toolForms: clone(previous.toolForms),
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack.slice(-SNAPSHOT_LIMIT + 1), createSnapshot({ activeTool, toolForms })],
        });
      },
      redo() {
        const { undoStack, redoStack, activeTool, toolForms } = get();
        const next = redoStack[redoStack.length - 1];
        if (!next) {
          return;
        }
        set({
          activeTool: next.activeTool,
          toolForms: clone(next.toolForms),
          redoStack: redoStack.slice(0, -1),
          undoStack: [...undoStack.slice(-SNAPSHOT_LIMIT + 1), createSnapshot({ activeTool, toolForms })],
        });
      },
    }),
    {
      name: 'offline-pdf-toolkit-state',
      partialize: (state) => ({
        theme: state.theme,
        activeTool: state.activeTool,
        toolForms: state.toolForms,
        recentFiles: state.recentFiles,
        history: state.history,
      }),
    },
  ),
);
