'use client';

import React from 'react';
import GridTile from './GridTile';
import { PlayerTile } from '../../utils/gameUtils';

interface TilePaletteProps {
  playerHand: PlayerTile[];
  remainingTiles: number;
  onDrawTiles: (count: number) => void;
  onTradeInTile: (tileId: string) => void;
}

function TilePalette({ 
  playerHand, 
  remainingTiles, 
  onDrawTiles, 
  onTradeInTile 
}: TilePaletteProps) {
  return (
    <div className="flex flex-col gap-2 p-3 border border-amber-800 rounded-md mb-4 bg-amber-50">
      <h2 className="font-semibold text-black text-sm">Your Tiles</h2>
      <div className="flex flex-wrap gap-1">
        {playerHand.map((tile) => (
          <div key={tile.id} className="w-8 h-8">
            <GridTile
              id={tile.id}
              content={tile.letter}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-1">
        <div className="text-xs text-gray-500">
          {remainingTiles} tiles remaining in bunch
        </div>
      </div>
      <div className="text-xs text-gray-700 text-right mt-1">
        {playerHand.length === 0 && remainingTiles > 0 ? 
          "Drawing 3 more tiles..." : 
          `${playerHand.length} tiles in hand`}
      </div>
    </div>
  );
}

export default TilePalette; 