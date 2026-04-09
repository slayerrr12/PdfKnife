import fs from 'node:fs/promises';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';

import type {
  BaseOperationResult,
  FileDialogOptions,
  FileDialogResult,
  OperationKind,
  OperationPayloadMap,
  WorkerRuntimeContext,
  WorkerTaskEvent,
  WorkerTaskRequest,
} from '../services/contracts';
import { APP_NAME } from '../services/constants';
import { loadPdf } from '../services/pdf-utils';

let mainWindow: BrowserWindow | null = null;
let activeTask:
  | {
      taskId: string;
      cancel: (reason: string) => Promise<void>;
    }
  | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#0b1020',
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  return win;
}

function getRuntimeContext(): WorkerRuntimeContext {
  return {
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
    userDataPath: app.getPath('userData'),
    isPackaged: app.isPackaged,
  };
}

function getWorkerPath(): string {
  return path.join(__dirname, '..', 'workers', 'task-worker.js');
}

async function cancelActiveTask(reason = 'Operation canceled.'): Promise<boolean> {
  const task = activeTask;
  if (!task) {
    return false;
  }

  activeTask = null;
  await task.cancel(reason);
  return true;
}

async function runOperationInWorker<K extends OperationKind>(
  win: BrowserWindow,
  operation: K,
  payload: OperationPayloadMap[K],
): Promise<BaseOperationResult> {
  const taskId = `${operation}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const request: WorkerTaskRequest<K> = {
    taskId,
    operation,
    payload,
    runtime: getRuntimeContext(),
  };

  return new Promise((resolve, reject) => {
    const worker = new Worker(getWorkerPath(), {
      workerData: request,
    });
    let settled = false;

    const clearTask = () => {
      if (activeTask?.taskId === taskId) {
        activeTask = null;
      }
    };

    const finalize = async (handler: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTask();
      handler();

      try {
        await worker.terminate();
      } catch {
        // Worker may already be exiting.
      }
    };

    activeTask = {
      taskId,
      cancel: async (reason: string) => {
        await finalize(() => reject(new Error(reason)));
      },
    };

    worker.on('message', (event: WorkerTaskEvent) => {
      if (event.type === 'progress') {
        win.webContents.send('task:progress', event.payload);
        return;
      }

      if (event.type === 'done') {
        void finalize(() => resolve(event.payload.result));
        return;
      }

      void finalize(() => reject(new Error(event.payload.error)));
    });

    worker.on('error', (error) => {
      void finalize(() => reject(error));
    });

    worker.on('exit', (code) => {
      clearTask();
      if (!settled && code !== 0) {
        settled = true;
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

async function openPathDialog(parentWindow: BrowserWindow, options: FileDialogOptions): Promise<FileDialogResult> {
  if (options.type === 'directory') {
    const result = await dialog.showOpenDialog(parentWindow, {
      title: options.title,
      defaultPath: options.defaultPath,
      properties: options.properties ?? ['openDirectory'],
    });
    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  }

  if (options.type === 'save') {
    const result = await dialog.showSaveDialog(parentWindow, {
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters,
    });
    return {
      canceled: result.canceled,
      filePaths: result.filePath ? [result.filePath] : [],
      filePath: result.filePath,
    };
  }

  const result = await dialog.showOpenDialog(parentWindow, {
    title: options.title,
    defaultPath: options.defaultPath,
    properties: options.properties ?? ['openFile'],
    filters: options.filters,
  });
  return {
    canceled: result.canceled,
    filePaths: result.filePaths,
  };
}

app.whenReady().then(() => {
  mainWindow = createWindow();

  ipcMain.handle('dialog:pickPath', async (_event, options: FileDialogOptions) => {
    return openPathDialog(mainWindow!, options);
  });

  ipcMain.handle(
    'operation:run',
    async (_event, operation: OperationKind, payload: OperationPayloadMap[OperationKind]) => {
      if (!mainWindow) {
        throw new Error('Main window is unavailable.');
      }
      await cancelActiveTask('Previous operation canceled because a new one started.');
      return runOperationInWorker(mainWindow, operation, payload);
    },
  );

  ipcMain.handle('operation:cancelCurrent', async (_event, reason?: string) =>
    cancelActiveTask(reason ?? 'Operation canceled by user.'),
  );

  ipcMain.handle('pdf:getInfo', async (_event, filePath: string) => {
    let encrypted = false;
    let pdf;

    try {
      pdf = await loadPdf(filePath);
    } catch {
      encrypted = true;
      pdf = await loadPdf(filePath, { ignoreEncryption: true });
    }

    return {
      filePath,
      pageCount: pdf.getPageCount(),
      title: pdf.getTitle() ?? '',
      author: pdf.getAuthor() ?? '',
      subject: pdf.getSubject() ?? '',
      encrypted,
    };
  });

  ipcMain.handle('file:readBuffer', async (_event, filePath: string) => {
    const buffer = await fs.readFile(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  });

  ipcMain.handle('app:getUserDataPath', async () => app.getPath('userData'));

  ipcMain.handle('app:exportJson', async (_event, defaultPath: string, payload: unknown) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export history',
      defaultPath,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await fs.writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8');
    return result.filePath;
  });

  ipcMain.handle('app:revealInFolder', async (_event, targetPath: string) => {
    shell.showItemInFolder(targetPath);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  void cancelActiveTask('Application closed.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
