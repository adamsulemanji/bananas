'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  MultiplayerRoom,
  GameStartData,
  PeelData,
  GameWonData,
  PlayerBoardUpdateData,
  PlayerLeftData,
  DumpData,
  BoardTile,
  PlayerHandUpdateData,
} from '@/types/multiplayer';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: MultiplayerRoom | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  gameStartData: GameStartData | null;

  // Room operations
  createRoom: (
    playerName: string
  ) => Promise<{ success: boolean; pin?: string; gameId?: string; error?: string }>;
  joinRoom: (
    pin: string,
    playerName: string
  ) => Promise<{ success: boolean; gameId?: string; error?: string }>;
  toggleReady: () => void;
  startGame: () => Promise<{ success: boolean; error?: string }>;

  // Game operations
  callPeel: () => Promise<{ success: boolean; won?: boolean; error?: string }>;
  dumpTile: (tileId: string) => Promise<{ success: boolean; newTiles?: any[]; error?: string }>;
  updateBoard: (boardTiles: BoardTile[]) => void;
  updateHandSize: (handSize: number) => void;
  updateTileLocations: (data: {
    tilesMovedToBoard?: string[];
    tilesMovedToHand?: string[];
  }) => void;

  // Event listeners - components can use these to react to game events
  onRoomUpdate: (callback: (room: MultiplayerRoom) => void) => () => void;
  onGameStart: (callback: (data: GameStartData) => void) => () => void;
  onPeelCalled: (callback: (data: PeelData) => void) => () => void;
  onGameWon: (callback: (data: GameWonData) => void) => () => void;
  onPlayerBoardUpdate: (callback: (data: PlayerBoardUpdateData) => void) => () => void;
  onPlayerLeft: (callback: (data: PlayerLeftData) => void) => () => void;
  onPlayerDumped: (callback: (data: DumpData) => void) => () => void;
  onPlayerHandUpdate: (callback: (data: PlayerHandUpdateData) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoom | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [gameStartData, setGameStartData] = useState<GameStartData | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('roomUpdate', (room: MultiplayerRoom) => {
      setCurrentRoom(room);
    });

    socketInstance.on('gameStart', (data: GameStartData) => {
      setGameStartData(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Room operations
  const createRoom = async (
    name: string
  ): Promise<{ success: boolean; pin?: string; gameId?: string; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      socket.emit('createRoom', name, (response: any) => {
        if (response.success) {
          setPlayerName(name);
        }
        resolve(response);
      });
    });
  };

  const joinRoom = async (
    pin: string,
    name: string
  ): Promise<{ success: boolean; gameId?: string; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      socket.emit('joinRoom', pin, name, (response: any) => {
        if (response.success) {
          setPlayerName(name);
        }
        resolve(response);
      });
    });
  };

  const toggleReady = () => {
    if (!socket) return;
    socket.emit('toggleReady');
  };

  const startGame = async (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      socket.emit('startGame', (response: any) => {
        resolve(response);
      });
    });
  };

  // Game operations
  const callPeel = async (): Promise<{ success: boolean; won?: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      socket.emit('peel', (response: any) => {
        resolve(response);
      });
    });
  };

  const dumpTile = async (
    tileId: string
  ): Promise<{ success: boolean; newTiles?: any[]; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      socket.emit('dump', tileId, (response: any) => {
        resolve(response);
      });
    });
  };

  const updateBoard = (boardTiles: BoardTile[]) => {
    if (!socket) return;
    socket.emit('updateBoard', boardTiles);
  };

  const updateHandSize = (handSize: number) => {
    if (!socket) return;
    socket.emit('updateHandSize', handSize);
  };

  const updateTileLocations = (data: {
    tilesMovedToBoard?: string[];
    tilesMovedToHand?: string[];
  }) => {
    if (!socket) return;
    socket.emit('updateTileLocations', data);
  };

  // Event listener helpers
  const onRoomUpdate = (callback: (room: MultiplayerRoom) => void) => {
    if (!socket) return () => {};
    socket.on('roomUpdate', callback);
    return () => {
      socket.off('roomUpdate', callback);
    };
  };

  const onGameStart = (callback: (data: GameStartData) => void) => {
    // This is kept for backward compatibility but the main logic now uses stored gameStartData
    if (!socket) {
      return () => {};
    }
    const wrappedCallback = (data: GameStartData) => {
      callback(data);
    };
    socket.on('gameStart', wrappedCallback);
    return () => {
      socket.off('gameStart', wrappedCallback);
    };
  };

  const onPeelCalled = (callback: (data: PeelData) => void) => {
    if (!socket) return () => {};
    socket.on('peelCalled', callback);
    return () => {
      socket.off('peelCalled', callback);
    };
  };

  const onGameWon = (callback: (data: GameWonData) => void) => {
    if (!socket) return () => {};
    socket.on('gameWon', callback);
    return () => {
      socket.off('gameWon', callback);
    };
  };

  const onPlayerBoardUpdate = (callback: (data: PlayerBoardUpdateData) => void) => {
    if (!socket) return () => {};
    socket.on('playerBoardUpdate', callback);
    return () => {
      socket.off('playerBoardUpdate', callback);
    };
  };

  const onPlayerLeft = (callback: (data: PlayerLeftData) => void) => {
    if (!socket) return () => {};
    socket.on('playerLeft', callback);
    return () => {
      socket.off('playerLeft', callback);
    };
  };

  const onPlayerDumped = (callback: (data: DumpData) => void) => {
    if (!socket) return () => {};
    socket.on('playerDumped', callback);
    return () => {
      socket.off('playerDumped', callback);
    };
  };

  const onPlayerHandUpdate = (callback: (data: PlayerHandUpdateData) => void) => {
    if (!socket) return () => {};
    socket.on('playerHandUpdate', callback);
    return () => {
      socket.off('playerHandUpdate', callback);
    };
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    currentRoom,
    playerName,
    setPlayerName,
    gameStartData,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    callPeel,
    dumpTile,
    updateBoard,
    updateHandSize,
    updateTileLocations,
    onRoomUpdate,
    onGameStart,
    onPeelCalled,
    onGameWon,
    onPlayerBoardUpdate,
    onPlayerLeft,
    onPlayerDumped,
    onPlayerHandUpdate,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
