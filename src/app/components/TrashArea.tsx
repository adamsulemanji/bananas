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
      className={`mt-4 p-3 border-2 rounded-md w-full max-w-md flex items-center justify-center
        ${isOver ? 'border-amber-600 bg-amber-100' : 'border-amber-400'}`}
    >
      <div className="flex items-center gap-2">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 ${isOver ? 'text-amber-700' : 'text-amber-500'}`} 
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
        <span className={`${isOver ? 'text-amber-700 font-semibold' : 'text-amber-600'} text-sm`}>
          Return tile to bunch
        </span>
      </div>
    </div>
  );
}

export default TrashArea; 