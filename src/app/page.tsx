'use client';

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import GridCell from './components/GridCell';
import GridTile from './components/GridTile';
import TilePalette from './components/TilePalette';
import TrashArea from './components/TrashArea';

// Letter distribution for Bananagrams
const INITIAL_LETTER_DISTRIBUTION = [
  { letter: 'A', count: 13 },
  { letter: 'B', count: 3 },
  { letter: 'C', count: 3 },
  { letter: 'D', count: 6 },
  { letter: 'E', count: 18 },
  { letter: 'F', count: 3 },
  { letter: 'G', count: 4 },
  { letter: 'H', count: 3 },
  { letter: 'I', count: 12 },
  { letter: 'J', count: 2 },
  { letter: 'K', count: 2 },
  { letter: 'L', count: 5 },
  { letter: 'M', count: 3 },
  { letter: 'N', count: 8 },
  { letter: 'O', count: 11 },
  { letter: 'P', count: 3 },
  { letter: 'Q', count: 2 },
  { letter: 'R', count: 9 },
  { letter: 'S', count: 6 },
  { letter: 'T', count: 9 },
  { letter: 'U', count: 6 },
  { letter: 'V', count: 3 },
  { letter: 'W', count: 3 },
  { letter: 'X', count: 2 },
  { letter: 'Y', count: 3 },
  { letter: 'Z', count: 2 },
];

export default function Home() {
  // Create a 25x25 grid
  const gridSize = 25;
  const gridCellIds = Array.from({ length: gridSize * gridSize }, (_, i) => `cell-${i}`);
  
  // Initial state: empty board
  const [tiles, setTiles] = useState<{
    id: string;
    content: string;
    position: string;
  }[]>([]);

  // Letter bag state
  const [letterBag, setLetterBag] = useState([...INITIAL_LETTER_DISTRIBUTION]);
  const [playerHand, setPlayerHand] = useState<{ id: string; letter: string }[]>([]);
  
  // Counter to create unique IDs for new tiles
  const [tileCounter, setTileCounter] = useState(1);

  console.log(tileCounter);
  console.log(playerHand);
  console.log(letterBag);
  // Initialize the game with 21 tiles in player's hand
  useEffect(() => {
    // Generate the initial tiles once
    if (playerHand.length === 0 && tiles.length === 0) {
      console.log('Initializing with 21 tiles');
      drawTiles(21); // Start with 21 tiles as required for Bananagrams
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Empty dependency array to run only once
  
  // Automatically draw 3 more tiles when player's hand is empty
  useEffect(() => {
    const remainingCount = letterBag.reduce((sum, item) => sum + item.count, 0);
    if (playerHand.length === 0 && remainingCount > 0 && tiles.length > 0) {
      console.log('Hand empty and game in progress, drawing 3 more tiles');
      drawTiles(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerHand.length, letterBag, tiles.length]);
  
  // Draw random tiles from the bag
  const drawTiles = (count: number) => {
    console.log(`Drawing ${count} tiles...`);
    // Create a copy of the letter bag
    const updatedBag = [...letterBag];
    const newTiles: { id: string; letter: string }[] = [];
    
    // Draw random letters
    for (let i = 0; i < count; i++) {
      // Calculate total tiles remaining
      const totalRemaining = updatedBag.reduce((sum, item) => sum + item.count, 0);
      if (totalRemaining === 0) {
        console.log('No more tiles remaining!');
        break;
      }
      
      // Pick a random tile from what's left
      const randomIndex = Math.floor(Math.random() * totalRemaining);
      let runningCount = 0;
      let selectedLetter = '';
      
      // Find which letter got selected
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
    
    console.log(`Drew ${newTiles.length} new tiles`);
    
    // Update the state
    setLetterBag(updatedBag);
    setPlayerHand(prevHand => [...prevHand, ...newTiles]);
    setTileCounter(prevCounter => prevCounter + newTiles.length);
  };
  
  // Handle trading 1 tile for 3 new ones
  const handleTradeInTile = (tileId: string) => {
    // Find the tile in the player's hand
    const tileToTrade = playerHand.find(tile => tile.id === tileId);
    if (!tileToTrade) return;
    
    // Remove that tile from the hand
    setPlayerHand(playerHand.filter(tile => tile.id !== tileId));
    
    // Update the letter bag to put the letter back
    const updatedBag = [...letterBag];
    const letterIndex = updatedBag.findIndex(item => item.letter === tileToTrade.letter);
    if (letterIndex >= 0) {
      updatedBag[letterIndex].count++;
    }
    setLetterBag(updatedBag);
    
    // Draw 3 new tiles
    drawTiles(3);
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const tileFromHand = playerHand.find(tile => tile.id === activeId);
    const tileFromBoard = tiles.find(tile => tile.id === activeId);

    // Scenario 1: Dropping into Trash Area
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
        const letter = letterToReturn; // To satisfy TypeScript inside the map function
        setLetterBag(prevBag => {
          const updatedBag = [...prevBag];
          const letterIndex = updatedBag.findIndex(item => item.letter === letter);
          if (letterIndex >= 0) {
            updatedBag[letterIndex] = { ...updatedBag[letterIndex], count: updatedBag[letterIndex].count + 1 };
          }
          return updatedBag;
        });
        drawTiles(3); // Draw 3 new tiles
      }
      return;
    }

    // Scenario 2: Dragging from playerHand to a board cell (Droppable ID starts with 'cell-')
    if (tileFromHand && overId.startsWith('cell-')) {
      const destinationCellId = overId;
      const tileAtDestinationBoard = tiles.find(t => t.position === destinationCellId);

      if (tileAtDestinationBoard) {
        // Destination is occupied on the board, prevent stacking
        return;
      }

      // Place tile on board
      const newBoardTile = { id: tileFromHand.id, content: tileFromHand.letter, position: destinationCellId };
      setTiles(prevTiles => [...prevTiles, newBoardTile]);
      setPlayerHand(prevHand => prevHand.filter(tile => tile.id !== activeId));
      return;
    }

    // Scenario 3: Dragging a tile that is already on the board (Droppable ID starts with 'cell-')
    if (tileFromBoard && overId.startsWith('cell-')) {
      const destinationCellId = overId;
      const originCellId = tileFromBoard.position;

      if (destinationCellId === originCellId) {
        // Dropped on its own cell, do nothing
        return;
      }

      const tileAtDestinationBoard = tiles.find(t => t.position === destinationCellId);

      if (tileAtDestinationBoard) {
        // Destination cell is occupied by another tile, swap them
        setTiles(prevTiles => prevTiles.map(t => {
          if (t.id === tileFromBoard.id) {
            return { ...t, position: destinationCellId }; // Move the dragged tile to the new cell
          }
          if (t.id === tileAtDestinationBoard.id) {
            return { ...t, position: originCellId }; // Move the occupant tile to the original cell of the dragged tile
          }
          return t;
        }));
      } else {
        // Destination cell is empty, just move the tile
        setTiles(prevTiles => prevTiles.map(t =>
          t.id === tileFromBoard.id ? { ...t, position: destinationCellId } : t
        ));
      }
      return;
    }
  }

  // Function to get the tile at a specific position
  const getTileAtPosition = (cellId: string) => {
    return tiles.find(tile => tile.position === cellId);
  };

  return (
    <main className="min-h-screen p-4 flex flex-col items-center bg-amber-50">
      <h1 className="text-2xl font-bold mb-4 text-black">Bananagrams</h1>
      
      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        {/* Player's hand */}
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
