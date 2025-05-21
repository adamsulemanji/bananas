'use client';

import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import GridCell from './components/GridCell';
import GridTile from './components/GridTile';
import TilePalette from './components/TilePalette';
import TrashArea from './components/TrashArea';
import { useGameState } from '../hooks/useGameState';
import { useDragDrop } from '../hooks/useDragDrop';
import { generateGridCellIds } from '../utils/gridUtils';

export default function Home() {
  // Get grid cell IDs
  const gridCellIds = generateGridCellIds();
  
  // Setup game state
  const gameState = useGameState();
  
  // Setup drag and drop handling
  const { handleDragEnd } = useDragDrop({
    getHandTile: gameState.getHandTile,
    getBoardTile: gameState.getBoardTile,
    addTileToBoard: gameState.addTileToBoard,
    removeTileFromHand: gameState.removeTileFromHand,
    removeTileFromBoard: gameState.removeTileFromBoard,
    updateTilePositions: gameState.updateTilePositions,
    returnTileToBag: gameState.returnTileToBag,
    drawTiles: gameState.drawTiles
  });

  return (
    <main className="min-h-screen p-4 flex flex-col items-center bg-amber-50">
      <h1 className="text-2xl font-bold mb-4 text-black">Bananagrams</h1>
      
      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <TilePalette 
          playerHand={gameState.playerHand}
          remainingTiles={gameState.getRemainingTileCount()}
          onDrawTiles={gameState.drawTiles}
          onTradeInTile={gameState.handleTradeInTile}
        />
        
        <div className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-[repeat(25,_minmax(0,_1fr))] gap-px border border-amber-800 bg-amber-100 p-px w-full aspect-square">
            {gridCellIds.map((cellId) => {
              const tile = gameState.getTileAtPosition(cellId);
              return (
                <GridCell key={cellId} id={cellId}>
                  {tile ? (
                    <GridTile 
                      id={tile.id} 
                      content={tile.content} 
                    />
                  ) : null}
                </GridCell>
              );
            })}
          </div>
        </div>
        
        <TrashArea />
      </DndContext>
    </main>
  );
}
