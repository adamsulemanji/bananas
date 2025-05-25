'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/contexts/SocketContext';

function MultiplayerLobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomPin = searchParams.get('pin');
  
  const { 
    currentRoom, 
    playerName,
    isConnected,
    toggleReady, 
    startGame,
    onRoomUpdate,
    onGameStart,
    onPlayerLeft
  } = useSocket();
  
  const [error, setError] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!roomPin) {
      router.push('/');
      return;
    }

    // Listen for room updates
    const unsubscribeRoom = onRoomUpdate((room) => {
      console.log('Room updated:', room);
    });

    // Listen for game start
    const unsubscribeGameStart = onGameStart((data) => {
      console.log('Game starting!', data);
      // Navigate to multiplayer game
      router.push(`/multiplayer/game?pin=${roomPin}`);
    });

    // Listen for players leaving
    const unsubscribePlayerLeft = onPlayerLeft((data) => {
      console.log(`${data.playerName} left the game`);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeGameStart();
      unsubscribePlayerLeft();
    };
  }, [roomPin, router, onRoomUpdate, onGameStart, onPlayerLeft]);

  const handleStartGame = async () => {
    setIsStarting(true);
    setError('');
    
    const result = await startGame();
    if (!result.success) {
      setError(result.error || 'Failed to start game');
      setIsStarting(false);
    }
  };

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      router.push('/');
    }
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Connecting to server...</p>
        </div>
      </main>
    );
  }

  if (!currentRoom) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading room...</p>
        </div>
      </main>
    );
  }

  const currentPlayer = currentRoom.players.find(p => p.name === playerName);
  const isHost = currentPlayer?.isHost || false;
  const allPlayersReady = currentRoom.players.every(p => p.isReady || p.isHost);
  const canStart = isHost && allPlayersReady && currentRoom.players.length >= 2;

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-800 mb-2">🍌 Multiplayer Lobby</h1>
          <div className="bg-white rounded-lg shadow-md inline-block px-6 py-3 mt-4">
            <p className="text-sm text-gray-600 mb-1">Room PIN:</p>
            <p className="text-3xl font-mono font-bold text-amber-700">{currentRoom.pin}</p>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Players ({currentRoom.players.length}/8)
          </h2>
          
          <div className="grid gap-3">
            {currentRoom.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  player.name === playerName 
                    ? 'border-amber-400 bg-amber-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {player.isHost ? '👑' : '🎮'}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {player.name}
                      {player.name === playerName && ' (You)'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {player.isHost ? 'Host' : 'Player'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!player.isHost && (
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      player.isReady 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {player.isReady ? '✓ Ready' : 'Not Ready'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {currentRoom.players.length < 8 && (
            <p className="text-center text-gray-500 text-sm mt-4">
              Waiting for more players to join...
            </p>
          )}
        </div>

        {/* Game Rules */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Game Rules:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• {currentRoom.players.length <= 4 ? '21' : currentRoom.players.length <= 6 ? '15' : '11'} tiles per player to start</li>
            <li>• When someone empties their hand, everyone draws 1 tile</li>
            <li>• Trade 1 tile for 3 new ones anytime</li>
            <li>• First to empty their hand when tiles run out wins!</li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {!isHost && currentPlayer && (
            <button
              onClick={toggleReady}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                currentPlayer.isReady
                  ? 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {currentPlayer.isReady ? 'Cancel Ready' : 'Ready to Start'}
            </button>
          )}
          
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                canStart && !isStarting
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isStarting ? 'Starting...' : 'Start Game'}
            </button>
          )}
          
          <button
            onClick={handleLeaveRoom}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
          >
            Leave Room
          </button>
        </div>
        
        {isHost && !canStart && (
          <p className="text-center text-gray-600 text-sm mt-4">
            {currentRoom.players.length < 2 
              ? 'Need at least 2 players to start' 
              : 'Waiting for all players to be ready...'}
          </p>
        )}
      </div>
    </main>
  );
}

export default function MultiplayerLobby() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <MultiplayerLobbyContent />
    </Suspense>
  );
} 