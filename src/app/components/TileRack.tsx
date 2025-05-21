import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Letter } from './Letter';

type TileRackProps = {
  letters: { id: string; letter: string }[];
};

export function TileRack({ letters }: TileRackProps) {
  const { setNodeRef } = useDroppable({
    id: 'tile-rack',
  });

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-wrap p-4 gap-2 bg-gray-800 rounded-lg shadow-lg min-h-[80px] border-2 border-yellow-600"
    >
      {letters.map((letterObj) => (
        <Letter key={letterObj.id} id={letterObj.id} letter={letterObj.letter} />
      ))}
    </div>
  );
} 