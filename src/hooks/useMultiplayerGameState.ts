'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BoardTile, PlayerTile, GameStartData, PeelData } from '@/types/multiplayer';
import { useSocket } from '@/contexts/SocketContext';

export function useMultiplayerGameState() {
  // Initial state: empty board
  const [tiles, setTiles] = useState<BoardTile[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayerTile[]>([]);
  const [remainingTiles, setRemainingTiles] = useState<number>(0);
  const [gameInitialized, setGameInitialized] = useState(false);

  // Debug wrapper for setGameInitialized
  const setGameInitializedWithLog = (value: boolean) => {
    setGameInitialized(value);
  };

  // Debug gameInitialized changes
  useEffect(() => {}, [gameInitialized]);

  // Debug playerHand changes
  useEffect(() => {}, [playerHand]);

  // Use a ref to ensure unique IDs across all tiles
  const tileCounterRef = useRef(1);

  // Use a ref to track initialization state to avoid stale closures
  const gameInitializedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    gameInitializedRef.current = gameInitialized;
  }, [gameInitialized]);

  const { currentRoom, playerName, gameStartData, onGameStart, onPeelCalled } = useSocket();

  // Debug playerName changes
  useEffect(() => {}, [playerName]);

  // Debug gameStartData changes
  useEffect(() => {}, [gameStartData]);

  // Debug hook lifecycle
  useEffect(() => {
    return () => {};
  }, []);

  // Listen directly to gameStart events
  useEffect(() => {
    if (!playerName) return;

    const unsubscribe = onGameStart((data: GameStartData) => {
      // Use a ref to check if already initialized to avoid stale closure
      if (gameInitializedRef.current) {
        return;
      }

      const currentPlayer = data.players.find((p) => p.name === playerName);
      if (currentPlayer) {
        // On game start, all tiles should be in hand (board is empty)
        setPlayerHand(currentPlayer.tiles);
        setRemainingTiles(data.remainingTiles);
        setGameInitializedWithLog(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [playerName, onGameStart]); // Removed gameInitialized from deps to avoid re-subscription

  // Function to get next unique tile ID
  const getNextTileId = () => {
    const id = `tile-${tileCounterRef.current}`;
    tileCounterRef.current += 1;
    return id;
  };

  // Initialize game when gameStartData is available (fallback approach)
  useEffect(() => {
    if (!gameStartData) {
      return;
    }

    if (!playerName) {
      return;
    }

    if (gameInitialized) {
      return;
    }

    // Find current player's tiles
    const currentPlayer = gameStartData.players.find((p) => p.name === playerName);

    if (currentPlayer) {
      setPlayerHand(currentPlayer.tiles);
      setRemainingTiles(gameStartData.remainingTiles);
      setGameInitializedWithLog(true);
    } else {
    }
  }, [gameStartData, playerName, gameInitialized]);

  // Initialize from current room if game already started (but only if not already initialized)
  useEffect(() => {
    if (currentRoom && currentRoom.gameState === 'playing' && !gameInitialized && playerName) {
      const currentPlayer = currentRoom.players.find((p) => p.name === playerName);
      if (currentPlayer && currentPlayer.tiles && currentPlayer.tiles.length > 0) {
        setPlayerHand(currentPlayer.tiles);
        setRemainingTiles(currentRoom.letterBag ? currentRoom.letterBag.length : 0);
        setGameInitializedWithLog(true);
      }
    }
  }, [currentRoom, playerName, gameInitialized]);

  // Handle peel event - everyone gets a new tile
  const handlePeelEvent = useCallback(
    (data: PeelData) => {
      const currentPlayer = data.players.find((p) => p.name === playerName);
      if (currentPlayer) {
        setPlayerHand((prevHand) => {
          const existingIds = new Set(prevHand.map((t) => t.id));
          const newTiles = currentPlayer.tiles.filter((t) => !existingIds.has(t.id));

          return [...prevHand, ...newTiles];
        });

        setRemainingTiles(data.remainingTiles);
      } else {
      }
    },
    [playerName]
  );

  // Handle dump result - replace tile with new ones
  const handleDumpResult = useCallback((oldTileId: string, newTiles: PlayerTile[]) => {
    setPlayerHand((prevHand) => {
      const filtered = prevHand.filter((tile) => tile.id !== oldTileId);
      return [...filtered, ...newTiles];
    });
  }, []);

  // Handle player dump events (when other players dump)
  const handlePlayerDumpEvent = useCallback((data: { remainingTiles: number }) => {
    setRemainingTiles(data.remainingTiles);
  }, []);

  // Add a tile from the board back to the player's hand
  const addTileToHand = useCallback((letter: string) => {
    const tileId = getNextTileId();
    setPlayerHand((prevHand) => [...prevHand, { id: tileId, letter }]);
  }, []);

  // Return a tile to the bag (not used in multiplayer)
  const returnTileToBag = useCallback((letter: string) => {
    // In multiplayer, tiles don't go back to bag individually
  }, []);

  // Draw tiles (not used in multiplayer - server handles this)
  const drawTiles = useCallback((count: number) => {
    // In multiplayer, drawing is handled by server
  }, []);

  // Functions related to the board
  const getHandTile = useCallback(
    (id: string) => playerHand.find((tile) => tile.id === id),
    [playerHand]
  );
  const getBoardTile = useCallback((id: string) => tiles.find((tile) => tile.id === id), [tiles]);
  const getTileAtPosition = useCallback(
    (cellId: string) => tiles.find((tile) => tile.position === cellId),
    [tiles]
  );

  // Remove a tile from hand
  const removeTileFromHand = useCallback((id: string) => {
    setPlayerHand((prevHand) => prevHand.filter((tile) => tile.id !== id));
  }, []);

  // Remove a tile from the board
  const removeTileFromBoard = useCallback((id: string) => {
    setTiles((prevTiles) => prevTiles.filter((tile) => tile.id !== id));
  }, []);

  // Add a tile to the board
  const addTileToBoard = useCallback((newTile: BoardTile) => {
    setTiles((prevTiles) => [...prevTiles, newTile]);
  }, []);

  // Update tile positions on the board
  const updateTilePositions = useCallback((updater: (prevTiles: BoardTile[]) => BoardTile[]) => {
    setTiles(updater);
  }, []);

  return {
    tiles,
    playerHand,
    remainingTiles,
    handlePeelEvent,
    handleDumpResult,
    handlePlayerDumpEvent,
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
