'use client';

import { DragEndEvent } from '@dnd-kit/core';
import { BoardTile, PlayerTile } from '../utils/gameUtils';

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
  drawTiles
}: UseDragDropParams) {
  
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const tileFromHand = getHandTile(activeId);
    const tileFromBoard = getBoardTile(activeId);

    // Dropping into trash area
    if (overId === 'trash') {
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
        position: destinationCellId 
      };
      
      addTileToBoard(newBoardTile);
      removeTileFromHand(activeId);
      return;
    }

    // Dragging a tile that is already on the board
    if (tileFromBoard && overId.startsWith('cell-')) {
      const destinationCellId = overId;
      const originCellId = tileFromBoard.position;

      if (destinationCellId === originCellId) {
        return; // Dropped on its own cell, do nothing
      }

      const tileAtDestination = getTileAtPosition(destinationCellId);

      if (tileAtDestination) {
        // Destination cell is occupied by another tile, swap them
        updateTilePositions(prevTiles => prevTiles.map(t => {
          if (t.id === tileFromBoard.id) {
            return { ...t, position: destinationCellId };
          }
          if (t.id === tileAtDestination.id) {
            return { ...t, position: originCellId };
          }
          return t;
        }));
      } else {
        // Destination cell is empty, just move the tile
        updateTilePositions(prevTiles => prevTiles.map(t =>
          t.id === tileFromBoard.id ? { ...t, position: destinationCellId } : t
        ));
      }
      return;
    }
  }

  return { handleDragEnd };
} 