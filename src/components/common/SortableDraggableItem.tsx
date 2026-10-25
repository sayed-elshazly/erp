import React, { useRef, useState } from 'react';
import { useLayoutOrder } from '../../context/LayoutOrderContext';
import { GripVertical } from 'lucide-react';

interface SortableDraggableItemProps {
  containerId: string;
  itemId?: string;
  id?: string;
  index: number;
  defaultIds?: string[];
  direction?: 'horizontal' | 'vertical';
  className?: string;
  showHandle?: boolean;
  handlePosition?: 'start' | 'end';
  children: React.ReactNode | ((dragHandle: React.ReactNode, isDragging: boolean) => React.ReactNode);
  disabled?: boolean;
}

export const SortableDraggableItem: React.FC<SortableDraggableItemProps> = ({
  containerId,
  itemId,
  id,
  index,
  defaultIds,
  direction = 'vertical',
  className = '',
  showHandle = false,
  handlePosition = 'start',
  children,
  disabled = false
}) => {
  const effectiveId = itemId || id || '';
  const {
    canReorder,
    activeDragItem,
    dragOverInfo,
    setActiveDragItem,
    setDragOverInfo,
    reorderItem
  } = useLayoutOrder();

  const itemRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'before' | 'after' | null>(null);

  const isCurrentDragging = activeDragItem?.containerId === containerId && activeDragItem?.id === effectiveId;
  const isTargetOver = dragOverInfo?.containerId === containerId && dragOverInfo?.id === effectiveId;

  // If user cannot reorder or component is disabled, render static wrapper
  if (!canReorder || disabled) {
    return (
      <div className={className}>
        {typeof children === 'function' ? children(null, false) : children}
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent) => {
    setActiveDragItem({
      containerId,
      id: effectiveId,
      index
    });
    e.dataTransfer.setData('text/plain', effectiveId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Strictly prevent dragging between different containers (Requirement #3)
    if (!activeDragItem || activeDragItem.containerId !== containerId) {
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!itemRef.current) return;

    const rect = itemRef.current.getBoundingClientRect();
    let isBefore = false;

    if (direction === 'horizontal') {
      const mouseX = e.clientX;
      isBefore = mouseX < rect.left + rect.width / 2;
    } else {
      const mouseY = e.clientY;
      isBefore = mouseY < rect.top + rect.height / 2;
    }

    const currentPlacement = isBefore ? 'before' : 'after';
    setPlacement(currentPlacement);
    setDragOverInfo({
      containerId,
      id: effectiveId,
      index,
      placement: currentPlacement
    });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if actually leaving the node
    if (itemRef.current && !itemRef.current.contains(e.relatedTarget as Node)) {
      setPlacement(null);
      if (dragOverInfo?.id === effectiveId) {
        setDragOverInfo(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!activeDragItem || activeDragItem.containerId !== containerId) {
      setPlacement(null);
      setDragOverInfo(null);
      setActiveDragItem(null);
      return;
    }

    const sourceIndex = activeDragItem.index;
    let targetIndex = index;

    if (placement === 'after' && sourceIndex < index) {
      targetIndex = index;
    } else if (placement === 'after' && sourceIndex > index) {
      targetIndex = index + 1;
    } else if (placement === 'before' && sourceIndex < index) {
      targetIndex = index - 1;
    }

    // Clamp within bounds
    if (defaultIds && defaultIds.length > 0) {
      targetIndex = Math.max(0, Math.min(targetIndex, defaultIds.length - 1));
    }

    if (sourceIndex !== targetIndex) {
      reorderItem(containerId, sourceIndex, targetIndex, defaultIds);
    }

    setPlacement(null);
    setDragOverInfo(null);
    setActiveDragItem(null);
  };

  const handleDragEnd = () => {
    setPlacement(null);
    setDragOverInfo(null);
    setActiveDragItem(null);
  };

  const dragHandle = (
    <div
      className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-zinc-400 hover:text-orange-500 cursor-grab active:cursor-grabbing p-1 rounded transition-opacity shrink-0 select-none"
      title="اسحب لإعادة الترتيب"
    >
      <GripVertical className="w-3.5 h-3.5" />
    </div>
  );

  return (
    <div
      ref={itemRef}
      draggable={true}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`group relative transition-all duration-200 ${
        isCurrentDragging ? 'opacity-35 scale-[0.98] blur-[0.3px]' : ''
      } ${className}`}
    >
      {/* Visual Drop Indicators (Glowing line and dot) */}
      {isTargetOver && !isCurrentDragging && (
        <>
          {direction === 'vertical' ? (
            <div
              className={`absolute left-0 right-0 h-1 z-30 pointer-events-none transition-all flex items-center justify-between ${
                placement === 'before' ? '-top-1' : '-bottom-1'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316] animate-pulse" />
              <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 shadow-[0_0_8px_#f97316]" />
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316] animate-pulse" />
            </div>
          ) : (
            <div
              className={`absolute top-0 bottom-0 w-1 z-30 pointer-events-none transition-all flex flex-col items-center justify-between ${
                placement === 'before' ? '-right-1' : '-left-1'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316] animate-pulse" />
              <div className="flex-1 w-0.5 bg-gradient-to-b from-orange-500 via-amber-400 to-orange-500 shadow-[0_0_8px_#f97316]" />
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316] animate-pulse" />
            </div>
          )}
        </>
      )}

      {/* Content Rendering */}
      {typeof children === 'function' ? (
        children(dragHandle, isCurrentDragging)
      ) : (
        <div className="flex items-center w-full">
          {showHandle && handlePosition === 'start' && dragHandle}
          <div className="flex-1 min-w-0">{children}</div>
          {showHandle && handlePosition === 'end' && dragHandle}
        </div>
      )}
    </div>
  );
};
