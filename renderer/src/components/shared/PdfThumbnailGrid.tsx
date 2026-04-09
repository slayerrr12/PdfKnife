import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
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
  selectedPages?: number[];
  removedPages?: number[];
  onPageClick?: (
    pageNumber: number,
    modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
  ) => void;
}

async function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    return canvas.toDataURL('image/png');
  }

  return URL.createObjectURL(blob);
}

function PageCard({
  page,
  highlight,
  selected,
  removed,
  onClick,
  dragHandle,
  dragStyle,
}: {
  page: ThumbnailPage;
  highlight: boolean;
  selected: boolean;
  removed: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  dragHandle?: ReactNode;
  dragStyle?: CSSProperties;
}) {
  const className = [
    'thumbnail-card',
    highlight ? 'thumbnail-card--highlight' : '',
    selected ? 'thumbnail-card--selected' : '',
    removed ? 'thumbnail-card--removed' : '',
    onClick ? 'thumbnail-card--interactive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <div className="thumbnail-card__toolbar">
        <span>Page {page.pageNumber}</span>
        <div className="thumbnail-card__toolbar-actions">
          {selected ? <span className="thumbnail-card__badge">Selected</span> : null}
          {removed ? <span className="thumbnail-card__badge thumbnail-card__badge--danger">Removed</span> : null}
          {dragHandle}
        </div>
      </div>
      <img src={page.imageUrl} alt={`Preview of page ${page.pageNumber}`} />
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} style={dragStyle}>
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={dragStyle}>
      {content}
    </div>
  );
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <PageCard
        page={page}
        highlight={highlight}
        selected={false}
        removed={false}
        dragStyle={undefined}
        dragHandle={
          <span className="icon-button thumbnail-card__drag" {...attributes} {...listeners}>
            <GripVertical size={14} />
          </span>
        }
      />
    </div>
  );
}

export function PdfThumbnailGrid({
  filePath,
  pageOrder,
  onOrderChange,
  highlightedPages = [],
  selectedPages = [],
  removedPages = [],
  onPageClick,
}: PdfThumbnailGridProps) {
  const [pages, setPages] = useState<ThumbnailPage[]>([]);
  const [loadingState, setLoadingState] = useState<{ loading: boolean; total: number; rendered: number }>({
    loading: false,
    total: 0,
    rendered: 0,
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    let cancelled = false;
    let activeUrls: string[] = [];

    setPages([]);
    setLoadingState({ loading: true, total: 0, rendered: 0 });

    const render = async () => {
      const buffer = await window.pdfToolkit.readFileBuffer(filePath);
      const pdfDocument = await getDocument({
        data: buffer,
        useSystemFonts: true,
        isEvalSupported: false,
      }).promise;

      try {
        setLoadingState({ loading: true, total: pdfDocument.numPages, rendered: 0 });

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          if (cancelled) {
            break;
          }

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

          const imageUrl = await canvasToObjectUrl(canvas);
          activeUrls.push(imageUrl);

          if (!cancelled) {
            setPages((current) => [...current, { pageNumber, imageUrl }]);
            setLoadingState({ loading: true, total: pdfDocument.numPages, rendered: pageNumber });
          }

          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      } finally {
        await pdfDocument.destroy();
        if (!cancelled) {
          setLoadingState((current) => ({ ...current, loading: false }));
        }
      }
    };

    void render().catch(() => {
      if (!cancelled) {
        setLoadingState({ loading: false, total: 0, rendered: 0 });
      }
    });

    return () => {
      cancelled = true;
      activeUrls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      activeUrls = [];
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

  if (orderedPages.length === 0 && loadingState.loading) {
    return (
      <div className="panel-empty">
        Rendering page thumbnails ({loadingState.rendered}/{loadingState.total || '...'})
      </div>
    );
  }

  if (orderedPages.length === 0) {
    return <div className="panel-empty">No pages available for preview.</div>;
  }

  const grid = (
    <>
      {loadingState.loading ? (
        <div className="thumbnail-grid__status">
          Rendering page thumbnails {loadingState.rendered}/{loadingState.total}
        </div>
      ) : null}
      <div className="thumbnail-grid">
        {orderedPages.map((page) => {
          const highlight = highlightedPages.includes(page.pageNumber);
          const selected = selectedPages.includes(page.pageNumber);
          const removed = removedPages.includes(page.pageNumber);

          if (onOrderChange && pageOrder) {
            return <SortableThumb key={page.pageNumber} page={page} highlight={highlight} />;
          }

          return (
            <PageCard
              key={page.pageNumber}
              page={page}
              highlight={highlight}
              selected={selected}
              removed={removed}
              onClick={
                onPageClick
                  ? (event) =>
                      onPageClick(page.pageNumber, {
                        shiftKey: event.shiftKey,
                        metaKey: event.metaKey,
                        ctrlKey: event.ctrlKey,
                      })
                  : undefined
              }
            />
          );
        })}
      </div>
    </>
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
