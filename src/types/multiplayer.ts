export interface MultiplayerPlayer {
  id: string;
  name: string;
  tiles: PlayerTile[];
  boardTiles?: BoardTile[];
  isHost: boolean;
  isReady: boolean;
}

export interface MultiplayerRoom {
  id: string;
  pin: string;
  host: string;
  players: MultiplayerPlayer[];
  gameState: 'waiting' | 'playing' | 'finished';
  letterBag: string[];
  createdAt: Date;
}

export interface PlayerTile {
  id: string;
  letter: string;
}

export interface BoardTile {
  id: string;
  content: string;
  position: string;
}

export interface GameStartData {
  players: MultiplayerPlayer[];
  remainingTiles: number;
}

export interface PeelData {
  callerName: string;
  players: MultiplayerPlayer[];
  remainingTiles: number;
}

export interface GameWonData {
  winnerId: string;
  winnerName: string;
}

export interface PlayerBoardUpdateData {
  playerId: string;
  playerName: string;
  boardTiles: BoardTile[];
}

export interface PlayerLeftData {
  playerId: string;
  playerName: string;
  room: MultiplayerRoom;
}

export interface DumpData {
  playerId: string;
  playerName: string;
  remainingTiles: number;
} 