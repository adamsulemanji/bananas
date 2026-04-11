'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

function TrashArea() {
  const { isOver, setNodeRef } = useDroppable({ id: 'trash' });

  return (
    <div
      ref={setNodeRef}
      className="mt-2 rounded-lg transition-all duration-150"
      style={{
        border: `1.5px dashed ${isOver ? 'var(--red)' : 'var(--border2)'}`,
        background: isOver ? 'var(--red-bg)' : 'transparent',
        padding: '0.6rem 1rem',
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke={isOver ? 'var(--red)' : 'var(--text3)'}
          strokeWidth={2}
          style={{ transition: 'stroke 0.15s' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span
          className="text-xs font-medium"
          style={{
            color: isOver ? 'var(--red)' : 'var(--text3)',
            fontFamily: 'var(--font-outfit)',
            transition: 'color 0.15s',
          }}
        >
          {isOver ? 'Drop to dump · get 3 back' : 'Dump tile · get 3 back'}
        </span>
      </div>
    </div>
  );
}

export default TrashArea;
