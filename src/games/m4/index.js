import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, W = 700, H = 480) {
  const container = document.getElementById('phaser-container');

  class PenaltyScene extends Phaser.Scene {
    constructor() { super('PenaltyScene'); }

    create() {
      this.cameras.main.setBackgroundColor('#87CEEB'); // Cielo
      this.generateTextures();
      
      this.triviaActive = false;
      this.gameEnded = false;
      this.state = 'AIM_X'; // AIM_X, AIM_Y, TRIVIA, KICKING, RESULT
      this.scoreGoals = 0;
      this.attempts = 0;
      
      this.drawCrowd();
      this.drawStadium();
      
      // Partículas para el estallido del GOL
      this.emitter = this.add.particles(0, 0, 'ball', {
        speed: { min: 100, max: 400 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        emitting: false,
        lifespan: 1500,
        gravityY: 300
      });

      // Portero
      this.goalie = this.add.sprite(W/2, H - 240, 'goalie');
      this.goalie.setScale(1.5);
      
      // Animación de respiración (idle)
      this.tweens.add({
        targets: this.goalie,
        scaleX: 1.55,
        scaleY: 1.45,
        duration: 600,
        yoyo: true,
        repeat: -1
      });
      
      // Balón
      this.ball = this.add.sprite(W/2, H - 60, 'ball');
      this.ball.setScale(2);
      this.ballStartX = W/2;
      this.ballStartY = H - 60;
      
      // Mira (Target)
      this.target = this.add.graphics();
      // Borde exterior negro para contraste
      this.target.lineStyle(4, 0x000000, 1);
      this.target.strokeCircle(0, 0, 20);
      this.target.lineBetween(-28, 0, 28, 0);
      this.target.lineBetween(0, -28, 0, 28);
      // Relleno interior verde neón brillante
      this.target.lineStyle(2, 0x39FF14, 1);
      this.target.strokeCircle(0, 0, 20);
      this.target.lineBetween(-25, 0, 25, 0);
      this.target.lineBetween(0, -25, 0, 25);
      
      this.targetX = W/2;
      this.targetY = H/2 - 50;
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
      this.targetX = W/2;
      this.targetY = H/2 - 50;
      this.target.setPosition(this.targetX, this.targetY);
      
      // Variables de movimiento de mira
      this.aimDir = 1;
      this.aimSpeed = 300; // px/sec
      
      this.setupControls();

      // Audio
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    generateTextures() {
      // Balón
      const gb = this.add.graphics();
      gb.fillStyle(0xFFFFFF);
      gb.fillCircle(16, 16, 16);
      gb.fillStyle(0x000000);
      gb.fillCircle(16, 16, 6);
      gb.fillCircle(6, 10, 4);
      gb.fillCircle(26, 10, 4);
      gb.fillCircle(10, 24, 4);
      gb.fillCircle(22, 24, 4);
      gb.generateTexture('ball', 32, 32);
      gb.destroy();

      // Portero
      const gg = this.add.graphics();
      // Cuerpo (Camiseta verde neón)
      gg.fillStyle(0x39FF14);
      gg.fillRect(10, 15, 20, 25);
      // Cabeza
      gg.fillStyle(0xFFCC99);
      gg.fillCircle(20, 8, 8);
      // Pantalón (Negro)
      gg.fillStyle(0x000000);
      gg.fillRect(10, 40, 20, 10);
      // Brazos estirables
      gg.fillStyle(0xFFCC99);
      gg.fillRect(0, 15, 10, 8);
      gg.fillRect(30, 15, 10, 8);
      gg.generateTexture('goalie', 40, 60);
      gg.destroy();
    }

    drawCrowd() {
      // Contenedor para animar al público
      this.crowdContainer = this.add.container(0, 0);
      
      const cg = this.add.graphics();
      
      // Gradas grises más oscuras para mayor contraste
      cg.fillStyle(0x222222);
      cg.fillRect(0, 40, W, H - 340);
      
      // Hinchas de Ecuador (Amarillo, Azul, Rojo)
      const colors = [0xFFFF00, 0x0000FF, 0xFF0000];
      for(let y = 50; y < H - 300; y += 15) {
        for(let x = 10; x < W; x += 15) {
          if (Math.random() > 0.3) {
            cg.fillStyle(colors[Math.floor(Math.random() * colors.length)]);
            cg.fillCircle(x + Math.random()*5, y + Math.random()*5, 5);
          }
        }
      }
      this.crowdContainer.add(cg);

      // Bandera de Ecuador "¡SI SE PUEDE!"
      const flagG = this.add.graphics();
      const fx = W/2 - 100;
      const fy = 20;
      flagG.fillStyle(0xFFFF00); flagG.fillRect(fx, fy, 200, 20);
      flagG.fillStyle(0x0000FF); flagG.fillRect(fx, fy+20, 200, 10);
      flagG.fillStyle(0xFF0000); flagG.fillRect(fx, fy+30, 200, 10);
      this.crowdContainer.add(flagG);
      
      const flagText = this.add.text(W/2, 40, "¡SÍ SE PUEDE!", {
        fontFamily: 'Arial', fontSize: '18px', color: '#000', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.crowdContainer.add(flagText);
    }

    drawStadium() {
      const g = this.add.graphics();
      
      // Césped
      g.fillGradientStyle(0x2E8B57, 0x2E8B57, 0x006400, 0x006400, 1);
      g.fillRect(0, H - 300, W, 300);
      
      // Líneas del campo
      g.lineStyle(4, 0xFFFFFF, 0.8);
      g.strokeRect(W/2 - 150, H - 300, 300, 150); // Área grande
      g.strokeRect(W/2 - 75, H - 300, 150, 60);   // Área chica
      g.fillStyle(0xFFFFFF);
      g.fillCircle(W/2, H - 100, 5); // Punto penal

      // Vallas Publicitarias
      const vallaWidth = 140;
      const vallaHeight = 35;
      const vallaY = H - 325; // Justo sobre el césped

      const drawBillboard = (bx, by, text) => {
        g.fillStyle(0xFFFFFF); // Fondo blanco
        g.fillRect(bx, by, vallaWidth, vallaHeight);
        g.lineStyle(2, 0xCCCCCC); // Borde gris claro
        g.strokeRect(bx, by, vallaWidth, vallaHeight);
        
        // Logo (Círculo rojo con una 'M')
        const logoX = bx + 22;
        const logoY = by + vallaHeight / 2;
        g.fillStyle(0xE63946); // Rojo
        g.fillCircle(logoX, logoY, 13);
        this.add.text(logoX, logoY, "M", {
          fontFamily: 'Arial', fontSize: '18px', color: '#FFFFFF', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Letras grandes
        this.add.text(bx + 85, by + vallaHeight / 2, text, {
          fontFamily: 'Arial Black, Impact, sans-serif', fontSize: '16px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5);
      };

      // Dibujar muchas vallas a lo largo de todo el ancho
      for(let x = 0; x < W; x += vallaWidth) {
        drawBillboard(x, vallaY, "MANU PLAY");
      }

      // Red (Arco) - Dibujada después de las vallas para quedar por delante
      g.lineStyle(3, 0xFFFFFF);
      const gw = 320;
      const gh = 160;
      const gx = W/2 - gw/2;
      const gy = H - 300 - gh;
      
      // Postes y travesaño
      g.strokeRect(gx, gy, gw, gh);
      
      // Malla
      g.lineStyle(1, 0xFFFFFF, 0.4);
      for(let i=0; i<gw; i+=15) g.lineBetween(gx+i, gy, gx+i, gy+gh);
      for(let i=0; i<gh; i+=15) g.lineBetween(gx, gy+i, gx+gw, gy+i);
    }

    setupControls() {
      // Teclado
      this.input.keyboard.on('keydown-SPACE', this.handleAction, this);
      
      // Click / Touch
      this.input.on('pointerdown', this.handleAction, this);
    }

    handleAction() {
      if (this.triviaActive || this.gameEnded) return;

      // Asegurar que el contexto de audio esté activo (para Safari/Chrome)
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.state === 'AIM_X') {
        this.state = 'AIM_Y';
        this.playTone(300, 'square', 0.1);
      } else if (this.state === 'AIM_Y') {
        this.state = 'TRIVIA';
        this.playTone(400, 'square', 0.1);
        this.target.setAlpha(0); // Ocultar mira
        
        // Disparar trivia
        this.triviaActive = true;
        onTriviaRequest((isCorrect) => {
          this.triviaActive = false;
          this.state = 'KICKING';
          this.executeKick(isCorrect);
        });
      }
    }

    executeKick(isCorrect) {
      this.playTone(150, 'square', 0.2, 0.5); // Sonido de pateo
      
      let finalX = this.targetX;
      let finalY = this.targetY;
      let duration = 500;
      let spin = 1080;

      if (!isCorrect) {
        // Tiro malo al centro y lento
        finalX = W/2;
        finalY = H - 240; // Ras de piso
        duration = 1000;
        spin = 360;
        this.playTone(100, 'sawtooth', 0.5);
      } else {
        // Tiro bueno
        this.playTone(880, 'sine', 0.3);
      }

      // Animación del balón (Pseudo-3D)
      this.tweens.add({
        targets: this.ball,
        x: finalX,
        y: finalY,
        scaleX: 0.5,
        scaleY: 0.5,
        angle: spin,
        duration: duration,
        ease: isCorrect ? 'Cubic.easeOut' : 'Linear',
        onComplete: () => this.checkGoal(finalX, finalY, isCorrect)
      });

      // Animación del portero
      const goalieJumpX = isCorrect ? (finalX > W/2 ? finalX - 60 : finalX + 60) : finalX; // Si acertaste, el portero no llega
      const goalieJumpY = finalY > H - 200 ? finalY - 20 : finalY + 40;
      const diveAngle = goalieJumpX > W/2 ? 90 : -90;

      this.tweens.add({
        targets: this.goalie,
        x: goalieJumpX,
        y: goalieJumpY,
        angle: diveAngle,
        duration: 400,
        ease: 'Quad.easeOut'
      });
    }

    celebrateGoal() {
      // Explosión de partículas
      this.emitter.setPosition(this.targetX, this.targetY);
      this.emitter.explode(50);
      
      // Hinchada saltando
      this.tweens.add({
        targets: this.crowdContainer,
        y: -15,
        duration: 150,
        yoyo: true,
        repeat: 5
      });

      // Efecto sonido multitud/GOL
      this.playTone(400, 'square', 0.1, 0.2);
      this.time.delayedCall(100, () => this.playTone(500, 'square', 0.1, 0.2));
      this.time.delayedCall(200, () => this.playTone(600, 'square', 0.1, 0.2));
      this.time.delayedCall(300, () => this.playTone(800, 'square', 0.5, 0.4));
      
      // Texto GOL
      const t = this.add.text(W/2, H/2, "¡¡¡ GOL !!!", {
        fontFamily: 'Orbitron', fontSize: '100px', color: '#FFFF00',
        stroke: '#FF0000', strokeThickness: 12, fontStyle: 'bold'
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

    checkGoal(x, y, isCorrect) {
      const gw = 320;
      const gh = 160;
      const gx = W/2 - gw/2;
      const gy = H - 300 - gh;

      let goal = false;
      if (isCorrect) {
        // Verificar si fue dentro del marco
        if (x > gx && x < gx + gw && y > gy && y < gy + gh) {
          goal = true;
        }
      }

      this.attempts++;

      if (goal) {
        this.scoreGoals++;
        gameState.score += 500;
        this.celebrateGoal();
        
        const el = document.getElementById('hud-score');
        if (el) el.textContent = gameState.score;
      } else {
        this.playTone(150, 'sawtooth', 0.6);
        this.showFeedback(isCorrect ? "¡FUERA!" : "¡ATAJADA!", 0xFF0000);
      }

      if (gameState.questionIndex >= 10 || this.attempts >= 10) {
        this.gameEnded = true;
        this.time.delayedCall(2000, onGameComplete);
      } else {
        this.time.delayedCall(2500, () => this.resetTurn());
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
      this.ball.setScale(2);
      this.ball.setAngle(0);
      
      this.goalie.setPosition(W/2, H - 240);
      this.goalie.setAngle(0);
      
      this.target.setAlpha(1);
      this.targetX = W/2;
      this.targetY = H/2 - 50;
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

      const gw = 320;
      const gh = 160;
      const gx = W/2 - gw/2;
      const gy = H - 300 - gh;

      if (this.state === 'AIM_X') {
        this.targetX += this.aimSpeed * this.aimDir * (delta / 1000);
        if (this.targetX > gx + gw + 40) this.aimDir = -1;
        if (this.targetX < gx - 40) this.aimDir = 1;
        this.target.setX(this.targetX);
      } else if (this.state === 'AIM_Y') {
        this.targetY += this.aimSpeed * this.aimDir * (delta / 1000);
        if (this.targetY > H - 150) this.aimDir = -1;
        if (this.targetY < gy - 40) this.aimDir = 1;
        this.target.setY(this.targetY);
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'phaser-container',
    backgroundColor: '#87CEEB',
    scene: [PenaltyScene],
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
  let tc = document.getElementById('touch-controls-m4');
  if (tc) tc.remove();
  
  tc = document.createElement('div');
  tc.id = 'touch-controls-m4';
  tc.style.cssText = `
    position:absolute;bottom:20px;left:0;right:0;
    display:flex;justify-content:center;padding:0 20px;
    pointer-events:none;z-index:900;
  `;
  tc.innerHTML = `
    <button id="tc-kick" class="touch-btn" style="width:80px;height:80px;border-radius:50%;background:rgba(230,57,70,0.4);pointer-events:all;backdrop-filter:blur(4px);font-size:1.5rem;">⚽</button>
  `;
  container.style.position = 'relative';
  container.appendChild(tc);

  const getScene = () => game.scene.scenes[0];
  const kickBtn = document.getElementById('tc-kick');
  if (kickBtn) {
    kickBtn.addEventListener('mousedown', () => { const s = getScene(); if (s) s.handleAction(); });
    kickBtn.addEventListener('touchstart', (e) => { e.preventDefault(); const s = getScene(); if (s) s.handleAction(); });
  }
}
