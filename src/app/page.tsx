'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { DndContext, closestCenter, DragStartEvent, DragEndEvent as DndKitDragEndEvent } from '@dnd-kit/core';
import GridCell from './components/GridCell';
import GridTile from './components/GridTile';
import TilePalette from './components/TilePalette';
import TrashArea from './components/TrashArea';
import { useGameState } from '../hooks/useGameState';
import { useDragDrop } from '../hooks/useDragDrop';
import { useMarqueeSelection, MarqueeRect } from '../hooks/useMarqueeSelection';
import { generateGridCellIds } from '../utils/gridUtils';
import { GRID_SIZE } from '../utils/config';

export default function Home() {
  const gridCellIds = generateGridCellIds();
  const gameState = useGameState();
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [isDndDragging, setIsDndDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState<null | { x: number; y: number; width: number; height: number }>(null);

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
    addTileToHand: gameState.addTileToHand,
    selectedTileIds: selectedTileIds
  });

  const handleDndDragStart = (event: DragStartEvent) => {
    setIsDndDragging(true);
    
    // Only clear selection if dragging a non-selected tile
    const draggedTileId = event.active.id as string;
    const isDraggingSelectedTile = selectedTileIds.includes(draggedTileId);
    
    if (!isDraggingSelectedTile) {
      setSelectedTileIds([]);
    }
  };

  const handleDndDragEnd = (event: DndKitDragEndEvent) => {
    dndHandlers.handleDragEnd(event);
    setIsDndDragging(false);
    // Clear selection after dropping to revert tile colors
    setSelectedTileIds([]);
  };

  // Compute bounding box for the current selection
  useEffect(() => {
    if (selectedTileIds.length === 0 || !gridRef.current) {
      setSelectionBox(null);
      return;
    }

    const gridBounds = gridRef.current.getBoundingClientRect();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedTileIds.forEach(id => {
      const tile = gameState.getBoardTile(id);
      if (!tile) return;
      const cellEl = document.getElementById(tile.position);
      if (!cellEl) return;
      const cellRect = cellEl.getBoundingClientRect();

      minX = Math.min(minX, cellRect.left - gridBounds.left);
      minY = Math.min(minY, cellRect.top - gridBounds.top);
      maxX = Math.max(maxX, cellRect.right - gridBounds.left);
      maxY = Math.max(maxY, cellRect.bottom - gridBounds.top);
    });

    if (minX === Infinity) {
      setSelectionBox(null);
      return;
    }

    setSelectionBox({
      x: minX - 1, // account for grid gap
      y: minY - 1,
      width: maxX - minX + 2,
      height: maxY - minY + 2,
    });
  }, [selectedTileIds, gameState.tiles]);

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
        >
          <div 
            ref={gridRef} 
            className={`grid grid-cols-[repeat(${GRID_SIZE},_minmax(0,_1fr))] gap-px border border-amber-800 bg-amber-100 p-px w-full aspect-square relative`}
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

          {/* Selection bounding box */}
          {selectionBox && !marqueeSelection.isSelecting && (
            <div
              style={{
                position: 'absolute',
                left: selectionBox.x,
                top: selectionBox.y,
                width: selectionBox.width,
                height: selectionBox.height,
                border: '2px dashed #1e40af', // bounding box border color
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
        
        <TrashArea />
      </DndContext>
      
      <div className="mt-4 text-xs text-gray-600">
        {selectedTileIds.length > 0 && 
          <p>Selected {selectedTileIds.length} tiles. Drag any selected tile to move all together.</p>
        }
      </div>
    </main>
  );
}
