'use client';

import React, { useRef, useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import TrashArea from '../../components/TrashArea';
import { useMultiplayerGameState } from '@/hooks/useMultiplayerGameState';
import { useDragDrop } from '@/hooks/useDragDrop';
import { useMarqueeSelection, MarqueeRect } from '@/hooks/useMarqueeSelection';
import { generateGridCellIds, transposeTiles } from '@/utils/gridUtils';
import { GRID_SIZE } from '@/utils/config';
import { BoardTile, PlayerTile } from '@/types/multiplayer';
import { useSocket } from '@/contexts/SocketContext';

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

function MultiplayerGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomPin = searchParams.get('pin');
  
  const { 
    currentRoom,
    playerName,
    isConnected,
    callPeel,
    dumpTile,
    updateBoard,
    onPeelCalled,
    onGameWon,
    onPlayerDumped
  } = useSocket();
  
  const gridCellIds = generateGridCellIds();
  const gameState = useMultiplayerGameState();
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [isDndDragging, setIsDndDragging] = useState(false);
  const [activeDragData, setActiveDragData] = useState<ActiveDragData | null>(null);
  const [selectionBox, setSelectionBox] = useState<null | { x: number; y: number; width: number; height: number }>(null);
  const [gameStatus, setGameStatus] = useState<string>('');
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);

  // Configure sensors to capture initial cursor position
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    })
  );

  useEffect(() => {
    if (!roomPin || !currentRoom) {
      router.push('/');
      return;
    }

    // Listen for peel events
    const unsubscribePeel = onPeelCalled((data) => {
      setGameStatus(`${data.callerName} called PEEL! Everyone gets a new tile.`);
      gameState.handlePeelEvent(data);
      setTimeout(() => setGameStatus(''), 3000);
    });

    // Listen for game won
    const unsubscribeWon = onGameWon((data) => {
      setWinner({ id: data.winnerId, name: data.winnerName });
    });

    // Listen for dumps
    const unsubscribeDump = onPlayerDumped((data) => {
      setGameStatus(`${data.playerName} dumped a tile. ${data.remainingTiles} tiles left.`);
      setTimeout(() => setGameStatus(''), 3000);
    });

    return () => {
      unsubscribePeel();
      unsubscribeWon();
      unsubscribeDump();
    };
  }, [roomPin, currentRoom, onPeelCalled, onGameWon, onPlayerDumped, gameState, router]);

  // Update board state when tiles change
  useEffect(() => {
    if (gameState.tiles.length > 0 || gameState.playerHand.length > 0) {
      updateBoard(gameState.tiles);
    }
  }, [gameState.tiles, updateBoard]);

  const handleCallPeel = async () => {
    if (gameState.playerHand.length > 0) {
      setGameStatus('You still have tiles in your hand!');
      setTimeout(() => setGameStatus(''), 3000);
      return;
    }

    const result = await callPeel();
    if (!result.success) {
      setGameStatus(result.error || 'Failed to call peel');
      setTimeout(() => setGameStatus(''), 3000);
    }
  };

  const handleDumpTile = async (tileId: string) => {
    const result = await dumpTile(tileId);
    if (result.success && result.newTiles) {
      gameState.handleDumpResult(tileId, result.newTiles);
    } else {
      setGameStatus(result.error || 'Failed to dump tile');
      setTimeout(() => setGameStatus(''), 3000);
    }
  };

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

  if (!isConnected || !currentRoom) {
    return (
      <main className="min-h-screen bg-amber-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </main>
    );
  }

  const currentPlayer = currentRoom.players.find(p => p.name === playerName);
  const otherPlayers = currentRoom.players.filter(p => p.name !== playerName);

  if (winner) {
    return (
      <main className="min-h-screen bg-amber-50 p-4 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-12">
          <h1 className="text-4xl font-bold mb-4">
            {winner.name === playerName ? '🎉 You Won! 🎉' : `${winner.name} Won!`}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {winner.name === playerName 
              ? 'Congratulations on your victory!' 
              : 'Better luck next time!'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main 
      className="min-h-screen p-4 flex flex-col items-center bg-amber-50 relative"
      onMouseMove={marqueeSelection.dragMarquee}
      onMouseUp={marqueeSelection.endMarquee}
    >
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-black">Bananagrams Multiplayer</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            PIN: <span className="font-mono font-bold">{roomPin}</span>
          </div>
          <div className="text-sm text-gray-600">
            {gameState.remainingTiles} tiles left
          </div>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to leave the game?')) {
                router.push('/');
              }
            }}
            className="px-3 py-1 text-sm text-black bg-amber-200 hover:bg-amber-300 rounded transition-colors"
          >
            Leave Game
          </button>
        </div>
      </div>

      {/* Game Status Messages */}
      {gameStatus && (
        <div className="mb-4 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg animate-pulse">
          {gameStatus}
        </div>
      )}
      
      <DndContext 
        sensors={sensors}
        onDragStart={handleDndDragStart}
        onDragEnd={handleDndDragEnd} 
        collisionDetection={closestCenter}
      >
        <div className="flex gap-4 w-full max-w-7xl">
          {/* Main Game Area */}
          <div className="flex-1">
            {/* Player Hand */}
            <div className="mb-4 p-3 border border-amber-800 rounded-md bg-amber-50">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-black text-sm">Your Tiles ({gameState.playerHand.length})</h2>
                <button
                  onClick={handleCallPeel}
                  disabled={gameState.playerHand.length > 0}
                  className={`px-4 py-1 text-sm font-bold rounded transition-colors ${
                    gameState.playerHand.length === 0
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  PEEL!
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {gameState.playerHand.map((tile) => (
                  <div key={tile.id} className="w-8 h-8 relative">
                    <GridTile
                      id={tile.id}
                      content={tile.letter}
                    />
                    <button
                      onClick={() => handleDumpTile(tile.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center"
                      title="Dump this tile for 3 new ones"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Game Board */}
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
          </div>

          {/* Other Players Sidebar */}
          <div className="w-64 bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">Other Players</h3>
            <div className="space-y-2">
              {otherPlayers.map((player) => (
                <div key={player.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">{player.name}</span>
                    <span className="text-sm text-gray-500">
                      {player.tiles.length} tiles
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

export default function MultiplayerGamePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-amber-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </main>
    }>
      <MultiplayerGameContent />
    </Suspense>
  );
} 