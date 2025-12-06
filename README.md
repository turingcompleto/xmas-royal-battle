# 🎄 Navidad Battle Royale ❄️

Un juego battle royale multijugador con temática navideña, desarrollado con Node.js, Express y Socket.io.

## 🎮 Cómo jugar

### Objetivo
¡Sé el último jugador en pie! Sobrevive al frío mientras la zona se congela desde los bordes.

### Mecánicas

- **Movimiento**: Muévete 1 casilla por turno (flechas o WASD)
- **Ataque**: Ataca a jugadores dentro de 2 casillas de distancia (25 de daño)
- **Regalos** 🎁: Recógelos moviéndote sobre ellos
  - 💚 Curación (+20 HP)
  - 🛡️ Escudo (reduce el siguiente daño a la mitad)
  - ⚡ Doble ataque (siguiente ataque hace 50 de daño)
- **Zona congelada** ❄️: Cada 3 turnos el hielo avanza desde los bordes. ¡Estar en el hielo hace 15 de daño!

### Personajes
- 🎅 Santa
- 🤶 Mrs. Claus  
- ⛄ Muñeco de nieve
- 🦌 Rudolph
- 🧝 Elfo
- 🎄 Árbol de Navidad

## 🚀 Instalación

```bash
# Clonar o descargar el proyecto
cd navidad-battle-royale

# Instalar dependencias
npm install

# Iniciar el servidor
npm start
```

El juego estará disponible en `http://localhost:3000`

## 🎯 Crear/Unirse a una partida

1. **Crear partida**: 
   - Escribe tu nombre
   - Click en "Crear Partida"
   - Comparte el código con tus amigos

2. **Unirse a partida**:
   - Escribe tu nombre
   - Click en "Unirse a Partida"
   - Ingresa el código de 6 letras
   - Click en "Entrar"

3. **Iniciar**:
   - Solo el host (quien creó) puede iniciar
   - Se necesitan mínimo 2 jugadores
   - Máximo 6 jugadores

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **WebSockets**: Socket.io
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla

## 📁 Estructura del proyecto

```
navidad-battle-royale/
├── package.json
├── README.md
├── src/
│   └── server.js      # Servidor y lógica del juego
└── public/
    ├── index.html     # Interfaz del juego
    ├── styles.css     # Estilos navideños
    └── game.js        # Cliente del juego
```

## ⚙️ Configuración

Puedes modificar estos valores en `src/server.js`:

```javascript
const CONFIG = {
  GRID_SIZE: 12,        // Tamaño del tablero
  MAX_PLAYERS: 6,       // Máximo de jugadores
  MIN_PLAYERS: 2,       // Mínimo para iniciar
  TURNS_TO_SHRINK: 3,   // Turnos entre congelamiento
  INITIAL_HEALTH: 100,  // Vida inicial
  ATTACK_DAMAGE: 25,    // Daño base de ataque
  FREEZE_DAMAGE: 15,    // Daño por turno en hielo
  GIFT_HEAL: 20,        // Curación de regalo
  GIFT_SPAWN_CHANCE: 0.15 // Probabilidad de regalo
};
```

## 🎨 Características

- ❄️ Copos de nieve animados
- 🎵 Efectos visuales festivos
- 📱 Diseño responsivo
- ⌨️ Controles por teclado (WASD/flechas)
- 🔔 Notificaciones en tiempo real
- 📜 Log de eventos

---

¡Feliz Navidad y que gane el mejor! 🎄🏆
