import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, W = 700, H = 480) {
  const container = document.getElementById('phaser-container');

  class DuckHuntScene extends Phaser.Scene {
    constructor() { super('DuckHuntScene'); }

    create() {
      this.cameras.main.setBackgroundColor('#64B5F6'); // Cielo celeste

      this.gameEnded = false;
      this.triviaActive = false;
      this.activeDuck = null;

      this.generateTextures();
      this.drawScenery();
      
      // Crosshair (mira)
      this.crosshair = this.add.graphics();
      this.crosshair.lineStyle(2, 0xff0000, 1);
      this.crosshair.strokeCircle(0, 0, 15);
      this.crosshair.lineBetween(-20, 0, 20, 0);
      this.crosshair.lineBetween(0, -20, 0, 20);
      this.crosshair.setDepth(100);

      this.input.on('pointermove', (pointer) => {
        this.crosshair.setPosition(pointer.x, pointer.y);
      });

      // Ocultar cursor nativo
      this.input.setDefaultCursor('none');

      this.input.on('pointerdown', (pointer) => {
        this.handleShoot(pointer);
      });
      
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Spawn del primer pato
      this.time.delayedCall(1000, () => this.spawnDuck());

      // Cleanup on destroy
      this.events.on('destroy', () => {
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
          this.audioCtx.close();
        }
      });
    }

    generateTextures() {
      // Helper for pixel art
      const makeTex = (key, data, pal, scale = 2) => {
        const tex = this.textures.createCanvas(key, data[0].length * scale, data.length * scale);
        const ctx = tex.getContext();
        for (let y = 0; y < data.length; y++) {
          for (let x = 0; x < data[y].length; x++) {
            const char = data[y][x];
            if (char !== ' ' && pal[char]) {
              ctx.fillStyle = pal[char];
              ctx.fillRect(x * scale, y * scale, scale, scale);
            }
          }
        }
        tex.refresh();
      };

      // Pasto
      const gg = this.add.graphics();
      gg.fillStyle(0x4CAF50);
      gg.fillRect(0, 0, 32, 32);
      gg.fillStyle(0x388E3C);
      gg.fillRect(16, 0, 16, 16);
      gg.fillRect(0, 16, 16, 16);
      gg.generateTexture('grass', 32, 32);
      gg.destroy();

      const duckPal = { 'b': '#000000', 'g': '#4CAF50', 'w': '#FFFFFF', 'o': '#FF9800', 'r': '#795548' };
      const duckImg = [
        "      gggg      ",
        "     gggggg     ",
        "    gggggwb     ",
        "    ggggggb     ",
        "       oo       ",
        "      oooo      ",
        "     rrrrrr     ",
        "    rrrrrrrr    ",
        "   rrrrrrrrrr   ",
        "   rrrrrrrrrr   ",
        "    rrrrrrrr    ",
        "     rrrrrr     "
      ];
      makeTex('duck', duckImg, duckPal, 3);

      const dogPal = { 'b': '#000000', 'w': '#FFFFFF', 'o': '#d86810', 'p': '#ff8888', ' ': null };
      const dogLaugh1 = [
        "      bbbbbbb       ",
        "    bbbooooobbb     ",
        "  bbboowoowoowbbb   ",
        " bb oowbwwbwwbo bb  ",
        " b  oowwwwwwwwo  b  ",
        "    bbbbwwwwbbbb    ",
        "   bwwwwbwwbwwwwb   ",
        "  bwbwwwbbbbwwwbwb  ",
        "  bwwwwwwwwwwwwwwb  ",
        "  bbwwwwwwwwwwwwbb  ",
        " boobbbbbbbbbbbboob ",
        " boooooooooooooooob ",
        " boooooooooooooooob ",
        " boooooooooooooooob ",
        " booooooobbbbooooob ",
        " boooooobboooboooob ",
        " booooobbbbbbbbooob ",
        " booooobbooobooooob ",
        "  boobbbboooobbbb   ",
        "   bbbb  bbbb       "
      ];
      makeTex('dog_laugh1', dogLaugh1, dogPal, 3);

      const dogLaugh2 = [
        "      bbbbbbb       ",
        "    bbbooooobbb     ",
        "  bbboowoowoowbbb   ",
        " bb oowbwwbwwbo bb  ",
        " b  oowwwwwwwwo  b  ",
        "    bbbbwwwwbbbb    ",
        "   bwwwwbwwbwwwwb   ",
        "  bwbwwwbbbbwwwbwb  ",
        "  bwwwwwwwwwwwwwwb  ",
        "  bbwwwwwwwwwwwwbb  ",
        " boobbbbbbbbbbbboob ",
        " bboooooooooooooobb ",
        " bboooooooooooooobb ",
        " bboooooooooooooobb ",
        " bboooooobbbboooobb ",
        " bbooooobbooobooobb ",
        " bboooobbbbbbbboobb ",
        " bboooobboooboooobb ",
        "  bboobbbboooobbbbb ",
        "   bbbb  bbbb       "
      ];
      makeTex('dog_laugh2', dogLaugh2, dogPal, 3);

      const dogHappy = [
        "      bbbbbbb       ",
        "    bbbooooobbb     ",
        "  bbboowoowoowbbb   ",
        " bb oowbwwbwwbo bb  ",
        " b  oowwwwwwwwo  b  ",
        "    bbbbwwwwbbbb    ",
        "   bwwwwbwwbwwwwb   ",
        "  bwbwwwbbbbwwwbwb  ",
        "  bwwwwwwppwwwwwwb  ",
        "  bbwwwwppppwwwwbb  ",
        " boobbbbbbbbbbbboob ",
        " booooooooboooooooo ",
        " booooooooboooooooo ",
        " booooooooboooooooo ",
        " booooooooboooooooo ",
        "  bbbbbbbbbbbbbbbb  "
      ];
      makeTex('dog_happy', dogHappy, dogPal, 3);

      this.anims.create({
        key: 'dog_laugh_anim',
        frames: [
          { key: 'dog_laugh1' },
          { key: 'dog_laugh2' }
        ],
        frameRate: 6,
        repeat: -1
      });
    }

    drawScenery() {
      // Nubes
      const cloud = this.add.graphics();
      cloud.fillStyle(0xFFFFFF, 0.8);
      cloud.fillCircle(100, 100, 30);
      cloud.fillCircle(130, 100, 40);
      cloud.fillCircle(160, 110, 25);
      
      cloud.fillCircle(500, 150, 25);
      cloud.fillCircle(530, 150, 35);
      cloud.fillCircle(560, 160, 20);

      // Sol
      const sun = this.add.graphics();
      sun.fillStyle(0xFFEB3B);
      sun.fillCircle(W - 80, 80, 40);

      // Suelo
      this.add.tileSprite(W/2, H - 40, W, 80, 'grass');
    }

    spawnDuck() {
      if (this.gameEnded || this.triviaActive) return;
      if (gameState.questionIndex >= 10) {
        this.time.delayedCall(500, () => this.endGame());
        return;
      }

      this.playBarks();

      const isLeftToRight = Math.random() > 0.5;
      const startX = isLeftToRight ? -50 : W + 50;
      const startY = H - 100;
      
      this.activeDuck = this.add.sprite(startX, startY, 'duck');
      this.activeDuck.setScale(2);
      if (!isLeftToRight) this.activeDuck.setFlipX(true);
      this.activeDuck.setInteractive();

      // Trayectoria del pato (random zig-zag)
      const targetX = isLeftToRight ? W + 50 : -50;
      
      const segments = 3;
      const xStep = (targetX - startX) / segments;
      const pathTweens = [];
      for (let i = 1; i <= segments; i++) {
        pathTweens.push({
          x: startX + xStep * i,
          y: Math.random() * (H / 2) + 20,
          duration: (3000 + Math.random() * 2000) / segments,
          ease: 'Sine.easeInOut'
        });
      }

      this.duckTween = this.tweens.chain({
        targets: this.activeDuck,
        tweens: pathTweens,
        onComplete: () => {
          if (this.activeDuck && this.activeDuck.active) {
            // El pato escapó
            this.activeDuck.destroy();
            this.activeDuck = null;
            this.showFeedbackText(W/2, H/2, "¡SE ESCAPÓ!", '#FF0000');
            this.playTone(200, 'sawtooth', 0.4);
            // Hacer respawn sin gastar pregunta
            this.time.delayedCall(1000, () => this.spawnDuck());
          }
        }
      });
      
      // Animación de aleteo suave
      this.duckFlapTween = this.tweens.add({
        targets: this.activeDuck,
        angle: { from: -5, to: 5 },
        duration: 150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    handleShoot(pointer) {
      if (this.triviaActive || this.gameEnded) return;
      
      // Sonido de disparo y flash
      this.playTone(150, 'square', 0.1);
      this.cameras.main.flash(50, 255, 255, 255);

      if (!this.activeDuck) return;

      const bounds = this.activeDuck.getBounds();
      const hitTolerance = 25; // Hitbox permisivo
      if (
        pointer.x >= bounds.x - hitTolerance &&
        pointer.x <= bounds.x + bounds.width + hitTolerance &&
        pointer.y >= bounds.y - hitTolerance &&
        pointer.y <= bounds.y + bounds.height + hitTolerance
      ) {
        // ¡Impacto!
        this.duckTween.stop();
        this.duckFlapTween.stop();
        this.activeDuck.setTint(0xFF0000);
        this.triggerTrivia();
      }
    }

    triggerTrivia() {
      this.triviaActive = true;
      this.input.setDefaultCursor('default');
      this.crosshair.setVisible(false);

      onTriviaRequest((isCorrect) => {
        this.triviaActive = false;
        if (this.gameEnded) return;

        this.input.setDefaultCursor('none');
        this.crosshair.setVisible(true);

        if (isCorrect) {
          this.playTone(880, 'sine', 0.2);
          this.playTone(1100, 'sine', 0.2);
          
          if (this.activeDuck) {
            // Pato cae
            this.activeDuck.clearTint();
            this.activeDuck.setFlipY(true);
            this.tweens.add({
              targets: this.activeDuck,
              y: H,
              duration: 700,
              ease: 'Quad.easeIn',
              onComplete: () => {
                this.activeDuck.destroy();
                this.activeDuck = null;
                this.showDog(true);
              }
            });
          }
        } else {
          this.playTone(150, 'sawtooth', 0.4);
          if (this.activeDuck) {
            // Pato escapa volando
            this.activeDuck.clearTint();
            this.tweens.add({
              targets: this.activeDuck,
              y: -50,
              duration: 800,
              onComplete: () => {
                this.activeDuck.destroy();
                this.activeDuck = null;
                this.showDog(false);
              }
            });
          }
        }
      });
    }

    showDog(success) {
      if (this.gameEnded) return;

      const textureKey = success ? 'dog_happy' : 'dog_laugh1';
      const dog = this.add.sprite(W/2, H, textureKey);
      
      if (!success) {
        this.playLaugh();
        dog.play('dog_laugh_anim');
      }

      this.tweens.add({
        targets: dog,
        y: H - 90,
        duration: 500,
        yoyo: true,
        hold: 800,
        onComplete: () => {
          dog.destroy();
          this.time.delayedCall(200, () => this.spawnDuck());
        }
      });

      if (success) {
        this.showFeedbackText(W/2, H/2 - 50, "+100", '#39FF14');
      }
    }

    playLaugh() {
      if (!this.audioCtx || window.appMuted) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      
      const playBark = (time, pitch) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch, time);
        osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, time + 0.1);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
        gain.gain.linearRampToValueAtTime(0, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
      };

      const now = this.audioCtx.currentTime;
      for (let i = 0; i < 6; i++) {
        playBark(now + i * 0.15, 300 - i * 10);
      }
    }

    playBarks() {
      if (!this.audioCtx || window.appMuted) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      
      const playBark = (time, pitch) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(pitch, time);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
        gain.gain.linearRampToValueAtTime(0, time + 0.15);
        osc.start(time);
        osc.stop(time + 0.15);
      };

      const now = this.audioCtx.currentTime;
      for (let i = 0; i < 3; i++) {
        playBark(now + i * 0.3, 180);
      }
    }

    showFeedbackText(x, y, text, color) {
      const txt = this.add.text(x, y, text, {
        fontFamily: 'Orbitron, sans-serif', fontSize: '32px', fontWeight: 'bold',
        color: color, stroke: '#000000', strokeThickness: 5
      }).setOrigin(0.5);

      this.tweens.add({
        targets: txt, y: y - 50, alpha: 0, scale: 1.5,
        duration: 1200, onComplete: () => txt.destroy()
      });
    }

    playTone(freq, type, dur) {
      if (!this.audioCtx || window.appMuted || this.audioCtx.state === 'closed') return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type; osc.frequency.value = freq;
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      
      const now = this.audioCtx.currentTime;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + dur);
      
      osc.start(now);
      osc.stop(now + dur);
    }

    endGame() {
      this.gameEnded = true;
      this.input.setDefaultCursor('default');
      if (this.crosshair) this.crosshair.setVisible(false);
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        this.audioCtx.close();
      }
      onGameComplete();
    }
  }

  const config = {
    type: Phaser.AUTO,
    parent: container,
    width: W, height: H,
    transparent: true,
    scene: DuckHuntScene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  };

  return new Phaser.Game(config);
}
