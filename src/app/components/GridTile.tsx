'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface GridTileProps {
  id: string;
  content: string;
}

function GridTile({ id, content }: GridTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
    transition: isDragging ? undefined : 'transform 0.2s ease',
  } : undefined;
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`w-full h-full bg-yellow-100 border border-yellow-700 text-black rounded-sm shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing font-semibold text-sm ${isDragging ? 'opacity-80 shadow-lg' : ''}`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <span className="text-center">{content.toUpperCase()}</span>
      </div>
    </div>
  );
}

export default GridTile; 