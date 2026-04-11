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

const DEMO_TILES = ['B', 'A', 'N', 'A', 'N', 'A', 'G', 'R', 'A', 'M', 'S'];
const TILE_TILTS = [-3, 2, -1, 4, -2, 1, -4, 3, 0, -2, 3];

export default function LandingPage() {
  const router = useRouter();
  const [restorePin, setRestorePin] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [recentGames, setRecentGames] = useState<GameSession[]>([]);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [showGameManagement, setShowGameManagement] = useState(false);

  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<'create' | 'join' | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [multiplayerError, setMultiplayerError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { createRoom, joinRoom, isConnected } = useSocket();

  useEffect(() => {
    setRecentGames(getRecentSessions(3));
  }, []);

  const handleStartNewGame = async () => {
    setIsCreatingGame(true);
    const gameId = generateGameId();
    const pin = generatePin();
    saveGameSession({ gameId, pin, createdAt: new Date(), lastSaved: new Date(), gameState: '' });
    router.push(`/game/${gameId}`);
  };

  const handleRestoreGame = (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError(null);
    if (restorePin.length !== 4) { setRestoreError('PIN must be 4 digits'); return; }
    const session = getGameSessionByPin(restorePin);
    if (session) { router.push(`/game/${session.gameId}`); }
    else { setRestoreError('No game found with this PIN'); }
  };

  const handleCreateMultiplayerRoom = async () => {
    if (!playerName.trim()) { setMultiplayerError('Please enter your name'); return; }
    setIsProcessing(true); setMultiplayerError('');
    const result = await createRoom(playerName);
    if (result.success && result.pin) { router.push(`/multiplayer/lobby?pin=${result.pin}`); }
    else { setMultiplayerError(result.error || 'Failed to create room'); setIsProcessing(false); }
  };

  const handleJoinMultiplayerRoom = async () => {
    if (!playerName.trim()) { setMultiplayerError('Please enter your name'); return; }
    if (joinPin.length !== 4) { setMultiplayerError('PIN must be 4 digits'); return; }
    setIsProcessing(true); setMultiplayerError('');
    const result = await joinRoom(joinPin, playerName);
    if (result.success) { router.push(`/multiplayer/lobby?pin=${joinPin}`); }
    else { setMultiplayerError(result.error || 'Failed to join room'); setIsProcessing(false); }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString();
  };

  const closeModal = () => {
    setShowMultiplayerModal(false);
    setMultiplayerMode(null);
    setMultiplayerError('');
    setPlayerName('');
    setJoinPin('');
    setIsProcessing(false);
  };

  return (
    <main
      className="min-h-screen bg-texture"
      style={{ background: 'var(--bg)', fontFamily: 'var(--font-outfit)' }}
    >
      <div className="max-w-2xl mx-auto px-5 pt-16 pb-20">

        {/* ── Hero ── */}
        <header className="mb-12">

          {/* Tile strip */}
          <div className="reveal-1 flex gap-1.5 mb-8">
            {DEMO_TILES.map((letter, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded flex items-center justify-center text-sm font-bold select-none tile-base"
                style={{
                  background: 'var(--tile-bg)',
                  border: '1.5px solid var(--tile-b)',
                  color: 'var(--tile-t)',
                  fontFamily: 'var(--font-jetbrains)',
                  transform: `rotate(${TILE_TILTS[i]}deg)`,
                  flexShrink: 0,
                }}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Title */}
          <div className="reveal-2">
            <h1
              className="text-5xl sm:text-6xl font-extrabold leading-none tracking-tight mb-3"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-outfit)' }}
            >
              Bananagrams
            </h1>
            <p className="text-base font-medium" style={{ color: 'var(--text2)' }}>
              Build words from your tiles faster than everyone else.
            </p>
          </div>
        </header>

        {/* ── Action Cards ── */}
        <div className="space-y-4">

          {/* New Game + Continue — side by side */}
          <div className="reveal-3 grid grid-cols-2 gap-4">

            {/* New Game */}
            <div className="card p-6 flex flex-col gap-4">
              <div>
                <p className="label">Solo</p>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>New Game</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
                  Starts fresh. Auto-saves with a PIN.
                </p>
              </div>
              <button
                onClick={handleStartNewGame}
                disabled={isCreatingGame}
                className="btn-primary"
              >
                {isCreatingGame ? 'Starting…' : 'Play Solo'}
              </button>
            </div>

            {/* Continue */}
            <div className="card p-6 flex flex-col gap-4">
              <div>
                <p className="label">Resume</p>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Continue</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
                  Enter your 4-digit PIN.
                </p>
              </div>
              <form onSubmit={handleRestoreGame} className="flex flex-col gap-2 mt-auto">
                <input
                  type="text"
                  value={restorePin}
                  onChange={(e) => {
                    setRestorePin(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setRestoreError(null);
                  }}
                  placeholder="0000"
                  className="pin-field"
                  maxLength={4}
                />
                {restoreError && (
                  <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>
                    {restoreError}
                  </p>
                )}
                <button type="submit" className="btn-secondary">
                  Restore
                </button>
              </form>
            </div>
          </div>

          {/* Multiplayer */}
          <div className="reveal-4 card p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="label">Multiplayer · 2–8 players</p>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                  Play with friends
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
                  Real-time. Create a room or join with a PIN.
                  {!isConnected && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--text3)' }}>
                      Connecting…
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setShowMultiplayerModal(true); setMultiplayerMode('create'); }}
                  disabled={!isConnected}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0.65rem 1.25rem' }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowMultiplayerModal(true); setMultiplayerMode('join'); }}
                  disabled={!isConnected}
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '0.65rem 1.25rem' }}
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Recent Games */}
          {recentGames.length > 0 && (
            <div className="reveal-5">
              <p className="label mb-3">Recent Games</p>
              <div className="space-y-2">
                {recentGames.map((game) => (
                  <button
                    key={game.gameId}
                    onClick={() => router.push(`/game/${game.gameId}`)}
                    className="card w-full px-5 py-4 flex items-center justify-between text-left"
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <span
                        className="text-lg font-bold tracking-widest"
                        style={{ fontFamily: 'var(--font-jetbrains)', color: 'var(--text)' }}
                      >
                        {game.pin}
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                        {formatDate(game.lastSaved)}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'var(--lime)' }}
                    >
                      Resume →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced */}
          <div className="reveal-6 pt-2 text-center">
            <button
              onClick={() => setShowGameManagement(!showGameManagement)}
              className="text-xs font-medium transition-colors duration-150"
              style={{ color: 'var(--text3)' }}
              onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text2)')}
              onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text3)')}
            >
              {showGameManagement ? 'Hide' : 'Show'} advanced options
            </button>
            {showGameManagement && <GameManagement />}
          </div>
        </div>
      </div>

      {/* ── Multiplayer Modal ── */}
      {showMultiplayerModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: 'rgba(12,13,16,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="animate-fadeIn w-full max-w-sm card p-7"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="label mb-0.5">
                  {multiplayerMode === 'create' ? 'New Room' : 'Enter Room'}
                </p>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                  {multiplayerMode === 'create' ? 'Create Room' : 'Join Room'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-xl font-light leading-none transition-colors"
                style={{ color: 'var(--text3)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text2)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text3)')}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Your name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="input-field"
                  maxLength={20}
                  autoFocus
                />
              </div>

              {multiplayerMode === 'join' && (
                <div>
                  <label className="label">Room PIN</label>
                  <input
                    type="text"
                    value={joinPin}
                    onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    className="pin-field"
                    maxLength={4}
                  />
                </div>
              )}

              {multiplayerError && (
                <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>
                  {multiplayerError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={multiplayerMode === 'create' ? handleCreateMultiplayerRoom : handleJoinMultiplayerRoom}
                  disabled={isProcessing}
                  className="btn-primary"
                >
                  {isProcessing ? 'Working…' : multiplayerMode === 'create' ? 'Create' : 'Join'}
                </button>
                <button onClick={closeModal} className="btn-secondary">
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
