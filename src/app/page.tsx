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

const HERO_TILES = ['B', 'A', 'N', 'A', 'N', 'A', 'G', 'R', 'A', 'M', 'S'];
const ROTATIONS = [-4, 2, -2, 5, -3, 1, -5, 3, -1, 4, -2];
const FLOAT_DELAYS = [0, 0.8, 1.6, 0.4, 1.2, 2.0, 0.6, 1.4, 0.2, 1.0, 1.8];

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
    const recent = getRecentSessions(3);
    setRecentGames(recent);
  }, []);

  const handleStartNewGame = async () => {
    setIsCreatingGame(true);
    const gameId = generateGameId();
    const pin = generatePin();
    const newSession: GameSession = {
      gameId,
      pin,
      createdAt: new Date(),
      lastSaved: new Date(),
      gameState: '',
    };
    saveGameSession(newSession);
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
    if (!playerName.trim()) { setMultiplayerError('Please enter your name'); return; }
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
    if (!playerName.trim()) { setMultiplayerError('Please enter your name'); return; }
    if (joinPin.length !== 4) { setMultiplayerError('PIN must be 4 digits'); return; }
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
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <main className="min-h-screen bg-ink relative overflow-x-hidden">

      {/* Dot-grid texture */}
      <div className="fixed inset-0 bg-dot-texture pointer-events-none" aria-hidden="true" />

      {/* Faint corner vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-4xl mx-auto px-6">

        {/* ── Hero ── */}
        <section className="pt-16 pb-10 text-center">

          {/* Top eyebrow rule */}
          <div className="reveal-1 flex items-center gap-4 mb-10">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #5a4830)' }} />
            <span
              className="text-[10px] tracking-[0.45em] uppercase"
              style={{ color: 'var(--aged)', fontFamily: 'var(--font-crimson-body)' }}
            >
              The Classic Word Game
            </span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #5a4830)' }} />
          </div>

          {/* Main title */}
          <div className="reveal-2">
            <h1
              className="text-5xl sm:text-7xl md:text-8xl leading-none mb-6 tracking-wider"
              style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--cream)' }}
            >
              BANANAGRAMS
            </h1>
            <p
              className="text-lg italic mb-10"
              style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--aged)' }}
            >
              Assemble your tiles. Form your words. Beat the bunch.
            </p>
          </div>

          {/* Floating decorative tiles */}
          <div className="reveal-3 flex flex-wrap justify-center gap-2 mb-10">
            {HERO_TILES.map((letter, i) => (
              <div
                key={i}
                className="float-tile"
                style={{
                  '--tile-rotate': `${ROTATIONS[i]}deg`,
                  animationDelay: `${FLOAT_DELAYS[i]}s`,
                  animationDuration: `${3.5 + (i % 3) * 0.5}s`,
                } as React.CSSProperties}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center tile-shadow"
                  style={{
                    background: 'var(--tile-bg)',
                    border: '1px solid var(--tile-border)',
                    fontFamily: 'var(--font-courier-prime)',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    fontSize: '1.1rem',
                    transform: `rotate(${ROTATIONS[i]}deg)`,
                    borderRadius: '2px',
                    userSelect: 'none',
                  }}
                >
                  {letter}
                </div>
              </div>
            ))}
          </div>

          {/* Ornamental rule */}
          <div className="reveal-3 flex items-center gap-3 text-brass/50 mb-0">
            <div className="flex-1 h-px bg-case" />
            <span className="text-brass text-base">✦</span>
            <div className="flex-1 h-px bg-case" />
            <span className="text-brass/60 text-xs">✦</span>
            <div className="flex-1 h-px bg-case" />
          </div>
        </section>

        {/* ── Action Cards ── */}
        <section className="pb-8">
          <div className="grid md:grid-cols-2 gap-5 mb-5">

            {/* New Game */}
            <div className="reveal-4 card-press p-8 flex flex-col">
              <div
                className="text-[10px] tracking-[0.4em] uppercase mb-3"
                style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--aged)' }}
              >
                Solo Play
              </div>
              <h2
                className="text-2xl mb-4"
                style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--cream)' }}
              >
                New Game
              </h2>
              <p
                className="text-base leading-relaxed mb-8 flex-1"
                style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)' }}
              >
                Begin a fresh single-player game. Your progress is automatically saved and can be resumed with a 4-digit PIN.
              </p>
              <button
                onClick={handleStartNewGame}
                disabled={isCreatingGame}
                className="btn-press w-full"
              >
                {isCreatingGame ? 'Dealing Tiles...' : 'Deal Tiles'}
              </button>
            </div>

            {/* Continue Game */}
            <div className="reveal-4 card-press p-8 flex flex-col">
              <div
                className="text-[10px] tracking-[0.4em] uppercase mb-3"
                style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--aged)' }}
              >
                Resume
              </div>
              <h2
                className="text-2xl mb-4"
                style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--cream)' }}
              >
                Continue Game
              </h2>
              <p
                className="text-base leading-relaxed mb-6 flex-1"
                style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)' }}
              >
                Return to a saved game using your 4-digit PIN.
              </p>
              <form onSubmit={handleRestoreGame} className="space-y-3">
                <input
                  type="text"
                  value={restorePin}
                  onChange={(e) => {
                    setRestorePin(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setRestoreError(null);
                  }}
                  placeholder="· · · ·"
                  className="pin-input"
                  maxLength={4}
                />
                {restoreError && (
                  <p
                    className="text-sm italic"
                    style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--vermil)' }}
                  >
                    {restoreError}
                  </p>
                )}
                <button type="submit" className="btn-ghost w-full">
                  Restore
                </button>
              </form>
            </div>
          </div>

          {/* Multiplayer */}
          <div className="reveal-5 card-press p-8 mb-5">
            <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
              <div>
                <div
                  className="text-[10px] tracking-[0.4em] uppercase mb-3"
                  style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--aged)' }}
                >
                  Real-Time · 2–8 Players
                </div>
                <h2
                  className="text-2xl mb-2"
                  style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--cream)' }}
                >
                  Multiplayer
                </h2>
                <p
                  className="text-base"
                  style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)' }}
                >
                  Create a room or join a friend's game with their PIN.
                  {!isConnected && (
                    <span className="italic ml-2" style={{ color: 'var(--rule)' }}>
                      Connecting...
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => { setShowMultiplayerModal(true); setMultiplayerMode('create'); }}
                  disabled={!isConnected}
                  className="btn-press"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowMultiplayerModal(true); setMultiplayerMode('join'); }}
                  disabled={!isConnected}
                  className="btn-ghost"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Recent Games */}
          {recentGames.length > 0 && (
            <div className="reveal-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-case" />
                <span
                  className="text-[10px] tracking-[0.4em] uppercase"
                  style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)' }}
                >
                  Recent Games
                </span>
                <div className="flex-1 h-px bg-case" />
              </div>
              <div className="space-y-2">
                {recentGames.map((game) => (
                  <div
                    key={game.gameId}
                    className="card-press flex items-center justify-between px-6 py-4 cursor-pointer"
                    onClick={() => router.push(`/game/${game.gameId}`)}
                  >
                    <div>
                      <span
                        className="text-xl tracking-[0.4em]"
                        style={{ fontFamily: 'var(--font-courier-prime)', color: 'var(--cream)' }}
                      >
                        {game.pin}
                      </span>
                      <p
                        className="text-xs italic mt-0.5"
                        style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)' }}
                      >
                        {formatDate(game.lastSaved)}
                      </p>
                    </div>
                    <span
                      className="text-xs tracking-[0.3em] uppercase"
                      style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--brass)', opacity: 0.7 }}
                    >
                      Resume →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer className="pb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-case" />
            <span className="text-brass/30 text-xs">✦</span>
            <div className="flex-1 h-px bg-case" />
          </div>
          <div className="text-center">
            <button
              onClick={() => setShowGameManagement(!showGameManagement)}
              className="text-xs italic transition-colors duration-200"
              style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--rule)' }}
              onMouseOver={(e) => (e.currentTarget.style.color = 'var(--muted)')}
              onMouseOut={(e) => (e.currentTarget.style.color = 'var(--rule)')}
            >
              {showGameManagement ? 'hide' : 'show'} advanced options
            </button>
          </div>
          {showGameManagement && <GameManagement />}
        </footer>

      </div>

      {/* ── Multiplayer Modal ── */}
      {showMultiplayerModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: 'rgba(13,10,6,0.85)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="animate-fadeIn w-full max-w-md p-8"
            style={{ background: 'var(--press)', border: '1px solid var(--case)' }}
          >
            <div
              className="text-[10px] tracking-[0.4em] uppercase mb-2"
              style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--aged)' }}
            >
              {multiplayerMode === 'create' ? 'New Room' : 'Enter Room'}
            </div>
            <h3
              className="text-2xl mb-6"
              style={{ fontFamily: 'var(--font-cinzel-display)', color: 'var(--cream)' }}
            >
              {multiplayerMode === 'create' ? 'Create Room' : 'Join Room'}
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-[10px] tracking-[0.35em] uppercase mb-2"
                  style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)' }}
                >
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="input-press"
                  maxLength={20}
                />
              </div>

              {multiplayerMode === 'join' && (
                <div>
                  <label
                    className="block text-[10px] tracking-[0.35em] uppercase mb-2"
                    style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)' }}
                  >
                    Room PIN
                  </label>
                  <input
                    type="text"
                    value={joinPin}
                    onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="· · · ·"
                    className="pin-input"
                    maxLength={4}
                  />
                </div>
              )}

              {multiplayerError && (
                <p
                  className="text-sm italic"
                  style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--vermil)' }}
                >
                  {multiplayerError}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={multiplayerMode === 'create' ? handleCreateMultiplayerRoom : handleJoinMultiplayerRoom}
                  disabled={isProcessing}
                  className="btn-press flex-1"
                >
                  {isProcessing ? 'Processing...' : multiplayerMode === 'create' ? 'Create' : 'Join'}
                </button>
                <button
                  onClick={() => {
                    setShowMultiplayerModal(false);
                    setMultiplayerMode(null);
                    setMultiplayerError('');
                    setPlayerName('');
                    setJoinPin('');
                  }}
                  className="btn-ghost flex-1"
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
