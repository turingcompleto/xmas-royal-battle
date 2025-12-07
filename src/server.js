const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

// Configuración del juego
const CONFIG = {
  GRID_SIZE: 12,
  MAX_PLAYERS: 6,
  MIN_PLAYERS: 2,
  TURNS_TO_SHRINK: 3,
  INITIAL_HEALTH: 100,
  ATTACK_DAMAGE: 25,
  FREEZE_DAMAGE: 15,
  GIFT_HEAL: 20,
  GIFT_SPAWN_CHANCE: 0.15
};

// Estado del juego
let games = {};

// Generar ID único para partidas
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Crear tablero inicial con regalos
function createBoard() {
  const board = [];
  for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
      row.push({
        type: Math.random() < CONFIG.GIFT_SPAWN_CHANCE ? 'gift' : 'empty',
        frozen: false
      });
    }
    board.push(row);
  }
  return board;
}

// Obtener posición inicial aleatoria en el borde
function getStartPosition(board, existingPositions) {
  const edges = [];
  const size = CONFIG.GRID_SIZE;
  
  // Bordes del tablero
  for (let i = 0; i < size; i++) {
    edges.push({ x: i, y: 0 });
    edges.push({ x: i, y: size - 1 });
    edges.push({ x: 0, y: i });
    edges.push({ x: size - 1, y: i });
  }
  
  // Filtrar posiciones ocupadas
  const available = edges.filter(pos => 
    !existingPositions.some(p => p.x === pos.x && p.y === pos.y)
  );
  
  return available[Math.floor(Math.random() * available.length)];
}

// Expandir zona congelada
function expandFreezeZone(game) {
  game.freezeLevel++;
  const freeze = game.freezeLevel;
  const size = CONFIG.GRID_SIZE;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x < freeze || x >= size - freeze || y < freeze || y >= size - freeze) {
        game.board[y][x].frozen = true;
        game.board[y][x].type = 'frozen';
      }
    }
  }
  
  // Dañar jugadores en zona congelada
  Object.values(game.players).forEach(player => {
    if (player.alive && game.board[player.y][player.x].frozen) {
      player.health -= CONFIG.FREEZE_DAMAGE;
      if (player.health <= 0) {
        player.alive = false;
        player.health = 0;
      }
    }
  });
}

// Verificar ganador
function checkWinner(game) {
  const alivePlayers = Object.values(game.players).filter(p => p.alive);
  if (alivePlayers.length === 1) {
    return alivePlayers[0];
  }
  if (alivePlayers.length === 0) {
    return { name: 'Nadie', tie: true };
  }
  return null;
}

// Calcular distancia Manhattan
function getDistance(p1, p2) {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

io.on('connection', (socket) => {
  console.log('Jugador conectado:', socket.id);
  
  // Crear partida
  socket.on('createGame', ({ playerName, avatar }) => {
    const gameId = generateGameId();
    const position = getStartPosition(createBoard(), []);
    
    games[gameId] = {
      id: gameId,
      board: createBoard(),
      players: {
        [socket.id]: {
          id: socket.id,
          name: playerName || 'Jugador',
          avatar: avatar || '🎅',
          x: position.x,
          y: position.y,
          health: CONFIG.INITIAL_HEALTH,
          alive: true,
          hasShield: false,
          hasDoubleAttack: false,
          isHost: true
        }
      },
      started: false,
      currentTurn: 0,
      turnOrder: [socket.id],
      freezeLevel: 0,
      turnsUntilFreeze: CONFIG.TURNS_TO_SHRINK
    };
    
    socket.join(gameId);
    socket.gameId = gameId;
    socket.emit('gameCreated', { gameId, playerId: socket.id });
    io.to(gameId).emit('gameState', games[gameId]);
  });
  
  // Unirse a partida
  socket.on('joinGame', ({ gameId, playerName, avatar }) => {
    const game = games[gameId];
    
    if (!game) {
      socket.emit('error', 'Partida no encontrada');
      return;
    }
    
    if (game.started) {
      socket.emit('error', 'La partida ya comenzó');
      return;
    }
    
    if (Object.keys(game.players).length >= CONFIG.MAX_PLAYERS) {
      socket.emit('error', 'Partida llena');
      return;
    }
    
    const existingPositions = Object.values(game.players).map(p => ({ x: p.x, y: p.y }));
    const position = getStartPosition(game.board, existingPositions);
    
    game.players[socket.id] = {
      id: socket.id,
      name: playerName || 'Jugador',
      avatar: avatar || '🎅',
      x: position.x,
      y: position.y,
      health: CONFIG.INITIAL_HEALTH,
      alive: true,
      hasShield: false,
      hasDoubleAttack: false,
      isHost: false
    };
    
    game.turnOrder.push(socket.id);
    
    socket.join(gameId);
    socket.gameId = gameId;
    socket.emit('joinedGame', { gameId, playerId: socket.id });
    io.to(gameId).emit('gameState', game);
    io.to(gameId).emit('playerJoined', { playerName: playerName || 'Jugador', avatar: avatar || '🎅' });
  });
  
  // Iniciar partida
  socket.on('startGame', () => {
    const game = games[socket.gameId];
    
    if (!game) return;
    
    if (Object.keys(game.players).length < CONFIG.MIN_PLAYERS) {
      socket.emit('error', `Se necesitan al menos ${CONFIG.MIN_PLAYERS} jugadores`);
      return;
    }
    
    if (!game.players[socket.id]?.isHost) {
      socket.emit('error', 'Solo el host puede iniciar');
      return;
    }
    
    game.started = true;
    game.turnOrder = game.turnOrder.sort(() => Math.random() - 0.5);
    
    io.to(socket.gameId).emit('gameStarted', game);
    io.to(socket.gameId).emit('turnStart', {
      playerId: game.turnOrder[game.currentTurn],
      playerName: game.players[game.turnOrder[game.currentTurn]].name
    });
  });
  
  // Realizar acción
  socket.on('action', ({ type, direction, targetId }) => {
    const game = games[socket.gameId];
    
    if (!game || !game.started) return;
    
    const player = game.players[socket.id];
    if (!player || !player.alive) return;
    
    // Verificar turno
    if (game.turnOrder[game.currentTurn] !== socket.id) {
      socket.emit('error', 'No es tu turno');
      return;
    }
    
    let actionResult = { type, success: false, message: '' };
    
    switch (type) {
      case 'move':
        const moves = {
          up: { dx: 0, dy: -1 },
          down: { dx: 0, dy: 1 },
          left: { dx: -1, dy: 0 },
          right: { dx: 1, dy: 0 }
        };
        
        if (moves[direction]) {
          const newX = player.x + moves[direction].dx;
          const newY = player.y + moves[direction].dy;
          
          // Verificar límites
          if (newX >= 0 && newX < CONFIG.GRID_SIZE && 
              newY >= 0 && newY < CONFIG.GRID_SIZE) {
            
            // Verificar si hay otro jugador
            const blocked = Object.values(game.players).some(
              p => p.alive && p.id !== socket.id && p.x === newX && p.y === newY
            );
            
            if (!blocked) {
              player.x = newX;
              player.y = newY;
              
              // Recoger regalo si hay
              const cell = game.board[newY][newX];
              if (cell.type === 'gift') {
                const giftType = Math.random();
                if (giftType < 0.4) {
                  player.health = Math.min(CONFIG.INITIAL_HEALTH, player.health + CONFIG.GIFT_HEAL);
                  actionResult.gift = 'heal';
                } else if (giftType < 0.7) {
                  player.hasShield = true;
                  actionResult.gift = 'shield';
                } else {
                  player.hasDoubleAttack = true;
                  actionResult.gift = 'doubleAttack';
                }
                cell.type = 'empty';
              }
              
              // Daño por zona congelada
              if (cell.frozen) {
                player.health -= CONFIG.FREEZE_DAMAGE;
                actionResult.frozenDamage = CONFIG.FREEZE_DAMAGE;
              }
              
              actionResult.success = true;
              actionResult.message = `${player.name} se movió`;
            } else {
              actionResult.message = 'Casilla ocupada';
            }
          } else {
            actionResult.message = 'Fuera del tablero';
          }
        }
        break;
        
      case 'attack':
        const target = game.players[targetId];
        
        if (!target || !target.alive) {
          actionResult.message = 'Objetivo no válido';
          break;
        }
        
        const distance = getDistance(player, target);
        
        if (distance > 2) {
          actionResult.message = 'Objetivo muy lejos (máx 2 casillas)';
          break;
        }
        
        let damage = CONFIG.ATTACK_DAMAGE;
        if (player.hasDoubleAttack) {
          damage *= 2;
          player.hasDoubleAttack = false;
        }
        
        if (target.hasShield) {
          damage = Math.floor(damage / 2);
          target.hasShield = false;
          actionResult.shieldBroken = true;
        }
        
        target.health -= damage;
        
        if (target.health <= 0) {
          target.health = 0;
          target.alive = false;
          actionResult.eliminated = target.name;
        }
        
        actionResult.success = true;
        actionResult.damage = damage;
        actionResult.message = `${player.name} atacó a ${target.name}`;
        break;
        
      case 'skip':
        actionResult.success = true;
        actionResult.message = `${player.name} pasó turno`;
        break;
    }
    
    // Verificar si el jugador murió por hielo
    if (player.health <= 0) {
      player.health = 0;
      player.alive = false;
    }
    
    // Emitir resultado de acción
    io.to(socket.gameId).emit('actionResult', actionResult);
    
    // Verificar ganador
    const winner = checkWinner(game);
    if (winner) {
      io.to(socket.gameId).emit('gameOver', { winner: winner.name });
      delete games[socket.gameId];
      return;
    }
    
    // Siguiente turno
    do {
      game.currentTurn = (game.currentTurn + 1) % game.turnOrder.length;
    } while (!game.players[game.turnOrder[game.currentTurn]]?.alive);
    
    // Verificar si toca reducir zona
    game.turnsUntilFreeze--;
    if (game.turnsUntilFreeze <= 0) {
      game.turnsUntilFreeze = CONFIG.TURNS_TO_SHRINK;
      expandFreezeZone(game);
      io.to(socket.gameId).emit('zoneShrank', { freezeLevel: game.freezeLevel });
      
      // Verificar ganador después de daño por hielo
      const winnerAfterFreeze = checkWinner(game);
      if (winnerAfterFreeze) {
        io.to(socket.gameId).emit('gameOver', { winner: winnerAfterFreeze.name });
        delete games[socket.gameId];
        return;
      }
    }
    
    io.to(socket.gameId).emit('gameState', game);
    io.to(socket.gameId).emit('turnStart', {
      playerId: game.turnOrder[game.currentTurn],
      playerName: game.players[game.turnOrder[game.currentTurn]].name
    });
  });
  
  // Desconexión
  socket.on('disconnect', () => {
    console.log('Jugador desconectado:', socket.id);
    
    const game = games[socket.gameId];
    if (game) {
      if (game.players[socket.id]) {
        game.players[socket.id].alive = false;
        io.to(socket.gameId).emit('playerLeft', { 
          playerName: game.players[socket.id].name 
        });
      }
      
      // Si no quedan jugadores, eliminar partida
      const activePlayers = Object.values(game.players).filter(p => p.alive);
      if (activePlayers.length === 0) {
        delete games[socket.gameId];
      } else if (game.started) {
        const winner = checkWinner(game);
        if (winner) {
          io.to(socket.gameId).emit('gameOver', { winner: winner.name });
          delete games[socket.gameId];
        } else {
          io.to(socket.gameId).emit('gameState', game);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎄 Servidor Navidad Battle Royale corriendo en http://localhost:${PORT}`);
});
