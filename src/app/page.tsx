// This file will be replaced with the landing page
// The game logic has been moved to src/app/game/[gameId]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  generateGameId,
  generatePin,
  saveGameSession,
  getGameSessionByPin,
  getRecentSessions,
  GameSession,
} from '../utils/gameSession';
import GameManagement from './components/GameManagement';
import { useSocket } from '@/contexts/SocketContext';

export default function LandingPage() {
  const router = useRouter();
  const [restorePin, setRestorePin] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [recentGames, setRecentGames] = useState<GameSession[]>([]);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [showGameManagement, setShowGameManagement] = useState(false);

  // Multiplayer states
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<'create' | 'join' | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [multiplayerError, setMultiplayerError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { createRoom, joinRoom, isConnected } = useSocket();

  // Load recent games on mount
  useEffect(() => {
    const recent = getRecentSessions(3);
    setRecentGames(recent);
  }, []);

  const handleStartNewGame = async () => {
    setIsCreatingGame(true);

    // Generate new game session
    const gameId = generateGameId();
    const pin = generatePin();

    const newSession: GameSession = {
      gameId,
      pin,
      createdAt: new Date(),
      lastSaved: new Date(),
      gameState: '', // Empty string instead of empty object - will trigger proper initialization
    };

    // Save session to local storage (will be server in future)
    saveGameSession(newSession);

    // Navigate to game
    router.push(`/game/${gameId}`);
  };

  const handleRestoreGame = (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError(null);

    if (restorePin.length !== 4) {
      setRestoreError('PIN must be 4 digits');
      return;
    }

    const session = getGameSessionByPin(restorePin);
    if (session) {
      router.push(`/game/${session.gameId}`);
    } else {
      setRestoreError('No game found with this PIN');
    }
  };

  const handleCreateMultiplayerRoom = async () => {
    if (!playerName.trim()) {
      setMultiplayerError('Please enter your name');
      return;
    }

    setIsProcessing(true);
    setMultiplayerError('');

    const result = await createRoom(playerName);

    if (result.success && result.pin) {
      router.push(`/multiplayer/lobby?pin=${result.pin}`);
    } else {
      setMultiplayerError(result.error || 'Failed to create room');
      setIsProcessing(false);
    }
  };

  const handleJoinMultiplayerRoom = async () => {
    if (!playerName.trim()) {
      setMultiplayerError('Please enter your name');
      return;
    }

    if (joinPin.length !== 4) {
      setMultiplayerError('PIN must be 4 digits');
      return;
    }

    setIsProcessing(true);
    setMultiplayerError('');

    const result = await joinRoom(joinPin, playerName);

    if (result.success) {
      router.push(`/multiplayer/lobby?pin=${joinPin}`);
    } else {
      setMultiplayerError(result.error || 'Failed to join room');
      setIsProcessing(false);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return d.toLocaleDateString();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 p-4">
      <div className="max-w-4xl mx-auto pt-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-amber-800 mb-4">🍌 Bananagrams</h1>
          <p className="text-xl text-amber-700">Create words, solve puzzles, have fun!</p>
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Start New Game */}
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Start New Game</h2>
            <p className="text-gray-600 mb-6">
              Begin a fresh single-player game. Your progress will be automatically saved.
            </p>
            <button
              onClick={handleStartNewGame}
              disabled={isCreatingGame}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isCreatingGame ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Creating Game...
                </>
              ) : (
                <>🎮 Start Single Player</>
              )}
            </button>
          </div>

          {/* Restore Game */}
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Continue Game</h2>
            <p className="text-gray-600 mb-6">Enter your 4-digit PIN to restore a previous game.</p>
            <form onSubmit={handleRestoreGame} className="space-y-4">
              <input
                type="text"
                value={restorePin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setRestorePin(value);
                  setRestoreError(null);
                }}
                placeholder="Enter PIN"
                className="text-black w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-mono focus:border-amber-500 focus:outline-none"
                maxLength={4}
              />
              {restoreError && <p className="text-red-500 text-sm">{restoreError}</p>}
              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                🔓 Restore Game
              </button>
            </form>
          </div>
        </div>

        {/* Multiplayer Section */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-4">🌟 NEW: Multiplayer Mode!</h2>
            <p className="text-lg mb-6">
              Play with 2-8 friends in real-time. Create a room or join with a PIN!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowMultiplayerModal(true);
                  setMultiplayerMode('create');
                }}
                disabled={!isConnected}
                className="bg-white text-purple-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
              <button
                onClick={() => {
                  setShowMultiplayerModal(true);
                  setMultiplayerMode('join');
                }}
                disabled={!isConnected}
                className="bg-white text-pink-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Room
              </button>
            </div>
            {!isConnected && (
              <p className="text-yellow-200 text-sm mt-4">Connecting to server...</p>
            )}
          </div>
        </div>

        {/* Recent Games */}
        {recentGames.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Games</h2>
            <div className="space-y-3">
              {recentGames.map((game) => (
                <div
                  key={game.gameId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors text-black"
                  onClick={() => router.push(`/game/${game.gameId}`)}
                >
                  <div>
                    <span className="font-mono font-bold text-lg">PIN: {game.pin}</span>
                    <p className="text-sm text-gray-600">
                      Last played {formatDate(game.lastSaved)}
                    </p>
                  </div>
                  <button className="text-amber-600 hover:text-amber-700">Continue →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Game Management */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowGameManagement(!showGameManagement)}
            className="text-gray-600 hover:text-gray-800 text-sm underline"
          >
            {showGameManagement ? 'Hide' : 'Show'} Advanced Options
          </button>
        </div>

        {showGameManagement && <GameManagement />}

        {/* Coming Soon Section */}
        <div className="mt-12 text-center text-gray-500">
          <p className="text-sm mb-2">Coming Soon</p>
          <div className="flex gap-4 justify-center">
            <span className="px-4 py-2 bg-gray-200 rounded-lg text-gray-600">🏆 Leaderboards</span>
            <span className="px-4 py-2 bg-gray-200 rounded-lg text-gray-600">📱 Mobile App</span>
            <span className="px-4 py-2 bg-gray-200 rounded-lg text-gray-600">🎨 Custom Themes</span>
          </div>
        </div>
      </div>

      {/* Multiplayer Modal */}
      {showMultiplayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {multiplayerMode === 'create' ? 'Create Multiplayer Room' : 'Join Multiplayer Room'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="text-black w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                  maxLength={20}
                />
              </div>

              {multiplayerMode === 'join' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room PIN</label>
                  <input
                    type="text"
                    value={joinPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setJoinPin(value);
                    }}
                    placeholder="Enter 4-digit PIN"
                    className="text-black w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-center text-xl font-mono focus:border-amber-500 focus:outline-none"
                    maxLength={4}
                  />
                </div>
              )}

              {multiplayerError && <p className="text-red-500 text-sm">{multiplayerError}</p>}

              <div className="flex gap-4 mt-6">
                <button
                  onClick={
                    multiplayerMode === 'create'
                      ? handleCreateMultiplayerRoom
                      : handleJoinMultiplayerRoom
                  }
                  disabled={isProcessing}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  {isProcessing
                    ? 'Processing...'
                    : multiplayerMode === 'create'
                      ? 'Create Room'
                      : 'Join Room'}
                </button>
                <button
                  onClick={() => {
                    setShowMultiplayerModal(false);
                    setMultiplayerMode(null);
                    setMultiplayerError('');
                    setPlayerName('');
                    setJoinPin('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
