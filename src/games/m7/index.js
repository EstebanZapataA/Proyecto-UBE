import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, W = 700, H = 480) {
  const container = document.getElementById('phaser-container');

  class BaseballScene extends Phaser.Scene {
    constructor() { super('BaseballScene'); }

    create() {
      this.cameras.main.setBackgroundColor('#87CEEB'); // Sky blue
      this.generateTextures();
      
      this.triviaActive = false;
      this.gameEnded = false;
      this.state = 'WAITING'; // WAITING, PITCHING, TRIVIA, HITTING
      this.scoreRuns = 0;
      this.attempts = 0;
      
      this.drawStadium();
      
      // Pitcher
      this.pitcher = this.add.sprite(W/2, H/2 - 20, 'pitcher');
      this.pitcher.setScale(1);
      
      // Batter
      this.batter = this.add.sprite(W/2, H - 80, 'batter');
      this.batter.setScale(1.5);
      
      // Bat
      this.bat = this.add.sprite(W/2 + 25, H - 70, 'bat');
      this.bat.setScale(1.5);
      this.bat.setOrigin(0.5, 0.8); // pivot near bottom handle
      this.bat.setAngle(20);
      
      // Ball
      this.ball = this.add.sprite(W/2, H/2 - 20, 'ball');
      this.ball.setScale(0.5);
      this.ball.setAlpha(0);

      this.setupControls();

      // Audio
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Initial instruction
      this.instructionText = this.add.text(W/2, H/2 + 60, 'PRESIONA ESPACIO\nPARA RECIBIR EL LANZAMIENTO', {
        fontFamily: 'Orbitron', fontSize: '24px', color: '#fff', align: 'center',
        stroke: '#000', strokeThickness: 4, fontStyle: 'bold'
      }).setOrigin(0.5);
      
      this.tweens.add({
        targets: this.instructionText,
        alpha: 0.5,
        duration: 800,
        yoyo: true,
        repeat: -1
      });
    }

    generateTextures() {
      const g = this.add.graphics();
      
      // Pitcher
      g.fillStyle(0x0000FF); // Blue jersey
      g.fillRect(10, 15, 20, 25);
      g.fillStyle(0xFFCC99); // Skin
      g.fillCircle(20, 8, 8);
      g.fillStyle(0xFFFFFF); // Pants
      g.fillRect(10, 40, 20, 15);
      g.fillStyle(0x0000FF); // Cap
      g.fillRect(12, 0, 16, 6);
      g.fillRect(20, 0, 14, 4); // Visor
      g.generateTexture('pitcher', 40, 60);
      g.clear();
      
      // Batter
      g.fillStyle(0xFF0000); // Red jersey
      g.fillRect(15, 20, 30, 35);
      g.fillStyle(0xFFCC99); // Skin
      g.fillCircle(30, 10, 10);
      g.fillStyle(0xFFFFFF); // Pants
      g.fillRect(15, 55, 30, 25);
      g.fillStyle(0xFF0000); // Cap
      g.fillRect(20, 0, 20, 8);
      g.fillRect(30, 4, 18, 4); // Visor backwards/forwards
      g.generateTexture('batter', 60, 80);
      g.clear();
      
      // Bat standalone
      g.fillStyle(0x8B4513);
      g.fillRect(0, 0, 8, 50);
      g.generateTexture('bat', 8, 50);
      g.clear();
      
      // Star particle
      g.fillStyle(0xFFFFFF);
      const starPoints = [0,-10, 3,-3, 10,-3, 4,2, 6,10, 0,5, -6,10, -4,2, -10,-3, -3,-3];
      g.beginPath();
      g.moveTo(10 + starPoints[0], 10 + starPoints[1]);
      for(let i=2; i<starPoints.length; i+=2) {
        g.lineTo(10 + starPoints[i], 10 + starPoints[i+1]);
      }
      g.closePath();
      g.fill();
      g.generateTexture('star_particle', 20, 20);
      g.clear();
      
      // Ball
      g.fillStyle(0xFFFFFF);
      g.fillCircle(10, 10, 10);
      g.lineStyle(2, 0xFF0000);
      g.beginPath();
      g.arc(2, 10, 8, -Math.PI/3, Math.PI/3, false);
      g.strokePath();
      g.beginPath();
      g.arc(18, 10, 8, Math.PI - Math.PI/3, Math.PI + Math.PI/3, false);
      g.strokePath();
      g.generateTexture('ball', 20, 20);
      g.destroy();
    }

    drawStadium() {
      const g = this.add.graphics();
      
      // Grass
      g.fillGradientStyle(0x228B22, 0x228B22, 0x006400, 0x006400, 1);
      g.fillRect(0, H/2 - 100, W, H/2 + 100);
      
      // Infield dirt
      g.fillStyle(0xD2B48C);
      g.fillEllipse(W/2, H/2 + 50, W*0.8, H*0.6);
      
      // Bases
      g.fillStyle(0xFFFFFF);
      g.fillRect(W/2 - 10, H - 40, 20, 20); // Home plate (simplified)
      g.fillRect(W/2 - 10, H/2 - 10, 20, 20); // Pitcher's mound plate
      g.fillRect(W*0.2, H/2 + 50, 20, 20); // 3rd base
      g.fillRect(W*0.8, H/2 + 50, 20, 20); // 1st base
      g.fillRect(W/2 - 10, H*0.3, 20, 20); // 2nd base
      
      // Foul lines
      g.lineStyle(4, 0xFFFFFF);
      g.lineBetween(W/2, H - 30, 0, H/2 - 100); // Left foul line
      g.lineBetween(W/2, H - 30, W, H/2 - 100); // Right foul line
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

      if (this.state === 'WAITING') {
        this.instructionText.setAlpha(0);
        this.state = 'PITCHING';
        this.playTone(300, 'square', 0.1);
        this.pitchBall();
      }
    }

    pitchBall() {
      this.ball.setPosition(W/2, H/2 - 20);
      this.ball.setAlpha(1);
      this.ball.setScale(0.5);
      
      this.playTone(400, 'sine', 0.2); // Pitch sound

      // Tween ball towards batter
      this.tweens.add({
        targets: this.ball,
        y: H - 120, // Near batter
        scale: 1.5,
        duration: 800,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.triggerTrivia();
        }
      });
    }

    triggerTrivia() {
      this.state = 'TRIVIA';
      this.triviaActive = true;
      
      onTriviaRequest((isCorrect) => {
        this.triviaActive = false;
        this.state = 'HITTING';
        this.executeHit(isCorrect);
      });
    }

    executeHit(isCorrect) {
      if (isCorrect) {
        // Home Run
        this.playTone(150, 'square', 0.1, 0.5); // Bat hit sound
        this.time.delayedCall(100, () => this.playTone(200, 'square', 0.1, 0.5));
        
        // Batting animation (swing bat forward powerfully)
        this.tweens.add({
          targets: this.bat,
          angle: -90,
          duration: 150,
          yoyo: true,
          ease: 'Cubic.easeOut',
          onComplete: () => this.bat.setAngle(20)
        });

        // Give batter a slight jump
        this.tweens.add({
          targets: this.batter,
          y: this.batter.y - 15,
          duration: 150,
          yoyo: true
        });

        // Ball flies away
        this.tweens.add({
          targets: this.ball,
          y: -50,
          x: Phaser.Math.Between(100, W - 100),
          scale: 0.2,
          duration: 1000,
          ease: 'Quad.easeOut',
          onComplete: () => this.checkResult(true)
        });
        
        this.playTone(880, 'sine', 0.5);
      } else {
        // Strike
        this.playTone(100, 'sawtooth', 0.3); // Miss sound
        
        // Batter swings late or misses
        this.tweens.add({
          targets: this.bat,
          angle: -90,
          duration: 250,
          yoyo: true,
          ease: 'Cubic.easeInOut',
          onComplete: () => this.bat.setAngle(20)
        });

        // Ball continues to catcher
        this.tweens.add({
          targets: this.ball,
          y: H + 50,
          scale: 2,
          duration: 300,
          onComplete: () => this.checkResult(false)
        });
      }
    }

    checkResult(isCorrect) {
      this.attempts++;

      if (isCorrect) {
        this.scoreRuns++;
        gameState.score += 500;
        this.showFeedback("¡HOME RUN!", 0xFFFF00);
        this.createStarsFalling();
        this.playCheer();
        
        const el = document.getElementById('hud-score');
        if (el) el.textContent = gameState.score;
      } else {
        this.showFeedback("¡STRIKE!", 0xFF0000);
      }

      if (gameState.questionIndex >= 10 || this.attempts >= 10) {
        this.gameEnded = true;
        this.time.delayedCall(2000, onGameComplete);
      } else {
        this.time.delayedCall(2000, () => this.resetTurn());
      }
    }

    showFeedback(text, color) {
      const t = this.add.text(W/2, H/2 - 50, text, {
        fontFamily: 'Orbitron', fontSize: '56px', color: '#fff',
        stroke: '#000', strokeThickness: 8, fontStyle: 'bold'
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
      this.state = 'WAITING';
      this.ball.setAlpha(0);
      this.ball.setPosition(W/2, H/2 - 20);
      this.ball.setScale(0.5);
      
      this.instructionText.setAlpha(1);
      this.tweens.add({
        targets: this.instructionText,
        alpha: 0.5,
        duration: 800,
        yoyo: true,
        repeat: -1
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
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) {}
    }

    playCheer() {
      if (window.appMuted || !this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      try {
        const bufferSize = this.audioCtx.sampleRate * 2;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = buffer;
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, this.audioCtx.currentTime);
        filter.frequency.linearRampToValueAtTime(2000, this.audioCtx.currentTime + 1);
        filter.frequency.linearRampToValueAtTime(500, this.audioCtx.currentTime + 2);
        
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + 0.5);
        gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 2);
        
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        noiseSource.start();
      } catch (e) {}
    }

    createStarsFalling() {
      const W = this.sys.game.config.width;
      
      const emitter = this.add.particles(0, 0, 'star_particle', {
        x: { min: 0, max: W },
        y: -20,
        speedY: { min: 100, max: 300 },
        speedX: { min: -50, max: 50 },
        scale: { start: 1.5, end: 0 },
        rotate: { start: 0, end: 360 },
        gravityY: 100,
        lifespan: 2500,
        quantity: 8,
        tint: [ 0xffff00, 0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0x00ffff ]
      });
      
      this.time.delayedCall(1500, () => {
        emitter.stop();
        this.time.delayedCall(3000, () => emitter.destroy());
      });
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'phaser-container',
    backgroundColor: '#87CEEB',
    scene: [BaseballScene],
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
  let tc = document.getElementById('touch-controls-m7');
  if (tc) tc.remove();
  
  tc = document.createElement('div');
  tc.id = 'touch-controls-m7';
  tc.style.cssText = `
    position:absolute;bottom:40px;right:40px;
    display:flex;justify-content:flex-end;
    pointer-events:none;z-index:900;
  `;
  tc.innerHTML = `
    <button id="tc-hit" class="touch-btn" style="width:80px;height:80px;border-radius:50%;background:rgba(239,68,68,0.7);pointer-events:all;backdrop-filter:blur(4px);font-size:1.5rem;color:white;font-weight:bold;border:2px solid white;box-shadow: 0 4px 15px rgba(239,68,68,0.5);">BATEAR</button>
  `;
  container.style.position = 'relative';
  container.appendChild(tc);

  const getScene = () => game.scene.scenes[0];
  const hitBtn = document.getElementById('tc-hit');
  if (hitBtn) {
    hitBtn.addEventListener('mousedown', () => { const s = getScene(); if (s) s.handleAction(); });
    hitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); const s = getScene(); if (s) s.handleAction(); });
  }
}
