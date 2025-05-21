import React from 'react';
import { useDraggable } from '@dnd-kit/core';

type LetterProps = {
  id: string;
  letter: string;
};

export function Letter({ id, letter }: LetterProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
    position: 'relative' as const,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className="w-12 h-12 bg-yellow-100 rounded-md flex items-center justify-center font-bold text-xl cursor-move select-none shadow-md border-2 border-yellow-700 text-black"
    >
      {letter}
    </div>
  );
} 