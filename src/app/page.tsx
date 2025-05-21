'use client';

import React, { useRef, useState, useCallback } from 'react';
import { DndContext, closestCenter, DragStartEvent, DragEndEvent as DndKitDragEndEvent } from '@dnd-kit/core';
import GridCell from './components/GridCell';
import GridTile from './components/GridTile';
import TilePalette from './components/TilePalette';
import TrashArea from './components/TrashArea';
import { useGameState } from '../hooks/useGameState';
import { useDragDrop } from '../hooks/useDragDrop';
import { useMarqueeSelection, MarqueeRect } from '../hooks/useMarqueeSelection';
import { generateGridCellIds } from '../utils/gridUtils';

export default function Home() {
  const gridCellIds = generateGridCellIds();
  const gameState = useGameState();
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [isDndDragging, setIsDndDragging] = useState(false);

  const handleSelectTiles = useCallback((ids: string[]) => {
    setSelectedTileIds(ids);
  }, []);

  const marqueeSelection = useMarqueeSelection({
    gridRef,
    tiles: gameState.tiles,
    onSelectTiles: handleSelectTiles,
    isEnabled: !isDndDragging,
  });
  
  const dndHandlers = useDragDrop({
    getHandTile: gameState.getHandTile,
    getBoardTile: gameState.getBoardTile,
    getTileAtPosition: gameState.getTileAtPosition,
    addTileToBoard: gameState.addTileToBoard,
    removeTileFromHand: gameState.removeTileFromHand,
    removeTileFromBoard: gameState.removeTileFromBoard,
    updateTilePositions: gameState.updateTilePositions,
    returnTileToBag: gameState.returnTileToBag,
    drawTiles: gameState.drawTiles,
    addTileToHand: gameState.addTileToHand
  });

  const handleDndDragStart = (event: DragStartEvent) => {
    setIsDndDragging(true);
    setSelectedTileIds([]);
  };

  const handleDndDragEnd = (event: DndKitDragEndEvent) => {
    dndHandlers.handleDragEnd(event);
    setIsDndDragging(false);
  };

  const handleGridClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDndDragging && !(event.target as HTMLElement).closest('[data-draggable-tile="true"]')) {
        if(!marqueeSelection.isSelecting){
            setSelectedTileIds([]);
        }
    }
  }, [isDndDragging, marqueeSelection.isSelecting]);

  return (
    <main 
      className="min-h-screen p-4 flex flex-col items-center bg-amber-50 relative"
      onMouseMove={marqueeSelection.dragMarquee}
      onMouseUp={marqueeSelection.endMarquee}
    >
      <h1 className="text-2xl font-bold mb-4 text-black">Bananagrams</h1>
      
      <DndContext 
        onDragStart={handleDndDragStart}
        onDragEnd={handleDndDragEnd} 
        collisionDetection={closestCenter}
      >
        <TilePalette 
          playerHand={gameState.playerHand}
          remainingTiles={gameState.getRemainingTileCount()}
          onDrawTiles={gameState.drawTiles}
          onTradeInTile={gameState.handleTradeInTile}
        />
        
        <div 
          className="w-full max-w-5xl mx-auto relative"
          onMouseDown={marqueeSelection.initiateMarquee}
          onClick={handleGridClick}
        >
          <div 
            ref={gridRef} 
            className="grid grid-cols-[repeat(25,_minmax(0,_1fr))] gap-px border border-amber-800 bg-amber-100 p-px w-full aspect-square relative"
            style={{
              position: 'relative',
              zIndex: 0
            }}
          >
            {gridCellIds.map((cellId) => {
              const tile = gameState.getTileAtPosition(cellId);
              return (
                <GridCell key={cellId} id={cellId}>
                  {tile ? (
                    <GridTile 
                      id={tile.id} 
                      content={tile.content} 
                      isSelected={selectedTileIds.includes(tile.id)}
                    />
                  ) : null}
                </GridCell>
              );
            })}
          </div>
          {marqueeSelection.marqueeRect && (
            <div
              style={{
                position: 'absolute',
                left: marqueeSelection.marqueeRect.x,
                top: marqueeSelection.marqueeRect.y,
                width: marqueeSelection.marqueeRect.width,
                height: marqueeSelection.marqueeRect.height,
                border: '1px dashed blue',
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
        
        <TrashArea />
      </DndContext>
    </main>
  );
}
