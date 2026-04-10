'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

function TrashArea() {
  const { isOver, setNodeRef } = useDroppable({ id: 'trash' });

  return (
    <div
      ref={setNodeRef}
      className="mt-3 transition-all duration-200"
      style={{
        border: `1px dashed ${isOver ? 'var(--vermil)' : 'var(--rule)'}`,
        background: isOver ? 'rgba(184,64,32,0.1)' : 'transparent',
        padding: '0.75rem',
      }}
    >
      <div className="flex flex-col items-center justify-center gap-1 py-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke={isOver ? 'var(--vermil)' : 'var(--rule)'}
          style={{ transition: 'stroke 0.15s' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span
          className="text-xs text-center leading-tight transition-colors"
          style={{
            fontFamily: 'var(--font-crimson-body)',
            color: isOver ? 'var(--vermil)' : 'var(--muted)',
            fontStyle: 'italic',
          }}
        >
          {isOver ? 'Release to dump' : 'Dump tile · get 3 back'}
        </span>
      </div>
    </div>
  );
}

export default TrashArea;
