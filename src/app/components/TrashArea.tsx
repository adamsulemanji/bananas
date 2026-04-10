'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

function TrashArea() {
  const { isOver, setNodeRef } = useDroppable({
    id: 'trash',
  });

  return (
    <div
      ref={setNodeRef}
      className={`mt-3 rounded-lg border-2 border-dashed transition-colors ${
        isOver
          ? 'border-red-400 bg-red-50'
          : 'border-gray-300 bg-gray-50 hover:border-amber-400 hover:bg-amber-50'
      }`}
    >
      <div className="flex flex-col items-center justify-center gap-1 py-4 px-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 transition-colors ${isOver ? 'text-red-500' : 'text-gray-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span
          className={`text-xs font-medium text-center leading-tight transition-colors ${
            isOver ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {isOver ? 'Release to dump!' : 'Dump tile'}
        </span>
        <span className={`text-xs text-center ${isOver ? 'text-red-400' : 'text-gray-400'}`}>
          Get 3 new tiles
        </span>
      </div>
    </div>
  );
}

export default TrashArea;
