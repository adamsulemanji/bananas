'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  DragStartEvent, 
  DragEndEvent as DndKitDragEndEvent,
  DragOverlay,
  Active
} from '@dnd-kit/core';
import GridCell from './components/GridCell';
import GridTile from './components/GridTile';
import TilePalette from './components/TilePalette';
import TrashArea from './components/TrashArea';
import { useGameState } from '../hooks/useGameState';
import { useDragDrop } from '../hooks/useDragDrop';
import { useMarqueeSelection, MarqueeRect } from '../hooks/useMarqueeSelection';
import { generateGridCellIds } from '../utils/gridUtils';
import { GRID_SIZE } from '../utils/config';
import { BoardTile, PlayerTile } from '../utils/gameUtils';

// Helper function (can be moved to utils if used elsewhere)
function getCellIndices(cellId: string): [number, number] {
  const index = parseInt(cellId.replace('cell-', ''), 10);
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return [row, col];
}

interface ActiveDragData {
  active: Active;
  cellWidth: number;
  cellHeight: number;
  initialSelectedTiles: BoardTile[]; // Store initial positions
}

export default function Home() {
  const gridCellIds = generateGridCellIds();
  const gameState = useGameState();
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [isDndDragging, setIsDndDragging] = useState(false);
  const [activeDragData, setActiveDragData] = useState<ActiveDragData | null>(null);
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

    const activeId = event.active.id as string;
    const isBoardTileDrag = !!gameState.getBoardTile(activeId);
    
    if (isBoardTileDrag && selectedTileIds.includes(activeId) && selectedTileIds.length > 0 && gridRef.current) {
      const firstCell = gridRef.current.querySelector('#cell-0'); // Corrected querySelector
      if (firstCell) {
        const cellRect = firstCell.getBoundingClientRect();
        const initialSelectedBoardTiles = selectedTileIds
          .map(id => gameState.getBoardTile(id))
          .filter(tile => tile !== undefined) as BoardTile[];

        setActiveDragData({
          active: event.active,
          cellWidth: cellRect.width,
          cellHeight: cellRect.height,
          initialSelectedTiles: initialSelectedBoardTiles,
        });
      }
    } else {
      // Handle dragging from hand or single board tile not part of current marquee selection
      // (though marquee selection clears on non-selected drag start)
      setActiveDragData({
        active: event.active,
        cellWidth: 50, // Default/approximate size for hand tiles
        cellHeight: 50,
        initialSelectedTiles: [], // No group for hand tiles in this context
      });
    }
    
    // Only clear selection if dragging a non-selected tile
    const isDraggingSelectedTile = selectedTileIds.includes(activeId);
    
    if (!isDraggingSelectedTile) {
      setSelectedTileIds([]);
    }
  };

  const handleDndDragEnd = (event: DndKitDragEndEvent) => {
    dndHandlers.handleDragEnd(event);
    setIsDndDragging(false);
    setActiveDragData(null);
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
                      isGhost={activeDragData !== null && selectedTileIds.includes(tile.id) && selectedTileIds.length > 0}
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
        <DragOverlay dropAnimation={null}>
          {activeDragData ? (() => {
            const { active, cellWidth, cellHeight, initialSelectedTiles } = activeDragData;
            const activeId = active.id as string;
            
            const isMultiSelectDrag = initialSelectedTiles.length > 0 && initialSelectedTiles.some(t => t.id === activeId);

            if (isMultiSelectDrag) {
              const activeDraggedTileInitial = initialSelectedTiles.find(t => t.id === activeId);
              if (!activeDraggedTileInitial) return null; // Should be a BoardTile

              // Get position of the active dragged tile
              const [activeInitialRow, activeInitialCol] = getCellIndices(activeDraggedTileInitial.position);
              
              // Calculate the bounding box of selected tiles relative to active tile
              let minRelRow = 0, maxRelRow = 0, minRelCol = 0, maxRelCol = 0;

              initialSelectedTiles.forEach(tile => { // These are BoardTile[]
                const [row, col] = getCellIndices(tile.position);
                const relRow = row - activeInitialRow;
                const relCol = col - activeInitialCol;
                
                minRelRow = Math.min(minRelRow, relRow);
                maxRelRow = Math.max(maxRelRow, relRow);
                minRelCol = Math.min(minRelCol, relCol);
                maxRelCol = Math.max(maxRelCol, relCol);
              });

              const containerWidth = (maxRelCol - minRelCol + 1) * cellWidth;
              const containerHeight = (maxRelRow - minRelRow + 1) * cellHeight;

              const containerStyle: React.CSSProperties = {
                width: containerWidth,
                height: containerHeight,
                position: 'relative',
                transform: `translate(${minRelCol * cellWidth}px, ${minRelRow * cellHeight}px)`,
                pointerEvents: 'none', // Ensure overlay doesn't interfere with the drag
              };

              return (
                <div style={containerStyle}>
                  {initialSelectedTiles.map(tile => { // These are BoardTile[]
                    const [row, col] = getCellIndices(tile.position);
                    // Position relative to the active tile
                    const relRow = row - activeInitialRow;
                    const relCol = col - activeInitialCol;
                    
                    const tileStyle: React.CSSProperties = {
                      position: 'absolute',
                      left: (relCol - minRelCol) * cellWidth,
                      top: (relRow - minRelRow) * cellHeight,
                      width: cellWidth,
                      height: cellHeight,
                      boxSizing: 'border-box',
                      margin: 0,
                      padding: 0,
                    };

                    return (
                      <GridTile
                        key={tile.id}
                        id={tile.id}
                        content={tile.content} // BoardTile has content
                        isSelected={true}
                        style={tileStyle}
                      />
                    );
                  })}
                </div>
              );
            } else {
              const tileData = gameState.getBoardTile(activeId) || gameState.getHandTile(activeId);
              if (!tileData) return null;

              const content = (tileData as BoardTile).content !== undefined 
                                ? (tileData as BoardTile).content 
                                : (tileData as PlayerTile).letter;
              return (
                <GridTile 
                  id={activeId} 
                  content={content}
                  isSelected={true} 
                  style={{ width: cellWidth, height: cellHeight }}
                />
              );
            }
          })() : null}
        </DragOverlay>
      </DndContext>
      
      <div className="mt-4 text-xs text-gray-600">
        {selectedTileIds.length > 0 && 
          <p>Selected {selectedTileIds.length} tiles. Drag any selected tile to move all together.</p>
        }
      </div>
    </main>
  );
}
