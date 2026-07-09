import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, W = 800, H = 600) {
  const container = document.getElementById('phaser-container');

  // Asegurar que las preguntas no pasen de 10
  if (gameState.questions && gameState.questions.length > 10) {
    gameState.questions = gameState.questions.slice(0, 10);
  }

  class BikeScene extends Phaser.Scene {
    constructor() {
      super({ key: 'BikeScene' });
      this.state = 'RIDING'; // RIDING, JUMPING, PAUSED, ENDED
      this.speed = 4;
      this.obstaclesCleared = 0;
      this.attempts = 0;
      this.scoreRuns = 0;
      this.bg = null;
    }

    preload() {
      this.load.image('bg_guayaquil', '/bg-guayaquil.png');
      this.load.image('bg_iguanas', '/bg-iguanas.png');
      this.load.image('bg_catedral', '/bg-catedral.png');
      this.load.image('bg_penas', '/bg-penas.png');
      this.generateTextures();
    }

    generateTextures() {
      const g = this.add.graphics();
      
      // Bike (Bicicleta genérica colorida)
      // Wheels (Shifted down by 30)
      g.lineStyle(4, 0x333333);
      g.strokeCircle(20, 80, 15); // back wheel
      g.strokeCircle(80, 80, 15); // front wheel
      
      // Frame
      g.lineStyle(4, 0xef4444); // Red frame
      g.beginPath();
      g.moveTo(20, 80); // back axle
      g.lineTo(40, 55); // seat post bottom
      g.lineTo(70, 55); // top tube
      g.lineTo(80, 80); // front axle
      g.moveTo(40, 55);
      g.lineTo(55, 80); // down tube
      g.lineTo(70, 55);
      g.strokePath();

      // Handlebar and seat
      g.lineStyle(4, 0x000000);
      g.beginPath();
      g.moveTo(40, 55);
      g.lineTo(35, 45); // seat
      g.moveTo(70, 55);
      g.lineTo(70, 40); // handlebar stem
      g.lineTo(75, 35); // handle
      g.strokePath();

      // Rider
      g.fillStyle(0x3b82f6); // blue shirt
      g.fillRoundedRect(35, 25, 20, 30, 5);
      g.fillStyle(0xffcc99); // head
      g.fillCircle(45, 15, 10);
      g.fillStyle(0x111827); // helmet
      g.beginPath();
      g.arc(45, 15, 12, Math.PI, 0, false);
      g.fill();

      g.generateTexture('bike', 100, 100);
      g.clear();

      // Obstacle (Traffic Cone)
      g.fillStyle(0xff7300);
      g.beginPath();
      g.moveTo(20, 0);
      g.lineTo(40, 40);
      g.lineTo(0, 40);
      g.closePath();
      g.fill();
      g.fillStyle(0xffffff);
      g.fillRect(10, 15, 20, 10);
      g.generateTexture('obstacle', 40, 40);
      g.clear();
      
      // Particle
      g.fillStyle(0xffff00);
      g.fillRect(0, 0, 5, 5);
      g.generateTexture('spark', 5, 5);
      g.clear();
    }

    create() {
      // Audio context fallback if not created
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      this.bg = this.add.tileSprite(W/2, H/2, W, H, 'bg_guayaquil');
      // If the image is large, scale it to fit height
      this.bg.setDisplaySize(W, H);

      // Ground (Road)
      const ground = this.add.graphics();
      ground.fillStyle(0x555555); // Dark grey road
      ground.fillRect(0, H - 120, W, 120);
      
      // Road markings (dashed line)
      ground.lineStyle(4, 0xffffff);
      for(let i=0; i<W; i+=60) {
        ground.beginPath();
        ground.moveTo(i, H - 60);
        ground.lineTo(i + 30, H - 60);
        ground.strokePath();
      }

      // We'll move the road markings graphic to animate it
      this.roadLines = ground;

      // Ensure bike rests on the road (y = H - 120)
      this.player = this.add.sprite(150, H - 120, 'bike');
      this.player.setOrigin(0.5, 1);

      this.obstacle = this.add.sprite(W + 500, H - 120, 'obstacle'); // Start further away
      this.obstacle.setOrigin(0.5, 1);

      this.instructionText = this.add.text(W/2, H/2 - 50, 'Usa el botón SALTAR cuando te acerques\nal obstáculo para responder y esquivarlo.', {
        fontFamily: 'Orbitron',
        fontSize: '22px',
        color: '#ffffff',
        align: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { x: 10, y: 10 }
      }).setOrigin(0.5);

      this.time.delayedCall(4000, () => {
        this.instructionText.setAlpha(0);
      });
      
      // Botón Saltar
      this.jumpBtn = this.add.text(W - 120, H - 70, 'SALTAR', {
        fontFamily: 'Orbitron',
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#ef4444',
        padding: { x: 20, y: 15 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      this.jumpBtn.on('pointerdown', () => {
        if (this.state === 'RIDING') {
          this.performPhysicalJump();
        }
      });
    }

    performPhysicalJump() {
      this.state = 'JUMPING';
      this.playTone(400, 'sine', 0.2);
      this.tweens.add({
        targets: this.player,
        y: (H - 120) - 160, // Salto de 160px
        duration: 400,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Al aterrizar
          if (this.dodgedObstacle) {
            this.dodgedObstacle = false;
            this.triggerTrivia();
          } else {
            this.state = 'RIDING';
          }
        }
      });
    }

    update() {
      if (this.state === 'RIDING' || this.state === 'JUMPING') {
        this.bg.tilePositionX += this.speed * 0.5;
        this.obstacle.x -= this.speed;
        
        if (this.roadLines) {
          this.roadLines.x -= this.speed;
          if (this.roadLines.x <= -60) this.roadLines.x = 0;
        }

        if (this.state === 'RIDING') {
          // Animate bike bobbing
          this.player.y = (H - 120) + Math.sin(this.time.now / 100) * 2;
        }

        // Colisión: si el obstáculo toca al jugador en X, y el jugador NO está lo suficientemente alto
        const inObstacleX = this.obstacle.x > this.player.x - 30 && this.obstacle.x < this.player.x + 30;
        const isLow = this.player.y > (H - 120) - 40; // Si no está al menos 40px en el aire

        if (inObstacleX && isLow) {
          this.crashWithoutTrivia();
        }

        // Si esquivó el obstáculo con éxito (estaba alto cuando pasó)
        if (inObstacleX && !isLow) {
          this.dodgedObstacle = true;
        }
      }
    }

    crashWithoutTrivia() {
      this.state = 'PAUSED';
      this.playTone(150, 'sawtooth', 0.5);
      this.tweens.add({
        targets: this.player,
        angle: 90,
        x: this.player.x + 20,
        duration: 300,
        onComplete: () => {
          this.time.delayedCall(800, () => {
            // Recover
            this.tweens.add({
              targets: this.player,
              angle: 0,
              x: 150,
              duration: 300,
              onComplete: () => {
                this.obstacle.x = W + 500; // Reset obstacle further away
                this.state = 'RIDING';
              }
            });
          });
        }
      });
    }

    triggerTrivia() {
      if (gameState.questionIndex >= gameState.questions.length) {
        this.endGame();
        return;
      }
      this.state = 'PAUSED';
      this.playTone(300, 'square', 0.1);
      
      onTriviaRequest((isCorrect) => {
        this.handleTriviaResult(isCorrect);
      });
    }

    handleTriviaResult(isCorrect) {
      if (isCorrect) {
        this.playTone(600, 'sine', 0.2);
        this.createSparks();
        
        // Pequeño caballito de celebración
        this.tweens.add({
          targets: this.player,
          angle: -20,
          duration: 300,
          yoyo: true,
          onComplete: () => {
            this.obstacle.x = W + 500;
            this.updateBackground();
            this.checkProgress();
          }
        });
        
      } else {
        // Falló la pregunta: se cae
        this.playTone(150, 'sawtooth', 0.5);
        this.tweens.add({
          targets: this.player,
          angle: 90,
          x: this.player.x + 20,
          duration: 300,
          onComplete: () => {
            this.time.delayedCall(800, () => {
              this.tweens.add({
                targets: this.player,
                angle: 0,
                x: 150,
                duration: 300,
                onComplete: () => {
                  this.obstacle.x = W + 500;
                  this.updateBackground();
                  this.checkProgress();
                }
              });
            });
          }
        });
      }
    }

    checkProgress() {
      if (gameState.questionIndex >= gameState.questions.length) {
        this.endGame();
      } else {
        this.state = 'RIDING';
      }
    }

    createSparks() {
      const particles = this.add.particles(0, 0, 'spark', {
        x: this.player.x,
        y: this.player.y,
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 600,
        quantity: 20,
        tint: [ 0xffff00, 0xffaa00, 0xffffff ]
      });
      
      this.time.delayedCall(1000, () => particles.destroy());
    }

    updateBackground() {
      const bgKeys = ['bg_guayaquil', 'bg_iguanas', 'bg_catedral', 'bg_penas'];
      // Cambiar de fondo cada 3 preguntas (0..2 -> 0, 3..5 -> 1, 6..8 -> 2, 9 -> 3)
      const nextBgIdx = Math.min(Math.floor(gameState.questionIndex / 3), bgKeys.length - 1);
      
      if (this.bg && this.bg.texture.key !== bgKeys[nextBgIdx]) {
        this.bg.setTexture(bgKeys[nextBgIdx]);
        this.bg.setDisplaySize(W, H);
      }
    }

    endGame() {
      this.state = 'ENDED';
      this.playTone(800, 'sine', 0.2);
      this.time.delayedCall(200, () => this.playTone(1000, 'sine', 0.4));
      
      this.instructionText.setText('¡Recorrido Completado!');
      this.instructionText.setAlpha(1);

      // FIESTA (Confetti)
      if (gameState.hits >= 7) {
        const confettiColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        confettiColors.forEach(color => {
          const g = this.add.graphics();
          g.fillStyle(color);
          g.fillRect(0, 0, 10, 10);
          g.generateTexture(`confetti_${color}`, 10, 10);
          g.destroy();
          
          this.add.particles(0, 0, `confetti_${color}`, {
            x: { min: 0, max: W },
            y: -20,
            speedY: { min: 100, max: 400 },
            speedX: { min: -100, max: 100 },
            angle: { min: 0, max: 360 },
            rotate: { min: 0, max: 360 },
            scale: { start: 1, end: 0.5 },
            lifespan: 5000,
            frequency: 100,
            quantity: 1
          });
        });
      }
      
      this.time.delayedCall(4000, () => {
        onGameComplete();
      });
    }

    playTone(freq, type, duration, gain = 0.1) {
      if (window.appMuted || !this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      try {
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gainNode.gain.setValueAtTime(gain, this.audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + duration);
        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + duration);
        
        // Failsafe to disconnect and prevent stuck sounds
        setTimeout(() => {
          try {
            osc.disconnect();
            gainNode.disconnect();
          } catch(e) {}
        }, duration * 1000 + 50);
      } catch (e) {}
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: W,
    height: H,
    backgroundColor: '#87CEEB',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BikeScene]
  });

  return game;
}
