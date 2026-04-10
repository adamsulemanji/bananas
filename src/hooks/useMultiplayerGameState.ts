'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BoardTile, PlayerTile, GameStartData, PeelData } from '@/types/multiplayer';
import { useSocket } from '@/contexts/SocketContext';

export function useMultiplayerGameState() {
  const [tiles, setTiles] = useState<BoardTile[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayerTile[]>([]);
  const [remainingTiles, setRemainingTiles] = useState<number>(0);
  const [gameInitialized, setGameInitialized] = useState(false);

  const tileCounterRef = useRef(1);
  // Ref so the gameStart listener doesn't close over stale state
  const gameInitializedRef = useRef(false);

  useEffect(() => {
    gameInitializedRef.current = gameInitialized;
  }, [gameInitialized]);

  const { currentRoom, playerName, gameStartData, onGameStart } = useSocket();

  const getNextTileId = () => {
    const id = `tile-${tileCounterRef.current}`;
    tileCounterRef.current += 1;
    return id;
  };

  // Primary: listen for the gameStart socket event
  useEffect(() => {
    if (!playerName) return;

    const unsubscribe = onGameStart((data: GameStartData) => {
      if (gameInitializedRef.current) return;

      const currentPlayer = data.players.find((p) => p.name === playerName);
      if (currentPlayer) {
        setPlayerHand(currentPlayer.tiles);
        setRemainingTiles(data.remainingTiles);
        setGameInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [playerName, onGameStart]);

  // Fallback: use cached gameStartData from context (handles page refresh)
  useEffect(() => {
    if (!gameStartData || !playerName || gameInitialized) return;

    const currentPlayer = gameStartData.players.find((p) => p.name === playerName);
    if (currentPlayer) {
      setPlayerHand(currentPlayer.tiles);
      setRemainingTiles(gameStartData.remainingTiles);
      setGameInitialized(true);
    }
  }, [gameStartData, playerName, gameInitialized]);

  // Fallback: initialize from currentRoom if game is already in progress
  useEffect(() => {
    if (!currentRoom || currentRoom.gameState !== 'playing' || gameInitialized || !playerName) return;

    const currentPlayer = currentRoom.players.find((p) => p.name === playerName);
    if (currentPlayer?.tiles?.length) {
      setPlayerHand(currentPlayer.tiles);
      setRemainingTiles(currentRoom.remainingTiles ?? 0);
      setGameInitialized(true);
    }
  }, [currentRoom, playerName, gameInitialized]);

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
      }
    },
    [playerName]
  );

  const handleDumpResult = useCallback((oldTileId: string, newTiles: PlayerTile[]) => {
    setPlayerHand((prevHand) => {
      const filtered = prevHand.filter((tile) => tile.id !== oldTileId);
      return [...filtered, ...newTiles];
    });
  }, []);

  const handlePlayerDumpEvent = useCallback((data: { remainingTiles: number }) => {
    setRemainingTiles(data.remainingTiles);
  }, []);

  // Preserve the original tile ID when moving back from board to hand so the
  // server can still match it against player.tiles when validating peel.
  const addTileToHand = useCallback((letter: string, id?: string) => {
    const tileId = id ?? getNextTileId();
    setPlayerHand((prevHand) => [...prevHand, { id: tileId, letter }]);
  }, []);

  const returnTileToBag = useCallback((_letter: string) => {
    // In multiplayer, tiles don't go back to bag individually
  }, []);

  const drawTiles = useCallback((_count: number) => {
    // In multiplayer, drawing is handled by the server
  }, []);

  const getHandTile = useCallback(
    (id: string) => playerHand.find((tile) => tile.id === id),
    [playerHand]
  );
  const getBoardTile = useCallback((id: string) => tiles.find((tile) => tile.id === id), [tiles]);
  const getTileAtPosition = useCallback(
    (cellId: string) => tiles.find((tile) => tile.position === cellId),
    [tiles]
  );

  const removeTileFromHand = useCallback((id: string) => {
    setPlayerHand((prevHand) => prevHand.filter((tile) => tile.id !== id));
  }, []);

  const removeTileFromBoard = useCallback((id: string) => {
    setTiles((prevTiles) => prevTiles.filter((tile) => tile.id !== id));
  }, []);

  const addTileToBoard = useCallback((newTile: BoardTile) => {
    setTiles((prevTiles) => [...prevTiles, newTile]);
  }, []);

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
