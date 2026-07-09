import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, W = 720, H = 480) {
  const container = document.getElementById('phaser-container');

  const MAP = [
    "1111111111111111111111111111",
    "1322222222221111222222222231",
    "1211112111111111111121111211",
    "1211112111111111111121111211",
    "1211112111111111111121111211",
    "1222222222222222222222222221",
    "1211112112111111112112111121",
    "1311112112111111112112111131",
    "1222222112222112222112222221",
    "1111112111110110111112111111",
    "0000012111110110111112100000",
    "0000012110000000000112100000",
    "0000013110111441110113100000",
    "1111112110100000010112111111",
    "0000002000100000010002000000",
    "1111112110100000010112111111",
    "0000013110111111110113100000",
    "0000012110000000000112100000",
    "0000012110111111110112100000",
    "1111112110111111110112111111",
    "1222222222221111222222222221",
    "1211112111111111111121111211",
    "1322112222220000222222112231",
    "1112112112111111112112112111",
    "1112112112111111112112112111",
    "1222222112222112222112222221",
    "1211111111112112111111111121",
    "1211111111112112111111111121",
    "1222222222222222222222222221",
    "1111111111111111111111111111"
  ];
  const TS = 16; // Tile size
  const PAC_SPEED = 90;
  const GHOST_SPEED = 80;

  class PacScene extends Phaser.Scene {
    constructor() { super('PacScene'); }

    create() {
      this.generateTextures();
      this.cameras.main.setBackgroundColor('#000000');
      
      this.triviaActive = false;
      this.gameEnded = false;
      this.scaredMode = false;
      this.scaredTimer = null;
      
      this.walls = this.physics.add.staticGroup();
      this.dots = this.physics.add.staticGroup();
      this.powers = this.physics.add.staticGroup();
      this.ghostsGroup = this.physics.add.group();

      this.buildMaze();
      this.createPlayer();
      this.createGhosts();
      this.setupControls();
      
      // Colisiones
      this.physics.add.collider(this.player, this.walls);
      this.physics.add.collider(this.ghostsGroup, this.walls);
      this.physics.add.overlap(this.player, this.dots, this.eatDot, null, this);
      this.physics.add.overlap(this.player, this.powers, this.eatPower, null, this);
      this.physics.add.overlap(this.player, this.ghostsGroup, this.hitGhost, null, this);

      // Audio
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Auto-escala para centrar el laberinto
      const mazeW = 28 * TS;
      const mazeH = 30 * TS;
      const zoom = Math.min(W / mazeW, H / mazeH) * 0.95;
      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(mazeW / 2, mazeH / 2);
    }

    generateTextures() {
      // Wall (Blue Neon)
      let g = this.add.graphics();
      g.fillStyle(0x000000);
      g.fillRect(0, 0, TS, TS);
      g.lineStyle(2, 0x1919A6);
      g.strokeRect(1, 1, TS-2, TS-2);
      g.generateTexture('wall', TS, TS);
      g.destroy();

      // Dot
      g = this.add.graphics();
      g.fillStyle(0xFFB8AE);
      g.fillRect(6, 6, 4, 4);
      g.generateTexture('dot', TS, TS);
      g.destroy();

      // Power Pellet
      g = this.add.graphics();
      g.fillStyle(0xFFB8AE);
      g.fillCircle(8, 8, 6);
      g.generateTexture('power', TS, TS);
      g.destroy();

      // Pac-Man
      g = this.add.graphics();
      g.fillStyle(0xFFFF00);
      g.fillCircle(10, 10, 10);
      g.generateTexture('pac_closed', 20, 20);
      g.clear();
      g.fillStyle(0xFFFF00);
      g.beginPath();
      g.arc(10, 10, 10, 0.2 * Math.PI, 1.8 * Math.PI, false);
      g.lineTo(10, 10);
      g.fill();
      g.generateTexture('pac_open', 20, 20);
      g.destroy();

      // Fantasma Base (Helper para dibujar)
      const drawGhost = (key, color) => {
        g = this.add.graphics();
        g.fillStyle(color);
        g.beginPath();
        g.arc(10, 10, 10, Math.PI, 0, false);
        g.lineTo(20, 20);
        // Tentáculos
        g.lineTo(16, 17); g.lineTo(13, 20); g.lineTo(10, 17);
        g.lineTo(7, 20); g.lineTo(4, 17); g.lineTo(0, 20);
        g.fill();
        // Ojos
        g.fillStyle(0xFFFFFF);
        g.fillEllipse(6, 8, 4, 6);
        g.fillEllipse(14, 8, 4, 6);
        // Pupilas
        g.fillStyle(0x0000FF);
        g.fillCircle(6, 9, 1.5);
        g.fillCircle(14, 9, 1.5);
        g.generateTexture(key, 20, 20);
        g.destroy();
      };

      drawGhost('ghost_red', 0xFF0000);   // Blinky
      drawGhost('ghost_pink', 0xFFB8FF);  // Pinky
      drawGhost('ghost_cyan', 0x00FFFF);  // Inky
      drawGhost('ghost_orange', 0xFFB852); // Clyde
      drawGhost('ghost_blue', 0x2121DE);  // Scared

      // Animaciones
      this.anims.create({
        key: 'pac_chomp',
        frames: [{ key: 'pac_open' }, { key: 'pac_closed' }],
        frameRate: 10,
        repeat: -1
      });
    }

    buildMaze() {
      this.totalDots = 0;
      for (let y = 0; y < MAP.length; y++) {
        for (let x = 0; x < MAP[y].length; x++) {
          const char = MAP[y][x];
          const px = x * TS + TS/2;
          const py = y * TS + TS/2;

          if (char === '1') {
            this.walls.create(px, py, 'wall');
          } else if (char === '2') {
            this.dots.create(px, py, 'dot');
            this.totalDots++;
          } else if (char === '3') {
            const p = this.powers.create(px, py, 'power');
            this.tweens.add({ targets: p, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
          }
        }
      }
    }

    createPlayer() {
      // Pacman empieza en fila 22, col 14 (14 * TS + TS/2 x, 22 * TS + TS/2 y)
      this.player = this.physics.add.sprite(14 * TS + TS/2, 22 * TS + TS/2, 'pac_closed');
      this.player.setSize(10, 10);
      this.player.play('pac_chomp');
      this.queuedDir = Phaser.Math.Vector2.ZERO;
      this.currentDir = Phaser.Math.Vector2.ZERO;
    }

    createGhosts() {
      const gData = [
        { key: 'ghost_red', x: 14, y: 11 },
        { key: 'ghost_pink', x: 14, y: 14 },
        { key: 'ghost_cyan', x: 12, y: 14 },
        { key: 'ghost_orange', x: 16, y: 14 }
      ];

      gData.forEach(d => {
        const g = this.ghostsGroup.create(d.x * TS + TS/2, d.y * TS + TS/2, d.key);
        g.baseKey = d.key;
        g.setSize(12, 12);
        g.setBounce(1);
        // Darles una dirección inicial aleatoria (solo X o Y)
        const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
        const dir = dirs[Phaser.Math.Between(0, 3)];
        g.setVelocity(dir[0] * GHOST_SPEED, dir[1] * GHOST_SPEED);
      });
    }

    setupControls() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        down: Phaser.Input.Keyboard.KeyCodes.S
      });
    }

    playTone(freq, type, duration, gain = 0.1) {
      if (window.appMuted || !this.audioCtx) return; if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
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

    eatDot(player, dot) {
      dot.destroy();
      this.playTone(400, 'square', 0.05, 0.05);
      this.totalDots--;
      gameState.score += 10;
      const el = document.getElementById('hud-score');
      if (el) el.textContent = gameState.score;
      if (this.totalDots <= 0) {
        this.gameEnded = true;
        this.playTone(660, 'sine', 0.5);
        this.time.delayedCall(1000, onGameComplete);
      }
    }

    eatPower(player, power) {
      if (this.triviaActive || this.gameEnded) return;
      power.destroy();
      this.playTone(800, 'sine', 0.2);
      this.triviaActive = true;
      this.physics.pause();
      
      onTriviaRequest((isCorrect) => {
        this.triviaActive = false;
        
        if (isCorrect) {
          this.playTone(880, 'sine', 0.3);
          this.playTone(1100, 'sine', 0.2);
          this.scaredMode = true;
          this.ghostsGroup.getChildren().forEach(g => {
            g.setTexture('ghost_blue');
          });
          if (this.scaredTimer) this.scaredTimer.remove();
          this.scaredTimer = this.time.delayedCall(10000, () => {
            this.scaredMode = false;
            this.ghostsGroup.getChildren().forEach(g => {
              g.setTexture(g.baseKey);
            });
          });
        } else {
          this.playTone(150, 'sawtooth', 0.4);
        }

        this.physics.resume();
        if (gameState.questionIndex >= 10) {
          this.gameEnded = true;
          this.time.delayedCall(500, onGameComplete);
        }
      });
    }

    activateScaredMode() {
      this.scaredMode = true;
      this.ghostsGroup.children.iterate(g => {
        g.setTexture('ghost_blue');
        // Reducir velocidad
        g.body.velocity.x *= 0.6;
        g.body.velocity.y *= 0.6;
      });

      if (this.scaredTimer) this.scaredTimer.remove();
      this.scaredTimer = this.time.delayedCall(7000, () => {
        this.scaredMode = false;
        this.ghostsGroup.children.iterate(g => {
          g.setTexture(g.baseKey);
          // Restaurar velocidad
          g.body.velocity.x = Math.sign(g.body.velocity.x) * GHOST_SPEED;
          g.body.velocity.y = Math.sign(g.body.velocity.y) * GHOST_SPEED;
        });
      });
    }

    hitGhost(player, ghost) {
      if (this.gameEnded || this.triviaActive) return;
      
      if (this.scaredMode) {
        this.playTone(800, 'square', 0.1, 0.3);
        ghost.setPosition(14 * TS + TS/2, 14 * TS + TS/2);
        ghost.setTexture(ghost.baseKey);
        gameState.score += 50;
      } else {
        this.playTone(150, 'sawtooth', 0.5);
        this.player.setTint(0xff0000);
        this.physics.pause();
        this.time.delayedCall(1000, () => {
          this.player.setPosition(14 * TS + TS/2, 22 * TS + TS/2);
          this.player.setScale(1);
          this.player.setAngle(0);
          this.player.clearTint();
          this.queuedDir = Phaser.Math.Vector2.ZERO;
          this.player.setVelocity(0, 0);
          this.gameEnded = false;
          this.physics.resume();
        });
      }
    }

    update() {
      if (this.gameEnded || this.triviaActive) return;

      // Teletransporte de túneles
      if (this.player.x < 0) this.player.x = 28 * TS;
      if (this.player.x > 28 * TS) this.player.x = 0;

      // Determinar entrada
      let dirX = 0, dirY = 0;
      if (this.cursors.left.isDown || this.wasd.left.isDown || this.touchLeft) dirX = -1;
      else if (this.cursors.right.isDown || this.wasd.right.isDown || this.touchRight) dirX = 1;
      else if (this.cursors.up.isDown || this.wasd.up.isDown || this.touchUp) dirY = -1;
      else if (this.cursors.down.isDown || this.wasd.down.isDown || this.touchDown) dirY = 1;

      if (dirX !== 0 || dirY !== 0) {
        this.queuedDir = new Phaser.Math.Vector2(dirX, dirY);
      }

      // Lógica de movimiento por cuadrícula (simplificada para arcade)
      // Rotar sprites según movimiento
      if (this.player.body.velocity.x > 0) this.player.setAngle(0);
      else if (this.player.body.velocity.x < 0) this.player.setAngle(180);
      else if (this.player.body.velocity.y > 0) this.player.setAngle(90);
      else if (this.player.body.velocity.y < 0) this.player.setAngle(-90);

      // Si la dirección solicitada es opuesta, girar inmediatamente
      if (this.queuedDir.x !== 0 && this.queuedDir.x === -Math.sign(this.player.body.velocity.x)) {
        this.player.setVelocity(this.queuedDir.x * PAC_SPEED, 0);
      } else if (this.queuedDir.y !== 0 && this.queuedDir.y === -Math.sign(this.player.body.velocity.y)) {
        this.player.setVelocity(0, this.queuedDir.y * PAC_SPEED);
      }
      
      // Aplicar movimiento cuando está alineado a la grilla o detenido
      // Aumentado el margen de alineación a 4 píxeles para mayor respuesta en giros
      const isAlignedX = Math.abs((this.player.x - TS/2) % TS) < 4;
      const isAlignedY = Math.abs((this.player.y - TS/2) % TS) < 4;
      const isStopped = this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0;

      if ((isAlignedX && isAlignedY) || isStopped) {
        if (isStopped) {
          // Snap to grid when stopped to prevent getting stuck
          this.player.x = Math.round((this.player.x - TS/2)/TS)*TS + TS/2;
          this.player.y = Math.round((this.player.y - TS/2)/TS)*TS + TS/2;
        }

        if (this.queuedDir.x !== 0) {
          this.player.setVelocity(this.queuedDir.x * PAC_SPEED, 0);
          this.player.y = Math.round((this.player.y - TS/2)/TS)*TS + TS/2;
        } else if (this.queuedDir.y !== 0) {
          this.player.setVelocity(0, this.queuedDir.y * PAC_SPEED);
          this.player.x = Math.round((this.player.x - TS/2)/TS)*TS + TS/2;
        }
      }

      // Mantener al jugador en movimiento si no hay input
      if (this.player.body.velocity.length() === 0) {
        this.player.anims.stop();
      } else {
        if (!this.player.anims.isPlaying) this.player.play('pac_chomp');
      }

      // IA básica de fantasmas: Cambiar de dirección al chocar
      this.ghostsGroup.children.iterate(g => {
        if (!g || !g.body) return;
        
        // Túnel fantasmas
        if (g.x < 0) g.x = 28 * TS;
        if (g.x > 28 * TS) g.x = 0;

        if (g.body.velocity.x === 0 && g.body.velocity.y === 0) {
           // Atascado, elegir nueva dirección al azar
           const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
           const dir = dirs[Phaser.Math.Between(0, 3)];
           const speed = this.scaredMode ? GHOST_SPEED * 0.6 : GHOST_SPEED;
           g.setVelocity(dir[0] * speed, dir[1] * speed);
        }
      });
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'phaser-container',
    backgroundColor: '#000000',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [PacScene],
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
  let tc = document.getElementById('touch-controls-m2');
  if (tc) tc.remove();
  
  tc = document.createElement('div');
  tc.id = 'touch-controls-m2';
  tc.style.cssText = `
    position:absolute;bottom:20px;left:0;right:0;
    display:flex;justify-content:center;align-items:center;padding:0 20px;
    pointer-events:none;z-index:900;
  `;
  tc.innerHTML = `
    <div style="display:grid;grid-template-columns:50px 50px 50px;gap:8px;pointer-events:all;background:rgba(0,0,0,0.2);padding:10px;border-radius:50%;backdrop-filter:blur(4px);">
      <div></div>
      <button id="tc-up" class="touch-btn" style="height:50px;border-radius:10px;">▲</button>
      <div></div>
      <button id="tc-left" class="touch-btn" style="height:50px;border-radius:10px;">◀</button>
      <button id="tc-down" class="touch-btn" style="height:50px;border-radius:10px;">▼</button>
      <button id="tc-right" class="touch-btn" style="height:50px;border-radius:10px;">▶</button>
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
    el.addEventListener('mousedown', () => { const s = getScene(); if (s) s[prop] = val; });
    el.addEventListener('mouseup', () => { const s = getScene(); if (s) s[prop] = false; });
    el.addEventListener('mouseleave', () => { const s = getScene(); if (s) s[prop] = false; });
  };

  setTouch('tc-left', 'touchLeft', true);
  setTouch('tc-right', 'touchRight', true);
  setTouch('tc-up', 'touchUp', true);
  setTouch('tc-down', 'touchDown', true);
}
