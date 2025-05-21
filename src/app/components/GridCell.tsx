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
      id={id}
      ref={setNodeRef} 
      className={`w-full h-full min-h-[32px] aspect-square border border-amber-800/30 p-0.5 relative ${isOver ? 'bg-amber-200' : ''}`}
    >
      {children}
    </div>
  );
} 