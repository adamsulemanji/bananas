'use client';

import { useState, useEffect } from 'react';
import { 
  INITIAL_LETTER_DISTRIBUTION, 
  LetterDistributionItem,
  PlayerTile,
  BoardTile
} from '../utils/gameUtils';

export function useGameState() {
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

  // Return a tile to the bag
  const returnTileToBag = (letter: string) => {
    setLetterBag(prevBag => {
      const updatedBag = [...prevBag];
      const letterIndex = updatedBag.findIndex(item => item.letter === letter);
      if (letterIndex >= 0) {
        updatedBag[letterIndex] = { 
          ...updatedBag[letterIndex], 
          count: updatedBag[letterIndex].count + 1 
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
    updateTilePositions
  };
} 