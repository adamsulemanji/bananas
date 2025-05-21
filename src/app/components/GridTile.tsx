'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface GridTileProps {
  id: string;
  content: string;
  isSelected?: boolean;
}

export default function GridTile({ id, content, isSelected }: GridTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });
  
  const dynamicStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : (isSelected ? 900 : 1),
    transition: isDragging ? undefined : 'transform 0.2s ease',
    position: isDragging ? 'relative' as const : undefined,
  } : (isSelected ? { zIndex: 900 } : {});
  
  return (
    <div 
      ref={setNodeRef} 
      style={dynamicStyle}
      {...listeners} 
      {...attributes}
      data-draggable-tile="true"
      className={`w-full h-full bg-yellow-100 border text-black rounded-sm shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing font-semibold text-sm 
                  ${isDragging ? 'opacity-80 shadow-lg border-yellow-700' : 'border-yellow-700'} 
                  ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-500' : 'border-yellow-700'}`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <span className="text-center">{content.toUpperCase()}</span>
      </div>
    </div>
  );
} 