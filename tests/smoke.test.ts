import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import sharp from 'sharp';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

import { executeOperation } from '../services/operations';
import { loadPdf } from '../services/pdf-utils';
import type { ProgressReporter } from '../services/progress';
import type { WorkerRuntimeContext } from '../services/contracts';

const execFileAsync = promisify(execFile);

const reporter: ProgressReporter = {
  report() {
    // Smoke tests only assert results, not progress updates.
  },
};

async function createTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createFixturePdf(filePath: string, labels: string[]): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  labels.forEach((label, index) => {
    const page = pdf.addPage([595, 842]);
    page.drawText(label, {
      x: 48,
      y: 760,
      size: 28,
      font,
      color: rgb(0.1, 0.2, 0.8),
    });
    page.drawText(`Body ${index + 1}`, {
      x: 48,
      y: 710,
      size: 18,
      font,
      color: rgb(0.15, 0.2, 0.25),
    });
  });

  await fs.writeFile(filePath, await pdf.save());
}

async function createFixtureImage(filePath: string, color: string, label: string): Promise<void> {
  const svg = `
    <svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}" />
      <text x="60" y="310" font-size="72" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif">${label}</text>
    </svg>
  `;
  await sharp(Buffer.from(svg)).png().toFile(filePath);
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function createRuntime(baseDir: string): WorkerRuntimeContext {
  return {
    appPath: process.cwd(),
    resourcesPath: process.cwd(),
    userDataPath: baseDir,
    isPackaged: false,
  };
}

test('core structural PDF workflows succeed on generated fixtures', async () => {
  const workspace = await createTempDir('pdfknife-structural-');
  const runtime = createRuntime(workspace);

  try {
    const pdfA = path.join(workspace, 'alpha.pdf');
    const pdfB = path.join(workspace, 'beta.pdf');
    const img1 = path.join(workspace, 'cover.png');
    const img2 = path.join(workspace, 'appendix.png');

    await createFixturePdf(pdfA, ['Alpha page 1', 'Alpha page 2', 'Alpha page 3']);
    await createFixturePdf(pdfB, ['Beta page 1', 'Beta page 2']);
    await createFixtureImage(img1, '#1374d4', 'Cover');
    await createFixtureImage(img2, '#0f9f74', 'Appendix');

    const imagesToPdf = path.join(workspace, 'images.pdf');
    await executeOperation(
      runtime,
      'image-to-pdf',
      {
        imagePaths: [img1, img2],
        outputPath: imagesToPdf,
        pageSize: 'A4',
        margins: 18,
        orientation: 'auto',
      },
      reporter,
    );
    const imagePdfDoc = await loadPdf(imagesToPdf);
    assert.equal(imagePdfDoc.getPageCount(), 2);

    const mergedPath = path.join(workspace, 'merged.pdf');
    await executeOperation(
      runtime,
      'merge',
      {
        pdfPaths: [pdfA, pdfB, imagesToPdf],
        outputPath: mergedPath,
      },
      reporter,
    );
    const mergedDoc = await loadPdf(mergedPath);
    assert.equal(mergedDoc.getPageCount(), 7);

    const splitDir = path.join(workspace, 'split');
    const splitResult = await executeOperation(
      runtime,
      'split',
      {
        pdfPath: mergedPath,
        outputDir: splitDir,
        mode: 'range',
        ranges: [
          { label: 'front', range: '1-2' },
          { label: 'rest', range: '3-7' },
        ],
        pageSelection: '1',
      },
      reporter,
    );
    assert.equal(splitResult.outputPaths.length, 2);
    assert.equal((await loadPdf(splitResult.outputPaths[0])).getPageCount(), 2);
    assert.equal((await loadPdf(splitResult.outputPaths[1])).getPageCount(), 5);

    const rotatePath = path.join(workspace, 'rotated.pdf');
    await executeOperation(
      runtime,
      'rotate',
      {
        pdfPath: pdfA,
        outputPath: rotatePath,
        pageSelection: '1,3',
        angle: 90,
      },
      reporter,
    );
    const rotatedDoc = await loadPdf(rotatePath);
    assert.equal(rotatedDoc.getPage(0).getRotation().angle, 90);
    assert.equal(rotatedDoc.getPage(1).getRotation().angle, 0);
    assert.equal(rotatedDoc.getPage(2).getRotation().angle, 90);

    const reorderedPath = path.join(workspace, 'reordered.pdf');
    await executeOperation(
      runtime,
      'reorder',
      {
        pdfPath: pdfA,
        outputPath: reorderedPath,
        pageOrder: [2, 1, 0],
      },
      reporter,
    );
    const extractedPath = path.join(workspace, 'reordered.txt');
    await executeOperation(
      runtime,
      'extract-text',
      {
        pdfPath: reorderedPath,
        outputPath: extractedPath,
        format: 'txt',
        useOcr: false,
        ocrLanguage: 'eng',
      },
      reporter,
    );
    const extractedText = await fs.readFile(extractedPath, 'utf8');
    assert.match(extractedText, /Alpha page 3/);
    assert.ok(extractedText.indexOf('Alpha page 3') < extractedText.indexOf('Alpha page 1'));

    const metadataPath = path.join(workspace, 'metadata.pdf');
    await executeOperation(
      runtime,
      'metadata',
      {
        pdfPath: pdfA,
        outputPath: metadataPath,
        title: 'Fixture Title',
        author: 'Fixture Author',
        subject: 'Fixture Subject',
        keywords: 'one,two',
        producer: 'PdfKnife Tests',
        creator: 'Smoke Suite',
        clearAll: false,
      },
      reporter,
    );
    const metadataDoc = await loadPdf(metadataPath, { ignoreEncryption: true });
    assert.equal(metadataDoc.getTitle(), 'Fixture Title');
    assert.equal(metadataDoc.getAuthor(), 'Fixture Author');

    const watermarkPath = path.join(workspace, 'watermarked.pdf');
    await executeOperation(
      runtime,
      'watermark',
      {
        pdfPath: pdfA,
        outputPath: watermarkPath,
        type: 'text',
        pageSelection: 'all',
        text: 'CONFIDENTIAL',
        imagePath: '',
        opacity: 0.25,
        rotation: -30,
        position: 'center',
        fontSize: 36,
        color: '#ff5500',
        scale: 0.4,
      },
      reporter,
    );
    assert.ok(await fileExists(watermarkPath));
    assert.equal((await loadPdf(watermarkPath)).getPageCount(), 3);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test('raster and compression workflows generate outputs', async () => {
  const workspace = await createTempDir('pdfknife-raster-');
  const runtime = createRuntime(workspace);

  try {
    const sourcePdf = path.join(workspace, 'source.pdf');
    await createFixturePdf(sourcePdf, ['Raster page 1', 'Raster page 2']);

    const imageDir = path.join(workspace, 'images');
    const pdfToImage = await executeOperation(
      runtime,
      'pdf-to-image',
      {
        pdfPaths: [sourcePdf],
        outputDir: imageDir,
        format: 'png',
        pageSelection: 'all',
        dpi: 120,
        quality: 84,
      },
      reporter,
    );
    assert.equal(pdfToImage.outputPaths.length, 2);
    for (const imagePath of pdfToImage.outputPaths) {
      assert.ok(await fileExists(imagePath));
    }

    const compressedPath = path.join(workspace, 'compressed.pdf');
    await executeOperation(
      runtime,
      'compress',
      {
        pdfPath: sourcePdf,
        outputPath: compressedPath,
        level: 'medium',
        grayscale: false,
      },
      reporter,
    );
    const compressedDoc = await loadPdf(compressedPath);
    assert.equal(compressedDoc.getPageCount(), 2);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test('password workflow reports a clear setup error when qpdf is unavailable', async () => {
  const workspace = await createTempDir('pdfknife-password-');
  const runtime = createRuntime(workspace);
  const sourcePdf = path.join(workspace, 'source.pdf');

  try {
    await createFixturePdf(sourcePdf, ['Password page 1']);

    let qpdfAvailable = true;
    try {
      await execFileAsync('qpdf', ['--version']);
    } catch {
      qpdfAvailable = false;
    }

    if (qpdfAvailable) {
      const protectedPath = path.join(workspace, 'protected.pdf');
      const unprotectedPath = path.join(workspace, 'unprotected.pdf');

      await executeOperation(
        runtime,
        'password',
        {
          pdfPath: sourcePdf,
          outputPath: protectedPath,
          mode: 'add',
          password: 'secret123',
          ownerPassword: 'owner123',
        },
        reporter,
      );
      assert.ok(await fileExists(protectedPath));

      await executeOperation(
        runtime,
        'password',
        {
          pdfPath: protectedPath,
          outputPath: unprotectedPath,
          mode: 'remove',
          password: 'secret123',
          ownerPassword: '',
        },
        reporter,
      );
      assert.ok(await fileExists(unprotectedPath));
    } else {
      await assert.rejects(
        () =>
          executeOperation(
            runtime,
            'password',
            {
              pdfPath: sourcePdf,
              outputPath: path.join(workspace, 'protected.pdf'),
              mode: 'add',
              password: 'secret123',
              ownerPassword: '',
            },
            reporter,
          ),
        /QPDF binary is missing/i,
      );
    }
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});
