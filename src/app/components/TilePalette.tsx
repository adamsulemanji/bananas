'use client';

import React from 'react';
import GridTile from './GridTile';
import { PlayerTile } from '../../utils/gameUtils';
import { useDroppable } from '@dnd-kit/core';

interface TilePaletteProps {
  playerHand: PlayerTile[];
  remainingTiles: number;
  onDrawTiles: (count: number) => void;
  onTradeInTile: (tileId: string) => void;
}

function TilePalette({ playerHand, remainingTiles }: TilePaletteProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'tile-palette' });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-2 p-3 mb-3 relative z-10 rounded-lg transition-all duration-150"
      style={{
        background: isOver ? 'rgba(201,242,61,0.06)' : 'var(--surface)',
        border: `1.5px solid ${isOver ? 'rgba(201,242,61,0.4)' : 'var(--border)'}`,
      }}
    >
      <div className="flex justify-between items-center">
        <span className="label mb-0">Your Tiles</span>
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--text3)', fontFamily: 'var(--font-outfit)' }}
        >
          {isOver ? 'Release to return' : `${playerHand.length} in hand · ${remainingTiles} in bunch`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {playerHand.map((tile) => (
          <div key={tile.id} className="w-8 h-8 relative">
            <GridTile id={tile.id} content={tile.letter} />
          </div>
        ))}
        {playerHand.length === 0 && (
          <p className="text-xs py-1" style={{ color: 'var(--text3)' }}>
            {remainingTiles > 0 ? 'Drawing tiles…' : 'Hand is empty'}
          </p>
        )}
      </div>
    </div>
  );
}

export default TilePalette;
