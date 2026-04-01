import fs from 'node:fs';
import path from 'node:path';

import AdmZip from 'adm-zip';

const projectRoot = process.cwd();
const packagesDir = path.join(projectRoot, 'assets', 'packages');
const binariesDir = path.join(projectRoot, 'assets', 'binaries');

if (!fs.existsSync(packagesDir)) {
  console.log('No assets/packages directory found. Nothing to extract.');
  process.exit(0);
}

const archives = fs
  .readdirSync(packagesDir)
  .filter((entry) => entry.toLowerCase().endsWith('.zip'))
  .map((entry) => path.join(packagesDir, entry));

if (archives.length === 0) {
  console.log('No zip archives found in assets/packages.');
  process.exit(0);
}

fs.mkdirSync(binariesDir, { recursive: true });

for (const archivePath of archives) {
  const name = path.basename(archivePath, '.zip');
  const targetDir = path.join(binariesDir, name);
  fs.mkdirSync(targetDir, { recursive: true });
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(targetDir, true);
  console.log(`Extracted ${path.basename(archivePath)} -> ${targetDir}`);
}
