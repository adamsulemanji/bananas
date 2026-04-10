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
  useSensors,
} from '@dnd-kit/core';
import GridCell from '../../components/GridCell';
import GridTile from '../../components/GridTile';
import TilePalette from '../../components/TilePalette';
import TrashArea from '../../components/TrashArea';
import BoardValidation from '../../components/BoardValidation';
import { useGameState } from '../../../hooks/useGameState';
import { useDragDrop } from '../../../hooks/useDragDrop';
import { useMarqueeSelection, MarqueeRect } from '../../../hooks/useMarqueeSelection';
import { useWordValidation } from '../../../hooks/useWordValidation';
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
  cellStepX: number;
  cellStepY: number;
  tileOffsetX: number;
  tileOffsetY: number;
  initialSelectedTiles: BoardTile[]; // Store initial positions
  cursorOffset: { x: number; y: number }; // Store cursor offset from active tile
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const [gamePin, setGamePin] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [hasWon, setHasWon] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [isBoardValid, setIsBoardValid] = useState(false);
  const [invalidTileIds, setInvalidTileIds] = useState<Set<string>>(new Set());

  const gridCellIds = generateGridCellIds();
  const gameState = useGameState();
  const { validateBoard } = useWordValidation();
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [isDndDragging, setIsDndDragging] = useState(false);
  const [activeDragData, setActiveDragData] = useState<ActiveDragData | null>(null);
  const [selectionBox, setSelectionBox] = useState<null | {
    x: number;
    y: number;
    width: number;
    height: number;
  }>(null);

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
      if (
        session.gameState &&
        typeof session.gameState === 'string' &&
        session.gameState.length > 0
      ) {
        try {
          gameState.loadFromSerialized(session.gameState);
        } catch (error) {
          console.error('Failed to load saved game state:', error);
          // If loading fails, the game will initialize normally
        }
      }
    } else {
      // If no session found, redirect to home
      router.push('/');
    }
  }, [gameId]); // Remove router and gameState from dependencies to prevent re-runs

  // Auto-save game state every 3 seconds when there are changes
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
        }
      } catch (error) {
        console.error('Failed to save game:', error);
        setSaveStatus('error');
      }
    }, 3000);

    return () => clearInterval(saveInterval);
  }, [gameId, gamePin, gameState.tiles, gameState.playerHand, gameState.letterBag]);

  // Update invalid tile tracking whenever tiles change
  useEffect(() => {
    const updateInvalidTiles = async () => {
      const validationResult = await validateBoard(gameState.tiles);
      
      // Get all tile IDs that are part of invalid words
      const invalidIds = new Set<string>();
      validationResult.invalidWords.forEach(word => {
        word.tiles.forEach(tile => {
          invalidIds.add(tile.tileId);
        });
      });
      
      setInvalidTileIds(invalidIds);
    };

    updateInvalidTiles();
  }, [gameState.tiles, validateBoard]);

  // Draw 3 tiles only when the board is connected and valid
  useEffect(() => {
    if (
      gameState.playerHand.length === 0 &&
      gameState.tiles.length > 0 &&
      isBoardValid
    ) {
      const remainingTiles = gameState.getRemainingTileCount();
      if (remainingTiles > 0) {
        gameState.drawTiles(3);
      }
    }
  }, [
    gameState.playerHand.length,
    gameState.tiles.length,
    isBoardValid,
    gameState.letterBag,
  ]);

  // Check for win condition
  useEffect(() => {
    // Player wins when they have no tiles in hand AND no tiles remaining in the bag
    // Must have at least some tiles on the board to win
    // AND the board must be valid (all words are correct)
    if (
      gameState.playerHand.length === 0 &&
      gameState.getRemainingTileCount() === 0 &&
      gameState.tiles.length > 0 &&
      isBoardValid &&
      !hasWon
    ) {
      // Calculate score based on time taken (in seconds)
      const timeTaken = Math.floor((Date.now() - gameStartTime) / 1000);
      const baseScore = 10000;
      const timeBonus = Math.max(0, 3600 - timeTaken) * 10; // Bonus for finishing under 1 hour
      const totalScore = baseScore + timeBonus;

      setFinalScore(totalScore);
      setHasWon(true);

      // Save the win state
      setSaveStatus('saving');
      try {
        const session = getGameSession(gameId);
        if (session) {
          session.gameState = gameState.getSerializedState();
          session.lastSaved = new Date();
          session.isCompleted = true;
          session.finalScore = totalScore;
          session.completionTime = timeTaken;
          saveGameSession(session);
          setSaveStatus('saved');
        }
      } catch (error) {
        console.error('Failed to save win state:', error);
        setSaveStatus('error');
      }
    }
  }, [
    gameState.playerHand.length,
    gameState.getRemainingTileCount,
    gameState.tiles.length,
    gameId,
    gameStartTime,
    isBoardValid,
    hasWon,
    gameState,
  ]);

  const handleSelectTiles = useCallback((ids: string[]) => {
    setSelectedTileIds(ids);
  }, []);

  // Handle transpose with T key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't' && selectedTileIds.length > 0) {
        const selectedBoardTiles = selectedTileIds
          .map((id) => gameState.getBoardTile(id))
          .filter((tile) => tile !== undefined) as BoardTile[];

        if (selectedBoardTiles.length === 0) return;

        const newPositions = transposeTiles(selectedBoardTiles);
        if (!newPositions) return; // Can't transpose (would go out of bounds)

        // Check if any of the new positions are occupied by non-selected tiles
        let canTranspose = true;
        const selectedPositions = new Set(selectedBoardTiles.map((t) => t.position));

        newPositions.forEach((newPos) => {
          const occupyingTile = gameState.getTileAtPosition(newPos);
          if (
            occupyingTile &&
            !selectedTileIds.includes(occupyingTile.id) &&
            !selectedPositions.has(newPos)
          ) {
            canTranspose = false;
          }
        });

        if (!canTranspose) return;

        // Apply the transpose
        gameState.updateTilePositions((prevTiles) => {
          return prevTiles.map((tile) => {
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
    selectedTileIds: selectedTileIds,
  });

  const handleDndDragStart = (event: DragStartEvent) => {
    setIsDndDragging(true);

    const activeId = event.active.id as string;
    const isBoardTileDrag = !!gameState.getBoardTile(activeId);

    if (
      isBoardTileDrag &&
      selectedTileIds.includes(activeId) &&
      selectedTileIds.length > 0 &&
      gridRef.current
    ) {
      const firstCell = gridRef.current.querySelector<HTMLElement>('#cell-0');
      if (firstCell) {
        const cellRect = firstCell.getBoundingClientRect();
        const nextCell = gridRef.current.querySelector<HTMLElement>('#cell-1');
        const nextRowCell = gridRef.current.querySelector<HTMLElement>(`#cell-${GRID_SIZE}`);
        const cellStepX = nextCell
          ? nextCell.getBoundingClientRect().left - cellRect.left
          : cellRect.width;
        const cellStepY = nextRowCell
          ? nextRowCell.getBoundingClientRect().top - cellRect.top
          : cellRect.height;

        const initialSelectedBoardTiles = selectedTileIds
          .map((id) => gameState.getBoardTile(id))
          .filter((tile) => tile !== undefined) as BoardTile[];

        // Calculate cursor offset from the active tile
        const activeTile = gameState.getBoardTile(activeId);
        if (activeTile) {
          const activeCellElement = document.getElementById(activeTile.position);
          if (activeCellElement) {
            const activeCellRect = activeCellElement.getBoundingClientRect();
            const tileElement = activeCellElement.querySelector<HTMLElement>(
              '[data-draggable-tile="true"]'
            );
            const tileRect = tileElement
              ? tileElement.getBoundingClientRect()
              : activeCellRect;
            const pointerEvent = event.activatorEvent as PointerEvent;
            const cursorOffset = {
              x: pointerEvent.clientX - tileRect.left,
              y: pointerEvent.clientY - tileRect.top,
            };
            const tileOffsetX = tileRect.left - activeCellRect.left;
            const tileOffsetY = tileRect.top - activeCellRect.top;

            setActiveDragData({
              active: event.active,
              cellWidth: tileRect.width,
              cellHeight: tileRect.height,
              cellStepX,
              cellStepY,
              tileOffsetX,
              tileOffsetY,
              initialSelectedTiles: initialSelectedBoardTiles,
              cursorOffset,
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
        cellStepX: 50,
        cellStepY: 50,
        tileOffsetX: 0,
        tileOffsetY: 0,
        initialSelectedTiles: [], // No group for hand tiles in this context
        cursorOffset: { x: 25, y: 25 }, // Center by default
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

    selectedTileIds.forEach((id) => {
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

  // Show win screen if player has won
  if (hasWon) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center bg-dot-texture" style={{ background: 'var(--ink)' }}>
        <div className="text-center animate-fadeIn p-12 max-w-md mx-auto" style={{ background: 'var(--press)', border: '1px solid var(--case)' }}>
          <div className="mb-6">
            <div
              className="text-5xl mb-5"
              style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--brass)', letterSpacing: '0.1em' }}
            >
              ✦
            </div>
            <h1
              className="text-3xl mb-3"
              style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--cream)', letterSpacing: '0.12em' }}
            >
              Congratulations
            </h1>
            <p style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--aged)', fontSize: '1.1rem', fontStyle: 'italic' }}>
              The puzzle is complete.
            </p>
          </div>

          <div className="p-6 mb-8" style={{ border: '1px solid var(--case)', background: 'var(--type)' }}>
            <div
              className="text-3xl mb-2"
              style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--brass)' }}
            >
              {finalScore?.toLocaleString()}
            </div>
            <div style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {Math.floor((Date.now() - gameStartTime) / 60000)}m{' '}
              {Math.floor(((Date.now() - gameStartTime) % 60000) / 1000)}s
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                if (window.confirm('Start a new game?')) {
                  gameState.resetGame();
                  setHasWon(false);
                  setFinalScore(null);
                  setGameStartTime(Date.now());
                }
              }}
              className="btn-press w-full"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="btn-ghost w-full"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen p-4 flex flex-col items-center relative bg-dot-texture"
      style={{ background: 'var(--ink)' }}
      onMouseMove={marqueeSelection.dragMarquee}
      onMouseUp={marqueeSelection.endMarquee}
    >
      <div className="w-full max-w-5xl mx-auto flex justify-between items-center mb-4 py-2" style={{ borderBottom: '1px solid var(--case)' }}>
        <h1
          className="text-xl tracking-widest"
          style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--cream)' }}
        >
          BANANAGRAMS
        </h1>
        <div className="flex items-center gap-4">
          <div style={{ fontFamily: 'var(--font-courier-prime)', color: 'var(--aged)', fontSize: '0.85rem', letterSpacing: '0.15em' }}>
            {gamePin || '----'}
          </div>
          <div style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--rule)', fontSize: '0.75rem', fontStyle: 'italic' }}>
            {saveStatus === 'saving' && 'saving...'}
            {saveStatus === 'saved' && 'saved'}
            {saveStatus === 'error' && 'save error'}
          </div>
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to reset the game? This will clear all tiles and start fresh.'
                )
              ) {
                gameState.resetGame();
              }
            }}
            className="btn-ghost"
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.65rem' }}
          >
            Reset
          </button>
          <button
            onClick={() => router.push('/')}
            className="btn-ghost"
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.65rem' }}
          >
            Exit
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

        <div className="w-full max-w-5xl mx-auto mb-4">
          <BoardValidation 
            tiles={gameState.tiles} 
            onValidationChange={setIsBoardValid}
            showDetails={true}
          />
        </div>

        <div
          className="w-full max-w-5xl mx-auto relative"
          onMouseDown={marqueeSelection.initiateMarquee}
        >
          <div
            ref={gridRef}
            className={`grid grid-cols-${GRID_SIZE} gap-0 p-1 w-full aspect-square relative`}
            style={{
              border: '1px solid var(--case)',
              background: 'var(--ink)',
              position: 'relative',
              zIndex: 0,
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
                      isInvalidWord={invalidTileIds.has(tile.id)}
                      isGhost={
                        activeDragData !== null &&
                        selectedTileIds.includes(tile.id) &&
                        selectedTileIds.length > 0
                      }
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
                border: '1px dashed rgba(200,148,26,0.6)',
                backgroundColor: 'rgba(200,148,26,0.06)',
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
                border: '1px dashed rgba(200,148,26,0.45)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        <TrashArea />
        <DragOverlay dropAnimation={null}>
          {activeDragData
            ? (() => {
                const {
                  active,
                  cellWidth,
                  cellHeight,
                  cellStepX,
                  cellStepY,
                  tileOffsetX,
                  tileOffsetY,
                  initialSelectedTiles,
                  cursorOffset,
                } =
                  activeDragData;
                const activeId = active.id as string;

                const isMultiSelectDrag =
                  initialSelectedTiles.length > 0 &&
                  initialSelectedTiles.some((t) => t.id === activeId);

                if (isMultiSelectDrag) {
                  const activeDraggedTileInitial = initialSelectedTiles.find(
                    (t) => t.id === activeId
                  );
                  if (!activeDraggedTileInitial) return null; // Should be a BoardTile

                  // Get position of the active dragged tile
                  const [activeInitialRow, activeInitialCol] = getCellIndices(
                    activeDraggedTileInitial.position
                  );

                  // Calculate the bounding box of selected tiles relative to active tile
                  let minRelRow = 0,
                    maxRelRow = 0,
                    minRelCol = 0,
                    maxRelCol = 0;

                  initialSelectedTiles.forEach((tile) => {
                    // These are BoardTile[]
                    const [row, col] = getCellIndices(tile.position);
                    const relRow = row - activeInitialRow;
                    const relCol = col - activeInitialCol;

                    minRelRow = Math.min(minRelRow, relRow);
                    maxRelRow = Math.max(maxRelRow, relRow);
                    minRelCol = Math.min(minRelCol, relCol);
                    maxRelCol = Math.max(maxRelCol, relCol);
                  });

                  const containerWidth =
                    (maxRelCol - minRelCol) * cellStepX + tileOffsetX + cellWidth;
                  const containerHeight =
                    (maxRelRow - minRelRow) * cellStepY + tileOffsetY + cellHeight;

                  // Adjust for cursor offset
                  const offsetX = -cursorOffset.x + minRelCol * cellStepX - tileOffsetX;
                  const offsetY = -cursorOffset.y + minRelRow * cellStepY - tileOffsetY;

                  const containerStyle: React.CSSProperties = {
                    width: containerWidth,
                    height: containerHeight,
                    position: 'relative',
                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                    pointerEvents: 'none', // Ensure overlay doesn't interfere with the drag
                  };

                  return (
                    <div style={containerStyle}>
                      {initialSelectedTiles.map((tile) => {
                        // These are BoardTile[]
                        const [row, col] = getCellIndices(tile.position);
                        // Position relative to the active tile
                        const relRow = row - activeInitialRow;
                        const relCol = col - activeInitialCol;

                        const tileStyle: React.CSSProperties = {
                          position: 'absolute',
                          left: (relCol - minRelCol) * cellStepX + tileOffsetX,
                          top: (relRow - minRelRow) * cellStepY + tileOffsetY,
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
                            isInvalidWord={invalidTileIds.has(tile.id)}
                            style={tileStyle}
                          />
                        );
                      })}
                    </div>
                  );
                } else {
                  const tileData =
                    gameState.getBoardTile(activeId) || gameState.getHandTile(activeId);
                  if (!tileData) return null;

                  const content =
                    (tileData as BoardTile).content !== undefined
                      ? (tileData as BoardTile).content
                      : (tileData as PlayerTile).letter;
                  return (
                    <GridTile
                      id={activeId}
                      content={content}
                      isSelected={true}
                      isInvalidWord={invalidTileIds.has(activeId)}
                      style={{ width: cellWidth, height: cellHeight }}
                    />
                  );
                }
              })()
            : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-4 text-xs text-gray-600">
        {selectedTileIds.length > 0 && (
          <p>
            Selected {selectedTileIds.length} tiles. Drag any selected tile to move all together.
            Press T to transpose.
          </p>
        )}
      </div>
    </main>
  );
}
