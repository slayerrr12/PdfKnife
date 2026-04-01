# Offline PDF Toolkit

Offline PDF Toolkit is a privacy-first Electron desktop app for converting, editing, protecting, and managing PDFs without sending any file to a server.

## Highlights

- `PDF -> Image` with JPG, PNG, and WebP export
- `Image -> PDF` with margins, page size, and orientation control
- `Merge`, `Split`, `Rotate`, and `Reorder` workflows
- `Metadata` editing and privacy cleanup
- `Watermark` support for text or images
- `Password` add/remove support through local `qpdf`
- `Text extraction` with optional offline OCR fallback through `tesseract.js`
- Worker-thread execution for heavy jobs
- Drag-and-drop UI, thumbnail previews, dark/light mode, undo/redo, and local operation history

## Tech Stack

- Electron
- React + Vite
- Node.js worker threads
- `pdf-lib` for structural edits
- `pdfjs-dist` for previews and embedded text extraction
- `pdf-poppler` for PDF rasterization
- `sharp` for image optimization
- `tesseract.js` for optional OCR

## Project Structure

```text
electron-main/     Electron main process and preload bridge
renderer/          React application and UI components
services/          Modular PDF operation services
workers/           Worker thread entry points
assets/            Offline binary and packaging assets
scripts/           Helper scripts for binary preparation
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the desktop app

```bash
npm run dev
```

### 3. Verify the codebase

```bash
npm run lint
npm run build
```

## Packaging a Windows Executable

```bash
npm run dist:win
```

The packaged installer will be written to `release/`.

## Offline Binary Notes

### Password workflows

`Add password` and `Remove password` rely on `qpdf`. Put `qpdf.exe` in either:

- `assets/binaries/qpdf/windows/qpdf.exe`
- `assets/binaries/qpdf/qpdf.exe`

If `qpdf` is already on the system `PATH`, the app will use that as a fallback.

### OCR workflows

To keep OCR fully offline, store Tesseract language packs under:

- `assets/binaries/tesseract/tessdata/eng.traineddata.gz`

You can add more languages beside `eng` as needed.

### Preparing bundled binaries from zip archives

If you keep vendor zip files locally, use:

```bash
node scripts/prepare-binaries.mjs
```

The script extracts archives from `assets/packages/` into `assets/binaries/`.

## Architecture Overview

### Electron shell

- `electron-main/main.ts` creates the desktop window and owns IPC handlers.
- `electron-main/preload.ts` exposes a minimal typed bridge to the renderer.

### Renderer

- `renderer/src/App.tsx` provides the shell layout, history rail, and tool routing.
- Panel components under `renderer/src/components/panels/` keep each workflow isolated.
- Thumbnail previews use `pdfjs-dist` directly in the renderer for responsive feedback.

### Services and workers

- `workers/task-worker.ts` executes heavy jobs off the UI thread.
- `services/operations.ts` dispatches requests to the individual PDF modules.
- Shared helpers cover page parsing, temp file handling, image fitting, rasterization, and process execution.

## Current Implementation Notes

- Compression uses a raster-rebuild strategy, which is effective for image-heavy PDFs but may reduce text/vector fidelity.
- OCR activates only when local Tesseract language packs are available.
- Password features depend on local `qpdf` availability.

## Suggested Next Steps

- Bundle signed Windows binaries for `qpdf` and Tesseract language data
- Add cancellation support for long-running jobs
- Introduce thumbnail virtualization for very large documents
- Expand OCR language management inside the UI
