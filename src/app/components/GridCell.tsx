'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface GridCellProps {
  id: string;
  children: React.ReactNode;
}

export default function GridCell({ id, children }: GridCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`w-full h-full aspect-square border border-amber-800/30 p-0.5 ${isOver ? 'bg-amber-200' : ''}`}
    >
      {children}
    </div>
  );
} 