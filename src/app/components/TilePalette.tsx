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

function TilePalette({ playerHand, remainingTiles, onDrawTiles, onTradeInTile }: TilePaletteProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'tile-palette' });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-2 p-3 mb-4 relative z-10 transition-all duration-200"
      style={{
        background: isOver ? 'rgba(200,148,26,0.07)' : 'var(--press)',
        border: `1px solid ${isOver ? 'rgba(200,148,26,0.45)' : 'var(--case)'}`,
      }}
    >
      <div className="flex justify-between items-center">
        <h2
          className="text-xs tracking-[0.35em] uppercase"
          style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--aged)' }}
        >
          Your Tiles
        </h2>
        <span
          className="text-xs italic"
          style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--rule)' }}
        >
          {isOver ? 'Release to return tile' : `${playerHand.length} in hand · ${remainingTiles} in bunch`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {playerHand.map((tile) => (
          <div key={tile.id} className="w-8 h-8 relative">
            <GridTile id={tile.id} content={tile.letter} />
          </div>
        ))}
      </div>
      {playerHand.length === 0 && remainingTiles > 0 && (
        <p
          className="text-xs italic text-center py-1"
          style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)' }}
        >
          Drawing tiles...
        </p>
      )}
    </div>
  );
}

export default TilePalette;
