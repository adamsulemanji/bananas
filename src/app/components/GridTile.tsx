'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface GridTileProps {
  id: string;
  content: string;
  isSelected?: boolean;
  isGhost?: boolean;
  isInvalidWord?: boolean;
  style?: React.CSSProperties;
}

export default function GridTile({ id, content, isSelected, isGhost, isInvalidWord, style }: GridTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { overlayTile: !!style },
  });

  const baseStyle =
    transform && !style
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          zIndex: isDragging ? 1000 : isSelected ? 900 : 1,
          transition: isDragging ? undefined : 'transform 0.2s ease',
          position: isDragging ? ('relative' as const) : undefined,
        }
      : isSelected
        ? { zIndex: 900 }
        : {};

  const mergedStyle = { ...baseStyle, ...style };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      {...listeners}
      {...attributes}
      data-draggable-tile="true"
      className={`w-full h-full border rounded-sm shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing font-semibold text-sm
                  ${isDragging ? 'opacity-80 shadow-lg border-yellow-700' : isInvalidWord ? 'border-red-500' : 'border-yellow-700'}
                  ${isSelected && !isDragging ? 'bg-blue-200 border-blue-500' : isInvalidWord ? 'bg-red-100' : 'bg-yellow-100'}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                  ${isGhost ? 'opacity-30' : ''}`}
    >
      <div className="relative w-full h-full flex items-center justify-center select-none">
        <span className={`text-center ${isInvalidWord ? 'text-red-700' : 'text-black'}`}>{content.toUpperCase()}</span>
      </div>
    </div>
  );
}
