'use client';

import { useState, useEffect, useRef } from 'react';
import { BoardTile, PlayerTile, GameStartData, PeelData } from '@/types/multiplayer';
import { useSocket } from '@/contexts/SocketContext';

export function useMultiplayerGameState() {
  // Initial state: empty board
  const [tiles, setTiles] = useState<BoardTile[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayerTile[]>([]);
  const [remainingTiles, setRemainingTiles] = useState<number>(0);
  
  // Use a ref to ensure unique IDs across all tiles
  const tileCounterRef = useRef(1);
  
  const { currentRoom, playerName, onGameStart } = useSocket();
  
  // Function to get next unique tile ID
  const getNextTileId = () => {
    const id = `tile-${tileCounterRef.current}`;
    tileCounterRef.current += 1;
    return id;
  };

  // Initialize game when it starts
  useEffect(() => {
    const unsubscribe = onGameStart((data: GameStartData) => {
      // Find current player's tiles
      const currentPlayer = data.players.find(p => p.name === playerName);
      if (currentPlayer) {
        setPlayerHand(currentPlayer.tiles);
        setRemainingTiles(data.remainingTiles);
      }
    });

    return unsubscribe;
  }, [onGameStart, playerName]);

  // Initialize from current room if game already started
  useEffect(() => {
    if (currentRoom && currentRoom.gameState === 'playing') {
      const currentPlayer = currentRoom.players.find(p => p.name === playerName);
      if (currentPlayer) {
        setPlayerHand(currentPlayer.tiles);
      }
    }
  }, [currentRoom, playerName]);

  // Handle peel event - everyone gets a new tile
  const handlePeelEvent = (data: PeelData) => {
    const currentPlayer = data.players.find(p => p.name === playerName);
    if (currentPlayer) {
      setPlayerHand(currentPlayer.tiles);
      setRemainingTiles(data.remainingTiles);
    }
  };

  // Handle dump result - replace tile with new ones
  const handleDumpResult = (oldTileId: string, newTiles: PlayerTile[]) => {
    setPlayerHand(prevHand => {
      const filtered = prevHand.filter(tile => tile.id !== oldTileId);
      return [...filtered, ...newTiles];
    });
  };

  // Add a tile from the board back to the player's hand
  const addTileToHand = (letter: string) => {
    const tileId = getNextTileId();
    setPlayerHand(prevHand => [...prevHand, { id: tileId, letter }]);
  };

  // Return a tile to the bag (not used in multiplayer)
  const returnTileToBag = (letter: string) => {
    // In multiplayer, tiles don't go back to bag individually
  };

  // Draw tiles (not used in multiplayer - server handles this)
  const drawTiles = (count: number) => {
    // In multiplayer, drawing is handled by server
  };

  // Functions related to the board
  const getHandTile = (id: string) => playerHand.find(tile => tile.id === id);
  const getBoardTile = (id: string) => tiles.find(tile => tile.id === id);
  const getTileAtPosition = (cellId: string) => tiles.find(tile => tile.position === cellId);
  
  // Remove a tile from hand
  const removeTileFromHand = (id: string) => {
    setPlayerHand(prevHand => prevHand.filter(tile => tile.id !== id));
  };
  
  // Remove a tile from the board
  const removeTileFromBoard = (id: string) => {
    setTiles(prevTiles => prevTiles.filter(tile => tile.id !== id));
  };
  
  // Add a tile to the board
  const addTileToBoard = (newTile: BoardTile) => {
    setTiles(prevTiles => [...prevTiles, newTile]);
  };
  
  // Update tile positions on the board
  const updateTilePositions = (
    updater: (prevTiles: BoardTile[]) => BoardTile[]
  ) => {
    setTiles(updater);
  };

  return {
    tiles,
    playerHand,
    remainingTiles,
    handlePeelEvent,
    handleDumpResult,
    drawTiles,
    returnTileToBag,
    getHandTile,
    getBoardTile,
    getTileAtPosition,
    removeTileFromHand,
    removeTileFromBoard,
    addTileToBoard,
    updateTilePositions,
    addTileToHand,
  };
} 