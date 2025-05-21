"use client";

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { TileRack } from './TileRack';
import { Board } from './Board';
import { generateTiles, drawTiles } from '../utils/gameUtils';

export function Bananagrams() {
  // Game state
  const [allTiles, setAllTiles] = useState<{ id: string; letter: string }[]>([]);
  const [remainingTiles, setRemainingTiles] = useState<{ id: string; letter: string }[]>([]);
  const [playerTiles, setPlayerTiles] = useState<{ id: string; letter: string }[]>([]);
  const [boardState, setBoardState] = useState<Record<string, { id: string; letter: string } | null>>({});
  const [activeTile, setActiveTile] = useState<{ id: string; letter: string } | null>(null);
  const [activeTileLocation, setActiveTileLocation] = useState<string | null>(null);
  const boardSize = 15;
  
  // Initialize the game
  useEffect(() => {
    const tiles = generateTiles();
    setAllTiles(tiles);
    setRemainingTiles(tiles);
    
    // Draw initial tiles for player (21 is standard for Bananagrams)
    const { drawnTiles, remainingTiles: newRemaining } = drawTiles(tiles, 21);
    setPlayerTiles(drawnTiles);
    setRemainingTiles(newRemaining);
    
    // Initialize empty board
    const initialBoardState: Record<string, { id: string; letter: string } | null> = {};
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        initialBoardState[`square-${row}-${col}`] = null;
      }
    }
    setBoardState(initialBoardState);
  }, []);
  
  // Handle tile drag start
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const tileId = active.id as string;
    
    // Find the tile in player tiles
    const foundTile = playerTiles.find(tile => tile.id === tileId);
    
    // If not in player tiles, find it in board
    if (!foundTile) {
      for (const [squareId, tileObj] of Object.entries(boardState)) {
        if (tileObj && tileObj.id === tileId) {
          setActiveTile(tileObj);
          setActiveTileLocation(squareId);
          return;
        }
      }
      return;
    }
    
    setActiveTile(foundTile);
    setActiveTileLocation('tile-rack');
  }
  
  // Handle tile drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over || !activeTile) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // If dropping on the same spot, do nothing
    if (activeTileLocation === overId) return;
    
    // Handle dropping on a board square
    if (overId.startsWith('square-')) {
      // Update board state
      const newBoardState = { ...boardState };
      
      // Remove from previous board location if it was on the board
      if (activeTileLocation && activeTileLocation.startsWith('square-')) {
        newBoardState[activeTileLocation] = null;
      }
      
      // Add to new location
      newBoardState[overId] = activeTile;
      setBoardState(newBoardState);
      
      // Remove from player tiles if it was there
      if (activeTileLocation === 'tile-rack') {
        setPlayerTiles(playerTiles.filter(tile => tile.id !== activeId));
      }
    }
    
    // Handle dropping back to tile rack
    if (overId === 'tile-rack') {
      // Only do something if the tile was on the board
      if (activeTileLocation && activeTileLocation.startsWith('square-')) {
        // Remove from board
        const newBoardState = { ...boardState };
        newBoardState[activeTileLocation] = null;
        setBoardState(newBoardState);
        
        // Add back to player tiles
        setPlayerTiles([...playerTiles, activeTile]);
      }
    }
    
    // Reset active tile tracking
    setActiveTile(null);
    setActiveTileLocation(null);
  }
  
  // Draw more tiles
  function handleDrawTiles() {
    if (remainingTiles.length === 0) return;
    
    const { drawnTiles: newTiles, remainingTiles: newRemaining } = drawTiles(remainingTiles, 1);
    setPlayerTiles([...playerTiles, ...newTiles]);
    setRemainingTiles(newRemaining);
  }
  
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto p-4">
      <div className="w-full">
        <h1 className="text-3xl font-bold text-center mb-2 text-yellow-400">Bananagrams</h1>
        <div className="flex justify-between items-center">
          <div className="text-lg text-gray-200">
            <span>Tiles Remaining: {remainingTiles.length}</span>
          </div>
          <button 
            onClick={handleDrawTiles}
            disabled={remainingTiles.length === 0}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Draw Tile
          </button>
        </div>
      </div>
      
      <DndContext 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        <div className="w-full mb-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-200">Your Tiles</h2>
          <TileRack letters={playerTiles} />
        </div>
        
        <div className="overflow-auto max-w-full">
          <Board boardState={boardState} boardSize={boardSize} />
        </div>
      </DndContext>
    </div>
  );
} 