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
      origin: dev ? "http://localhost:3000" : process.env.PRODUCTION_URL,
      methods: ["GET", "POST"]
    }
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
        players: [{
          id: socket.id,
          name: playerName,
          tiles: [],
          isHost: true,
          isReady: false
        }],
        gameState: 'waiting', // waiting, playing, finished
        letterBag: [],
        createdAt: new Date()
      };
      
      gameRooms.set(pin, room);
      socket.join(gameId);
      socket.data.gamePin = pin;
      socket.data.playerName = playerName;
      
      callback({ success: true, pin, gameId });
      
      // Send updated room info
      io.to(gameId).emit('roomUpdate', room);
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
        isHost: false,
        isReady: false
      });
      
      socket.join(room.id);
      socket.data.gamePin = pin;
      socket.data.playerName = playerName;
      
      callback({ success: true, gameId: room.id });
      
      // Notify all players in room
      io.to(room.id).emit('roomUpdate', room);
    });

    // Player ready status
    socket.on('toggleReady', () => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);
      
      if (!room) return;
      
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(room.id).emit('roomUpdate', room);
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
      const allReady = room.players.every(p => p.isReady || p.isHost);
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
      letterDistribution.forEach(item => {
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
      
      room.players.forEach(player => {
        player.tiles = [];
        for (let i = 0; i < tilesPerPlayer; i++) {
          if (room.letterBag.length > 0) {
            player.tiles.push({
              id: `tile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              letter: room.letterBag.pop()
            });
          }
        }
      });
      
      room.gameState = 'playing';
      callback({ success: true });
      
      // Send game start event with initial state
      io.to(room.id).emit('gameStart', {
        players: room.players,
        remainingTiles: room.letterBag.length
      });
    });

    // Player calls "Peel" (emptied their hand)
    socket.on('peel', (callback) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);
      
      if (!room || room.gameState !== 'playing') return;
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.tiles.length > 0) {
        callback({ success: false, error: 'You still have tiles!' });
        return;
      }
      
      // Check if there are enough tiles for everyone
      if (room.letterBag.length < room.players.length) {
        // Winner!
        room.gameState = 'finished';
        io.to(room.id).emit('gameWon', {
          winnerId: socket.id,
          winnerName: player.name
        });
        callback({ success: true, won: true });
        return;
      }
      
      // Give everyone 1 tile
      room.players.forEach(p => {
        if (room.letterBag.length > 0) {
          p.tiles.push({
            id: `tile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            letter: room.letterBag.pop()
          });
        }
      });
      
      callback({ success: true, won: false });
      
      // Notify all players
      io.to(room.id).emit('peelCalled', {
        callerName: player.name,
        players: room.players,
        remainingTiles: room.letterBag.length
      });
    });

    // Trade 1 tile for 3 (dump)
    socket.on('dump', (tileId, callback) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);
      
      if (!room || room.gameState !== 'playing') return;
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;
      
      const tileIndex = player.tiles.findIndex(t => t.id === tileId);
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
            id: `tile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
            letter: room.letterBag.pop()
          });
        }
      }
      
      player.tiles.push(...newTiles);
      
      callback({ success: true, newTiles });
      
      // Notify all players of the dump
      io.to(room.id).emit('playerDumped', {
        playerId: socket.id,
        playerName: player.name,
        remainingTiles: room.letterBag.length
      });
    });

    // Update player's board state
    socket.on('updateBoard', (boardTiles) => {
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);
      
      if (!room || room.gameState !== 'playing') return;
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;
      
      player.boardTiles = boardTiles;
      
      // Broadcast to other players
      socket.to(room.id).emit('playerBoardUpdate', {
        playerId: socket.id,
        playerName: player.name,
        boardTiles
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      const pin = socket.data.gamePin;
      const room = gameRooms.get(pin);
      
      if (!room) return;
      
      // Remove player from room
      room.players = room.players.filter(p => p.id !== socket.id);
      
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
        room
      });
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 