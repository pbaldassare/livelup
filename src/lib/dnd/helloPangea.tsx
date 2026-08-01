import { useMemo, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type {
  DraggableProvidedDraggableProps,
  DraggableStateSnapshot,
  DragStart,
  DropResult,
} from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

/** Shared portal root so drag previews escape overflow/transform containers. */
function getDndPortal(): HTMLElement {
  const existing = document.getElementById('livelapp-dnd-portal');
  if (existing) return existing;
  const el = document.createElement('div');
  el.id = 'livelapp-dnd-portal';
  el.style.position = 'absolute';
  el.style.top = '0';
  el.style.left = '0';
  el.style.width = '0';
  el.style.height = '0';
  el.style.zIndex = '9999';
  document.body.appendChild(el);
  return el;
}

/**
 * Portal the dragging node to document.body so it is not clipped by
 * overflow/transform ancestors (dialogs, scroll areas, cards).
 */
export function portalWhileDragging(
  snapshot: DraggableStateSnapshot,
  node: ReactElement,
): ReactElement {
  if (typeof document === 'undefined' || !snapshot.isDragging) return node;
  return createPortal(node, getDndPortal());
}

/** Keep transform/position from hello-pangea; kill conflicting transitions. */
export function getDraggingStyle(
  style: DraggableProvidedDraggableProps['style'],
  snapshot: DraggableStateSnapshot,
): CSSProperties | undefined {
  if (!style) return undefined;
  if (snapshot.isDragging || snapshot.isDropAnimating) {
    return {
      ...style,
      transition: snapshot.isDropAnimating ? style.transition : 'none',
    };
  }
  return style;
}

/** ~44px touch target + touch-action:none to avoid scroll fights on mobile. */
export const dndDragHandleClassName = cn(
  'flex flex-col items-center justify-center gap-0.5 shrink-0',
  'min-h-11 min-w-11 rounded-md',
  'cursor-grab active:cursor-grabbing touch-none select-none',
  'text-muted-foreground hover:text-foreground hover:bg-muted/60',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

export function dndDraggableClassName(
  snapshot: DraggableStateSnapshot,
  ...extra: Array<string | false | null | undefined>
): string {
  return cn(
    snapshot.isDragging
      ? 'z-50 shadow-xl ring-2 ring-primary/40 bg-card opacity-95 !transition-none'
      : 'transition-shadow',
    snapshot.isDropAnimating && '!transition-none',
    ...extra,
  );
}

export function dndDroppableClassName(
  isDraggingOver: boolean,
  ...extra: Array<string | false | null | undefined>
): string {
  return cn(
    'rounded-lg p-1 min-h-[4px]',
    isDraggingOver && 'bg-accent/40 ring-1 ring-inset ring-primary/25',
    ...extra,
  );
}

/** Visible drop gap under the list placeholder. */
export function DndPlaceholder({
  placeholder,
  isDraggingOver,
}: {
  placeholder: ReactNode;
  isDraggingOver?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative',
        isDraggingOver &&
          '[&>[data-rbd-placeholder-context-id]]:min-h-[3.25rem] [&>[data-rbd-placeholder-context-id]]:rounded-lg [&>[data-rbd-placeholder-context-id]]:border [&>[data-rbd-placeholder-context-id]]:border-dashed [&>[data-rbd-placeholder-context-id]]:border-primary/40 [&>[data-rbd-placeholder-context-id]]:bg-primary/5',
      )}
    >
      {placeholder}
    </div>
  );
}

/** Tracks active drag id so expanded rows can collapse while dragging. */
export function useDndSessionState() {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  return useMemo(
    () => ({
      draggingId,
      onDragStart: (start: DragStart) => setDraggingId(start.draggableId),
      wrapDragEnd:
        (handler: (result: DropResult) => void) =>
        (result: DropResult) => {
          setDraggingId(null);
          handler(result);
        },
    }),
    [draggingId],
  );
}
