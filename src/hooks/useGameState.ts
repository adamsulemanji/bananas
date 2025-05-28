'use client';

import { useState, useEffect, useRef } from 'react';
import {
  INITIAL_LETTER_DISTRIBUTION,
  LetterDistributionItem,
  PlayerTile,
  BoardTile,
} from '../utils/gameUtils';
import { deserializeGameState, serializeGameState } from '@/utils/gameSession';

export function useGameState() {
  // Initial state: empty board
  const [tiles, setTiles] = useState<BoardTile[]>([]);

  // Letter bag state
  const [letterBag, setLetterBag] = useState<LetterDistributionItem[]>([
    ...INITIAL_LETTER_DISTRIBUTION,
  ]);
  const [playerHand, setPlayerHand] = useState<PlayerTile[]>([]);

  // Use a ref to ensure unique IDs across all tiles
  const tileCounterRef = useRef(1);

  // Track if game has been initialized to prevent double initialization in StrictMode
  const isInitializedRef = useRef(false);

  // Function to get next unique tile ID
  const getNextTileId = () => {
    const id = `hand-${tileCounterRef.current}`;
    tileCounterRef.current += 1;
    return id;
  };

  // Initialize the game with 21 tiles in player's hand
  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (!isInitializedRef.current && playerHand.length === 0 && tiles.length === 0) {
      isInitializedRef.current = true;
      drawTiles(21);
    }
  }, []);

  // Automatically draw 3 more tiles when player's hand is empty
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const remainingCount = letterBag.reduce((sum, item) => sum + item.count, 0);
    if (playerHand.length === 0 && remainingCount > 0 && tiles.length > 0) {
      drawTiles(3);
    }
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
        const tileId = getNextTileId();
        newTiles.push({ id: tileId, letter: selectedLetter });
      }
    }

    setLetterBag(updatedBag);
    setPlayerHand((prevHand) => [...prevHand, ...newTiles]);
  };

  // Add a tile from the board back to the player's hand
  const addTileToHand = (letter: string) => {
    const tileId = getNextTileId();
    setPlayerHand((prevHand) => [...prevHand, { id: tileId, letter }]);
  };

  // Handle trading 1 tile for 3 new ones
  const handleTradeInTile = (tileId: string) => {
    const tileToTrade = playerHand.find((tile) => tile.id === tileId);
    if (!tileToTrade) return;

    setPlayerHand(playerHand.filter((tile) => tile.id !== tileId));

    const updatedBag = [...letterBag];
    const letterIndex = updatedBag.findIndex((item) => item.letter === tileToTrade.letter);
    if (letterIndex >= 0) {
      updatedBag[letterIndex].count++;
    }
    setLetterBag(updatedBag);

    drawTiles(3);
  };

  // Return a tile to the bag
  const returnTileToBag = (letter: string) => {
    setLetterBag((prevBag) => {
      const updatedBag = [...prevBag];
      const letterIndex = updatedBag.findIndex((item) => item.letter === letter);
      if (letterIndex >= 0) {
        updatedBag[letterIndex] = {
          ...updatedBag[letterIndex],
          count: updatedBag[letterIndex].count + 1,
        };
      }
      return updatedBag;
    });
  };

  // Get the total number of remaining tiles in the bag
  const getRemainingTileCount = () => {
    return letterBag.reduce((sum, item) => sum + item.count, 0);
  };

  // Functions related to the board
  const getHandTile = (id: string) => playerHand.find((tile) => tile.id === id);
  const getBoardTile = (id: string) => tiles.find((tile) => tile.id === id);
  const getTileAtPosition = (cellId: string) => tiles.find((tile) => tile.position === cellId);

  // Remove a tile from hand
  const removeTileFromHand = (id: string) => {
    setPlayerHand((prevHand) => prevHand.filter((tile) => tile.id !== id));
  };

  // Remove a tile from the board
  const removeTileFromBoard = (id: string) => {
    setTiles((prevTiles) => prevTiles.filter((tile) => tile.id !== id));
  };

  // Add a tile to the board
  const addTileToBoard = (newTile: BoardTile) => {
    setTiles((prevTiles) => [...prevTiles, newTile]);
  };

  // Update tile positions on the board
  const updateTilePositions = (updater: (prevTiles: BoardTile[]) => BoardTile[]) => {
    setTiles(updater);
  };

  // Load game state from serialized data
  const loadFromSerialized = (serializedData: string) => {
    try {
      const deserialized = deserializeGameState(serializedData);
      setTiles(deserialized.tiles || []);
      setPlayerHand(deserialized.playerHand || []);
      setLetterBag(deserialized.letterBag || [...INITIAL_LETTER_DISTRIBUTION]);

      // Restore tile counter to ensure unique IDs
      if (deserialized.tileCounter) {
        tileCounterRef.current = deserialized.tileCounter;
      }

      // Check if the loaded state is empty (0 tiles everywhere)
      const totalTilesInBag = (deserialized.letterBag || []).reduce(
        (sum: number, item: any) => sum + (item.count || 0),
        0
      );
      const hasNoTiles =
        (!deserialized.tiles || deserialized.tiles.length === 0) &&
        (!deserialized.playerHand || deserialized.playerHand.length === 0) &&
        totalTilesInBag === 0;

      if (hasNoTiles) {
        // Reset to initial state if loaded state is empty
        setLetterBag([...INITIAL_LETTER_DISTRIBUTION]);
        tileCounterRef.current = 1;
        isInitializedRef.current = false;
        // Trigger initial draw after state updates
        setTimeout(() => {
          isInitializedRef.current = true;
          drawTiles(21);
        }, 0);
      } else {
        // Mark as initialized to prevent auto-drawing tiles
        isInitializedRef.current = true;
      }
    } catch (error) {
      console.error('Error loading game state:', error);
      // Reset to initial state on error
      setTiles([]);
      setPlayerHand([]);
      setLetterBag([...INITIAL_LETTER_DISTRIBUTION]);
      tileCounterRef.current = 1;
      isInitializedRef.current = false;
    }
  };

  // Serialize current game state
  const getSerializedState = () => {
    return serializeGameState({
      tiles,
      playerHand,
      letterBag,
      tileCounter: tileCounterRef.current,
    });
  };

  // Reset the game to initial state
  const resetGame = () => {
    setTiles([]);
    setPlayerHand([]);
    setLetterBag([...INITIAL_LETTER_DISTRIBUTION]);
    tileCounterRef.current = 1;
    isInitializedRef.current = false;

    // Trigger initial draw
    setTimeout(() => {
      isInitializedRef.current = true;
      drawTiles(21);
    }, 0);
  };

  return {
    tiles,
    playerHand,
    letterBag,
    drawTiles,
    handleTradeInTile,
    returnTileToBag,
    getRemainingTileCount,
    getHandTile,
    getBoardTile,
    getTileAtPosition,
    removeTileFromHand,
    removeTileFromBoard,
    addTileToBoard,
    updateTilePositions,
    addTileToHand,
    loadFromSerialized,
    getSerializedState,
    resetGame,
  };
}
