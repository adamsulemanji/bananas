'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  DndContext, 
  closestCenter, 
  DragStartEvent, 
  DragEndEvent as DndKitDragEndEvent,
  DragOverlay,
  Active,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import GridCell from '../../components/GridCell';
import GridTile from '../../components/GridTile';
import TilePalette from '../../components/TilePalette';
import TrashArea from '../../components/TrashArea';
import { useGameState } from '../../../hooks/useGameState';
import { useDragDrop } from '../../../hooks/useDragDrop';
import { useMarqueeSelection, MarqueeRect } from '../../../hooks/useMarqueeSelection';
import { generateGridCellIds, transposeTiles } from '../../../utils/gridUtils';
import { GRID_SIZE } from '../../../utils/config';
import { BoardTile, PlayerTile } from '../../../utils/gameUtils';
import { getGameSession, saveGameSession } from '../../../utils/gameSession';

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
  cursorOffset: { x: number; y: number }; // Store cursor offset from active tile
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const [gamePin, setGamePin] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  const gridCellIds = generateGridCellIds();
  const gameState = useGameState();
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [isDndDragging, setIsDndDragging] = useState(false);
  const [activeDragData, setActiveDragData] = useState<ActiveDragData | null>(null);
  const [selectionBox, setSelectionBox] = useState<null | { x: number; y: number; width: number; height: number }>(null);

  // Configure sensors to capture initial cursor position
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    })
  );

  // Load game session on mount
  useEffect(() => {
    const session = getGameSession(gameId);
    if (session) {
      setGamePin(session.pin);
      // Load game state from session if it exists and is not empty
      if (session.gameState && typeof session.gameState === 'string' && session.gameState.length > 0) {
        try {
          gameState.loadFromSerialized(session.gameState);
        } catch (error) {
          console.error('Failed to load saved game state:', error);
          // If loading fails, the game will initialize normally
        }
      }
      // If gameState is empty or invalid, the game will initialize with 21 tiles automatically
    } else {
      // If no session found, redirect to home
      router.push('/');
    }
  }, [gameId]); // Remove router and gameState from dependencies to prevent re-runs

  // Auto-save game state every 5 seconds when there are changes
  useEffect(() => {
    if (!gamePin) return;
    
    const saveInterval = setInterval(() => {
      setSaveStatus('saving');
      
      try {
        const session = getGameSession(gameId);
        if (session) {
          // Serialize current game state
          session.gameState = gameState.getSerializedState();
          session.lastSaved = new Date();
          saveGameSession(session);
          setSaveStatus('saved');
          
          // In the future, this would be an API call:
          // await saveGameToServer(gameId, session);
        }
      } catch (error) {
        console.error('Failed to save game:', error);
        setSaveStatus('error');
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [gameId, gamePin, gameState.tiles, gameState.playerHand, gameState.letterBag]);

  const handleSelectTiles = useCallback((ids: string[]) => {
    setSelectedTileIds(ids);
  }, []);

  // Handle transpose with T key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't' && selectedTileIds.length > 0) {
        const selectedBoardTiles = selectedTileIds
          .map(id => gameState.getBoardTile(id))
          .filter(tile => tile !== undefined) as BoardTile[];
        
        if (selectedBoardTiles.length === 0) return;
        
        const newPositions = transposeTiles(selectedBoardTiles);
        if (!newPositions) return; // Can't transpose (would go out of bounds)
        
        // Check if any of the new positions are occupied by non-selected tiles
        let canTranspose = true;
        const selectedPositions = new Set(selectedBoardTiles.map(t => t.position));
        
        newPositions.forEach((newPos) => {
          const occupyingTile = gameState.getTileAtPosition(newPos);
          if (occupyingTile && !selectedTileIds.includes(occupyingTile.id) && !selectedPositions.has(newPos)) {
            canTranspose = false;
          }
        });
        
        if (!canTranspose) return;
        
        // Apply the transpose
        gameState.updateTilePositions(prevTiles => {
          return prevTiles.map(tile => {
            const newPosition = newPositions.get(tile.id);
            if (newPosition) {
              return { ...tile, position: newPosition };
            }
            return tile;
          });
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedTileIds, gameState]);

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
      const firstCell = gridRef.current.querySelector('#cell-0');
      if (firstCell) {
        const cellRect = firstCell.getBoundingClientRect();
        const initialSelectedBoardTiles = selectedTileIds
          .map(id => gameState.getBoardTile(id))
          .filter(tile => tile !== undefined) as BoardTile[];

        // Calculate cursor offset from the active tile
        const activeTile = gameState.getBoardTile(activeId);
        if (activeTile) {
          const activeTileElement = document.getElementById(activeTile.position);
          if (activeTileElement) {
            const tileRect = activeTileElement.getBoundingClientRect();
            const pointerEvent = event.activatorEvent as PointerEvent;
            const cursorOffset = {
              x: pointerEvent.clientX - tileRect.left,
              y: pointerEvent.clientY - tileRect.top
            };

            setActiveDragData({
              active: event.active,
              cellWidth: cellRect.width,
              cellHeight: cellRect.height,
              initialSelectedTiles: initialSelectedBoardTiles,
              cursorOffset
            });
          }
        }
      }
    } else {
      // Handle dragging from hand or single board tile not part of current marquee selection
      setActiveDragData({
        active: event.active,
        cellWidth: 50, // Default/approximate size for hand tiles
        cellHeight: 50,
        initialSelectedTiles: [], // No group for hand tiles in this context
        cursorOffset: { x: 25, y: 25 } // Center by default
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
      <div className="w-full max-w-5xl mx-auto flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-black">Bananagrams</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            PIN: <span className="font-mono font-bold">{gamePin || '----'}</span>
          </div>
          <div className="text-xs text-gray-500">
            {saveStatus === 'saving' && '⏳ Saving...'}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'error' && '⚠️ Save error'}
          </div>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to reset the game? This will clear all tiles and start fresh.')) {
                gameState.resetGame();
              }
            }}
            className="px-3 py-1 text-sm text-black bg-yellow-200 hover:bg-yellow-300 rounded transition-colors"
          >
            Reset Game
          </button>
          <button 
            onClick={() => router.push('/')}
            className="px-3 py-1 text-sm text-black bg-amber-200 hover:bg-amber-300 rounded transition-colors"
          >
            Exit Game
          </button>
        </div>
      </div>
      
      <DndContext 
        sensors={sensors}
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
            className={`grid grid-cols-${GRID_SIZE} gap-1 border-2 border-amber-800 bg-amber-100 p-2 w-full aspect-square relative`}
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
            const { active, cellWidth, cellHeight, initialSelectedTiles, cursorOffset } = activeDragData;
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

              // Adjust for cursor offset
              const offsetX = -cursorOffset.x + minRelCol * cellWidth;
              const offsetY = -cursorOffset.y + minRelRow * cellHeight;

              const containerStyle: React.CSSProperties = {
                width: containerWidth,
                height: containerHeight,
                position: 'relative',
                transform: `translate(${offsetX}px, ${offsetY}px)`,
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
          <p>Selected {selectedTileIds.length} tiles. Drag any selected tile to move all together. Press T to transpose.</p>
        }
      </div>
    </main>
  );
} 