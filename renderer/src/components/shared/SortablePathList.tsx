import { CSS } from '@dnd-kit/utilities';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, X } from 'lucide-react';

import { basename } from '../../utils/paths';

interface SortablePathListProps {
  paths: string[];
  onReorder: (paths: string[]) => void;
  onRemove?: (path: string) => void;
}

function SortableRow({ id, onRemove }: { id: string; onRemove?: (path: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className="sortable-row"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button type="button" className="sortable-row__grip" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>
      <div className="sortable-row__meta">
        <strong>{basename(id)}</strong>
        <span>{id}</span>
      </div>
      {onRemove ? (
        <button type="button" className="icon-button" onClick={() => onRemove(id)}>
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function SortablePathList({ paths, onReorder, onRemove }: SortablePathListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    const oldIndex = paths.indexOf(String(event.active.id));
    const newIndex = paths.indexOf(String(event.over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onReorder(arrayMove(paths, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={paths} strategy={verticalListSortingStrategy}>
        <div className="sortable-list">
          {paths.map((filePath) => (
            <SortableRow key={filePath} id={filePath} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
