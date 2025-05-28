const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Game room storage
const gameRooms = new Map();

// Global tile counter to ensure unique IDs
let globalTileIdCounter = 0;

// Helper to generate unique tile ID
function generateTileId(prefix = 'tile') {
  return `${prefix}-${Date.now()}-${globalTileIdCounter++}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to generate 4-digit PIN
function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper to calculate initial tiles per player
function getInitialTilesPerPlayer(playerCount) {
  if (playerCount <= 4) return 21;
  if (playerCount <= 6) return 15;
  return 11;
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.PRODUCTION_URL,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Create a new game room
    socket.on('createRoom', (playerName, callback) => {
      const pin = generatePin();
      const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const room = {
        id: gameId,
        pin,
        host: socket.id,
        players: [
          {
            id: socket.id,
            name: playerName,
            tiles: [],
            boardTiles: [],
            handSize: 0,
            isHost: true,
            isReady: false,
          },
        ],
        gameState: 'waiting', // waiting, playing, finished
        letterBag: [],
        createdAt: new Date(),
      };

      gameRooms.set(pin, room);
      socket.join(gameId);
      socket.data.gamePin = pin;
      socket.data.playerName = playerName;

      callback({ success: true, pin, gameId });

      // Send updated room info
      io.to(gameId).emit('roomUpdate', {
        ...room,
        players: room.players.map((p) => ({
          ...p,
          // Include tiles in hand count
          handSize: p.tiles
            ? p.tiles.filter(
                (tile) => !p.boardTiles || !p.boardTiles.some((bt) => bt.id === tile.id)
              ).length
            : 0,
          // Include board tiles count
          boardSize: p.boardTiles ? p.boardTiles.length : 0,
        })),
      });
    });

    // Join an existing room
    socket.on('joinRoom', (pin, playerName, callback) => {
      const room = gameRooms.get(pin);

      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      if (room.players.length >= 8) {
        callback({ success: false, error: 'Room is full (max 8 players)' });
        return;
      }

      if (room.gameState !== 'waiting') {
        callback({ success: false, error: 'Game already in progress' });
        return;
      }

      // Add player to room
      room.players.push({
        id: socket.id,
        name: playerName,
        tiles: [],
        boardTiles: [],
        handSize: 0,
        isHost: false,
        isReady: false,
      });

      socket.join(room.id);
      socket.data.gamePin = pin;
      socket.data.playerName = playerName;

      callback({ success: true, gameId: room.id });

      // Notify all players in room
      io.to(room.id).emit('roomUpdate', {
        ...room,
        players: room.players.map((p) => ({
          ...p,
          handSize: p.tiles
            ? p.tiles.filter(
                (tile) => !p.boardTiles || !p.boardTiles.some((bt) => bt.id === tile.id)
              ).length
            : 0,
          boardSize: p.boardTiles ? p.boardTiles.length : 0,
        })),
      });
    });

    // Player ready status
    socket.on('toggleReady', () => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(room.id).emit('roomUpdate', {
          ...room,
          players: room.players.map((p) => ({
            ...p,
            handSize: p.tiles
              ? p.tiles.filter(
                  (tile) => !p.boardTiles || !p.boardTiles.some((bt) => bt.id === tile.id)
                ).length
              : 0,
            boardSize: p.boardTiles ? p.boardTiles.length : 0,
          })),
        });
      }
    });

    // Start game (host only)
    socket.on('startGame', (callback) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room || room.host !== socket.id) {
        callback({ success: false, error: 'Only host can start the game' });
        return;
      }

      // Check if all players are ready
      const allReady = room.players.every((p) => p.isReady || p.isHost);
      if (!allReady) {
        callback({ success: false, error: 'Not all players are ready' });
        return;
      }

      // Initialize game
      const letterDistribution = [
        { letter: 'A', count: 13 },
        { letter: 'B', count: 3 },
        { letter: 'C', count: 3 },
        { letter: 'D', count: 6 },
        { letter: 'E', count: 18 },
        { letter: 'F', count: 3 },
        { letter: 'G', count: 4 },
        { letter: 'H', count: 3 },
        { letter: 'I', count: 12 },
        { letter: 'J', count: 2 },
        { letter: 'K', count: 2 },
        { letter: 'L', count: 5 },
        { letter: 'M', count: 3 },
        { letter: 'N', count: 8 },
        { letter: 'O', count: 11 },
        { letter: 'P', count: 3 },
        { letter: 'Q', count: 2 },
        { letter: 'R', count: 9 },
        { letter: 'S', count: 6 },
        { letter: 'T', count: 9 },
        { letter: 'U', count: 6 },
        { letter: 'V', count: 3 },
        { letter: 'W', count: 3 },
        { letter: 'X', count: 2 },
        { letter: 'Y', count: 3 },
        { letter: 'Z', count: 2 },
      ];

      // Create letter bag array
      const letterBag = [];
      letterDistribution.forEach((item) => {
        for (let i = 0; i < item.count; i++) {
          letterBag.push(item.letter);
        }
      });

      // Shuffle the bag
      for (let i = letterBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letterBag[i], letterBag[j]] = [letterBag[j], letterBag[i]];
      }

      room.letterBag = letterBag;

      // Distribute initial tiles to players
      const tilesPerPlayer = getInitialTilesPerPlayer(room.players.length);

      room.players.forEach((player, playerIndex) => {
        player.tiles = [];
        for (let i = 0; i < tilesPerPlayer; i++) {
          if (room.letterBag.length > 0) {
            player.tiles.push({
              id: generateTileId('start'),
              letter: room.letterBag.pop(),
            });
          }
        }
        player.handSize = player.tiles.length;
      });

      room.gameState = 'playing';
      callback({ success: true });

      // Send game start event with initial state FIRST
      io.to(room.id).emit('gameStart', {
        players: room.players.map((p) => ({
          ...p,
          // At game start, all tiles are in hand (boardTiles is undefined/empty)
          tiles: p.tiles,
        })),
        remainingTiles: room.letterBag.length,
      });

      // Send room update with playing state after a small delay
      setTimeout(() => {
        io.to(room.id).emit('roomUpdate', {
          ...room,
          players: room.players.map((p) => ({
            ...p,
            handSize: p.tiles
              ? p.tiles.filter(
                  (tile) => !p.boardTiles || !p.boardTiles.some((bt) => bt.id === tile.id)
                ).length
              : 0,
            boardSize: p.boardTiles ? p.boardTiles.length : 0,
          })),
        });
      }, 200);
    });

    // Player calls "Peel" (emptied their hand)
    socket.on('peel', (callback) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room || room.gameState !== 'playing') return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) {
        callback({ success: false, error: 'Player not found' });
        return;
      }

      // Check if player actually has 0 tiles in hand
      // We need to check tiles that are NOT on the board
      const tilesInHand = player.tiles.filter(
        (tile) => !player.boardTiles || !player.boardTiles.some((bt) => bt.id === tile.id)
      );

      if (tilesInHand.length > 0) {
        callback({ success: false, error: 'You still have tiles in your hand!' });
        return;
      }

      // Check if there are enough tiles for everyone
      if (room.letterBag.length < room.players.length) {
        // Winner!
        room.gameState = 'finished';
        io.to(room.id).emit('gameWon', {
          winnerId: socket.id,
          winnerName: player.name,
        });
        callback({ success: true, won: true });
        return;
      }

      // Check if this is the last round (not enough tiles for another peel)
      const isLastRound = room.letterBag.length < room.players.length * 2;

      // Give everyone 1 tile
      room.players.forEach((p) => {
        if (room.letterBag.length > 0) {
          const newTile = {
            id: generateTileId('peel'),
            letter: room.letterBag.pop(),
          };
          p.tiles.push(newTile);
        }
      });

      callback({ success: true, won: false });

      // Notify all players
      io.to(room.id).emit('peelCalled', {
        callerName: player.name,
        players: room.players.map((p) => ({
          ...p,
          // Only send tiles that are in hand (not on board)
          tiles: p.tiles.filter(
            (tile) => !p.boardTiles || !p.boardTiles.some((bt) => bt.id === tile.id)
          ),
          boardTiles: p.boardTiles || [],
        })),
        remainingTiles: room.letterBag.length,
        isLastRound: isLastRound,
      });

      // Send room update to update the sidebar
      io.to(room.id).emit('roomUpdate', {
        ...room,
        players: room.players.map((p) => ({
          ...p,
          handSize: p.tiles
            ? p.tiles.filter(
                (tile) => !p.boardTiles || !p.boardTiles.some((bt) => bt.id === tile.id)
              ).length
            : 0,
          boardSize: p.boardTiles ? p.boardTiles.length : 0,
        })),
      });
    });

    // Trade 1 tile for 3 (dump)
    socket.on('dump', (tileId, callback) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room || room.gameState !== 'playing') return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      const tileIndex = player.tiles.findIndex((t) => t.id === tileId);
      if (tileIndex === -1) {
        callback({ success: false, error: 'Tile not found' });
        return;
      }

      if (room.letterBag.length < 3) {
        callback({ success: false, error: 'Not enough tiles in the bag' });
        return;
      }

      // Remove the tile and return it to bag
      const [removedTile] = player.tiles.splice(tileIndex, 1);
      room.letterBag.push(removedTile.letter);

      // Shuffle the bag
      for (let i = room.letterBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [room.letterBag[i], room.letterBag[j]] = [room.letterBag[j], room.letterBag[i]];
      }

      // Draw 3 new tiles
      const newTiles = [];
      for (let i = 0; i < 3; i++) {
        if (room.letterBag.length > 0) {
          newTiles.push({
            id: generateTileId('dump'),
            letter: room.letterBag.pop(),
          });
        }
      }

      player.tiles.push(...newTiles);

      // Update handSize
      if (player.handSize !== undefined) {
        player.handSize = player.tiles.length;
      }

      callback({ success: true, newTiles });

      // Notify all players of the dump
      io.to(room.id).emit('playerDumped', {
        playerId: socket.id,
        playerName: player.name,
        remainingTiles: room.letterBag.length,
      });

      // Send room update to update the sidebar
      io.to(room.id).emit('roomUpdate', {
        ...room,
        players: room.players.map((p) => ({
          ...p,
          handSize: p.tiles
            ? p.tiles.filter(
                (tile) => !p.boardTiles || !p.boardTiles.some((bt) => bt.id === tile.id)
              ).length
            : 0,
          boardSize: p.boardTiles ? p.boardTiles.length : 0,
        })),
      });
    });

    // Update player's board state
    socket.on('updateBoard', (boardTiles) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room || room.gameState !== 'playing') return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      player.boardTiles = boardTiles;

      // Calculate actual hand size
      const handSize = player.tiles.filter(
        (tile) => !boardTiles.some((bt) => bt.id === tile.id)
      ).length;

      // Broadcast to other players
      socket.to(room.id).emit('playerBoardUpdate', {
        playerId: socket.id,
        playerName: player.name,
        boardTiles,
        handSize,
        boardSize: boardTiles.length,
      });
    });

    // Update player's hand size (new event)
    socket.on('updateHandSize', (handSize) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room || room.gameState !== 'playing') return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      player.handSize = handSize;

      // Broadcast to all players including sender
      io.to(room.id).emit('playerHandUpdate', {
        playerId: socket.id,
        playerName: player.name,
        handSize: handSize,
      });
    });

    // Update tile locations - which tiles are in hand vs on board
    socket.on('updateTileLocations', (data) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room || room.gameState !== 'playing') return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      // data should contain: { tilesMovedToBoard: string[], tilesMovedToHand: string[] }
      const { tilesMovedToBoard, tilesMovedToHand } = data;

      // Update player's tiles array to reflect current state
      if (tilesMovedToBoard && tilesMovedToBoard.length > 0) {
        // These tiles are now on the board, not in hand
        // Update handSize
        player.handSize = Math.max(0, (player.handSize || 0) - tilesMovedToBoard.length);
      }

      if (tilesMovedToHand && tilesMovedToHand.length > 0) {
        // These tiles are back in hand
        // Update handSize
        player.handSize = (player.handSize || 0) + tilesMovedToHand.length;
      }

      // Broadcast hand size update
      io.to(room.id).emit('playerHandUpdate', {
        playerId: socket.id,
        playerName: player.name,
        handSize: player.handSize,
      });
    });

    // Get detailed player information
    socket.on('getPlayerDetails', (targetPlayerName, callback) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room || room.gameState !== 'playing') return;

      const targetPlayer = room.players.find((p) => p.name === targetPlayerName);
      if (!targetPlayer) {
        callback({ success: false, error: 'Player not found' });
        return;
      }

      // Get tiles in hand (not on board)
      const tilesInHand = targetPlayer.tiles.filter(
        (tile) =>
          !targetPlayer.boardTiles || !targetPlayer.boardTiles.some((bt) => bt.id === tile.id)
      );

      callback({
        success: true,
        playerName: targetPlayer.name,
        tilesInHand: tilesInHand.map((t) => t.letter), // Just send letters, not full tile objects
        boardTiles: targetPlayer.boardTiles || [],
        handSize: tilesInHand.length,
        boardSize: targetPlayer.boardTiles ? targetPlayer.boardTiles.length : 0,
      });
    });

    // Kick player (host only)
    socket.on('kickPlayer', (targetPlayerId, callback) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      // Check if the requester is the host
      if (room.host !== socket.id) {
        callback({ success: false, error: 'Only the host can kick players' });
        return;
      }

      // Can't kick during an active game
      if (room.gameState !== 'waiting') {
        callback({ success: false, error: 'Cannot kick players during an active game' });
        return;
      }

      // Find the target player
      const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
      if (!targetPlayer) {
        callback({ success: false, error: 'Player not found' });
        return;
      }

      // Can't kick yourself
      if (targetPlayerId === socket.id) {
        callback({ success: false, error: 'You cannot kick yourself' });
        return;
      }

      // Remove the player from the room
      room.players = room.players.filter((p) => p.id !== targetPlayerId);

      // Get the socket of the kicked player and make them leave the room
      const kickedSocket = io.sockets.sockets.get(targetPlayerId);
      if (kickedSocket) {
        kickedSocket.leave(room.id);
        // Notify the kicked player
        kickedSocket.emit('kicked', {
          reason: 'You have been kicked from the room by the host',
        });
      }

      callback({ success: true });

      // Notify all remaining players
      io.to(room.id).emit('playerKicked', {
        playerId: targetPlayerId,
        playerName: targetPlayer.name,
      });

      // Send updated room info
      io.to(room.id).emit('roomUpdate', {
        ...room,
        players: room.players.map((p) => ({
          ...p,
          handSize: p.tiles
            ? p.tiles.filter(
                (tile) => !p.boardTiles || !p.boardTiles.some((bt) => bt.id === tile.id)
              ).length
            : 0,
          boardSize: p.boardTiles ? p.boardTiles.length : 0,
        })),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);

      if (!room) return;

      // Remove player from room
      room.players = room.players.filter((p) => p.id !== socket.id);

      // If room is empty, delete it
      if (room.players.length === 0) {
        gameRooms.delete(pin);
        return;
      }

      // If host left, assign new host
      if (room.host === socket.id && room.players.length > 0) {
        room.host = room.players[0].id;
        room.players[0].isHost = true;
      }

      // Notify remaining players
      io.to(room.id).emit('playerLeft', {
        playerId: socket.id,
        playerName: socket.data.playerName,
        room,
      });
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
