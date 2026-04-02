# Offline PDF Toolkit

Offline PDF Toolkit is a privacy-first Electron desktop app with two focused offline workflows: `PDF -> Image` and `Remove Password`. Files stay on the device and are processed locally through Electron worker threads.

## Highlights

- `PDF -> Image` with JPG, PNG, and WebP export
- `Remove Password` by entering the current PDF password and exporting a clean unlocked copy
- Drag-and-drop input for both workflows
- Worker-thread execution for heavy jobs
- Offline Windows packaging with bundled `qpdf`

## Tech Stack

- Electron
- React + Vite
- Node.js worker threads
- `pdf-poppler` for PDF rasterization
- `sharp` for image optimization
- `qpdf` for offline password removal

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

Windows packaging already includes `qpdf` under `assets/binaries/qpdf/windows`.

For local development, the app can use `qpdf.exe` from either:

- `assets/binaries/qpdf/windows/qpdf.exe`
- `assets/binaries/qpdf/qpdf.exe`

If `qpdf` is already on the system `PATH`, the app will use that as a fallback.

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

- `renderer/src/App.tsx` renders a single focused screen with two cards: image conversion and password removal.
- Shared UI components handle drag-and-drop, progress, and result reveal actions.

### Services and workers

- `workers/task-worker.ts` executes heavy jobs off the UI thread.
- `services/operations.ts` dispatches requests to the active PDF modules.
- Shared helpers cover temp file handling, rasterization, process execution, and bundled binary resolution.

## Current Implementation Notes

- The current UI intentionally exposes only `PDF -> Image` and `Remove Password`.
- Password removal creates a new unlocked PDF file and never overwrites the source unless you explicitly pick the same path.
- Wrong-password and missing-binary cases surface as user-visible errors from the worker process.

## Suggested Next Steps

- Add cancellation support for long-running jobs
- Add a lightweight PDF preview before conversion or unlock
- Add an explicit success toast with an `Open folder` action
