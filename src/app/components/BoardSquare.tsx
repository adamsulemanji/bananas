import React from 'react';
import { useDroppable } from '@dnd-kit/core';

type BoardSquareProps = {
  id: string;
  children?: React.ReactNode;
  bgColor: string;
};

export function BoardSquare({ id, children, bgColor }: BoardSquareProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`w-12 h-12 border border-black ${isOver ? 'opacity-75' : ''} ${bgColor} flex items-center justify-center`}
    >
      {children}
    </div>
  );
} 