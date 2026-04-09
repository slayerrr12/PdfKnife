import fs from 'node:fs/promises';
import path from 'node:path';

const releaseDir = path.resolve('release');
const cmdPath = path.join(releaseDir, 'Offline PDF Toolkit Uninstaller.cmd');
const txtPath = path.join(releaseDir, 'Offline PDF Toolkit Uninstaller.txt');

const cmdContents = `@echo off
setlocal

set "CANDIDATE1=%LOCALAPPDATA%\\Programs\\Offline PDF Toolkit\\Uninstall Offline PDF Toolkit.exe"
set "CANDIDATE2=%ProgramFiles%\\Offline PDF Toolkit\\Uninstall Offline PDF Toolkit.exe"
set "CANDIDATE3=%ProgramFiles(x86)%\\Offline PDF Toolkit\\Uninstall Offline PDF Toolkit.exe"

if exist "%CANDIDATE1%" (
  start "" "%CANDIDATE1%"
  exit /b 0
)

if exist "%CANDIDATE2%" (
  start "" "%CANDIDATE2%"
  exit /b 0
)

if exist "%CANDIDATE3%" (
  start "" "%CANDIDATE3%"
  exit /b 0
)

echo Offline PDF Toolkit is not installed in a standard location.
echo.
echo If you installed it, uninstall it from:
echo   Settings ^> Apps ^> Installed apps ^> Offline PDF Toolkit
echo.
echo If you are using the portable build, delete this folder:
echo   %~dp0win-unpacked
echo.
pause
`;

const txtContents = `Offline PDF Toolkit uninstall options

1. Installed app:
   Open Windows Settings > Apps > Installed apps > Offline PDF Toolkit > Uninstall

2. Uninstall helper:
   Run "Offline PDF Toolkit Uninstaller.cmd" from this release folder

3. Portable build:
   Delete the "win-unpacked" folder if you are only using the unpacked app
`;

await fs.mkdir(releaseDir, { recursive: true });
await fs.writeFile(cmdPath, cmdContents, 'utf8');
await fs.writeFile(txtPath, txtContents, 'utf8');

console.log(`Created uninstall helper at ${cmdPath}`);
