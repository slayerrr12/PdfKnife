import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onUndo: () => void;
  onRedo: () => void;
  onToggleTheme: () => void;
  onExportHistory: () => void;
}

export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onToggleTheme,
  onExportHistory,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      if (!meta) {
        return;
      }

      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        onUndo();
        return;
      }

      if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault();
        onRedo();
        return;
      }

      if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        onToggleTheme();
        return;
      }

      if (event.key.toLowerCase() === 'e') {
        event.preventDefault();
        onExportHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExportHistory, onRedo, onToggleTheme, onUndo]);
}
