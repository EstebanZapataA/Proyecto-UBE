import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, W = 700, H = 480) {
  const container = document.getElementById('phaser-container');

  class BasketballScene extends Phaser.Scene {
    constructor() { super('BasketballScene'); }

    create() {
      this.cameras.main.setBackgroundColor('#cbd5e1'); // Pared del gimnasio
      this.generateTextures();
      
      this.triviaActive = false;
      this.gameEnded = false;
      this.state = 'AIM_X'; // AIM_X, AIM_Y, TRIVIA, SHOOTING, RESULT
      this.scoreBaskets = 0;
      this.attempts = 0;
      
      this.drawCrowd();
      this.drawCourt();
      
      // Partículas para encestar
      this.emitter = this.add.particles(0, 0, 'star', {
        speed: { min: 100, max: 400 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        emitting: false,
        lifespan: 1000,
        gravityY: 300
      });

      // Jugador
      this.player = this.add.sprite(W/2, H - 40, 'player');
      this.player.setScale(1.5);
      
      // Animación idle del jugador
      this.tweens.add({
        targets: this.player,
        scaleY: 1.55,
        duration: 500,
        yoyo: true,
        repeat: -1
      });

      // Balón
      this.ball = this.add.sprite(W/2, H - 80, 'basketball');
      this.ball.setScale(1.5);
      this.ballStartX = W/2;
      this.ballStartY = H - 80;
      
      // Mira (Target)
      this.target = this.add.graphics();
      // Borde exterior negro para contraste
      this.target.lineStyle(4, 0x000000, 1);
      this.target.strokeCircle(0, 0, 15);
      this.target.lineBetween(-20, 0, 20, 0);
      this.target.lineBetween(0, -20, 0, 20);
      // Relleno interior naranja
      this.target.lineStyle(2, 0xf97316, 1);
      this.target.strokeCircle(0, 0, 15);
      this.target.lineBetween(-18, 0, 18, 0);
      this.target.lineBetween(0, -18, 0, 18);
      
      this.targetX = W/2;
      this.targetY = H/2 - 100;
      this.target.setPosition(this.targetX, this.targetY);
      
      // Animación palpitante para la mira
      this.tweens.add({
        targets: this.target,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 350,
        yoyo: true,
        repeat: -1
      });
      
      // Variables de movimiento de mira
      this.aimDir = 1;
      this.aimSpeed = 350; // px/sec
      
      this.setupControls();

      // Audio
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    generateTextures() {
      // Balón de básquet
      const gb = this.add.graphics();
      gb.fillStyle(0xf97316); // Naranja
      gb.fillCircle(16, 16, 16);
      gb.lineStyle(2, 0x000000, 0.8);
      gb.strokeCircle(16, 16, 16);
      gb.beginPath();
      gb.moveTo(16, 0); gb.lineTo(16, 32); // vertical
      gb.moveTo(0, 16); gb.lineTo(32, 16); // horizontal
      gb.strokePath();
      gb.generateTexture('basketball', 32, 32);
      gb.destroy();

      // Jugador (Tirador)
      const p = this.add.graphics();
      // Cabeza
      p.fillStyle(0xFFCC99);
      p.fillCircle(20, 10, 10);
      // Cuerpo (Camiseta)
      p.fillStyle(0x3b82f6); // azul
      p.fillRect(10, 20, 20, 30);
      // Pantalón
      p.fillStyle(0xffffff);
      p.fillRect(10, 50, 20, 15);
      // Zapatos
      p.fillStyle(0x000000);
      p.fillRect(8, 65, 10, 5);
      p.fillRect(22, 65, 10, 5);
      // Brazos
      p.fillStyle(0xFFCC99);
      p.fillRect(0, 25, 10, 15);
      p.fillRect(30, 25, 10, 15);
      p.generateTexture('player', 40, 70);
      p.destroy();

      // Estrella para partículas
      const gs = this.add.graphics();
      gs.fillStyle(0xffd700);
      gs.fillRect(0, 0, 8, 8);
      gs.generateTexture('star', 8, 8);
      gs.destroy();
    }

    drawCrowd() {
      this.crowdContainer = this.add.container(0, 0);
      const cg = this.add.graphics();
      
      // Gradas
      cg.fillStyle(0x334155);
      cg.fillRect(0, 20, W, H - 220);
      
      // Espectadores
      const colors = [0xf87171, 0x60a5fa, 0x34d399, 0xfbbf24, 0xa78bfa];
      for(let y = 30; y < H - 200; y += 20) {
        for(let x = 10; x < W; x += 15) {
          if (Math.random() > 0.4) {
            cg.fillStyle(colors[Math.floor(Math.random() * colors.length)]);
            cg.fillCircle(x + Math.random()*5, y + Math.random()*5, 6);
          }
        }
      }
      this.crowdContainer.add(cg);

      const flagText = this.add.text(W/2, 20, "GO TEAM!", {
        fontFamily: 'Orbitron', fontSize: '24px', color: '#fff', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.crowdContainer.add(flagText);
    }

    drawCourt() {
      const g = this.add.graphics();
      
      // Piso de madera
      g.fillStyle(0xd97706);
      g.fillRect(0, H - 200, W, 200);
      
      // Líneas de la cancha (blancas)
      g.lineStyle(4, 0xffffff, 0.8);
      // Llave
      g.strokeRect(W/2 - 80, H - 200, 160, 200);
      // Círculo de tiro libre (círculo completo en vez de arc para evitar errores de API)
      g.strokeCircle(W/2, H - 200, 60);

      // Tablero (Backboard)
      const boardW = 140;
      const boardH = 90;
      const boardX = W/2 - boardW/2;
      const boardY = H - 380;
      
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(boardX, boardY, boardW, boardH);
      g.lineStyle(4, 0xef4444); // Borde rojo
      g.strokeRect(boardX, boardY, boardW, boardH);
      
      // Cuadro interior del tablero
      g.strokeRect(W/2 - 25, boardY + 40, 50, 40);
      
      // Soporte del tablero
      g.lineStyle(8, 0x64748b);
      g.beginPath();
      g.moveTo(W/2, boardY + boardH);
      g.lineTo(W/2, H - 200);
      g.strokePath();

      // Aro
      g.lineStyle(6, 0xf97316); // Naranja oscuro / Rojo
      g.beginPath();
      g.moveTo(W/2 - 25, boardY + 80);
      g.lineTo(W/2 + 25, boardY + 80);
      g.strokePath();
      
      // Malla del aro
      g.lineStyle(2, 0xffffff, 0.6);
      for(let i=0; i<=50; i+=10) {
        g.beginPath();
        g.moveTo(W/2 - 25 + i, boardY + 80);
        g.lineTo(W/2 - 15 + i*0.6, boardY + 110);
        g.strokePath();
      }
    }

    setupControls() {
      this.input.keyboard.on('keydown-SPACE', this.handleAction, this);
      this.input.on('pointerdown', this.handleAction, this);
    }

    handleAction() {
      if (this.triviaActive || this.gameEnded) return;

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.state === 'AIM_X') {
        this.state = 'AIM_Y';
        this.playTone(400, 'square', 0.1);
      } else if (this.state === 'AIM_Y') {
        this.state = 'TRIVIA';
        this.playTone(500, 'square', 0.1);
        this.target.setAlpha(0); // Ocultar mira
        
        this.triviaActive = true;
        onTriviaRequest((isCorrect) => {
          this.triviaActive = false;
          this.state = 'SHOOTING';
          this.executeShoot(isCorrect);
        });
      }
    }

    executeShoot(isCorrect) {
      this.playTone(200, 'square', 0.2, 0.5); // Sonido de bote/lanzamiento
      
      let finalX = this.targetX;
      let finalY = this.targetY;
      let duration = 800;
      let spin = 720;

      // Animación del jugador saltando
      this.tweens.add({
        targets: this.player,
        y: this.player.y - 40,
        scaleY: 1.7,
        duration: 300,
        yoyo: true,
        ease: 'Quad.easeOut'
      });

      if (!isCorrect) {
        // Falla: tiro corto o desviado
        finalX = (this.targetX > W/2) ? W/2 + 100 : W/2 - 100;
        finalY = H - 150; 
        
        // Sonido de fallo
        this.playTone(300, 'sawtooth', 0.2);
        this.time.delayedCall(200, () => this.playTone(250, 'sawtooth', 0.3));
        this.time.delayedCall(500, () => this.playTone(200, 'sawtooth', 0.5));
      } else {
        // Acierto
        // Sonido de tiro bueno (ascendente)
        this.playTone(500, 'sine', 0.1);
        this.time.delayedCall(150, () => this.playTone(700, 'sine', 0.1));
      }

      // Animación parabólica del balón usando un arco (ease Sine.easeOut y luego quad o cubic)
      // Primero sube y avanza
      this.tweens.add({
        targets: this.ball,
        x: finalX,
        y: finalY,
        scaleX: 0.6,
        scaleY: 0.6,
        angle: spin,
        duration: duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!isCorrect) {
             // Rebote si falla
             this.tweens.add({
               targets: this.ball,
               y: H - 50,
               duration: 400,
               ease: 'Bounce.easeOut',
               onComplete: () => this.checkBasket(finalX, finalY, isCorrect)
             });
          } else {
             // Entra limpio por la malla
             this.tweens.add({
               targets: this.ball,
               y: finalY + 40,
               duration: 200,
               ease: 'Linear',
               onComplete: () => this.checkBasket(finalX, finalY, isCorrect)
             });
          }
        }
      });
    }

    celebrateBasket() {
      this.emitter.setPosition(this.targetX, this.targetY);
      this.emitter.explode(40);
      
      this.tweens.add({
        targets: this.crowdContainer,
        y: -15,
        duration: 150,
        yoyo: true,
        repeat: 5
      });

      this.playTone(400, 'square', 0.1, 0.2);
      this.time.delayedCall(100, () => this.playTone(600, 'square', 0.1, 0.2));
      this.time.delayedCall(200, () => this.playTone(800, 'square', 0.5, 0.4));
      
      const t = this.add.text(W/2, H/2 - 50, "¡CANASTA!", {
        fontFamily: 'Orbitron', fontSize: '80px', color: '#f97316',
        stroke: '#ffffff', strokeThickness: 10, fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0).setScale(0);

      this.tweens.add({
        targets: t,
        alpha: 1, scale: 1.2,
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: t, scale: 1, duration: 200, yoyo: true, repeat: 3,
            onComplete: () => t.destroy()
          });
        }
      });
    }

    checkBasket(x, y, isCorrect) {
      const boardY = H - 380;
      const hoopX1 = W/2 - 25;
      const hoopX2 = W/2 + 25;
      const hoopY = boardY + 80;

      let basket = false;
      if (isCorrect) {
        // Lógica de enceste
        if (x >= hoopX1 - 20 && x <= hoopX2 + 20 && y >= hoopY - 30 && y <= hoopY + 30) {
          basket = true;
        }
      }

      this.attempts++;

      if (basket) {
        this.scoreBaskets++;
        gameState.score += 500;
        this.celebrateBasket();
        
        const el = document.getElementById('hud-score');
        if (el) el.textContent = gameState.score;
      } else {
        this.playTone(150, 'sawtooth', 0.6);
        this.showFeedback(isCorrect ? "¡FALLÓ!" : "¡TABLERO!", 0xff0000);
      }

      if (gameState.questionIndex >= 10 || this.attempts >= 10) {
        this.gameEnded = true;
        this.time.delayedCall(2000, onGameComplete);
      } else {
        this.time.delayedCall(2000, () => this.resetTurn());
      }
    }

    showFeedback(text, color) {
      const t = this.add.text(W/2, H/2 - 100, text, {
        fontFamily: 'Orbitron', fontSize: '48px', color: '#fff',
        stroke: '#000', strokeThickness: 6, fontStyle: 'bold'
      }).setOrigin(0.5);
      t.setTint(color);
      
      this.tweens.add({
        targets: t,
        scaleX: 1.2, scaleY: 1.2,
        duration: 300, yoyo: true, repeat: 1,
        onComplete: () => t.destroy()
      });
    }

    resetTurn() {
      this.state = 'AIM_X';
      this.ball.setPosition(this.ballStartX, this.ballStartY);
      this.ball.setScale(1.5);
      this.ball.setAngle(0);
      
      this.player.setPosition(W/2, H - 40);
      
      this.target.setAlpha(1);
      this.targetX = W/2;
      this.targetY = H/2 - 100;
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

      const boardY = H - 380;
      const hoopX1 = W/2 - 40;
      const hoopX2 = W/2 + 40;
      const hoopY = boardY + 80;

      if (this.state === 'AIM_X') {
        this.targetX += this.aimSpeed * this.aimDir * (delta / 1000);
        // Rango de la mira horizontal
        if (this.targetX > hoopX2 + 80) this.aimDir = -1;
        if (this.targetX < hoopX1 - 80) this.aimDir = 1;
        this.target.setX(this.targetX);
      } else if (this.state === 'AIM_Y') {
        this.targetY += this.aimSpeed * this.aimDir * (delta / 1000);
        // Rango de la mira vertical
        if (this.targetY > hoopY + 80) this.aimDir = -1;
        if (this.targetY < hoopY - 80) this.aimDir = 1;
        this.target.setY(this.targetY);
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'phaser-container',
    backgroundColor: '#cbd5e1',
    scene: [BasketballScene],
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
  let tc = document.getElementById('touch-controls-m9');
  if (tc) tc.remove();
  
  tc = document.createElement('div');
  tc.id = 'touch-controls-m9';
  tc.style.cssText = `
    position:absolute;bottom:20px;right:20px;
    display:flex;justify-content:flex-end;
    pointer-events:none;z-index:900;
  `;
  tc.innerHTML = `
    <button id="tc-shoot" class="touch-btn" style="width:80px;height:80px;border-radius:50%;background:rgba(249,115,22,0.6);pointer-events:all;backdrop-filter:blur(4px);font-size:1.5rem;color:white;">🏀</button>
  `;
  container.style.position = 'relative';
  container.appendChild(tc);

  const getScene = () => game.scene.scenes[0];
  const shootBtn = document.getElementById('tc-shoot');
  if (shootBtn) {
    shootBtn.addEventListener('mousedown', () => { const s = getScene(); if (s) s.handleAction(); });
    shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); const s = getScene(); if (s) s.handleAction(); });
  }
}
