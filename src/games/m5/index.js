// =============================================
// EduPlay UBE — Módulo 5: Roblox Obby
// =============================================

import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, width, height) {
  return new Promise((resolve) => {
    const config = {
      type: Phaser.AUTO,
      width: width,
      height: height,
      parent: 'phaser-container',
      transparent: true,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 800 },
          debug: false
        }
      },
      scene: {
        preload: preload,
        create: create,
        update: update
      }
    };

    let game = new Phaser.Game(config);

    function preload() {
      // Background and music (fallback to simple colors if assets missing)
      this.load.image('sky', '/portada.png'); // using portada as a skybox fallback
    }

    function create() {
      this.W = width;
      this.H = height;
      this.gameState = gameState;
      this.onTriviaRequest = onTriviaRequest;
      this.onGameComplete = onGameComplete;
      
      this.isPausedForTrivia = false;
      this.gatesCleared = 0;

      // Draw the Pelotocino character texture
      const g = this.add.graphics();
      // Head
      g.fillStyle(0xFFD700); g.fillRect(10, 0, 20, 20);
      // Hair (Bacon)
      g.fillStyle(0x8B4513); g.fillRect(8, -5, 24, 10); g.fillRect(12, -10, 16, 5);
      // Body
      g.fillStyle(0x0000FF); g.fillRect(5, 20, 30, 30);
      // Arms
      g.fillStyle(0xFFD700); g.fillRect(0, 20, 5, 25); g.fillRect(35, 20, 5, 25);
      // Legs
      g.fillStyle(0x008000); g.fillRect(10, 50, 8, 20); g.fillRect(22, 50, 8, 20);
      g.generateTexture('pelotocino', 40, 70);
      g.clear();

      // Create Lava Texture
      g.fillStyle(0xFF4500); g.fillRect(0, 0, 100, 40);
      g.fillStyle(0xFF8C00); g.fillRect(10, 10, 80, 20);
      g.generateTexture('lava', 100, 40);
      g.clear();

      // Background
      this.add.rectangle(0, 0, this.W * 100, this.H * 2, 0x87CEEB).setOrigin(0); // Blue sky

      // Groups
      this.platforms = this.physics.add.staticGroup();
      this.lavas = this.physics.add.staticGroup();
      this.gates = this.physics.add.staticGroup();

      // Build Level
      let currentX = 0;
      const floorY = this.H - 50;

      // Initial platform
      this.platforms.create(currentX + 400, floorY + 25, 'sky').setDisplaySize(800, 50).refreshBody().setTint(0x228B22);
      currentX += 800;

      for (let i = 0; i < 10; i++) {
        // Gate (Trivia Checkpoint)
        const gate = this.gates.create(currentX, floorY - 50, 'sky').setDisplaySize(20, 100).refreshBody().setTint(0x808080);
        // Extend the invisible physics body upwards so it can't be jumped over
        gate.body.setSize(20, 1000);
        gate.gateIndex = i;

        // Platform after gate
        this.platforms.create(currentX + 200, floorY + 25, 'sky').setDisplaySize(400, 50).refreshBody().setTint(0x228B22);
        currentX += 400;

        // Lava pit
        this.lavas.create(currentX + 50, floorY + 30, 'lava');
        currentX += 100;

        // Platform after lava
        this.platforms.create(currentX + 200, floorY + 25, 'sky').setDisplaySize(400, 50).refreshBody().setTint(0x228B22);
        currentX += 400;
      }

      // Final platform
      this.platforms.create(currentX + 400, floorY + 25, 'sky').setDisplaySize(800, 50).refreshBody().setTint(0xFFD700);

      // Player
      this.player = this.physics.add.sprite(100, floorY - 100, 'pelotocino');
      this.player.setCollideWorldBounds(false);
      this.player.setBounce(0.1);

      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.cameras.main.setBounds(0, 0, currentX + 800, this.H);

      // Collisions
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.overlap(this.player, this.gates, hitGate, null, this);
      this.physics.add.overlap(this.player, this.lavas, hitLava, null, this);

      // Sound generator
      this.playSound = (type) => {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          if (type === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
          } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
          }
        } catch(e) {}
      };

      // Controls
      this.input.keyboard.on('keydown-SPACE', jump, this);
      this.input.on('pointerdown', jump, this);

      resolve(game);
    }

    function jump() {
      if (!this.isPausedForTrivia && (this.player.body.touching.down || this.player.body.blocked.down)) {
        this.playSound('jump');
        this.player.setVelocityY(-450);
        // Spin animation
        this.tweens.add({
          targets: this.player,
          angle: 360,
          duration: 600,
          onComplete: () => { this.player.angle = 0; }
        });
      }
    }

    function hitGate(player, gate) {
      if (this.isPausedForTrivia) return;
      
      this.isPausedForTrivia = true;
      this.player.setVelocityX(0);
      this.player.setVelocityY(0);
      
      this.onTriviaRequest((isCorrect) => {
        if (isCorrect) {
          // Create star explosion in game
          const stars = this.add.particles(0, 0, 'sky', {
            x: gate.x,
            y: gate.y,
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            tint: [0xFFD700, 0xFF4500, 0x00FF88],
            blendMode: 'ADD',
            lifespan: 800,
            gravityY: 200,
            quantity: 20,
            emitting: false
          });
          stars.explode();
        }

        // Remove gate
        this.tweens.add({
          targets: gate,
          alpha: 0,
          y: gate.y - 100,
          duration: 500,
          onComplete: () => {
            gate.destroy();
            this.isPausedForTrivia = false;
            this.gatesCleared++;

            if (this.gatesCleared >= 10) {
              this.time.delayedCall(1000, () => {
                this.onGameComplete();
              });
            }
          }
        });
      });
    }

    function hitLava(player, lava) {
      if (this.isPausedForTrivia) return;
      
      this.playSound('hit');
      
      // Respawn further back to avoid falling straight into lava again
      this.player.setPosition(lava.x - 300, this.H - 90);
      this.player.setVelocity(0, 0);
      
      // Flash red
      this.player.setTint(0xFF0000);
      this.time.delayedCall(500, () => {
        this.player.clearTint();
      });
    }

    function update() {
      if (this.isPausedForTrivia) {
        this.player.setVelocityX(0);
        return;
      }

      // Auto run
      this.player.setVelocityX(200);

      // Fall off map
      if (this.player.y > this.H + 50) {
        this.player.setPosition(this.player.x - 200, this.H - 150);
        this.player.setVelocity(0, 0);
      }
    }
  });
}
