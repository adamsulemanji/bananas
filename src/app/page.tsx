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
  
  // Initialize the game with 21 tiles in player's hand
  useEffect(() => {
    drawTiles(21);
  }, []);
  
  // Check if player's hand is empty after each move, and draw 3 more if needed
  useEffect(() => {
    if (playerHand.length === 0) {
      drawTiles(3);
    }
  }, [playerHand]);
  
  // Draw random tiles from the bag
  const drawTiles = (count: number) => {
    // Create a copy of the letter bag
    const updatedBag = [...letterBag];
    const newTiles = [];
    
    // Draw random letters
    for (let i = 0; i < count; i++) {
      // Calculate total tiles remaining
      const totalRemaining = updatedBag.reduce((sum, item) => sum + item.count, 0);
      if (totalRemaining === 0) break;
      
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
    
    // Update the state
    setLetterBag(updatedBag);
    setPlayerHand([...playerHand, ...newTiles]);
    setTileCounter(tileCounter + newTiles.length);
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
    
    const activeTileId = active.id as string;
    const overDestinationId = over.id as string;
    
    // Handle dropping into trash area (return to bunch)
    if (overDestinationId === 'trash') {
      // Check if the tile is from the player's hand or the board
      const handTile = playerHand.find(tile => tile.id === activeTileId);
      const boardTile = tiles.find(tile => tile.id === activeTileId);
      
      if (handTile) {
        // Return the tile to the letter bag
        const updatedBag = [...letterBag];
        const letterIndex = updatedBag.findIndex(item => item.letter === handTile.letter);
        if (letterIndex >= 0) {
          updatedBag[letterIndex].count++;
        }
        setLetterBag(updatedBag);
        
        // Remove it from the hand
        setPlayerHand(playerHand.filter(tile => tile.id !== activeTileId));
        
        // Draw 3 new tiles
        drawTiles(3);
      } else if (boardTile) {
        // Return the tile to the letter bag
        const updatedBag = [...letterBag];
        const letterIndex = updatedBag.findIndex(item => item.letter === boardTile.content);
        if (letterIndex >= 0) {
          updatedBag[letterIndex].count++;
        }
        setLetterBag(updatedBag);
        
        // Remove it from the board
        setTiles(tiles.filter(tile => tile.id !== activeTileId));
        
        // Draw 3 new tiles
        drawTiles(3);
      }
      return;
    }
    
    // Check if the drag is from the player's hand
    if (activeTileId.startsWith('hand-')) {
      const handTile = playerHand.find(tile => tile.id === activeTileId);
      if (handTile) {
        // Create a new tile on the board
        const newTile = {
          id: activeTileId,
          content: handTile.letter,
          position: overDestinationId,
        };
        
        // Check if there's already a tile at the destination
        const tileAtDestination = tiles.find(tile => tile.position === overDestinationId);
        
        if (tileAtDestination) {
          // Don't allow stacking - do nothing
          return;
        } else {
          // Add the new tile to the board
          setTiles([...tiles, newTile]);
          // Remove from hand
          setPlayerHand(playerHand.filter(tile => tile.id !== activeTileId));
        }
      }
    } else {
      // This is a tile already on the board being moved
      if (active.id !== over.id) {
        const tileAtDestination = tiles.find(tile => tile.position === overDestinationId);
        
        if (tileAtDestination) {
          // Swap the positions of the two tiles
          setTiles(tiles.map(tile => {
            if (tile.id === activeTileId) {
              return { ...tile, position: overDestinationId };
            } else if (tile.id === tileAtDestination.id) {
              // Find the origin position of the active tile
              const activeTile = tiles.find(t => t.id === activeTileId);
              return { ...tile, position: activeTile ? activeTile.position : tile.position };
            }
            return tile;
          }));
        } else {
          // Move the tile to the new position
          setTiles(tiles.map(tile => 
            tile.id === activeTileId ? { ...tile, position: overDestinationId } : tile
          ));
        }
      }
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
