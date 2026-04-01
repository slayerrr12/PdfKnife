# Assets

This folder stores offline packaging assets and optional helper binaries.

## Expected Layout

```text
assets/
  binaries/
    qpdf/
      windows/
        qpdf.exe
    tesseract/
      tessdata/
        eng.traineddata.gz
  packages/
    *.zip
```

`pdf-poppler` is installed through npm and bundled as part of the app dependencies, so there is no separate Poppler placement step in this repo.
