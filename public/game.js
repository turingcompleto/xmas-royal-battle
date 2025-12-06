// Conexión con el servidor
const socket = io();

// Elementos del DOM
const screens = {
  menu: document.getElementById('menu-screen'),
  lobby: document.getElementById('lobby-screen'),
  game: document.getElementById('game-screen'),
  gameover: document.getElementById('gameover-screen')
};

const elements = {
  playerName: document.getElementById('player-name'),
  gameCode: document.getElementById('game-code'),
  lobbyCode: document.getElementById('lobby-code'),
  lobbyPlayers: document.getElementById('lobby-players'),
  gameBoard: document.getElementById('game-board'),
  playersStatus: document.getElementById('players-status'),
  currentTurn: document.getElementById('current-turn'),
  turnsUntilFreeze: document.getElementById('turns-until-freeze'),
  myHealth: document.getElementById('my-health'),
  myShield: document.getElementById('my-shield'),
  myDouble: document.getElementById('my-double'),
  eventList: document.getElementById('event-list'),
  winnerName: document.getElementById('winner-name'),
  notification: document.getElementById('notification'),
  btnAttack: document.getElementById('btn-attack'),
  joinSection: document.getElementById('join-section'),
  btnStart: document.getElementById('btn-start')
};

// Estado del cliente
let state = {
  playerId: null,
  gameId: null,
  gameState: null,
  selectedTarget: null,
  isMyTurn: false
};

// Emojis para jugadores
const playerEmojis = ['🎅', '🤶', '⛄', '🦌', '🧝', '🎄'];

// Mostrar pantalla
function showScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[screenName].classList.remove('hidden');
}

// Mostrar notificación
function showNotification(message, duration = 3000) {
  elements.notification.textContent = message;
  elements.notification.classList.remove('hidden');
  setTimeout(() => {
    elements.notification.classList.add('hidden');
  }, duration);
}

// Agregar evento al log
function addEvent(message) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
  elements.eventList.insertBefore(li, elements.eventList.firstChild);
  
  // Mantener solo los últimos 10 eventos
  while (elements.eventList.children.length > 10) {
    elements.eventList.removeChild(elements.eventList.lastChild);
  }
}

// Renderizar tablero
function renderBoard(gameState) {
  elements.gameBoard.innerHTML = '';
  
  const players = Object.values(gameState.players);
  const playerIndex = {};
  players.forEach((p, i) => playerIndex[p.id] = i);
  
  for (let y = 0; y < gameState.board.length; y++) {
    for (let x = 0; x < gameState.board[y].length; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      
      const boardCell = gameState.board[y][x];
      
      // Verificar si hay jugador en esta celda
      const playerHere = players.find(p => p.x === x && p.y === y && p.alive);
      
      if (boardCell.frozen) {
        cell.classList.add('frozen');
        cell.innerHTML = '❄️';
      } else if (playerHere) {
        cell.classList.add('has-player');
        const emoji = playerEmojis[playerIndex[playerHere.id] % playerEmojis.length];
        cell.innerHTML = `<span class="player-marker">${emoji}</span>`;
        
        if (playerHere.id === state.playerId) {
          cell.classList.add('my-cell');
        } else if (state.isMyTurn && canAttack(playerHere)) {
          cell.classList.add('can-attack');
          cell.onclick = () => selectTarget(playerHere);
        }
      } else if (boardCell.type === 'gift') {
        cell.classList.add('gift');
        cell.innerHTML = '🎁';
      }
      
      elements.gameBoard.appendChild(cell);
    }
  }
}

// Verificar si puede atacar a un jugador
function canAttack(target) {
  const me = state.gameState.players[state.playerId];
  if (!me || !target || !target.alive) return false;
  
  const distance = Math.abs(me.x - target.x) + Math.abs(me.y - target.y);
  return distance <= 2 && target.id !== state.playerId;
}

// Seleccionar objetivo
function selectTarget(player) {
  state.selectedTarget = player;
  elements.btnAttack.disabled = false;
  
  // Actualizar UI
  document.querySelectorAll('#players-status li').forEach(li => {
    li.classList.remove('selected');
    if (li.dataset.playerId === player.id) {
      li.classList.add('selected');
    }
  });
  
  showNotification(`Objetivo: ${player.name}`);
}

// Renderizar lista de jugadores
function renderPlayers(gameState) {
  elements.playersStatus.innerHTML = '';
  
  const players = Object.values(gameState.players);
  
  players.forEach((player, index) => {
    const li = document.createElement('li');
    li.dataset.playerId = player.id;
    
    const emoji = playerEmojis[index % playerEmojis.length];
    const healthPercent = (player.health / 100) * 100;
    
    li.innerHTML = `
      <span>${emoji} ${player.name}</span>
      ${player.hasShield ? '🛡️' : ''}
      ${player.hasDoubleAttack ? '⚡' : ''}
      <div class="health-bar">
        <div class="health-bar-fill" style="width: ${healthPercent}%"></div>
      </div>
    `;
    
    if (!player.alive) {
      li.classList.add('dead');
    }
    
    if (player.id === state.playerId && state.isMyTurn) {
      li.classList.add('current-player');
    }
    
    // Click para seleccionar objetivo
    if (player.id !== state.playerId && player.alive && state.isMyTurn) {
      li.style.cursor = 'pointer';
      li.onclick = () => {
        if (canAttack(player)) {
          selectTarget(player);
        } else {
          showNotification('Muy lejos para atacar (máx 2 casillas)');
        }
      };
    }
    
    elements.playersStatus.appendChild(li);
  });
}

// Actualizar mi estado
function updateMyStatus(gameState) {
  const me = gameState.players[state.playerId];
  if (!me) return;
  
  elements.myHealth.textContent = me.health;
  elements.myShield.textContent = me.hasShield ? 'Sí ✓' : 'No';
  elements.myDouble.textContent = me.hasDoubleAttack ? 'Sí ✓' : 'No';
}

// Habilitar/deshabilitar controles
function setControlsEnabled(enabled) {
  document.querySelectorAll('.btn-move').forEach(btn => {
    btn.disabled = !enabled;
  });
  document.getElementById('btn-skip').disabled = !enabled;
  
  if (!enabled) {
    elements.btnAttack.disabled = true;
    state.selectedTarget = null;
  }
}

// --- Event Listeners del DOM ---

// Botón crear partida
document.getElementById('btn-create').addEventListener('click', () => {
  const name = elements.playerName.value.trim() || 'Jugador';
  socket.emit('createGame', name);
});

// Toggle sección unirse
document.getElementById('btn-join-toggle').addEventListener('click', () => {
  elements.joinSection.classList.toggle('hidden');
});

// Botón unirse
document.getElementById('btn-join').addEventListener('click', () => {
  const name = elements.playerName.value.trim() || 'Jugador';
  const gameId = elements.gameCode.value.trim().toUpperCase();
  
  if (!gameId) {
    showNotification('Ingresa un código de partida');
    return;
  }
  
  socket.emit('joinGame', { gameId, playerName: name });
});

// Botón copiar código
document.getElementById('btn-copy').addEventListener('click', () => {
  navigator.clipboard.writeText(elements.lobbyCode.textContent);
  showNotification('¡Código copiado!');
});

// Botón iniciar partida
document.getElementById('btn-start').addEventListener('click', () => {
  socket.emit('startGame');
});

// Controles de movimiento
document.querySelectorAll('.btn-move').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!state.isMyTurn) return;
    socket.emit('action', { type: 'move', direction: btn.dataset.dir });
  });
});

// Botón atacar
elements.btnAttack.addEventListener('click', () => {
  if (!state.isMyTurn || !state.selectedTarget) return;
  socket.emit('action', { type: 'attack', targetId: state.selectedTarget.id });
  state.selectedTarget = null;
  elements.btnAttack.disabled = true;
});

// Botón pasar turno
document.getElementById('btn-skip').addEventListener('click', () => {
  if (!state.isMyTurn) return;
  socket.emit('action', { type: 'skip' });
});

// Botón volver al menú
document.getElementById('btn-menu').addEventListener('click', () => {
  state = {
    playerId: null,
    gameId: null,
    gameState: null,
    selectedTarget: null,
    isMyTurn: false
  };
  showScreen('menu');
});

// Teclas de dirección
document.addEventListener('keydown', (e) => {
  if (!state.isMyTurn) return;
  
  const keyMap = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'w': 'up',
    's': 'down',
    'a': 'left',
    'd': 'right'
  };
  
  if (keyMap[e.key]) {
    e.preventDefault();
    socket.emit('action', { type: 'move', direction: keyMap[e.key] });
  }
});

// --- Socket Events ---

socket.on('gameCreated', ({ gameId, playerId }) => {
  state.gameId = gameId;
  state.playerId = playerId;
  elements.lobbyCode.textContent = gameId;
  elements.btnStart.classList.remove('hidden');
  showScreen('lobby');
  showNotification('¡Partida creada! Comparte el código');
});

socket.on('joinedGame', ({ gameId, playerId }) => {
  state.gameId = gameId;
  state.playerId = playerId;
  elements.lobbyCode.textContent = gameId;
  elements.btnStart.classList.add('hidden');
  showScreen('lobby');
  showNotification('¡Te uniste a la partida!');
});

socket.on('gameState', (gameState) => {
  state.gameState = gameState;
  
  // Actualizar lobby
  if (!gameState.started) {
    elements.lobbyPlayers.innerHTML = '';
    Object.values(gameState.players).forEach((player, index) => {
      const li = document.createElement('li');
      li.textContent = `${playerEmojis[index]} ${player.name}`;
      if (player.isHost) li.classList.add('host');
      elements.lobbyPlayers.appendChild(li);
    });
    
    // Actualizar visibilidad botón start
    const playerCount = Object.keys(gameState.players).length;
    if (gameState.players[state.playerId]?.isHost && playerCount >= 2) {
      elements.btnStart.classList.remove('hidden');
    }
  } else {
    // Actualizar juego
    renderBoard(gameState);
    renderPlayers(gameState);
    updateMyStatus(gameState);
    elements.turnsUntilFreeze.textContent = `${gameState.turnsUntilFreeze} turnos`;
  }
});

socket.on('playerJoined', ({ playerName }) => {
  addEvent(`${playerName} se unió a la partida`);
  showNotification(`${playerName} se unió`);
});

socket.on('playerLeft', ({ playerName }) => {
  addEvent(`${playerName} abandonó la partida`);
  showNotification(`${playerName} se fue`);
});

socket.on('gameStarted', (gameState) => {
  state.gameState = gameState;
  showScreen('game');
  addEvent('¡La partida ha comenzado!');
  showNotification('¡Que empiece la batalla!', 2000);
});

socket.on('turnStart', ({ playerId, playerName }) => {
  state.isMyTurn = playerId === state.playerId;
  elements.currentTurn.textContent = playerName;
  setControlsEnabled(state.isMyTurn);
  
  if (state.isMyTurn) {
    showNotification('¡Tu turno!', 1500);
  }
  
  // Limpiar selección
  document.querySelectorAll('#players-status li').forEach(li => {
    li.classList.remove('selected');
  });
});

socket.on('actionResult', (result) => {
  let message = result.message;
  
  if (result.gift) {
    const giftMessages = {
      heal: '💚 ¡Curaste 20 HP!',
      shield: '🛡️ ¡Obtuviste un escudo!',
      doubleAttack: '⚡ ¡Doble daño en siguiente ataque!'
    };
    addEvent(giftMessages[result.gift]);
  }
  
  if (result.frozenDamage) {
    addEvent(`❄️ El hielo hizo ${result.frozenDamage} de daño`);
  }
  
  if (result.damage) {
    message += ` (${result.damage} daño)`;
  }
  
  if (result.shieldBroken) {
    addEvent('🛡️ ¡Escudo destruido!');
  }
  
  if (result.eliminated) {
    addEvent(`☠️ ${result.eliminated} fue eliminado`);
    showNotification(`${result.eliminated} eliminado`, 2000);
  }
  
  if (message) {
    addEvent(message);
  }
});

socket.on('zoneShrank', ({ freezeLevel }) => {
  addEvent(`❄️ ¡La zona se está congelando! Nivel: ${freezeLevel}`);
  showNotification('⚠️ ¡El hielo avanza!', 2000);
});

socket.on('gameOver', ({ winner }) => {
  elements.winnerName.textContent = winner;
  showScreen('gameover');
  
  if (state.gameState?.players[state.playerId]?.name === winner) {
    addEvent('🏆 ¡GANASTE!');
  } else {
    addEvent(`🏆 ${winner} ganó la partida`);
  }
});

socket.on('error', (message) => {
  showNotification(`❌ ${message}`);
});

// Reconexión
socket.on('connect', () => {
  console.log('Conectado al servidor');
});

socket.on('disconnect', () => {
  showNotification('Desconectado del servidor');
});
