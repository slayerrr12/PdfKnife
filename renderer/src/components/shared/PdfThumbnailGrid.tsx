import { useEffect, useMemo, useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ThumbnailPage {
  pageNumber: number;
  imageUrl: string;
}

interface PdfThumbnailGridProps {
  filePath: string;
  pageOrder?: number[];
  onOrderChange?: (order: number[]) => void;
  highlightedPages?: number[];
}

async function renderPdfThumbnails(filePath: string): Promise<ThumbnailPage[]> {
  const buffer = await window.pdfToolkit.readFileBuffer(filePath);
  const pdfDocument = await getDocument({
    data: buffer,
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;

  const results: ThumbnailPage[] = [];
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.24 });
    const canvas = window.document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      continue;
    }
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    results.push({
      pageNumber,
      imageUrl: canvas.toDataURL('image/png'),
    });
  }

  return results;
}

function SortableThumb({
  page,
  highlight,
}: {
  page: ThumbnailPage;
  highlight: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: page.pageNumber,
  });

  return (
    <div
      ref={setNodeRef}
      className={`thumbnail-card ${highlight ? 'thumbnail-card--highlight' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="thumbnail-card__toolbar">
        <span>Page {page.pageNumber}</span>
        <button type="button" className="icon-button" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </button>
      </div>
      <img src={page.imageUrl} alt={`Preview of page ${page.pageNumber}`} />
    </div>
  );
}

function StaticThumb({
  page,
  highlight,
}: {
  page: ThumbnailPage;
  highlight: boolean;
}) {
  return (
    <div className={`thumbnail-card ${highlight ? 'thumbnail-card--highlight' : ''}`}>
      <div className="thumbnail-card__toolbar">
        <span>Page {page.pageNumber}</span>
      </div>
      <img src={page.imageUrl} alt={`Preview of page ${page.pageNumber}`} />
    </div>
  );
}

export function PdfThumbnailGrid({
  filePath,
  pageOrder,
  onOrderChange,
  highlightedPages = [],
}: PdfThumbnailGridProps) {
  const [pages, setPages] = useState<ThumbnailPage[]>([]);
  const [loading, setLoading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    renderPdfThumbnails(filePath)
      .then((nextPages) => {
        if (!cancelled) {
          setPages(nextPages);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  const orderedPages = useMemo(() => {
    if (!pageOrder || pageOrder.length === 0) {
      return pages;
    }
    return pageOrder
      .map((pageIndex) => pages.find((page) => page.pageNumber === pageIndex + 1))
      .filter((page): page is ThumbnailPage => Boolean(page));
  }, [pageOrder, pages]);

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!onOrderChange || !overId || event.active.id === overId || !pageOrder) {
      return;
    }

    const oldIndex = pageOrder.findIndex((page) => page + 1 === event.active.id);
    const newIndex = pageOrder.findIndex((page) => page + 1 === overId);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    onOrderChange(arrayMove(pageOrder, oldIndex, newIndex));
  };

  if (!filePath) {
    return null;
  }

  if (loading) {
    return <div className="panel-empty">Rendering page thumbnails…</div>;
  }

  if (orderedPages.length === 0) {
    return <div className="panel-empty">No pages available for preview.</div>;
  }

  const grid = (
    <div className="thumbnail-grid">
      {orderedPages.map((page) =>
        onOrderChange && pageOrder ? (
          <SortableThumb
            key={page.pageNumber}
            page={page}
            highlight={highlightedPages.includes(page.pageNumber)}
          />
        ) : (
          <StaticThumb
            key={page.pageNumber}
            page={page}
            highlight={highlightedPages.includes(page.pageNumber)}
          />
        ),
      )}
    </div>
  );

  if (!onOrderChange || !pageOrder) {
    return grid;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedPages.map((page) => page.pageNumber)} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </DndContext>
  );
}
