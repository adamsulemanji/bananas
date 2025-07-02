'use client';

import { DragEndEvent } from '@dnd-kit/core';
import { BoardTile, PlayerTile } from '../utils/gameUtils';
import { GRID_SIZE } from '../utils/config';

interface UseDragDropParams {
  getHandTile: (id: string) => PlayerTile | undefined;
  getBoardTile: (id: string) => BoardTile | undefined;
  getTileAtPosition: (cellId: string) => BoardTile | undefined;
  addTileToBoard: (newTile: BoardTile) => void;
  removeTileFromHand: (id: string) => void;
  removeTileFromBoard: (id: string) => void;
  updateTilePositions: (updater: (prevTiles: BoardTile[]) => BoardTile[]) => void;
  returnTileToBag: (letter: string) => void;
  drawTiles: (count: number) => void;
  addTileToHand: (letter: string) => void;
  selectedTileIds: string[];
  // Optional multiplayer dump handler
  onDumpTile?: (tileId: string) => Promise<void>;
  // Optional tile location update handler for server sync
  onTileLocationUpdate?: (data: {
    tilesMovedToBoard?: string[];
    tilesMovedToHand?: string[];
  }) => void;
  // Optional board update handler for multiplayer sync
  onBoardUpdate?: (tiles: BoardTile[]) => void;
  // Helper to get all current board tiles
  getCurrentBoardTiles?: () => BoardTile[];
}

export function useDragDrop({
  getHandTile,
  getBoardTile,
  getTileAtPosition,
  addTileToBoard,
  removeTileFromHand,
  removeTileFromBoard,
  updateTilePositions,
  returnTileToBag,
  drawTiles,
  addTileToHand,
  selectedTileIds,
  onDumpTile,
  onTileLocationUpdate,
  onBoardUpdate,
  getCurrentBoardTiles,
}: UseDragDropParams) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const tileFromHand = getHandTile(activeId);
    const tileFromBoard = getBoardTile(activeId);

    // Determine if we're moving a single tile or multiple selected tiles
    const isPartOfSelection =
      tileFromBoard && selectedTileIds.includes(activeId) && selectedTileIds.length > 1;

    // Dropping onto the tile palette from the board
    if (overId === 'tile-palette') {
      // Reject moving multiple tiles to the palette
      if (isPartOfSelection) {
        return;
      }

      // Allow single tile moves back to the hand
      if (tileFromBoard) {
        addTileToHand(tileFromBoard.content);
        removeTileFromBoard(activeId);

        // Notify server about tile moved to hand
        if (onTileLocationUpdate) {
          onTileLocationUpdate({ tilesMovedToHand: [activeId] });
        }
      }
      return;
    }

    // Dropping into trash area
    if (overId === 'trash') {
      // Reject moving multiple tiles to trash in one action
      if (isPartOfSelection) {
        return;
      }

      // Use multiplayer dump if available, otherwise fall back to single-player logic
      if (onDumpTile) {
        // For multiplayer: only dump tiles from hand, not from board
        if (tileFromHand) {
          onDumpTile(activeId);
        }
        // Don't allow dumping tiles from board in multiplayer
        return;
      }

      // Single-player logic (fallback)
      let letterToReturn: string | undefined;

      if (tileFromHand) {
        letterToReturn = tileFromHand.letter;
        removeTileFromHand(activeId);
      } else if (tileFromBoard) {
        letterToReturn = tileFromBoard.content;
        removeTileFromBoard(activeId);
      }

      if (letterToReturn) {
        returnTileToBag(letterToReturn);
        drawTiles(3);
      }
      return;
    }

    // Dragging from playerHand to a board cell
    if (tileFromHand && overId.startsWith('cell-')) {
      const destinationCellId = overId;
      const tileAtDestination = getTileAtPosition(destinationCellId);

      if (tileAtDestination) {
        return; // Destination is occupied, prevent stacking
      }

      // Place tile on board
      const newBoardTile: BoardTile = {
        id: tileFromHand.id,
        content: tileFromHand.letter,
        position: destinationCellId,
      };

      addTileToBoard(newBoardTile);
      removeTileFromHand(activeId);

      // Notify server about tile moved to board
      if (onTileLocationUpdate) {
        onTileLocationUpdate({ tilesMovedToBoard: [activeId] });
      }

      // Notify server about board update for multiplayer sync
      if (onBoardUpdate && getCurrentBoardTiles) {
        onBoardUpdate(getCurrentBoardTiles());
      }
      return;
    }

    // Dragging a tile that is already on the board
    if (tileFromBoard && overId.startsWith('cell-')) {
      const destinationCellId = overId;

      if (isPartOfSelection) {
        // Handle moving multiple selected tiles
        const originCellId = tileFromBoard.position;

        // Calculate offset from the active tile to the destination cell
        const [originRow, originCol] = getCellIndices(originCellId);
        const [destRow, destCol] = getCellIndices(destinationCellId);
        const rowOffset = destRow - originRow;
        const colOffset = destCol - originCol;

        // First check if all destination positions are valid and unoccupied
        // (excluding positions of selected tiles as they will be moved)
        const newPositions = new Map<string, string>(); // tileId -> new position
        let canMove = true;

        // Create a set of current positions of selected tiles for faster lookup
        const selectedPositions = new Set<string>();
        selectedTileIds.forEach((tileId) => {
          const tile = getBoardTile(tileId);
          if (tile) {
            selectedPositions.add(tile.position);
          }
        });

        selectedTileIds.forEach((tileId) => {
          const tile = getBoardTile(tileId);
          if (!tile) return;

          const [tileRow, tileCol] = getCellIndices(tile.position);
          const newRow = tileRow + rowOffset;
          const newCol = tileCol + colOffset;

          // Check if the new position is within grid bounds
          if (newRow < 0 || newCol < 0 || newRow >= GRID_SIZE || newCol >= GRID_SIZE) {
            canMove = false;
            return;
          }

          const newCellId = `cell-${newRow * GRID_SIZE + newCol}`;

          // Check if the destination cell is already occupied by a non-selected tile
          const occupyingTile = getTileAtPosition(newCellId);
          if (
            occupyingTile &&
            !selectedTileIds.includes(occupyingTile.id) &&
            !selectedPositions.has(newCellId)
          ) {
            canMove = false;
            return;
          }

          newPositions.set(tileId, newCellId);
        });

        if (!canMove) return;

        // Apply all movements at once
        updateTilePositions((prevTiles) => {
          return prevTiles.map((tile) => {
            const newPosition = newPositions.get(tile.id);
            if (newPosition) {
              return { ...tile, position: newPosition };
            }
            return tile;
          });
        });

        // Notify server about board update for multiplayer sync
        if (onBoardUpdate && getCurrentBoardTiles) {
          onBoardUpdate(getCurrentBoardTiles());
        }

        // Note: For multi-tile board movements, we don't need to update hand size
        // as tiles are just moving positions on the board
      } else {
        // Handle moving a single tile
        const originCellId = tileFromBoard.position;

        if (destinationCellId === originCellId) {
          return; // Dropped on its own cell, do nothing
        }

        const tileAtDestination = getTileAtPosition(destinationCellId);

        if (tileAtDestination) {
          // Destination cell is occupied by another tile, swap them
          updateTilePositions((prevTiles) =>
            prevTiles.map((t) => {
              if (t.id === tileFromBoard.id) {
                return { ...t, position: destinationCellId };
              }
              if (t.id === tileAtDestination.id) {
                return { ...t, position: originCellId };
              }
              return t;
            })
          );
        } else {
          // Destination cell is empty, just move the tile
          updateTilePositions((prevTiles) =>
            prevTiles.map((t) =>
              t.id === tileFromBoard.id ? { ...t, position: destinationCellId } : t
            )
          );
        }

        // Notify server about board update for multiplayer sync
        if (onBoardUpdate && getCurrentBoardTiles) {
          onBoardUpdate(getCurrentBoardTiles());
        }
      }
      return;
    }
  }

  // Helper function to get row and column from cell ID
  function getCellIndices(cellId: string): [number, number] {
    const index = parseInt(cellId.replace('cell-', ''), 10);
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    return [row, col];
  }

  return { handleDragEnd };
}
