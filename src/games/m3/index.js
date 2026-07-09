import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, W = 700, H = 520) {
  const container = document.getElementById('phaser-container');

  // Constantes de Tetris Clásico
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 24;
  
  const COLORS = {
    I: 0x00FFFF, // Cian
    J: 0x0000FF, // Azul
    L: 0xFFA500, // Naranja
    O: 0xFFFF00, // Amarillo
    S: 0x00FF00, // Verde
    T: 0x800080, // Morado
    Z: 0xFF0000  // Rojo
  };

  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]]
  };

  class TetrisScene extends Phaser.Scene {
    constructor() { super('TetrisScene'); }

    create() {
      this.cameras.main.setBackgroundColor('#1a1a2e');
      
      this.board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
      this.triviaActive = false;
      this.gameEnded = false;
      
      this.dropTimer = 0;
      this.dropInterval = 800; // ms por caída
      this.linesClearedTotal = 0;

      // Calcular offset para centrar tablero
      this.boardOffsetX = (W - COLS * BLOCK_SIZE) / 2;
      this.boardOffsetY = (H - ROWS * BLOCK_SIZE) / 2;

      this.graphics = this.add.graphics();
      this.drawBackground();

      this.setupControls();
      this.spawnPiece();

      // Audio
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    drawBackground() {
      // Marco del tablero
      this.graphics.lineStyle(4, 0x4a4e69);
      this.graphics.strokeRect(this.boardOffsetX - 2, this.boardOffsetY - 2, COLS * BLOCK_SIZE + 4, ROWS * BLOCK_SIZE + 4);
      
      // Fondo tablero
      this.graphics.fillStyle(0x0f0f1a);
      this.graphics.fillRect(this.boardOffsetX, this.boardOffsetY, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      
      // Cuadrícula ligera
      this.graphics.lineStyle(1, 0x22223b, 0.5);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          this.graphics.strokeRect(this.boardOffsetX + c * BLOCK_SIZE, this.boardOffsetY + r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
    }

    spawnPiece() {
      const keys = Object.keys(SHAPES);
      const key = keys[Math.floor(Math.random() * keys.length)];
      
      this.currentPiece = {
        shape: SHAPES[key].map(row => [...row]),
        color: COLORS[key],
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[key][0].length / 2),
        y: 0
      };

      if (this.checkCollision(0, 0, this.currentPiece.shape)) {
        this.gameOver();
      }
    }

    checkCollision(offsetX, offsetY, shape) {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] === 0) continue;
          
          let newX = this.currentPiece.x + c + offsetX;
          let newY = this.currentPiece.y + r + offsetY;
          
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true; // Paredes y suelo
          if (newY >= 0 && this.board[newY][newX] !== 0) return true; // Colisión con bloques
        }
      }
      return false;
    }

    rotate() {
      const shape = this.currentPiece.shape;
      const N = shape.length;
      let newShape = Array.from({length: N}, () => Array(N).fill(0));
      
      // Transponer y revertir filas (Rotación 90 grados)
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          newShape[c][N - 1 - r] = shape[r][c];
        }
      }

      // Evitar rotar contra pared
      if (!this.checkCollision(0, 0, newShape)) {
        this.currentPiece.shape = newShape;
        this.playTone(300, 'square', 0.05);
      } else {
        // Simple wall kick (mover a un lado si choca al rotar)
        if (!this.checkCollision(-1, 0, newShape)) {
          this.currentPiece.shape = newShape;
          this.currentPiece.x -= 1;
          this.playTone(300, 'square', 0.05);
        } else if (!this.checkCollision(1, 0, newShape)) {
          this.currentPiece.shape = newShape;
          this.currentPiece.x += 1;
          this.playTone(300, 'square', 0.05);
        }
      }
    }

    lockPiece() {
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c] !== 0) {
            let by = this.currentPiece.y + r;
            let bx = this.currentPiece.x + c;
            if (by >= 0 && by < ROWS) {
              this.board[by][bx] = this.currentPiece.color;
            }
          }
        }
      }
      this.playTone(150, 'square', 0.1);
      this.checkLines();
    }

    checkLines() {
      let linesToClear = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.board[r].every(cell => cell !== 0)) {
          linesToClear.push(r);
        }
      }

      if (linesToClear.length > 0) {
        this.triviaActive = true;
        
        // Destello visual en líneas
        this.graphics.fillStyle(0xFFFFFF, 0.5);
        linesToClear.forEach(r => {
          this.graphics.fillRect(this.boardOffsetX, this.boardOffsetY + r * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
        });

        // Lanzar trivia
        onTriviaRequest((isCorrect) => {
          this.triviaActive = false;
          
          if (isCorrect) {
            this.playTone(880, 'sine', 0.3);
            gameState.score += linesToClear.length * 100 * linesToClear.length; // Multiplicador por combo
          } else {
            this.playTone(150, 'sawtooth', 0.4);
            gameState.score += linesToClear.length * 10;
          }

          // Eliminar las líneas
          linesToClear.sort((a,b) => b-a).forEach(r => {
            this.board.splice(r, 1);
            this.board.unshift(Array(COLS).fill(0));
          });
          
          this.linesClearedTotal += linesToClear.length;
          this.dropInterval = Math.max(100, 800 - (this.linesClearedTotal * 20)); // Aumentar dificultad

          const el = document.getElementById('hud-score');
          if (el) el.textContent = gameState.score;

          if (gameState.questionIndex >= 10) {
             this.gameOver(true);
          } else {
             this.spawnPiece();
          }
        });
      } else {
        this.spawnPiece();
      }
    }

    gameOver(win = false) {
      this.gameEnded = true;
      if (win) {
         this.playTone(660, 'sine', 0.5);
      } else {
         this.playTone(150, 'sawtooth', 0.8);
      }
      this.time.delayedCall(1000, onGameComplete);
    }

    setupControls() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE
      });

      this.input.keyboard.on('keydown-UP', () => { if (!this.triviaActive && !this.gameEnded) this.rotate(); });
      this.input.keyboard.on('keydown-W', () => { if (!this.triviaActive && !this.gameEnded) this.rotate(); });
      
      this.input.keyboard.on('keydown-SPACE', () => {
        if (this.triviaActive || this.gameEnded) return;
        while (!this.checkCollision(0, 1, this.currentPiece.shape)) {
          this.currentPiece.y++;
        }
        this.lockPiece();
      });
    }

    playTone(freq, type, duration, gain = 0.1) {
      if (window.appMuted || !this.audioCtx) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gainNode.gain.setValueAtTime(gain, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) {}
    }

    update(time, delta) {
      if (this.triviaActive || this.gameEnded) return;

      // Handle Inputs with debounce
      const left = this.cursors.left.isDown || this.wasd.left.isDown || this.touchLeft;
      const right = this.cursors.right.isDown || this.wasd.right.isDown || this.touchRight;
      const down = this.cursors.down.isDown || this.wasd.down.isDown || this.touchDown;

      if (!this.lastMoveTime) this.lastMoveTime = 0;
      if (time - this.lastMoveTime > 120) {
        if (left && !this.checkCollision(-1, 0, this.currentPiece.shape)) {
          this.currentPiece.x--;
          this.lastMoveTime = time;
          this.playTone(400, 'square', 0.02, 0.05);
        } else if (right && !this.checkCollision(1, 0, this.currentPiece.shape)) {
          this.currentPiece.x++;
          this.lastMoveTime = time;
          this.playTone(400, 'square', 0.02, 0.05);
        }
      }

      this.dropTimer += delta;
      const currentInterval = down ? 50 : this.dropInterval; // Caída rápida si se pulsa Abajo
      
      if (this.dropTimer > currentInterval) {
        if (!this.checkCollision(0, 1, this.currentPiece.shape)) {
          this.currentPiece.y++;
        } else {
          this.lockPiece();
        }
        this.dropTimer = 0;
      }

      this.render();
    }

    render() {
      // Limpiar y dibujar fondo base de nuevo
      this.graphics.clear();
      this.drawBackground();

      const drawBlock = (x, y, color) => {
        const px = this.boardOffsetX + x * BLOCK_SIZE;
        const py = this.boardOffsetY + y * BLOCK_SIZE;
        
        // Bloque central
        this.graphics.fillStyle(color);
        this.graphics.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
        
        // Brillo superior e izquierdo
        this.graphics.fillStyle(0xFFFFFF, 0.3);
        this.graphics.fillRect(px, py, BLOCK_SIZE, 3);
        this.graphics.fillRect(px, py, 3, BLOCK_SIZE);
        
        // Sombra inferior y derecha
        this.graphics.fillStyle(0x000000, 0.3);
        this.graphics.fillRect(px, py + BLOCK_SIZE - 3, BLOCK_SIZE, 3);
        this.graphics.fillRect(px + BLOCK_SIZE - 3, py, 3, BLOCK_SIZE);
      };

      // Dibujar Tablero Estático
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.board[r][c] !== 0) {
            drawBlock(c, r, this.board[r][c]);
          }
        }
      }

      // Dibujar Pieza Actual
      if (this.currentPiece && !this.triviaActive) {
        for (let r = 0; r < this.currentPiece.shape.length; r++) {
          for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
            if (this.currentPiece.shape[r][c] !== 0) {
              drawBlock(this.currentPiece.x + c, this.currentPiece.y + r, this.currentPiece.color);
            }
          }
        }
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'phaser-container',
    backgroundColor: '#1a1a2e',
    scene: [TetrisScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.NO_CENTER
    }
  });

  addTouchControls(game);
  return game;
}

function addTouchControls(game) {
  const container = document.getElementById('phaser-container');
  let tc = document.getElementById('touch-controls-m3');
  if (tc) tc.remove();
  
  tc = document.createElement('div');
  tc.id = 'touch-controls-m3';
  tc.style.cssText = `
    position:absolute;bottom:20px;left:0;right:0;
    display:flex;justify-content:space-between;align-items:center;padding:0 30px;
    pointer-events:none;z-index:900;
  `;
  tc.innerHTML = `
    <div style="display:flex;gap:10px;pointer-events:all;">
      <button id="tc-left" class="touch-btn" style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.2);backdrop-filter:blur(4px);">◀</button>
      <button id="tc-down" class="touch-btn" style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.2);backdrop-filter:blur(4px);">▼</button>
      <button id="tc-right" class="touch-btn" style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.2);backdrop-filter:blur(4px);">▶</button>
    </div>
    <div style="display:flex;gap:10px;pointer-events:all;">
      <button id="tc-rotate" class="touch-btn" style="width:60px;height:60px;border-radius:50%;background:rgba(124,58,237,0.4);backdrop-filter:blur(4px);">↻</button>
      <button id="tc-drop" class="touch-btn" style="width:60px;height:60px;border-radius:50%;background:rgba(230,57,70,0.4);backdrop-filter:blur(4px);">⇓</button>
    </div>
  `;
  container.style.position = 'relative';
  container.appendChild(tc);

  const getScene = () => game.scene.scenes[0];

  const setTouch = (id, prop, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); const s = getScene(); if (s) s[prop] = val; });
    el.addEventListener('touchend', e => { e.preventDefault(); const s = getScene(); if (s) s[prop] = false; });
  };

  setTouch('tc-left', 'touchLeft', true);
  setTouch('tc-right', 'touchRight', true);
  setTouch('tc-down', 'touchDown', true);
  
  const rotBtn = document.getElementById('tc-rotate');
  if (rotBtn) rotBtn.addEventListener('touchstart', e => { e.preventDefault(); const s = getScene(); if (s && !s.triviaActive) s.rotate(); });
  
  const dropBtn = document.getElementById('tc-drop');
  if (dropBtn) dropBtn.addEventListener('touchstart', e => { 
    e.preventDefault(); 
    const s = getScene();
    if (s && !s.triviaActive && !s.gameEnded) {
       while (!s.checkCollision(0, 1, s.currentPiece.shape)) s.currentPiece.y++;
       s.lockPiece();
    }
  });
}
