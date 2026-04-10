'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface GridCellProps {
  id: string;
  children: React.ReactNode;
}

export default function GridCell({ id, children }: GridCellProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      id={id}
      ref={setNodeRef}
      className="w-full h-full min-h-[32px] aspect-square p-0.5 relative transition-colors duration-100"
      style={{
        border: '1px solid rgba(58,50,32,0.5)',
        background: isOver ? 'rgba(200,148,26,0.12)' : 'transparent',
      }}
    >
      {children}
    </div>
  );
}
