'use client';

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import GridCell from './components/GridCell';
import GridTile from './components/GridTile';
import TilePalette from './components/TilePalette';
import TrashArea from './components/TrashArea';
import { 
  INITIAL_LETTER_DISTRIBUTION, 
  PlayerTile, 
  BoardTile, 
  LetterDistributionItem 
} from '../utils/gameUtils';

export default function Home() {
  // Create a 25x25 grid
  const gridSize = 25;
  const gridCellIds = Array.from({ length: gridSize * gridSize }, (_, i) => `cell-${i}`);
  
  // Initial state: empty board
  const [tiles, setTiles] = useState<BoardTile[]>([]);

  // Letter bag state
  const [letterBag, setLetterBag] = useState<LetterDistributionItem[]>([...INITIAL_LETTER_DISTRIBUTION]);
  const [playerHand, setPlayerHand] = useState<PlayerTile[]>([]);
  
  // Counter to create unique IDs for new tiles
  const [tileCounter, setTileCounter] = useState(1);

  // Initialize the game with 21 tiles in player's hand
  useEffect(() => {
    // Generate the initial tiles once
    if (playerHand.length === 0 && tiles.length === 0) {
      drawTiles(21); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Empty dependency array to run only once
  
  // Automatically draw 3 more tiles when player's hand is empty
  useEffect(() => {
    const remainingCount = letterBag.reduce((sum, item) => sum + item.count, 0);
    if (playerHand.length === 0 && remainingCount > 0 && tiles.length > 0) {
      drawTiles(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerHand.length, letterBag, tiles.length]);
  
  // Draw random tiles from the bag
  const drawTiles = (count: number) => {
    const updatedBag = [...letterBag];
    const newTiles: PlayerTile[] = [];
    
    for (let i = 0; i < count; i++) {
      const totalRemaining = updatedBag.reduce((sum, item) => sum + item.count, 0);
      if (totalRemaining === 0) {
        break;
      }
      
      const randomIndex = Math.floor(Math.random() * totalRemaining);
      let runningCount = 0;
      let selectedLetter = '';
      
      for (let j = 0; j < updatedBag.length; j++) {
        runningCount += updatedBag[j].count;
        if (randomIndex < runningCount && updatedBag[j].count > 0) {
          selectedLetter = updatedBag[j].letter;
          updatedBag[j].count--;
          break;
        }
      }
      
      if (selectedLetter) {
        const tileId = `hand-${tileCounter + i}`;
        newTiles.push({ id: tileId, letter: selectedLetter });
      }
    }
    
    setLetterBag(updatedBag);
    setPlayerHand(prevHand => [...prevHand, ...newTiles]);
    setTileCounter(prevCounter => prevCounter + newTiles.length);
  };
  
  // Handle trading 1 tile for 3 new ones
  const handleTradeInTile = (tileId: string) => {
    const tileToTrade = playerHand.find(tile => tile.id === tileId);
    if (!tileToTrade) return;
    
    setPlayerHand(playerHand.filter(tile => tile.id !== tileId));
    
    const updatedBag = [...letterBag];
    const letterIndex = updatedBag.findIndex(item => item.letter === tileToTrade.letter);
    if (letterIndex >= 0) {
      updatedBag[letterIndex].count++;
    }
    setLetterBag(updatedBag);
    
    drawTiles(3);
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const tileFromHand = playerHand.find(tile => tile.id === activeId);
    const tileFromBoard = tiles.find(tile => tile.id === activeId);

    if (overId === 'trash') {
      let letterToReturn: string | undefined;
      if (tileFromHand) {
        letterToReturn = tileFromHand.letter;
        setPlayerHand(prevHand => prevHand.filter(tile => tile.id !== activeId));
      } else if (tileFromBoard) {
        letterToReturn = tileFromBoard.content;
        setTiles(prevTiles => prevTiles.filter(tile => tile.id !== activeId));
      }

      if (letterToReturn) {
        const letter = letterToReturn;
        setLetterBag(prevBag => {
          const updatedBag = [...prevBag];
          const letterIndex = updatedBag.findIndex(item => item.letter === letter);
          if (letterIndex >= 0) {
            updatedBag[letterIndex] = { ...updatedBag[letterIndex], count: updatedBag[letterIndex].count + 1 };
          }
          return updatedBag;
        });
        drawTiles(3); 
      }
      return;
    }

    if (tileFromHand && overId.startsWith('cell-')) {
      const destinationCellId = overId;
      const tileAtDestinationBoard = tiles.find(t => t.position === destinationCellId);

      if (tileAtDestinationBoard) {
        return;
      }

      const newBoardTile = { id: tileFromHand.id, content: tileFromHand.letter, position: destinationCellId };
      setTiles(prevTiles => [...prevTiles, newBoardTile]);
      setPlayerHand(prevHand => prevHand.filter(tile => tile.id !== activeId));
      return;
    }

    if (tileFromBoard && overId.startsWith('cell-')) {
      const destinationCellId = overId;
      const originCellId = tileFromBoard.position;

      if (destinationCellId === originCellId) {
        return;
      }

      const tileAtDestinationBoard = tiles.find(t => t.position === destinationCellId);

      if (tileAtDestinationBoard) {
        setTiles(prevTiles => prevTiles.map(t => {
          if (t.id === tileFromBoard.id) {
            return { ...t, position: destinationCellId }; 
          }
          if (t.id === tileAtDestinationBoard.id) {
            return { ...t, position: originCellId }; 
          }
          return t;
        }));
      } else {
        setTiles(prevTiles => prevTiles.map(t =>
          t.id === tileFromBoard.id ? { ...t, position: destinationCellId } : t
        ));
      }
      return;
    }
  }

  const getTileAtPosition = (cellId: string) => {
    return tiles.find(tile => tile.position === cellId);
  };

  return (
    <main className="min-h-screen p-4 flex flex-col items-center bg-amber-50">
      <h1 className="text-2xl font-bold mb-4 text-black">Bananagrams</h1>
      
      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <TilePalette 
          playerHand={playerHand}
          remainingTiles={letterBag.reduce((sum, item) => sum + item.count, 0)}
          onDrawTiles={drawTiles}
          onTradeInTile={handleTradeInTile}
        />
        
        <div className="grid grid-cols-[repeat(25,_minmax(0,_1fr))] gap-0 w-full max-w-5xl border border-amber-800 bg-amber-100 p-px">
          {gridCellIds.map((cellId) => {
            const tile = getTileAtPosition(cellId);
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
        
        <TrashArea />
      </DndContext>
    </main>
  );
}
