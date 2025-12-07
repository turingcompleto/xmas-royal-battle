// Conexión con el servidor
const socket = io();

// ====== SISTEMA DE MÚSICA DE TENSIÓN ======
class TensionMusic {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.nodes = {};
    this.tempo = 120;
    this.currentBeat = 0;
    this.intervalId = null;
    this.tensionLevel = 1; // 1-3, aumenta cuando la zona se reduce
  }

  init() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Nodo master de volumen
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioCtx.destination);
  }

  // Crear oscilador con envolvente
  playNote(freq, duration, type = 'square', gainValue = 0.2, delay = 0) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    const startTime = this.audioCtx.currentTime + delay;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }

  // Bajo pulsante (estilo 8-bit navideño oscuro)
  playBass() {
    const bassNotes = [
      [65.41, 82.41, 73.42], // C2, E2, D2 - nivel 1
      [61.74, 77.78, 69.30], // B1, Eb2, Db2 - nivel 2 (más tenso)
      [58.27, 73.42, 65.41]  // Bb1, D2, C2 - nivel 3 (muy tenso)
    ];
    const notes = bassNotes[this.tensionLevel - 1];
    const note = notes[this.currentBeat % notes.length];
    this.playNote(note, 0.3, 'square', 0.25);
  }

  // Melodía de tensión
  playMelody() {
    const melodies = [
      // Nivel 1 - Misterioso navideño
      [392, 0, 330, 0, 349, 0, 294, 0], // G4, E4, F4, D4
      // Nivel 2 - Más urgente
      [415, 0, 349, 370, 311, 0, 330, 0], // Ab4, F4, Gb4, Eb4
      // Nivel 3 - Muy tenso
      [440, 415, 392, 370, 349, 330, 311, 294] // Escala descendente cromática
    ];
    
    const melody = melodies[this.tensionLevel - 1];
    const note = melody[this.currentBeat % melody.length];
    
    if (note > 0) {
      this.playNote(note, 0.15, 'square', 0.12);
      // Armonía
      if (this.tensionLevel >= 2) {
        this.playNote(note * 1.25, 0.15, 'triangle', 0.08); // Tercera mayor
      }
    }
  }

  // Arpegio de tensión (campanas siniestras)
  playArpeggio() {
    if (this.currentBeat % 2 !== 0) return;
    
    const arpeggios = [
      [523, 659, 784], // C5, E5, G5
      [554, 698, 831], // Db5, F5, Ab5
      [523, 622, 784]  // C5, Eb5, G5 (menor)
    ];
    
    const arp = arpeggios[this.tensionLevel - 1];
    arp.forEach((note, i) => {
      this.playNote(note, 0.2, 'triangle', 0.06, i * 0.08);
    });
  }

  // Percusión 8-bit
  playDrums() {
    // Kick en beats 0 y 4
    if (this.currentBeat % 4 === 0) {
      this.playNote(60, 0.1, 'square', 0.3);
      this.playNote(55, 0.15, 'square', 0.2);
    }
    
    // Snare/hit en beats 2 y 6
    if (this.currentBeat % 4 === 2) {
      // Ruido simulado con múltiples frecuencias
      [800, 1000, 1200].forEach(f => {
        this.playNote(f, 0.05, 'square', 0.08);
      });
    }
    
    // Hi-hat más rápido en niveles altos
    if (this.tensionLevel >= 2 || this.currentBeat % 2 === 0) {
      this.playNote(1500, 0.02, 'square', 0.04);
    }
    
    // Redoble en nivel 3
    if (this.tensionLevel === 3 && this.currentBeat % 8 >= 6) {
      this.playNote(200, 0.05, 'square', 0.15);
    }
  }

  // Loop principal
  tick() {
    this.playBass();
    this.playMelody();
    this.playArpeggio();
    this.playDrums();
    
    this.currentBeat = (this.currentBeat + 1) % 8;
  }

  start() {
    if (this.isPlaying) return;
    
    this.init();
    this.isPlaying = true;
    
    // Tempo basado en nivel de tensión
    const getInterval = () => {
      const baseTempo = 140 + (this.tensionLevel * 20);
      return 60000 / baseTempo / 2;
    };
    
    const scheduleNext = () => {
      if (!this.isPlaying) return;
      this.tick();
      this.intervalId = setTimeout(scheduleNext, getInterval());
    };
    
    scheduleNext();
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  setTensionLevel(level) {
    this.tensionLevel = Math.max(1, Math.min(3, level));
  }

  setVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }
}

// Instancia global de música
const tensionMusic = new TensionMusic();

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
  isMyTurn: false,
  selectedAvatar: '🎅'
};

// Guardar mapeo de avatares de jugadores
let playerAvatars = {};

// Obtener avatar de un jugador
function getPlayerAvatar(playerId) {
  return playerAvatars[playerId] || '🎅';
}

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
        const avatar = getPlayerAvatar(playerHere.id);
        cell.innerHTML = `<span class="player-marker">${avatar}</span>`;
        
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
  
  // Actualizar hint de ataque
  const attackHint = document.getElementById('attack-target-hint');
  if (attackHint) {
    attackHint.textContent = `Objetivo: ${player.name}`;
    attackHint.style.color = '#ff6b6b';
  }
  
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
  
  players.forEach((player) => {
    const li = document.createElement('li');
    li.dataset.playerId = player.id;
    
    const avatar = getPlayerAvatar(player.id);
    const healthPercent = (player.health / 100) * 100;
    const isMe = player.id === state.playerId;
    
    li.innerHTML = `
      <span>${avatar} ${player.name}${isMe ? ' (Tú)' : ''}</span>
      ${player.hasShield ? '🛡️' : ''}
      ${player.hasDoubleAttack ? '⚡' : ''}
      <div class="health-bar">
        <div class="health-bar-fill" style="width: ${healthPercent}%"></div>
      </div>
    `;
    
    if (!player.alive) {
      li.classList.add('dead');
    }
    
    if (isMe && state.isMyTurn) {
      li.classList.add('current-player');
    }
    
    // Click para seleccionar objetivo
    if (!isMe && player.alive && state.isMyTurn) {
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
  
  // Actualizar mi indicador de personaje
  const myAvatarEl = document.getElementById('game-my-avatar');
  const myNameEl = document.getElementById('game-my-name');
  if (myAvatarEl && state.playerId) {
    myAvatarEl.textContent = getPlayerAvatar(state.playerId);
    const me = gameState.players[state.playerId];
    if (me) {
      myNameEl.textContent = me.name;
    }
  }
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

// Selector de avatar
document.querySelectorAll('.avatar-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.selectedAvatar = btn.dataset.avatar;
  });
});

// Modal de instrucciones
document.getElementById('btn-instructions').addEventListener('click', () => {
  document.getElementById('instructions-modal').classList.remove('hidden');
});

document.getElementById('btn-instructions-lobby')?.addEventListener('click', () => {
  document.getElementById('instructions-modal').classList.remove('hidden');
});

document.getElementById('btn-instructions-game')?.addEventListener('click', () => {
  document.getElementById('instructions-modal').classList.remove('hidden');
});

document.getElementById('btn-close-instructions').addEventListener('click', () => {
  document.getElementById('instructions-modal').classList.add('hidden');
});

// Cerrar modal con click afuera
document.getElementById('instructions-modal').addEventListener('click', (e) => {
  if (e.target.id === 'instructions-modal') {
    document.getElementById('instructions-modal').classList.add('hidden');
  }
});

// Botón crear partida
document.getElementById('btn-create').addEventListener('click', () => {
  const name = elements.playerName.value.trim() || 'Jugador';
  socket.emit('createGame', { playerName: name, avatar: state.selectedAvatar });
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
  
  socket.emit('joinGame', { gameId, playerName: name, avatar: state.selectedAvatar });
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
  tensionMusic.stop();
  playerAvatars = {};
  state = {
    playerId: null,
    gameId: null,
    gameState: null,
    selectedTarget: null,
    isMyTurn: false,
    selectedAvatar: '🎅'
  };
  // Resetear selector de avatar
  document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
  document.querySelector('.avatar-option[data-avatar="🎅"]').classList.add('selected');
  showScreen('menu');
});

// Control de volumen
document.getElementById('volume-slider').addEventListener('input', (e) => {
  const volume = e.target.value / 100;
  tensionMusic.setVolume(volume);
  document.getElementById('btn-mute').textContent = volume === 0 ? '🔇' : '🔊';
});

// Botón mute
let previousVolume = 0.3;
document.getElementById('btn-mute').addEventListener('click', () => {
  const slider = document.getElementById('volume-slider');
  const btn = document.getElementById('btn-mute');
  
  if (parseFloat(slider.value) > 0) {
    previousVolume = slider.value / 100;
    slider.value = 0;
    tensionMusic.setVolume(0);
    btn.textContent = '🔇';
  } else {
    slider.value = previousVolume * 100;
    tensionMusic.setVolume(previousVolume);
    btn.textContent = '🔊';
  }
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

// --- Controles Táctiles (Swipe) ---
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
const MIN_SWIPE_DISTANCE = 30;
const MAX_SWIPE_TIME = 500;

document.getElementById('game-board').addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
}, { passive: true });

document.getElementById('game-board').addEventListener('touchend', (e) => {
  if (!state.isMyTurn) return;
  
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const touchEndTime = Date.now();
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const deltaTime = touchEndTime - touchStartTime;
  
  // Verificar que sea un swipe válido
  if (deltaTime > MAX_SWIPE_TIME) return;
  
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  
  if (absX < MIN_SWIPE_DISTANCE && absY < MIN_SWIPE_DISTANCE) return;
  
  let direction;
  if (absX > absY) {
    direction = deltaX > 0 ? 'right' : 'left';
  } else {
    direction = deltaY > 0 ? 'down' : 'up';
  }
  
  socket.emit('action', { type: 'move', direction });
  showNotification(`Moviendo ${direction === 'up' ? '⬆️' : direction === 'down' ? '⬇️' : direction === 'left' ? '⬅️' : '➡️'}`, 500);
}, { passive: true });

// Prevenir scroll en el tablero en móvil
document.getElementById('game-board').addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });

// --- Socket Events ---

socket.on('gameCreated', ({ gameId, playerId }) => {
  state.gameId = gameId;
  state.playerId = playerId;
  playerAvatars[playerId] = state.selectedAvatar;
  
  elements.lobbyCode.textContent = gameId;
  elements.btnStart.classList.remove('hidden');
  
  // Mostrar mi avatar en el lobby
  document.getElementById('my-avatar-big').textContent = state.selectedAvatar;
  document.getElementById('my-name-display').textContent = elements.playerName.value.trim() || 'Jugador';
  
  showScreen('lobby');
  showNotification('¡Partida creada! Comparte el código');
});

socket.on('joinedGame', ({ gameId, playerId }) => {
  state.gameId = gameId;
  state.playerId = playerId;
  playerAvatars[playerId] = state.selectedAvatar;
  
  elements.lobbyCode.textContent = gameId;
  elements.btnStart.classList.add('hidden');
  
  // Mostrar mi avatar en el lobby
  document.getElementById('my-avatar-big').textContent = state.selectedAvatar;
  document.getElementById('my-name-display').textContent = elements.playerName.value.trim() || 'Jugador';
  
  showScreen('lobby');
  showNotification('¡Te uniste a la partida!');
});

socket.on('gameState', (gameState) => {
  state.gameState = gameState;
  
  // Guardar avatares de todos los jugadores
  Object.values(gameState.players).forEach(player => {
    if (player.avatar && !playerAvatars[player.id]) {
      playerAvatars[player.id] = player.avatar;
    }
  });
  
  // Actualizar lobby
  if (!gameState.started) {
    elements.lobbyPlayers.innerHTML = '';
    Object.values(gameState.players).forEach((player) => {
      const li = document.createElement('li');
      const avatar = playerAvatars[player.id] || player.avatar || '🎅';
      const isMe = player.id === state.playerId;
      li.innerHTML = `<span>${avatar}</span> ${player.name}${isMe ? ' <small>(Tú)</small>' : ''}`;
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
  
  // Iniciar música de tensión
  tensionMusic.setTensionLevel(1);
  tensionMusic.start();
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
  
  // Aumentar tensión de la música según el nivel de congelamiento
  const newTensionLevel = Math.min(3, 1 + Math.floor(freezeLevel / 2));
  tensionMusic.setTensionLevel(newTensionLevel);
});

socket.on('gameOver', ({ winner }) => {
  // Detener música de tensión
  tensionMusic.stop();
  
  elements.winnerName.textContent = winner;
  showScreen('gameover');
  
  if (state.gameState?.players[state.playerId]?.name === winner) {
    addEvent('🏆 ¡GANASTE!');
    // Tocar melodía de victoria
    playVictorySound();
  } else {
    addEvent(`🏆 ${winner} ganó la partida`);
  }
});

// Sonido de victoria
function playVictorySound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(ctx.destination);
  
  // Melodía navideña de victoria
  const notes = [
    { freq: 523, time: 0 },     // C5
    { freq: 659, time: 0.15 },  // E5
    { freq: 784, time: 0.3 },   // G5
    { freq: 1047, time: 0.45 }, // C6
    { freq: 784, time: 0.6 },   // G5
    { freq: 1047, time: 0.75 }, // C6
  ];
  
  notes.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(masterGain);
    
    const startTime = ctx.currentTime + time;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
    
    osc.start(startTime);
    osc.stop(startTime + 0.25);
  });
}

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
