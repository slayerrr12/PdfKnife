import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, FolderOpen, History, RefreshCw, RotateCcw, Sparkles, Undo2 } from 'lucide-react';

import type { AppHistoryEntry, OperationKind, OperationPayloadMap, PdfInfo, ToolId } from '@services/contracts';
import { IMAGE_EXTENSIONS, PDF_EXTENSIONS, TOOL_TITLES } from '@services/constants';
import { parsePageSelection } from '@services/page-range';

import { Sidebar } from './components/layout/Sidebar';
import { DashboardPanel } from './components/panels/DashboardPanel';
import { ImageToPdfPanel, MergePanel, PdfToImagePanel } from './components/panels/FileConversionPanels';
import { CompressPanel, RemovePagesPanel, ReorderPanel, RotatePanel, SplitPanel } from './components/panels/EditPanels';
import { ExtractTextPanel, MetadataPanel, PasswordPanel, WatermarkPanel } from './components/panels/SecurityPanels';
import { ProgressBanner } from './components/shared/ProgressBanner';
import { Section } from './components/shared/FormBits';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAppStore } from './store/useAppStore';
import { basename, dirname, withSuffix } from './utils/paths';

type NoticeState = { kind: 'success' | 'error' | 'info'; text: string };

function isCancellationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('canceled') || normalized.includes('cancelled');
}

function dedupePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.filter(Boolean)));
}

function App() {
  const {
    theme,
    activeTool,
    toolForms,
    currentProgress,
    recentFiles,
    history,
    toggleTheme,
    setActiveTool,
    patchToolForm,
    addRecentFiles,
    addHistory,
    setCurrentProgress,
    resetSession,
    undo,
    redo,
  } = useAppStore();

  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [pdfInfoCache, setPdfInfoCache] = useState<Record<string, PdfInfo>>({});
  const [removePageSelection, setRemovePageSelection] = useState<number[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);

  const lastRemovePageRef = useRef<number | null>(null);
  const runTokenRef = useRef(0);
  const isBusy = Boolean(currentProgress) || isCancelling;

  const invalidateRun = useCallback(() => {
    runTokenRef.current += 1;
    return runTokenRef.current;
  }, []);

  const showNotice = useCallback((nextNotice: NoticeState | null) => setNotice(nextNotice), []);
  const showError = useCallback((message: string) => showNotice({ kind: 'error', text: message }), [showNotice]);

  const runUiAction = useCallback((action: () => Promise<void> | void) => {
    Promise.resolve(action()).catch((error) => {
      showError(error instanceof Error ? error.message : 'Unexpected UI error.');
    });
  }, [showError]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!window.pdfToolkit) {
      showError('Electron bridge is unavailable. Please restart the desktop app.');
    }
  }, [showError]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => event.message && showError(event.message);
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      showError(reason || 'Unhandled promise rejection.');
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [showError]);

  useEffect(() => window.pdfToolkit.onTaskProgress((progress) => setCurrentProgress(progress)), [setCurrentProgress]);

  const exportHistory = useCallback(async () => {
    if (history.length === 0) {
      showNotice({ kind: 'info', text: 'There is no history to export yet.' });
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportedPath = await window.pdfToolkit.exportJson(`pdf-toolkit-history-${stamp}.json`, history);
    if (exportedPath) {
      showNotice({ kind: 'success', text: `History exported to ${exportedPath}` });
    }
  }, [history, showNotice]);

  useKeyboardShortcuts({ onUndo: undo, onRedo: redo, onToggleTheme: toggleTheme, onExportHistory: exportHistory });

  const pickFiles = useCallback(async (title: string, extensions: string[], multiple = true) => {
    const result = await window.pdfToolkit.pickPath({
      title,
      type: 'file',
      filters: [{ name: 'Supported Files', extensions }],
      properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    });
    return dedupePaths(result.filePaths);
  }, []);

  const pickDirectory = useCallback(async (title: string) => {
    const result = await window.pdfToolkit.pickPath({ title, type: 'directory', properties: ['openDirectory'] });
    return result.filePaths[0] ?? '';
  }, []);

  const pickSavePath = useCallback(async (title: string, defaultPath: string, extensions: string[]) => {
    const result = await window.pdfToolkit.pickPath({
      title,
      type: 'save',
      defaultPath,
      filters: [{ name: 'Output', extensions }],
    });
    return result.filePath ?? '';
  }, []);

  const ensurePdfInfo = useCallback(async (filePath: string) => {
    if (pdfInfoCache[filePath]) {
      return pdfInfoCache[filePath];
    }
    const info = await window.pdfToolkit.getPdfInfo(filePath);
    setPdfInfoCache((current) => ({ ...current, [filePath]: info }));
    return info;
  }, [pdfInfoCache]);

  const cancelCurrentOperation = useCallback(async (reason: string, message?: string) => {
    const token = invalidateRun();
    setIsCancelling(true);
    try {
      const cancelled = await window.pdfToolkit.cancelCurrentOperation(reason);
      if (runTokenRef.current === token) {
        setCurrentProgress(null);
      }
      if (cancelled && message) {
        showNotice({ kind: 'info', text: message });
      }
      return cancelled;
    } finally {
      setIsCancelling(false);
    }
  }, [invalidateRun, setCurrentProgress, showNotice]);

  const executeOperation = useCallback(async <K extends OperationKind>(operation: K, payload: OperationPayloadMap[K], sourcePaths: string[]) => {
    const token = invalidateRun();
    showNotice(null);
    setCurrentProgress({ taskId: 'queued', progress: 2, stage: 'Queued', detail: 'Preparing your job...' });
    try {
      const result = await window.pdfToolkit.runOperation(operation, payload);
      if (token !== runTokenRef.current) {
        return;
      }
      const entry: AppHistoryEntry = {
        id: `${operation}-${Date.now()}`,
        operation,
        sourcePaths,
        outputPaths: result.outputPaths,
        summary: result.summary,
        createdAt: new Date().toISOString(),
      };
      addHistory(entry);
      addRecentFiles([...sourcePaths, ...result.outputPaths]);
      showNotice({ kind: 'success', text: result.summary });
    } catch (error) {
      if (token !== runTokenRef.current) {
        return;
      }
      const message = error instanceof Error ? error.message : 'Operation failed.';
      showNotice({ kind: isCancellationError(message) ? 'info' : 'error', text: message });
    } finally {
      if (token === runTokenRef.current) {
        window.setTimeout(() => token === runTokenRef.current && setCurrentProgress(null), 220);
      }
    }
  }, [addHistory, addRecentFiles, invalidateRun, setCurrentProgress, showNotice]);

  const selectPdfForTool = useCallback(async (tool: 'split' | 'compress' | 'rotate' | 'reorder' | 'removePages' | 'metadata' | 'watermark' | 'password' | 'extractText', filePath?: string) => {
    const nextPath = filePath ?? (await pickFiles('Choose a PDF', PDF_EXTENSIONS, false))[0];
    if (!nextPath) {
      return;
    }
    addRecentFiles([nextPath]);
    const info = await ensurePdfInfo(nextPath);
    if (tool === 'split') patchToolForm('split', { pdfPath: nextPath, outputDir: dirname(nextPath) });
    if (tool === 'compress') patchToolForm('compress', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-compressed') });
    if (tool === 'rotate') patchToolForm('rotate', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-rotated') });
    if (tool === 'reorder') patchToolForm('reorder', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-reordered'), pageOrder: Array.from({ length: info.pageCount }, (_, index) => index) });
    if (tool === 'removePages') {
      patchToolForm('removePages', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-trimmed'), removedPages: [] });
      setRemovePageSelection([]);
      lastRemovePageRef.current = null;
    }
    if (tool === 'metadata') patchToolForm('metadata', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-metadata'), title: info.title, author: info.author, subject: info.subject });
    if (tool === 'watermark') patchToolForm('watermark', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-watermarked') });
    if (tool === 'password') patchToolForm('password', { pdfPath: nextPath, outputPath: withSuffix(nextPath, toolForms.password.mode === 'remove' ? '-unlocked' : '-secured') });
    if (tool === 'extractText') patchToolForm('extractText', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-text', toolForms.extractText.format) });
  }, [addRecentFiles, ensurePdfInfo, patchToolForm, pickFiles, toolForms.extractText.format, toolForms.password.mode]);

  const selectTool = useCallback(async (tool: ToolId) => {
    if (tool === activeTool) {
      return;
    }
    if (isBusy) {
      await cancelCurrentOperation(`Canceled ${TOOL_TITLES[activeTool]} to open ${TOOL_TITLES[tool]}.`, `Stopped the previous job and opened ${TOOL_TITLES[tool]}.`);
    }
    showNotice(null);
    setActiveTool(tool);
  }, [activeTool, cancelCurrentOperation, isBusy, setActiveTool, showNotice]);

  const restartSession = useCallback(async () => {
    if (isBusy) {
      await cancelCurrentOperation('Session restarted.', 'Stopped the current job and restarted the session.');
    } else {
      invalidateRun();
    }
    resetSession();
    setPdfInfoCache({});
    setRemovePageSelection([]);
    lastRemovePageRef.current = null;
    setCurrentProgress(null);
    showNotice({ kind: 'info', text: 'Session restarted. Pick a tool to begin again.' });
  }, [cancelCurrentOperation, invalidateRun, isBusy, resetSession, setCurrentProgress, showNotice]);

  const highlightedRotatePages = useMemo(() => {
    const filePath = toolForms.rotate.pdfPath;
    const pageCount = filePath ? pdfInfoCache[filePath]?.pageCount ?? 0 : 0;
    if (!pageCount) return [];
    try { return parsePageSelection(toolForms.rotate.pageSelection, pageCount).map((page) => page + 1); } catch { return []; }
  }, [pdfInfoCache, toolForms.rotate.pageSelection, toolForms.rotate.pdfPath]);

  const highlightedWatermarkPages = useMemo(() => {
    const filePath = toolForms.watermark.pdfPath;
    const pageCount = filePath ? pdfInfoCache[filePath]?.pageCount ?? 0 : 0;
    if (!pageCount) return [];
    try { return parsePageSelection(toolForms.watermark.pageSelection, pageCount).map((page) => page + 1); } catch { return []; }
  }, [pdfInfoCache, toolForms.watermark.pageSelection, toolForms.watermark.pdfPath]);

  const removePagesPageCount = useMemo(() => {
    const filePath = toolForms.removePages.pdfPath;
    return filePath ? pdfInfoCache[filePath]?.pageCount ?? 0 : 0;
  }, [pdfInfoCache, toolForms.removePages.pdfPath]);

  const toggleRemovePage = useCallback((pageNumber: number, modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
    const pageIndex = pageNumber - 1;
    const isRange = modifiers.shiftKey && lastRemovePageRef.current !== null;
    const isMulti = modifiers.metaKey || modifiers.ctrlKey;
    if (!isRange && !isMulti) {
      const next = toolForms.removePages.removedPages.includes(pageIndex)
        ? toolForms.removePages.removedPages.filter((item) => item !== pageIndex)
        : [...toolForms.removePages.removedPages, pageIndex].sort((left, right) => left - right);
      patchToolForm('removePages', { removedPages: next });
      setRemovePageSelection([pageNumber]);
      lastRemovePageRef.current = pageNumber;
      return;
    }
    setRemovePageSelection((current) => {
      let next = current;
      if (isRange && lastRemovePageRef.current !== null) {
        const start = Math.min(lastRemovePageRef.current, pageNumber);
        const end = Math.max(lastRemovePageRef.current, pageNumber);
        const range = Array.from({ length: end - start + 1 }, (_, index) => start + index);
        next = isMulti ? Array.from(new Set([...current, ...range])).sort((left, right) => left - right) : range;
      } else {
        next = current.includes(pageNumber) ? current.filter((item) => item !== pageNumber) : [...current, pageNumber].sort((left, right) => left - right);
      }
      lastRemovePageRef.current = pageNumber;
      return next;
    });
  }, [patchToolForm, toolForms.removePages.removedPages]);

  const removeSelectedPages = useCallback(() => {
    if (removePageSelection.length === 0) return showError('Select one or more pages first.');
    const next = Array.from(new Set([...toolForms.removePages.removedPages, ...removePageSelection.map((page) => page - 1)])).sort((left, right) => left - right);
    patchToolForm('removePages', { removedPages: next });
  }, [patchToolForm, removePageSelection, showError, toolForms.removePages.removedPages]);

  const restoreSelectedPages = useCallback(() => {
    if (removePageSelection.length === 0) return showError('Select one or more pages first.');
    const selected = new Set(removePageSelection.map((page) => page - 1));
    patchToolForm('removePages', { removedPages: toolForms.removePages.removedPages.filter((page) => !selected.has(page)) });
  }, [patchToolForm, removePageSelection, showError, toolForms.removePages.removedPages]);

  const restoreAllPages = useCallback(() => {
    patchToolForm('removePages', { removedPages: [] });
    setRemovePageSelection([]);
    lastRemovePageRef.current = null;
  }, [patchToolForm]);

  const rail = (
    <aside className="workspace__rail">
      <Section title="Recent Files">
        {recentFiles.length === 0 ? <div className="panel-empty">No recent files tracked in this session yet.</div> : <div className="rail-list">{recentFiles.slice(0, 10).map((filePath) => <button key={filePath} type="button" className="rail-list__item" onClick={() => runUiAction(() => window.pdfToolkit.revealInFolder(filePath))}><strong>{basename(filePath)}</strong><span>{filePath}</span></button>)}</div>}
      </Section>
      <Section title="Operation History" description="Latest exports in this session.">
        {history.length === 0 ? <div className="panel-empty">Completed operations will appear here.</div> : <div className="history-rail">{history.slice(0, 8).map((entry) => <div key={entry.id} className="history-rail__item"><div className="history-rail__head"><History size={14} /><strong>{TOOL_TITLES[entry.operation]}</strong></div><p>{entry.summary}</p><small>{new Date(entry.createdAt).toLocaleString()}</small></div>)}</div>}
      </Section>
      <Section title="Session Safety"><div className="notes-list"><div><FolderOpen size={16} /><span>Restart Session clears files, forms, progress, undo history, and in-memory previews.</span></div><div><RefreshCw size={16} /><span>Switching tools during processing cancels the old worker before opening the next workflow.</span></div><div><Download size={16} /><span>Heavy operations stay off the UI thread so the renderer remains responsive.</span></div></div></Section>
    </aside>
  );

  const renderPanel = () => {
    switch (activeTool) {
      case 'pdf-to-image':
        return <PdfToImagePanel form={toolForms.pdfToImage} onPatch={(partial) => patchToolForm('pdfToImage', partial)} onSelectFiles={(paths) => { const pdfPaths = dedupePaths(paths); if (pdfPaths.length > 0) { patchToolForm('pdfToImage', { pdfPaths, outputDir: dirname(pdfPaths[0]) }); addRecentFiles(pdfPaths); } }} onPickFiles={() => runUiAction(async () => { const paths = await pickFiles('Choose PDFs', PDF_EXTENSIONS, true); if (paths.length > 0) { patchToolForm('pdfToImage', { pdfPaths: paths, outputDir: dirname(paths[0]) }); addRecentFiles(paths); } })} onPickDirectory={() => runUiAction(async () => patchToolForm('pdfToImage', { outputDir: await pickDirectory('Choose output folder') }))} onRun={() => runUiAction(async () => { if (toolForms.pdfToImage.pdfPaths.length === 0) return showError('Choose at least one PDF to convert.'); if (!toolForms.pdfToImage.outputDir.trim()) return showError('Choose an output folder first.'); await executeOperation('pdf-to-image', toolForms.pdfToImage, toolForms.pdfToImage.pdfPaths); })} />;
      case 'image-to-pdf':
        return <ImageToPdfPanel form={toolForms.imageToPdf} onPatch={(partial) => patchToolForm('imageToPdf', partial)} onSelectFiles={(paths) => { const imagePaths = dedupePaths(paths); if (imagePaths.length > 0) { patchToolForm('imageToPdf', { imagePaths, outputPath: withSuffix(imagePaths[0], '-converted', 'pdf') }); addRecentFiles(imagePaths); } }} onPickFiles={() => runUiAction(async () => { const paths = await pickFiles('Choose files to convert', IMAGE_EXTENSIONS, true); if (paths.length > 0) { patchToolForm('imageToPdf', { imagePaths: paths, outputPath: withSuffix(paths[0], '-converted', 'pdf') }); addRecentFiles(paths); } })} onPickOutput={() => runUiAction(async () => patchToolForm('imageToPdf', { outputPath: await pickSavePath('Save converted PDF', toolForms.imageToPdf.outputPath || 'converted.pdf', ['pdf']) }))} onRun={() => runUiAction(async () => { if (toolForms.imageToPdf.imagePaths.length === 0) return showError('Choose at least one file to convert.'); if (!toolForms.imageToPdf.outputPath.trim()) return showError('Choose where to save the converted PDF.'); await executeOperation('image-to-pdf', toolForms.imageToPdf, toolForms.imageToPdf.imagePaths); })} />;
      case 'merge':
        return <MergePanel form={toolForms.merge} onPatch={(partial) => patchToolForm('merge', partial)} onSelectFiles={(paths) => { const pdfPaths = dedupePaths(paths); if (pdfPaths.length > 0) { patchToolForm('merge', { pdfPaths, outputPath: withSuffix(pdfPaths[0], '-merged') }); addRecentFiles(pdfPaths); } }} onPickFiles={() => runUiAction(async () => { const paths = await pickFiles('Choose PDFs', PDF_EXTENSIONS, true); if (paths.length > 0) { patchToolForm('merge', { pdfPaths: paths, outputPath: withSuffix(paths[0], '-merged') }); addRecentFiles(paths); } })} onPickOutput={() => runUiAction(async () => patchToolForm('merge', { outputPath: await pickSavePath('Save merged PDF', toolForms.merge.outputPath || 'merged.pdf', ['pdf']) }))} onRun={() => runUiAction(async () => { if (toolForms.merge.pdfPaths.length < 2) return showError('Choose at least two PDFs to merge.'); if (!toolForms.merge.outputPath.trim()) return showError('Choose where to save the merged PDF.'); await executeOperation('merge', toolForms.merge, toolForms.merge.pdfPaths); })} />;
      case 'remove-pages':
        return <RemovePagesPanel form={toolForms.removePages} pageCount={removePagesPageCount} selectedPages={removePageSelection} onPickPdf={() => runUiAction(() => selectPdfForTool('removePages'))} onSelectPdf={(path) => runUiAction(() => selectPdfForTool('removePages', path))} onPickOutput={() => runUiAction(async () => patchToolForm('removePages', { outputPath: await pickSavePath('Save cleaned PDF', toolForms.removePages.outputPath || 'cleaned.pdf', ['pdf']) }))} onOutputPathChange={(value) => patchToolForm('removePages', { outputPath: value })} onTogglePage={toggleRemovePage} onRemoveSelected={removeSelectedPages} onRestoreSelected={restoreSelectedPages} onRestoreAll={restoreAllPages} onRun={() => runUiAction(async () => { if (!toolForms.removePages.pdfPath.trim()) return showError('Choose a PDF first.'); if (removePagesPageCount === 0) return showError('The selected PDF could not be read.'); if (toolForms.removePages.removedPages.length === 0) return showError('Mark at least one page for removal first.'); if (toolForms.removePages.removedPages.length >= removePagesPageCount) return showError('At least one page must remain in the PDF.'); if (!toolForms.removePages.outputPath.trim()) return showError('Choose where to save the cleaned PDF.'); await executeOperation('remove-pages', toolForms.removePages, [toolForms.removePages.pdfPath]); })} />;
      case 'split':
        return <SplitPanel form={toolForms.split} onPatch={(partial) => patchToolForm('split', partial)} onPickPdf={() => runUiAction(() => selectPdfForTool('split'))} onSelectPdf={(path) => runUiAction(() => selectPdfForTool('split', path))} onPickDirectory={() => runUiAction(async () => patchToolForm('split', { outputDir: await pickDirectory('Choose output folder') }))} onRun={() => runUiAction(async () => { if (!toolForms.split.pdfPath.trim()) return showError('Choose a PDF first.'); if (!toolForms.split.outputDir.trim()) return showError('Choose an output folder first.'); await executeOperation('split', toolForms.split, [toolForms.split.pdfPath]); })} />;
      case 'compress':
        return <CompressPanel form={toolForms.compress} onPatch={(partial) => patchToolForm('compress', partial)} onPickPdf={() => runUiAction(() => selectPdfForTool('compress'))} onSelectPdf={(path) => runUiAction(() => selectPdfForTool('compress', path))} onPickOutput={() => runUiAction(async () => patchToolForm('compress', { outputPath: await pickSavePath('Save compressed PDF', toolForms.compress.outputPath || 'compressed.pdf', ['pdf']) }))} onRun={() => runUiAction(async () => { if (!toolForms.compress.pdfPath.trim()) return showError('Choose a PDF first.'); if (!toolForms.compress.outputPath.trim()) return showError('Choose where to save the compressed PDF.'); await executeOperation('compress', toolForms.compress, [toolForms.compress.pdfPath]); })} />;
      case 'rotate':
        return <RotatePanel form={toolForms.rotate} highlightedPages={highlightedRotatePages} onPatch={(partial) => patchToolForm('rotate', partial)} onPickPdf={() => runUiAction(() => selectPdfForTool('rotate'))} onSelectPdf={(path) => runUiAction(() => selectPdfForTool('rotate', path))} onPickOutput={() => runUiAction(async () => patchToolForm('rotate', { outputPath: await pickSavePath('Save rotated PDF', toolForms.rotate.outputPath || 'rotated.pdf', ['pdf']) }))} onRun={() => runUiAction(async () => { if (!toolForms.rotate.pdfPath.trim()) return showError('Choose a PDF first.'); if (!toolForms.rotate.outputPath.trim()) return showError('Choose where to save the rotated PDF.'); await executeOperation('rotate', toolForms.rotate, [toolForms.rotate.pdfPath]); })} />;
      case 'reorder':
        return <ReorderPanel form={toolForms.reorder} onPatch={(partial) => patchToolForm('reorder', partial)} onPickPdf={() => runUiAction(() => selectPdfForTool('reorder'))} onSelectPdf={(path) => runUiAction(() => selectPdfForTool('reorder', path))} onPickOutput={() => runUiAction(async () => patchToolForm('reorder', { outputPath: await pickSavePath('Save reordered PDF', toolForms.reorder.outputPath || 'reordered.pdf', ['pdf']) }))} onRun={() => runUiAction(async () => { if (!toolForms.reorder.pdfPath.trim()) return showError('Choose a PDF first.'); if (toolForms.reorder.pageOrder.length === 0) return showError('There are no pages available to reorder.'); if (!toolForms.reorder.outputPath.trim()) return showError('Choose where to save the reordered PDF.'); await executeOperation('reorder', toolForms.reorder, [toolForms.reorder.pdfPath]); })} />;
      case 'metadata':
        return <MetadataPanel form={toolForms.metadata} onPatch={(partial) => patchToolForm('metadata', partial)} onPickPdf={() => runUiAction(() => selectPdfForTool('metadata'))} onSelectPdf={(path) => runUiAction(() => selectPdfForTool('metadata', path))} onPickOutput={() => runUiAction(async () => patchToolForm('metadata', { outputPath: await pickSavePath('Save metadata PDF', toolForms.metadata.outputPath || 'metadata.pdf', ['pdf']) }))} onRun={() => runUiAction(async () => { if (!toolForms.metadata.pdfPath.trim()) return showError('Choose a PDF first.'); if (!toolForms.metadata.outputPath.trim()) return showError('Choose where to save the metadata PDF.'); await executeOperation('metadata', toolForms.metadata, [toolForms.metadata.pdfPath]); })} />;
      case 'watermark':
        return <WatermarkPanel form={toolForms.watermark} highlightedPages={highlightedWatermarkPages} onPatch={(partial) => patchToolForm('watermark', partial)} onPickPdf={() => runUiAction(() => selectPdfForTool('watermark'))} onSelectPdf={(path) => runUiAction(() => selectPdfForTool('watermark', path))} onPickOutput={() => runUiAction(async () => patchToolForm('watermark', { outputPath: await pickSavePath('Save watermarked PDF', toolForms.watermark.outputPath || 'watermarked.pdf', ['pdf']) }))} onPickImage={() => runUiAction(async () => { const selected = (await pickFiles('Choose watermark image', IMAGE_EXTENSIONS, false))[0] ?? ''; if (selected) patchToolForm('watermark', { imagePath: selected }); })} onRun={() => runUiAction(async () => { if (!toolForms.watermark.pdfPath.trim()) return showError('Choose a PDF first.'); if (!toolForms.watermark.outputPath.trim()) return showError('Choose where to save the watermarked PDF.'); if (toolForms.watermark.type === 'text' && !toolForms.watermark.text.trim()) return showError('Enter watermark text first.'); if (toolForms.watermark.type === 'image' && !toolForms.watermark.imagePath.trim()) return showError('Choose a watermark image first.'); await executeOperation('watermark', toolForms.watermark, [toolForms.watermark.pdfPath]); })} />;
      case 'password':
        return <PasswordPanel form={toolForms.password} onPatch={(partial) => patchToolForm('password', partial)} onPickPdf={() => runUiAction(() => selectPdfForTool('password'))} onSelectPdf={(path) => runUiAction(() => selectPdfForTool('password', path))} onPickOutput={() => runUiAction(async () => patchToolForm('password', { outputPath: await pickSavePath('Save password result', toolForms.password.outputPath || 'secured.pdf', ['pdf']) }))} onRun={() => runUiAction(async () => { if (!toolForms.password.pdfPath.trim()) return showError('Choose a PDF first.'); if (!toolForms.password.password.trim()) return showError('Enter the PDF password first.'); if (!toolForms.password.outputPath.trim()) return showError('Choose where to save the password result PDF.'); await executeOperation('password', toolForms.password, [toolForms.password.pdfPath]); })} />;
      case 'extract-text':
        return <ExtractTextPanel form={toolForms.extractText} onPatch={(partial) => patchToolForm('extractText', partial)} onPickPdf={() => runUiAction(() => selectPdfForTool('extractText'))} onSelectPdf={(path) => runUiAction(() => selectPdfForTool('extractText', path))} onPickOutput={() => runUiAction(async () => patchToolForm('extractText', { outputPath: await pickSavePath('Save extracted text', toolForms.extractText.outputPath || 'extracted.txt', [toolForms.extractText.format]) }))} onRun={() => runUiAction(async () => { if (!toolForms.extractText.pdfPath.trim()) return showError('Choose a PDF first.'); if (!toolForms.extractText.outputPath.trim()) return showError('Choose where to save the extracted text.'); await executeOperation('extract-text', toolForms.extractText, [toolForms.extractText.pdfPath]); })} />;
      default:
        return null;
    }
  };

  if (activeTool === 'dashboard') {
    return (
      <div className="landing-shell">
        <header className="landing-topbar">
          <div className="landing-topbar__brand"><div className="landing-topbar__logo">PDF</div><div><span className="eyebrow">Offline desktop suite</span><h2>Toolkit</h2></div></div>
          <div className="landing-topbar__actions">
            <button type="button" className="button button--ghost" onClick={toggleTheme}><Sparkles size={16} />{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
            <button type="button" className="button button--secondary" onClick={() => runUiAction(exportHistory)}><Download size={16} />Export history</button>
            <button type="button" className="button button--ghost" onClick={() => runUiAction(restartSession)}><RotateCcw size={16} />Restart session</button>
          </div>
        </header>
        {notice ? <div className={`notice notice--${notice.kind}`}>{notice.text}</div> : null}
        <DashboardPanel history={history} recentFiles={recentFiles} onSelectTool={(tool) => { void selectTool(tool); }} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar activeTool={activeTool} onSelect={(tool) => { void selectTool(tool); }} theme={theme} onToggleTheme={toggleTheme} />
      <main className="workspace">
        <header className="workspace__header">
          <div><span className="eyebrow">Focused workflow</span><h2>{TOOL_TITLES[activeTool]}</h2></div>
          <div className="workspace__actions">
            <button type="button" className="button button--ghost" onClick={() => void selectTool('dashboard')}><ArrowLeft size={16} />All tools</button>
            <button type="button" className="button button--ghost" onClick={() => runUiAction(restartSession)}><RotateCcw size={16} />Restart session</button>
            <button type="button" className="button button--ghost" onClick={undo}><Undo2 size={16} />Undo</button>
            <button type="button" className="button button--ghost" onClick={redo}><RefreshCw size={16} />Redo</button>
            <button type="button" className="button button--secondary" onClick={() => runUiAction(exportHistory)}><Download size={16} />Export history</button>
          </div>
        </header>
        <ProgressBanner progress={currentProgress} isCancelling={isCancelling} onCancel={isBusy ? () => runUiAction(async () => { await cancelCurrentOperation('Operation canceled by user.', 'Stopped the current job.'); }) : undefined} />
        {notice ? <div className={`notice notice--${notice.kind}`}>{notice.text}</div> : null}
        <div className="workspace__body"><section className={`workspace__main ${isBusy ? 'workspace__main--busy' : ''}`}>{renderPanel()}</section>{rail}</div>
      </main>
    </div>
  );
}

export default App;
