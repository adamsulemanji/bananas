// Game session management utilities

// Generate a UUID v4
export function generateGameId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate a 4-digit PIN
export function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Game session interface
export interface GameSession {
  gameId: string;
  pin: string;
  createdAt: Date;
  lastSaved: Date;
  gameState: any; // Will be properly typed when we implement save/load
  isCompleted?: boolean;
  finalScore?: number;
  completionTime?: number; // Time in seconds
}

// Mock storage for game sessions (will be replaced with server API)
const STORAGE_KEY = 'bananagrams_sessions';
const GAME_STATE_VERSION = '1.0';

// Interface for the complete game state
export interface SerializedGameState {
  version: string;
  tiles: any[];
  playerHand: any[];
  letterBag: any[];
  tileCounter: number;
  timestamp: string;
}

export function saveGameSession(session: GameSession): void {
  if (typeof window === 'undefined') return;

  try {
    const sessions = getStoredSessions();

    // Ensure dates are serialized properly
    const serializedSession = {
      ...session,
      createdAt:
        session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
      lastSaved:
        session.lastSaved instanceof Date ? session.lastSaved.toISOString() : session.lastSaved,
      gameState:
        typeof session.gameState === 'string'
          ? session.gameState
          : serializeGameState(session.gameState),
    };

    sessions[session.gameId] = serializedSession as any;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving game session:', error);
    throw new Error('Failed to save game session');
  }
}

export function getGameSession(gameId: string): GameSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const sessions = getStoredSessions();
    const session = sessions[gameId];

    if (!session) return null;

    // Restore Date objects
    return {
      ...session,
      createdAt: new Date(session.createdAt),
      lastSaved: new Date(session.lastSaved),
    };
  } catch (error) {
    console.error('Error getting game session:', error);
    return null;
  }
}

export function getGameSessionByPin(pin: string): GameSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const sessions = getStoredSessions();
    const session = Object.values(sessions).find((session) => session.pin === pin);

    if (!session) return null;

    // Restore Date objects
    return {
      ...session,
      createdAt: new Date(session.createdAt),
      lastSaved: new Date(session.lastSaved),
    };
  } catch (error) {
    console.error('Error getting game session by PIN:', error);
    return null;
  }
}

export function getRecentSessions(limit: number = 5): GameSession[] {
  if (typeof window === 'undefined') return [];

  try {
    const sessions = getStoredSessions();
    return Object.values(sessions)
      .map((session) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        lastSaved: new Date(session.lastSaved),
      }))
      .sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting recent sessions:', error);
    return [];
  }
}

function getStoredSessions(): Record<string, GameSession> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error parsing stored sessions:', error);
    return {};
  }
}

// Delete a game session
export function deleteGameSession(gameId: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const sessions = getStoredSessions();
    if (sessions[gameId]) {
      delete sessions[gameId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting game session:', error);
    return false;
  }
}

// Clear all game sessions
export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing sessions:', error);
  }
}

// Game state serialization
export function serializeGameState(gameState: any): string {
  try {
    if (!gameState) {
      throw new Error('Game state is undefined');
    }

    const serialized: SerializedGameState = {
      version: GAME_STATE_VERSION,
      tiles: gameState.tiles || [],
      playerHand: gameState.playerHand || [],
      letterBag: gameState.letterBag || [],
      tileCounter: gameState.tileCounter || 1,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(serialized);
  } catch (error) {
    console.error('Error serializing game state:', error);
    throw new Error('Failed to serialize game state');
  }
}

export function deserializeGameState(data: string): any {
  try {
    if (!data) {
      throw new Error('No data to deserialize');
    }

    const parsed = JSON.parse(data);

    // Version checking for future compatibility
    if (parsed.version !== GAME_STATE_VERSION) {
      console.warn(
        `Game state version mismatch. Expected ${GAME_STATE_VERSION}, got ${parsed.version}`
      );
    }

    return {
      tiles: parsed.tiles || [],
      playerHand: parsed.playerHand || [],
      letterBag: parsed.letterBag || [],
      tileCounter: parsed.tileCounter || 1,
    };
  } catch (error) {
    console.error('Error deserializing game state:', error);
    throw new Error('Failed to deserialize game state');
  }
}

// Export/import game state as JSON file
export function exportGameState(gameId: string): void {
  const session = getGameSession(gameId);
  if (!session) {
    throw new Error('Game session not found');
  }

  const dataStr = JSON.stringify(
    {
      ...session,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );

  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFileDefaultName = `bananagrams-${gameId}-${new Date().toISOString().split('T')[0]}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

export function importGameState(jsonData: string): GameSession {
  try {
    const imported = JSON.parse(jsonData);

    // Generate new IDs for imported game
    const newGameId = generateGameId();
    const newPin = generatePin();

    const session: GameSession = {
      gameId: newGameId,
      pin: newPin,
      createdAt: new Date(imported.createdAt || new Date()),
      lastSaved: new Date(),
      gameState: imported.gameState,
    };

    saveGameSession(session);
    return session;
  } catch (error) {
    console.error('Error importing game state:', error);
    throw new Error('Failed to import game state');
  }
}
