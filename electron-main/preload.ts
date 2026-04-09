import { contextBridge, ipcRenderer } from 'electron';

import type {
  DesktopBridge,
  FileDialogOptions,
  OperationKind,
  OperationPayloadMap,
  WorkerTaskProgress,
} from '../services/contracts';

const bridge: DesktopBridge = {
  pickPath(options: FileDialogOptions) {
    return ipcRenderer.invoke('dialog:pickPath', options);
  },
  runOperation<K extends OperationKind>(operation: K, payload: OperationPayloadMap[K]) {
    return ipcRenderer.invoke('operation:run', operation, payload);
  },
  cancelCurrentOperation(reason?: string) {
    return ipcRenderer.invoke('operation:cancelCurrent', reason);
  },
  onTaskProgress(listener: (progress: WorkerTaskProgress) => void) {
    const wrapped = (_event: Electron.IpcRendererEvent, progress: WorkerTaskProgress) => {
      listener(progress);
    };
    ipcRenderer.on('task:progress', wrapped);
    return () => {
      ipcRenderer.removeListener('task:progress', wrapped);
    };
  },
  getPdfInfo(filePath: string) {
    return ipcRenderer.invoke('pdf:getInfo', filePath);
  },
  readFileBuffer(filePath: string) {
    return ipcRenderer.invoke('file:readBuffer', filePath);
  },
  getUserDataPath() {
    return ipcRenderer.invoke('app:getUserDataPath');
  },
  exportJson(defaultPath: string, payload: unknown) {
    return ipcRenderer.invoke('app:exportJson', defaultPath, payload);
  },
  revealInFolder(targetPath: string) {
    return ipcRenderer.invoke('app:revealInFolder', targetPath);
  },
};

contextBridge.exposeInMainWorld('pdfToolkit', bridge);
