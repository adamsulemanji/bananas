'use client';

import { useState } from 'react';
import { 
  getRecentSessions, 
  deleteGameSession, 
  clearAllSessions,
  exportGameState,
  importGameState,
  GameSession
} from '@/utils/gameSession';

export default function GameManagement() {
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');

  const handleShowRecentSessions = () => {
    const sessions = getRecentSessions(10);
    setRecentSessions(sessions);
    setShowSessions(true);
  };

  const handleDeleteSession = (gameId: string) => {
    if (window.confirm('Are you sure you want to delete this saved game?')) {
      deleteGameSession(gameId);
      handleShowRecentSessions(); // Refresh the list
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL saved games? This cannot be undone.')) {
      clearAllSessions();
      setRecentSessions([]);
    }
  };

  const handleExport = (gameId: string) => {
    try {
      exportGameState(gameId);
    } catch (error) {
      alert('Failed to export game: ' + error);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const session = importGameState(text);
      setImportStatus(`Game imported successfully! PIN: ${session.pin}`);
      handleShowRecentSessions(); // Refresh the list
    } catch (error) {
      setImportStatus('Failed to import game: ' + error);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Game Management</h2>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={handleShowRecentSessions}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
          >
            Show Saved Games
          </button>
          
          <label className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors cursor-pointer">
            Import Game
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Clear All Data
          </button>
        </div>
        
        {importStatus && (
          <div className="p-3 bg-blue-100 text-blue-800 rounded">
            {importStatus}
          </div>
        )}
        
        {showSessions && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Recent Games</h3>
            {recentSessions.length === 0 ? (
              <p className="text-gray-500">No saved games found.</p>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.gameId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div>
                      <div className="font-medium">PIN: {session.pin}</div>
                      <div className="text-sm text-gray-600">
                        Created: {new Date(session.createdAt).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        Last saved: {new Date(session.lastSaved).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.location.href = `/game/${session.gameId}`}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
                      >
                        Resume
                      </button>
                      <button
                        onClick={() => handleExport(session.gameId)}
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded"
                      >
                        Export
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.gameId)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 