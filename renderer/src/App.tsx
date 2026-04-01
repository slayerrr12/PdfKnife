import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FolderOpen, History, RefreshCw, Undo2 } from 'lucide-react';

import type { AppHistoryEntry, OperationKind, OperationPayloadMap, PdfInfo } from '@services/contracts';
import { TOOL_TITLES } from '@services/constants';
import { parsePageSelection } from '@services/page-range';

import { Sidebar } from './components/layout/Sidebar';
import { DashboardPanel } from './components/panels/DashboardPanel';
import { ImageToPdfPanel, MergePanel, PdfToImagePanel } from './components/panels/FileConversionPanels';
import { CompressPanel, ReorderPanel, RotatePanel, SplitPanel } from './components/panels/EditPanels';
import {
  ExtractTextPanel,
  MetadataPanel,
  PasswordPanel,
  WatermarkPanel,
} from './components/panels/SecurityPanels';
import { ProgressBanner } from './components/shared/ProgressBanner';
import { Section } from './components/shared/FormBits';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAppStore } from './store/useAppStore';
import { basename, dirname, withSuffix } from './utils/paths';

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
    undo,
    redo,
  } = useAppStore();

  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [pdfInfoCache, setPdfInfoCache] = useState<Record<string, PdfInfo>>({});

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    return window.pdfToolkit.onTaskProgress((progress) => {
      setCurrentProgress(progress);
    });
  }, [setCurrentProgress]);

  const exportHistory = useCallback(async () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportedPath = await window.pdfToolkit.exportJson(`pdf-toolkit-history-${stamp}.json`, history);
    if (exportedPath) {
      setNotice({ kind: 'success', text: `History exported to ${exportedPath}` });
    }
  }, [history]);

  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onToggleTheme: toggleTheme,
    onExportHistory: exportHistory,
  });

  const ensurePdfInfo = useCallback(
    async (filePath: string) => {
      if (pdfInfoCache[filePath]) {
        return pdfInfoCache[filePath];
      }
      const info = await window.pdfToolkit.getPdfInfo(filePath);
      setPdfInfoCache((current) => ({ ...current, [filePath]: info }));
      return info;
    },
    [pdfInfoCache],
  );

  const pickFiles = useCallback(async (title: string, extensions: string[], multiple = true) => {
    const result = await window.pdfToolkit.pickPath({
      title,
      type: 'file',
      filters: [{ name: 'Supported Files', extensions }],
      properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    });
    return result.filePaths;
  }, []);

  const pickDirectory = useCallback(async (title: string) => {
    const result = await window.pdfToolkit.pickPath({
      title,
      type: 'directory',
      properties: ['openDirectory'],
    });
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

  const executeOperation = useCallback(
    async <K extends OperationKind>(operation: K, payload: OperationPayloadMap[K], sourcePaths: string[]) => {
      setNotice(null);
      setCurrentProgress({
        taskId: 'queued',
        progress: 2,
        stage: 'Queued',
        detail: 'Preparing your job...',
      });

      try {
        const result = await window.pdfToolkit.runOperation(operation, payload);
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
        setNotice({ kind: 'success', text: result.summary });
      } catch (error) {
        setNotice({
          kind: 'error',
          text: error instanceof Error ? error.message : 'Operation failed.',
        });
      } finally {
        window.setTimeout(() => setCurrentProgress(null), 450);
      }
    },
    [addHistory, addRecentFiles, setCurrentProgress],
  );

  const selectPdfForTool = useCallback(
    async (
      tool:
        | 'split'
        | 'compress'
        | 'rotate'
        | 'reorder'
        | 'metadata'
        | 'watermark'
        | 'password'
        | 'extractText',
      filePath?: string,
    ) => {
      const nextPath = filePath ?? (await pickFiles('Choose a PDF', ['pdf'], false))[0];
      if (!nextPath) {
        return;
      }

      addRecentFiles([nextPath]);
      const info = await ensurePdfInfo(nextPath);

      if (tool === 'split') {
        patchToolForm('split', { pdfPath: nextPath, outputDir: dirname(nextPath) });
      } else if (tool === 'compress') {
        patchToolForm('compress', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-compressed') });
      } else if (tool === 'rotate') {
        patchToolForm('rotate', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-rotated') });
      } else if (tool === 'reorder') {
        patchToolForm('reorder', {
          pdfPath: nextPath,
          outputPath: withSuffix(nextPath, '-reordered'),
          pageOrder: Array.from({ length: info.pageCount }, (_, index) => index),
        });
      } else if (tool === 'metadata') {
        patchToolForm('metadata', {
          pdfPath: nextPath,
          outputPath: withSuffix(nextPath, '-metadata'),
          title: info.title,
          author: info.author,
          subject: info.subject,
        });
      } else if (tool === 'watermark') {
        patchToolForm('watermark', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-watermarked') });
      } else if (tool === 'password') {
        patchToolForm('password', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-secured') });
      } else if (tool === 'extractText') {
        patchToolForm('extractText', { pdfPath: nextPath, outputPath: withSuffix(nextPath, '-text', 'txt') });
      }
    },
    [addRecentFiles, ensurePdfInfo, patchToolForm, pickFiles],
  );

  const highlightedRotatePages = useMemo(() => {
    const filePath = toolForms.rotate.pdfPath;
    const pageCount = filePath ? pdfInfoCache[filePath]?.pageCount ?? 0 : 0;
    if (!pageCount) {
      return [];
    }
    try {
      return parsePageSelection(toolForms.rotate.pageSelection, pageCount).map((page) => page + 1);
    } catch {
      return [];
    }
  }, [pdfInfoCache, toolForms.rotate.pageSelection, toolForms.rotate.pdfPath]);

  const highlightedWatermarkPages = useMemo(() => {
    const filePath = toolForms.watermark.pdfPath;
    const pageCount = filePath ? pdfInfoCache[filePath]?.pageCount ?? 0 : 0;
    if (!pageCount) {
      return [];
    }
    try {
      return parsePageSelection(toolForms.watermark.pageSelection, pageCount).map((page) => page + 1);
    } catch {
      return [];
    }
  }, [pdfInfoCache, toolForms.watermark.pageSelection, toolForms.watermark.pdfPath]);

  const renderPanel = () => {
    switch (activeTool) {
      case 'dashboard':
        return <DashboardPanel history={history} recentFiles={recentFiles} onSelectTool={setActiveTool} />;
      case 'pdf-to-image':
        return (
          <PdfToImagePanel
            form={toolForms.pdfToImage}
            onPatch={(partial) => patchToolForm('pdfToImage', partial)}
            onSelectFiles={(paths) => {
              patchToolForm('pdfToImage', { pdfPaths: paths, outputDir: dirname(paths[0]) });
              addRecentFiles(paths);
            }}
            onPickFiles={async () => {
              const paths = await pickFiles('Choose PDFs', ['pdf'], true);
              if (paths.length > 0) {
                patchToolForm('pdfToImage', { pdfPaths: paths, outputDir: dirname(paths[0]) });
                addRecentFiles(paths);
              }
            }}
            onPickDirectory={async () => patchToolForm('pdfToImage', { outputDir: await pickDirectory('Choose output folder') })}
            onRun={() => executeOperation('pdf-to-image', toolForms.pdfToImage, toolForms.pdfToImage.pdfPaths)}
          />
        );
      case 'image-to-pdf':
        return (
          <ImageToPdfPanel
            form={toolForms.imageToPdf}
            onPatch={(partial) => patchToolForm('imageToPdf', partial)}
            onSelectFiles={(paths) => {
              patchToolForm('imageToPdf', { imagePaths: paths, outputPath: withSuffix(paths[0], '-merged', 'pdf') });
              addRecentFiles(paths);
            }}
            onPickFiles={async () => {
              const paths = await pickFiles('Choose images', ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tif', 'tiff'], true);
              if (paths.length > 0) {
                patchToolForm('imageToPdf', { imagePaths: paths, outputPath: withSuffix(paths[0], '-merged', 'pdf') });
                addRecentFiles(paths);
              }
            }}
            onPickOutput={async () =>
              patchToolForm('imageToPdf', {
                outputPath: await pickSavePath('Save PDF', toolForms.imageToPdf.outputPath || 'images.pdf', ['pdf']),
              })
            }
            onRun={() => executeOperation('image-to-pdf', toolForms.imageToPdf, toolForms.imageToPdf.imagePaths)}
          />
        );
      case 'merge':
        return (
          <MergePanel
            form={toolForms.merge}
            onPatch={(partial) => patchToolForm('merge', partial)}
            onSelectFiles={(paths) => {
              patchToolForm('merge', { pdfPaths: paths, outputPath: withSuffix(paths[0], '-merged') });
              addRecentFiles(paths);
            }}
            onPickFiles={async () => {
              const paths = await pickFiles('Choose PDFs', ['pdf'], true);
              if (paths.length > 0) {
                patchToolForm('merge', { pdfPaths: paths, outputPath: withSuffix(paths[0], '-merged') });
                addRecentFiles(paths);
              }
            }}
            onPickOutput={async () =>
              patchToolForm('merge', {
                outputPath: await pickSavePath('Save merged PDF', toolForms.merge.outputPath || 'merged.pdf', ['pdf']),
              })
            }
            onRun={() => executeOperation('merge', toolForms.merge, toolForms.merge.pdfPaths)}
          />
        );
      case 'split':
        return (
          <SplitPanel
            form={toolForms.split}
            onPatch={(partial) => patchToolForm('split', partial)}
            onPickPdf={() => selectPdfForTool('split')}
            onSelectPdf={(path) => selectPdfForTool('split', path)}
            onPickDirectory={async () => patchToolForm('split', { outputDir: await pickDirectory('Choose output folder') })}
            onRun={() => executeOperation('split', toolForms.split, [toolForms.split.pdfPath])}
          />
        );
      case 'compress':
        return (
          <CompressPanel
            form={toolForms.compress}
            onPatch={(partial) => patchToolForm('compress', partial)}
            onPickPdf={() => selectPdfForTool('compress')}
            onSelectPdf={(path) => selectPdfForTool('compress', path)}
            onPickOutput={async () =>
              patchToolForm('compress', {
                outputPath: await pickSavePath('Save compressed PDF', toolForms.compress.outputPath || 'compressed.pdf', ['pdf']),
              })
            }
            onRun={() => executeOperation('compress', toolForms.compress, [toolForms.compress.pdfPath])}
          />
        );
      case 'rotate':
        return (
          <RotatePanel
            form={toolForms.rotate}
            highlightedPages={highlightedRotatePages}
            onPatch={(partial) => patchToolForm('rotate', partial)}
            onPickPdf={() => selectPdfForTool('rotate')}
            onSelectPdf={(path) => selectPdfForTool('rotate', path)}
            onPickOutput={async () =>
              patchToolForm('rotate', {
                outputPath: await pickSavePath('Save rotated PDF', toolForms.rotate.outputPath || 'rotated.pdf', ['pdf']),
              })
            }
            onRun={() => executeOperation('rotate', toolForms.rotate, [toolForms.rotate.pdfPath])}
          />
        );
      case 'reorder':
        return (
          <ReorderPanel
            form={toolForms.reorder}
            onPatch={(partial) => patchToolForm('reorder', partial)}
            onPickPdf={() => selectPdfForTool('reorder')}
            onSelectPdf={(path) => selectPdfForTool('reorder', path)}
            onPickOutput={async () =>
              patchToolForm('reorder', {
                outputPath: await pickSavePath('Save reordered PDF', toolForms.reorder.outputPath || 'reordered.pdf', ['pdf']),
              })
            }
            onRun={() => executeOperation('reorder', toolForms.reorder, [toolForms.reorder.pdfPath])}
          />
        );
      case 'metadata':
        return (
          <MetadataPanel
            form={toolForms.metadata}
            onPatch={(partial) => patchToolForm('metadata', partial)}
            onPickPdf={() => selectPdfForTool('metadata')}
            onSelectPdf={(path) => selectPdfForTool('metadata', path)}
            onPickOutput={async () =>
              patchToolForm('metadata', {
                outputPath: await pickSavePath('Save metadata PDF', toolForms.metadata.outputPath || 'metadata.pdf', ['pdf']),
              })
            }
            onRun={() => executeOperation('metadata', toolForms.metadata, [toolForms.metadata.pdfPath])}
          />
        );
      case 'watermark':
        return (
          <WatermarkPanel
            form={toolForms.watermark}
            highlightedPages={highlightedWatermarkPages}
            onPatch={(partial) => patchToolForm('watermark', partial)}
            onPickPdf={() => selectPdfForTool('watermark')}
            onSelectPdf={(path) => selectPdfForTool('watermark', path)}
            onPickOutput={async () =>
              patchToolForm('watermark', {
                outputPath: await pickSavePath('Save watermarked PDF', toolForms.watermark.outputPath || 'watermarked.pdf', ['pdf']),
              })
            }
            onPickImage={async () => {
              const selected = (await pickFiles('Choose watermark image', ['jpg', 'jpeg', 'png', 'webp'], false))[0] ?? '';
              patchToolForm('watermark', { imagePath: selected });
            }}
            onRun={() => executeOperation('watermark', toolForms.watermark, [toolForms.watermark.pdfPath])}
          />
        );
      case 'password':
        return (
          <PasswordPanel
            form={toolForms.password}
            onPatch={(partial) => patchToolForm('password', partial)}
            onPickPdf={() => selectPdfForTool('password')}
            onSelectPdf={(path) => selectPdfForTool('password', path)}
            onPickOutput={async () =>
              patchToolForm('password', {
                outputPath: await pickSavePath('Save secured PDF', toolForms.password.outputPath || 'secured.pdf', ['pdf']),
              })
            }
            onRun={() => executeOperation('password', toolForms.password, [toolForms.password.pdfPath])}
          />
        );
      case 'extract-text':
        return (
          <ExtractTextPanel
            form={toolForms.extractText}
            onPatch={(partial) => patchToolForm('extractText', partial)}
            onPickPdf={() => selectPdfForTool('extractText')}
            onSelectPdf={(path) => selectPdfForTool('extractText', path)}
            onPickOutput={async () =>
              patchToolForm('extractText', {
                outputPath: await pickSavePath(
                  'Save extracted text',
                  toolForms.extractText.outputPath || 'extracted.txt',
                  [toolForms.extractText.format],
                ),
              })
            }
            onRun={() => executeOperation('extract-text', toolForms.extractText, [toolForms.extractText.pdfPath])}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activeTool={activeTool} onSelect={setActiveTool} theme={theme} onToggleTheme={toggleTheme} />
      <main className="workspace">
        <header className="workspace__header">
          <div>
            <span className="eyebrow">Privacy-first desktop suite</span>
            <h2>{TOOL_TITLES[activeTool]}</h2>
          </div>
          <div className="workspace__actions">
            <button type="button" className="button button--ghost" onClick={undo}>
              <Undo2 size={16} />
              Undo
            </button>
            <button type="button" className="button button--ghost" onClick={redo}>
              <RefreshCw size={16} />
              Redo
            </button>
            <button type="button" className="button button--secondary" onClick={exportHistory}>
              <Download size={16} />
              Export history
            </button>
          </div>
        </header>

        <ProgressBanner progress={currentProgress} />

        {notice ? <div className={`notice notice--${notice.kind}`}>{notice.text}</div> : null}

        <div className="workspace__body">
          <section className="workspace__main">{renderPanel()}</section>
          <aside className="workspace__rail">
            <Section title="Recent Files">
              {recentFiles.length === 0 ? (
                <div className="panel-empty">No recent files tracked yet.</div>
              ) : (
                <div className="rail-list">
                  {recentFiles.slice(0, 10).map((filePath) => (
                    <button key={filePath} type="button" className="rail-list__item" onClick={() => window.pdfToolkit.revealInFolder(filePath)}>
                      <strong>{basename(filePath)}</strong>
                      <span>{filePath}</span>
                    </button>
                  ))}
                </div>
              )}
            </Section>
            <Section title="Operation History" description="Most recent jobs on this machine.">
              {history.length === 0 ? (
                <div className="panel-empty">Completed operations will appear here.</div>
              ) : (
                <div className="history-rail">
                  {history.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="history-rail__item">
                      <div className="history-rail__head">
                        <History size={14} />
                        <strong>{TOOL_TITLES[entry.operation]}</strong>
                      </div>
                      <p>{entry.summary}</p>
                      <small>{new Date(entry.createdAt).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section title="Quick Start">
              <div className="notes-list">
                <div><FolderOpen size={16} /><span>Drag files into any module to skip the file picker.</span></div>
                <div><RefreshCw size={16} /><span>`Ctrl/Cmd + Z` and `Ctrl/Cmd + Y` undo and redo form changes.</span></div>
                <div><Download size={16} /><span>`Ctrl/Cmd + E` exports the local history log.</span></div>
              </div>
            </Section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
