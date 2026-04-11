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
      className="w-full h-full min-h-[32px] aspect-square p-0.5 relative"
      style={{
        border: '1px solid rgba(39,42,56,0.8)',
        background: isOver ? 'rgba(201,242,61,0.08)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {children}
    </div>
  );
}
