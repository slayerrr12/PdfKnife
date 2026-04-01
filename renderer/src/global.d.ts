import type { DesktopBridge } from '@services/contracts';

declare global {
  interface Window {
    pdfToolkit: DesktopBridge;
  }
}

export {};
