import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, W = 800, H = 500) {
  const container = document.getElementById('phaser-container');

  // Fixed internal resolution for BIG pixel art (Phaser FIT scales it up)
  const GW = 640;
  const GH = 400;

  class MarioScene extends Phaser.Scene {
    constructor() { super('MarioScene'); }

    create() {
      try {
        this.generateTextures();
        this.createAnimations();

        this.cameras.main.setBackgroundColor('#5C94FC');
      this.worldWidth = 3200;
      this.physics.world.setBounds(0, 0, this.worldWidth, GH);
      
      this.triviaActive = false;
      this.gameEnded = false;
      
      this.groundGroup = this.physics.add.staticGroup();
      this.brickGroup = this.physics.add.staticGroup();
      this.questionGroup = this.physics.add.staticGroup();
      this.pipeGroup = this.physics.add.staticGroup();
      this.enemies = this.physics.add.group();

      this.buildLevel();
      this.createPlayer();

      // Colisiones
      this.physics.add.collider(this.player, this.groundGroup);
      this.physics.add.collider(this.player, this.brickGroup, this.hitBrick, null, this);
      this.physics.add.collider(this.player, this.questionGroup, this.hitQuestionBlock, null, this);
      this.physics.add.collider(this.player, this.pipeGroup);
      this.physics.add.collider(this.enemies, this.groundGroup);
      this.physics.add.collider(this.enemies, this.pipeGroup);
      this.physics.add.collider(this.enemies, this.brickGroup);
      this.physics.add.collider(this.enemies, this.questionGroup);
      this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
      if (this.goalZone) {
        this.physics.add.overlap(this.player, this.goalZone, this.reachGoal, null, this);
      }

      // Cámara
      this.cameras.main.setBounds(0, 0, this.worldWidth, GH);
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
      this.cameras.main.setFollowOffset(0, 40);

      // Parallax background
      this.createParallaxBG();

      // Controles
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE
      });

      // Audio Synth
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      this.input.on('pointerdown', () => {
        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        this.playBGM();
      });
        this.input.keyboard.on('keydown', () => {
          if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
          this.playBGM();
        });
      } catch (err) {
        console.error(err);
        this.add.text(10, 10, err.message, { font: '16px Arial', fill: '#ff0000', backgroundColor: '#ffffff' });
      }
    }

    createParallaxBG() {
      // Hills in background
      const bgGfx = this.add.graphics();
      bgGfx.setScrollFactor(0.3);
      bgGfx.setDepth(-10);
      bgGfx.fillStyle(0x4A86D9, 0.6);
      for (let i = 0; i < 20; i++) {
        const hx = i * 300;
        const hw = 200 + Math.random() * 100;
        const hh = 60 + Math.random() * 40;
        bgGfx.fillEllipse(hx, GH - 64 - hh/2, hw, hh);
      }
      // Clouds
      const cloudGfx = this.add.graphics();
      cloudGfx.setScrollFactor(0.15);
      cloudGfx.setDepth(-9);
      cloudGfx.fillStyle(0xFFFFFF, 0.7);
      for (let i = 0; i < 12; i++) {
        const cx = i * 250 + Math.random() * 100;
        const cy = 30 + Math.random() * 60;
        cloudGfx.fillEllipse(cx, cy, 60, 25);
        cloudGfx.fillEllipse(cx + 20, cy - 10, 50, 20);
        cloudGfx.fillEllipse(cx - 15, cy - 5, 40, 18);
      }
    }

    playBGM() {
      if (this.bgmEvent) return;
      const notes = [330, 330, 0, 330, 0, 261, 330, 0, 392, 0, 0, 0, 196, 0, 0, 0];
      let i = 0;
      this.bgmEvent = this.time.addEvent({
        delay: 150,
        loop: true,
        callback: () => {
          if (this.triviaActive || this.gameEnded) return;
          if (notes[i]) this.playTone(notes[i], 'square', 0.1, 0.05);
          i = (i + 1) % notes.length;
        }
      });
    }

    generateTextures() {
      const makeTex = (key, pixels, palette, scale = 2) => {
        if (this.textures.exists(key)) return;
        const g = this.add.graphics();
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            const char = pixels[y] ? pixels[y][x] : ' ';
            if (char && char !== ' ' && palette[char]) {
              g.fillStyle(palette[char]);
              g.fillRect(x * scale, y * scale, scale, scale);
            }
          }
        }
        g.generateTexture(key, 16 * scale, 16 * scale);
        g.destroy();
      };

      const pal = {
        'R': 0xE52521, 'B': 0x43B047, 'O': 0x8B4513, 'S': 0xFFA040,
        'C': 0x000000, 'W': 0xFFFFFF, 'G': 0xC84C0C, 'g': 0xFCA044,
        'Y': 0xF83800, 'y': 0xFFA044
      };

      makeTex('mario_idle', [
        "    RRRRR       ", "   RRRRRRRRR    ", "   OOOSSOOS     ",
        "  OSOSSSOSSS    ", "  OSOSSSSSOS    ", "  OOSSSSOOOO    ",
        "    SSSSSSS     ", "   RR RRR       ", "  RRR RRR RRR   ",
        " RRRR RRR RRRR  ", " SS R RRR R SS  ", " SSS RRRRR SSS  ",
        " SS OOOOOOO SS  ", "    OOO OOO     ", "   OOO   OOO    ",
        "  OOOO   OOOO   "
      ], pal);

      makeTex('mario_run1', [
        "    RRRRR       ", "   RRRRRRRRR    ", "   OOOSSOOS     ",
        "  OSOSSSOSSS    ", "  OSOSSSSSOS    ", "  OOSSSSOOOO    ",
        "    SSSSSSS     ", "   RR RRR       ", "  RRR RRR RRR   ",
        " RRRR RRR RRRR  ", " SS R RRR R SS  ", " SSS RRRRR SSS  ",
        " SS OOOOOOO SS  ", "   OOO  OOO     ", "  OOO   OOO     ",
        " OOOO    OOOO   "
      ], pal);

      makeTex('mario_run2', [
        "    RRRRR       ", "   RRRRRRRRR    ", "   OOOSSOOS     ",
        "  OSOSSSOSSS    ", "  OSOSSSSSOS    ", "  OOSSSSOOOO    ",
        "    SSSSSSS     ", "   RR RRR       ", "  RRR RRR RRR   ",
        " RRRR RRR RRRR  ", " SS R RRR R SS  ", " SSS RRRRR SSS  ",
        " SS OOOOOOO SS  ", "     OOO        ", "    OOO         ",
        "   OOOO         "
      ], pal);

      makeTex('brick', [
        "GGGGGGGGGGGGGGGG", "gggggggggggggggC", "gGGGGGGCgGGGGGGC",
        "gGGGGGGCgGGGGGGC", "gGGGGGGCgGGGGGGC", "gGGGGGGCgGGGGGGC",
        "gGGGGGGCgGGGGGGC", "CCCCCCCCCCCCCCCC", "gGGGCgGGGGGGCgGG",
        "gGGGCgGGGGGGCgGG", "gGGGCgGGGGGGCgGG", "gGGGCgGGGGGGCgGG",
        "gGGGCgGGGGGGCgGG", "gGGGCgGGGGGGCgGG", "CCCCCCCCCCCCCCCC",
        "GGGGGGGGGGGGGGGG"
      ], pal);

      makeTex('question', [
        "YYYYYYYYYYYYYYYY", "YyyyyyyyyyyyyyyY", "YyYYYYYYYYYYYYyY",
        "YyYyyyyyyyyyyYyY", "YyYyYYYYYYYYyYyY", "YyYyYyyyyyyYyYyY",
        "YyYyYyYYYYyYyYyY", "YyYyYyYyyYyYyYyY", "YyYyYyYYYYyYyYyY",
        "YyYyYyYYYYyYyYyY", "YyYyYyYyyYyYyYyY", "YyYyYyYYYYyYyYyY",
        "YyYyYYYYYYYYyYyY", "YyYyyyyyyyyyyYyY", "YyYYYYYYYYYYYYyY",
        "YyyyyyyyyyyyyyyY"
      ], pal);

      makeTex('empty', [
        "GGGGGGGGGGGGGGGG", "GggggggggggggggG", "GgGGGGGGGGGGGGgG",
        "GgGCCCCCCCCCCGgG", "GgGCGGGGGGGGCGgG", "GgGCGGGGGGGGCGgG",
        "GgGCGGGGGGGGCGgG", "GgGCGGGGGGGGCGgG", "GgGCGGGGGGGGCGgG",
        "GgGCGGGGGGGGCGgG", "GgGCGGGGGGGGCGgG", "GgGCGGGGGGGGCGgG",
        "GgGCCCCCCCCCCGgG", "GgGGGGGGGGGGGGgG", "GggggggggggggggG",
        "GGGGGGGGGGGGGGGG"
      ], pal);

      makeTex('ground', [
        "yYyYyYyYyYyYyYyY", "YyYyYyYyYyYyYyYy", "yYyYyYyYyYyYyYyY",
        "YyYyYyYyYyYyYyYy", "GgGgGgGgGgGgGgGg", "gGgGgGgGgGgGgGgG",
        "GgGgGgGgGgGgGgGg", "gGgGgGgGgGgGgGgG", "GgGgGgGgGgGgGgGg",
        "gGgGgGgGgGgGgGgG", "GgGgGgGgGgGgGgGg", "gGgGgGgGgGgGgGgG",
        "GgGgGgGgGgGgGgGg", "gGgGgGgGgGgGgGgG", "GgGgGgGgGgGgGgGg",
        "gGgGgGgGgGgGgGgG"
      ], pal);

      // Pipes
      makeTex('pipe_tl', [
        "BBBBBBBBBBBBBBBB", "BWWWWBBBBBBBBBBB", "BWBBWBBBBBBBBBBB",
        "BWBBWBBBBBBBBBBB", "BWBBWBBBBBBBBBBB", "BWBBWBBBBBBBBBBB",
        "BWBBWBBBBBBBBBBB", "BWBBWBBBBBBBBBBB", "BWBBWBBBBBBBBBBB",
        "BWBBWBBBBBBBBBBB", "BWBBWBBBBBBBBBBB", "BWBBWBBBBBBBBBBB",
        "BWBBWBBBBBBBBBBB", "BWBBWBBBBBBBBBBB", "BWBBWBBBBBBBBBBB",
        "CBBBBBBBBBBBBBBC"
      ], pal);
      makeTex('pipe_tr', [
        "BBBBBBBBBBBBBBBB", "BBBBBBBBWWWWBBBB", "BBBBBBBBWBBWBBBB",
        "BBBBBBBBWBBWBBBB", "BBBBBBBBWBBWBBBB", "BBBBBBBBWBBWBBBB",
        "BBBBBBBBWBBWBBBB", "BBBBBBBBWBBWBBBB", "BBBBBBBBWBBWBBBB",
        "BBBBBBBBWBBWBBBB", "BBBBBBBBWBBWBBBB", "BBBBBBBBWBBWBBBB",
        "BBBBBBBBWBBWBBBB", "BBBBBBBBWBBWBBBB", "BBBBBBBBWBBWBBBB",
        "CBBBBBBBBBBBBBBC"
      ], pal);
      makeTex('pipe_bl', [
        "  BBBBBBBBBBBBBB", "  BWWWWBBBBBBBBB", "  BWBBWBBBBBBBBB",
        "  BWBBWBBBBBBBBB", "  BWBBWBBBBBBBBB", "  BWBBWBBBBBBBBB",
        "  BWBBWBBBBBBBBB", "  BWBBWBBBBBBBBB", "  BWBBWBBBBBBBBB",
        "  BWBBWBBBBBBBBB", "  BWBBWBBBBBBBBB", "  BWBBWBBBBBBBBB",
        "  BWBBWBBBBBBBBB", "  BWBBWBBBBBBBBB", "  BWBBWBBBBBBBBB",
        "  BWBBWBBBBBBBBB"
      ], pal);
      makeTex('pipe_br', [
        "BBBBBBBBBBBBBB  ", "BBBBBBBBWWWWBB  ", "BBBBBBBBWBBWBB  ",
        "BBBBBBBBWBBWBB  ", "BBBBBBBBWBBWBB  ", "BBBBBBBBWBBWBB  ",
        "BBBBBBBBWBBWBB  ", "BBBBBBBBWBBWBB  ", "BBBBBBBBWBBWBB  ",
        "BBBBBBBBWBBWBB  ", "BBBBBBBBWBBWBB  ", "BBBBBBBBWBBWBB  ",
        "BBBBBBBBWBBWBB  ", "BBBBBBBBWBBWBB  ", "BBBBBBBBWBBWBB  ",
        "BBBBBBBBWBBWBB  "
      ], pal);

      // Goomba
      makeTex('goomba1', [
        "    GGGGGGGG    ", "   GGGGGGGGGG   ", "  GGGGGGGGGGGG  ",
        " GGGGGGGGGGGGGG ", " GGGGGGGGGGGGGG ", " GGGGWWGGWWGGGG ",
        " GGGGWCGGWCGCGG ", " GGGGWCGGWCGCGG ", " GGGGGGGGGGGGGG ",
        " GGGGGGGGGCGGGG ", "  GGGGGGCCGGGG  ", "   SSSSSSSSSS   ",
        "  SSSSSSSSSSSS  ", "  SSSSSSSSSSSS  ", " CCCCC    CCCCC ",
        " CCCCC    CCCCC "
      ], pal);
      makeTex('goomba2', [
        "    GGGGGGGG    ", "   GGGGGGGGGG   ", "  GGGGGGGGGGGG  ",
        " GGGGGGGGGGGGGG ", " GGGGGGGGGGGGGG ", " GGGGWWGGWWGGGG ",
        " GGGGWCGGWCGCGG ", " GGGGWCGGWCGCGG ", " GGGGGGGGGGGGGG ",
        " GGGGGGGGGCGGGG ", "  GGGGGGCCGGGG  ", "   SSSSSSSSSS   ",
        "  SSSSSSSSSSSS  ", "  SSSSSSSSSSSS  ", "   CCCCC CCCCC  ",
        "   CCCCC CCCCC  "
      ], pal);

      // Coin (dorada brillante)
      makeTex('coin', [
        "      yyyy      ", "    yyYYYYyy    ", "   yYYyyyyYYy   ",
        "  yYYy    yYYy  ", "  yYYy    yYYy  ", " yYYy      yYYy ",
        " yYYy      yYYy ", " yYYy      yYYy ", " yYYy      yYYy ",
        " yYYy      yYYy ", " yYYy      yYYy ", "  yYYy    yYYy  ",
        "  yYYy    yYYy  ", "   yYYyyyyYYy   ", "    yyYYYYyy    ",
        "      yyyy      "
      ], pal);

      // Pole / Flag / Castle
      makeTex('pole', [
        "       CC       ", "       CC       ", "       CC       ",
        "       CC       ", "       CC       ", "       CC       ",
        "       CC       ", "       CC       ", "       CC       ",
        "       CC       ", "       CC       ", "       CC       ",
        "       CC       ", "       CC       ", "       CC       ",
        "       CC       "
      ], pal);

      makeTex('flag', [
        "  WWWWWWWWWWWW  ", "  WBBBBBBBBBBW  ", "  WBBBBBBBBBBW  ",
        "  WBBBBBBBBBBW  ", "  WBBBBBBBBBBW  ", "  WBBBBBBBBBBW  ",
        "  WBBBBBBBBBBW  ", "  WBBBBBBBBBBW  ", "  WWWWWWWWWWWW  ",
        "                ", "                ", "                ",
        "                ", "                ", "                ",
        "                "
      ], pal);

      // Castillo (más grande)
      makeTex('castle', [
        "  GGGG    GGGG  ", "  GGGG    GGGG  ", "  GGGGGGGGGGGG  ",
        " GGGGGGGGGGGGGG ", " GGGGGGGGGGGGGG ", " GGGGGGGGGGGGGG ",
        " GGGGG    GGGGG ", " GGGGG    GGGGG ", " GGGGG    GGGGG ",
        " GGGGG    GGGGG ", " GGGGG    GGGGG ", " GGGGG    GGGGG ",
        " GGGGG    GGGGG ", " GGGGG    GGGGG ", " GGGGG    GGGGG ",
        " GGGGG    GGGGG "
      ], pal, 4);

      // Star particle (for confetti)
      const starGfx = this.add.graphics();
      starGfx.fillStyle(0xFFD700);
      starGfx.beginPath();
      // Draw a simple 5-point star
      const cx = 8, cy = 8, outerRadius = 8, innerRadius = 3;
      let rot = Math.PI / 2 * 3;
      const step = Math.PI / 5;
      starGfx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < 5; i++) {
          starGfx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
          rot += step;
          starGfx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
          rot += step;
      }
      starGfx.lineTo(cx, cy - outerRadius);
      starGfx.closePath();
      starGfx.fillPath();
      starGfx.generateTexture('star', 16, 16);
      starGfx.destroy();
    }

    createAnimations() {
      this.anims.create({ key: 'mario_idle', frames: [{ key: 'mario_idle' }], frameRate: 10 });
      this.anims.create({ key: 'mario_jump', frames: [{ key: 'mario_run1' }], frameRate: 10 });
      this.anims.create({
        key: 'mario_run',
        frames: [{ key: 'mario_idle' }, { key: 'mario_run1' }, { key: 'mario_idle' }, { key: 'mario_run2' }],
        frameRate: 15, repeat: -1
      });
      this.anims.create({
        key: 'goomba_walk',
        frames: [{ key: 'goomba1' }, { key: 'goomba2' }],
        frameRate: 6, repeat: -1
      });
    }

    buildLevel() {
      const ts = 32;
      
      // Suelo con huecos
      for (let x = 0; x < this.worldWidth; x += ts) {
        if ((x > 1500 && x < 1564) || (x > 2200 && x < 2264)) continue;
        this.groundGroup.create(x + 16, GH - 16, 'ground');
        this.groundGroup.create(x + 16, GH - 48, 'ground');
      }

      // Bloques — repositioned to avoid pipe overlap
      const blocks = [
        { x: 400, y: GH - 150, type: '?' },
        { x: 550, y: GH - 150, type: 'B' },
        { x: 550+ts, y: GH - 150, type: '?' },
        { x: 550+ts*2, y: GH - 150, type: 'B' },
        { x: 550+ts*3, y: GH - 150, type: '?' },
        { x: 550+ts*4, y: GH - 150, type: 'B' },

        // Moved away from pipes (was at 1000, now at 1350+)
        { x: 1350, y: GH - 150, type: '?' },
        { x: 1350+ts, y: GH - 150, type: 'B' },
        { x: 1350+ts*2, y: GH - 150, type: '?' },

        { x: 1650, y: GH - 150, type: 'B' },
        { x: 1650+ts, y: GH - 150, type: '?' },

        { x: 1800, y: GH - 150, type: 'B' },
        { x: 1800+ts, y: GH - 150, type: '?' },
        { x: 1800+ts*2, y: GH - 150, type: '?' },
        { x: 1800+ts*3, y: GH - 150, type: 'B' },

        { x: 2000, y: GH - 150, type: '?' },

        { x: 2150, y: GH - 150, type: '?' },

        { x: 2350, y: GH - 150, type: '?' },

        // Pyramid
        { x: 2500, y: GH - 80, type: 'B' },
        { x: 2500+ts, y: GH - 80, type: 'B' }, { x: 2500+ts, y: GH - 112, type: 'B' },
        { x: 2500+ts*2, y: GH - 80, type: 'B' }, { x: 2500+ts*2, y: GH - 112, type: 'B' }, { x: 2500+ts*2, y: GH - 144, type: 'B' },
        { x: 2500+ts*3, y: GH - 80, type: 'B' }, { x: 2500+ts*3, y: GH - 112, type: 'B' }, { x: 2500+ts*3, y: GH - 144, type: 'B' }, { x: 2500+ts*3, y: GH - 176, type: 'B' }
      ];

      blocks.forEach(b => {
        if (b.type === 'B') {
          this.brickGroup.create(b.x, b.y, 'brick');
        } else if (b.type === '?') {
          const q = this.questionGroup.create(b.x, b.y, 'question');
          q.setData('active', true);
        }
      });

      // Tuberias — spaced further apart from blocks
      const pipes = [
        { x: 800, h: 2 },
        { x: 1000, h: 3 },
        { x: 1200, h: 2 }
      ];

      pipes.forEach(p => {
        const py = GH - 64;
        for (let i = 0; i < p.h; i++) {
          this.pipeGroup.create(p.x, py - (i * ts), 'pipe_bl');
          this.pipeGroup.create(p.x + ts, py - (i * ts), 'pipe_br');
        }
        this.pipeGroup.create(p.x, py - (p.h * ts), 'pipe_tl');
        this.pipeGroup.create(p.x + ts, py - (p.h * ts), 'pipe_tr');
      });

      // Flag and Castle (goal)
      const fx = 2700;
      for (let i = 0; i < 9; i++) {
        this.add.image(fx, GH - 80 - (i * ts), 'pole');
      }
      this.flag = this.add.image(fx - 16, GH - 80 - (8 * ts), 'flag');
      this.add.image(fx + 150, GH - 16, 'castle').setOrigin(0.5, 1);

      this.goalZone = this.add.rectangle(fx, GH - 200, 64, 400, 0x000000, 0);
      this.physics.add.existing(this.goalZone, true);

      // Enemies (spread across level)
      const enemyPos = [700, 1150, 1600, 1650, 2000, 2100];
      enemyPos.forEach(ex => {
        const e = this.enemies.create(ex, GH - 80, 'goomba1');
        e.setBounce(0);
        e.setCollideWorldBounds(true);
        e.setVelocityX(-50);
        e.play('goomba_walk');
      });
    }

    createPlayer() {
      this.player = this.physics.add.sprite(100, GH - 100, 'mario_idle');
      this.player.setBounce(0);
      this.player.setCollideWorldBounds(true);
      this.player.setMaxVelocity(200, 600);
      this.player.setDragX(500);
      this.physics.world.gravity.y = 1200;
      this.player.setSize(24, 30);
      this.player.setOffset(4, 2);
    }

    hitBrick(player, brick) {
      if (brick.body.touching.down && player.body.touching.up) {
        this.playTone(150, 'square', 0.1);
        this.tweens.add({ targets: brick, y: brick.y - 10, duration: 50, yoyo: true });
      }
    }

    hitQuestionBlock(player, block) {
      if (block.body.touching.down && player.body.touching.up) {
        if (block.getData('active') && !this.triviaActive) {
          this.triggerTrivia(block);
        }
      }
    }

    hitEnemy(player, enemy) {
      if (this.gameEnded || this.triviaActive) return;
      if (player.body.touching.down && enemy.body.touching.up) {
        this.playTone(800, 'square', 0.1, 0.3);
        enemy.destroy();
        player.setVelocityY(-300);
      } else {
        this.playTone(150, 'sawtooth', 0.5);
        this.player.setTint(0xff0000);
        this.physics.pause();
        this.time.delayedCall(1000, () => {
          this.player.setPosition(100, GH - 200);
          this.player.clearTint();
          this.physics.resume();
        });
      }
    }

    triggerTrivia(block) {
      this.triviaActive = true;
      this.physics.pause();
      
      // DEACTIVATE BLOCK IMMEDIATELY
      block.setData('active', false);
      block.setTexture('empty');
      
      this.tweens.add({ targets: block, y: block.y - 10, duration: 50, yoyo: true });

      onTriviaRequest((isCorrect) => {
        this.triviaActive = false;
        
        if (isCorrect) {
          this.playTone(880, 'sine', 0.3);
          this.playTone(1100, 'sine', 0.2);
          this.spawnCoin(block.x, block.y - 32);
          this.spawnConfettiExplosion(block.x, block.y);
          this.showPopupText(block.x, block.y - 64, "¡EXCELENTE!", '#43B047');
          // Screen flash green
          this.cameras.main.flash(300, 67, 176, 71, false);
        } else {
          this.playTone(150, 'sawtooth', 0.4);
          this.time.delayedCall(200, () => this.playTone(100, 'sawtooth', 0.4));
          this.spawnErrorEffect(block.x, block.y);
          this.showPopupText(block.x, block.y - 64, "¡UPS!", '#E52521');
          this.cameras.main.shake(300, 0.015);
          this.cameras.main.flash(200, 230, 57, 70, false);
          this.player.setVelocityY(-200);
          this.player.setVelocityX(-100);
        }

        this.physics.resume();
        
        if (gameState.questionIndex >= 10) {
          // Do NOT set this.gameEnded = true here, reachGoal handles it!
          this.time.delayedCall(500, () => this.reachGoal());
        }
      });
    }

    spawnCoin(x, y) {
      const coin = this.add.image(x, y + 16, 'coin');
      this.tweens.add({
        targets: coin, y: y - 48, duration: 400,
        yoyo: true, onComplete: () => coin.destroy()
      });
    }

    spawnConfettiExplosion(x, y) {
      // Multi-burst confetti explosion
      const colors = [0xFFD700, 0xFF6B6B, 0x43B047, 0x00D4FF, 0xFF69B4, 0xFFA500, 0x9B59B6];
      
      // Main burst
      const mainBurst = this.add.particles(0, 0, 'coin', {
        x: x, y: y,
        speed: { min: 200, max: 500 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        lifespan: 1800,
        gravityY: 600,
        quantity: 30,
        tint: colors,
        blendMode: 'ADD',
        rotate: { start: 0, end: 720 }
      });
      mainBurst.explode();

      // Star burst (delayed)
      this.time.delayedCall(100, () => {
        const starBurst = this.add.particles(0, 0, 'star', {
          x: x, y: y,
          speed: { min: 150, max: 400 },
          angle: { min: 200, max: 340 },
          scale: { start: 1.5, end: 0 },
          lifespan: 1500,
          gravityY: 500,
          quantity: 20,
          tint: [0xFFD700, 0xFFF700, 0xFFAA00],
          blendMode: 'ADD',
          rotate: { start: 0, end: 360 }
        });
        starBurst.explode();
        this.time.delayedCall(2000, () => starBurst.destroy());
      });

      // Ring effect
      const ring = this.add.circle(x, y, 5, 0xFFD700, 0.6);
      this.tweens.add({
        targets: ring, scaleX: 8, scaleY: 8, alpha: 0,
        duration: 600, ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });

      this.time.delayedCall(2500, () => mainBurst.destroy());
    }

    spawnErrorEffect(x, y) {
      const particles = this.add.particles(0, 0, 'brick', {
        x: x, y: y,
        speed: { min: 100, max: 300 },
        angle: { min: 180, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 1000,
        gravityY: 1000,
        quantity: 15
      });
      particles.explode();
      this.time.delayedCall(1200, () => particles.destroy());
    }

    showPopupText(x, y, text, color) {
      const txt = this.add.text(x, y, text, {
        fontFamily: 'Orbitron', fontSize: '24px', fontWeight: 'bold',
        color: color, stroke: '#000000', strokeThickness: 5
      }).setOrigin(0.5);

      this.tweens.add({
        targets: txt, y: y - 80, alpha: 0, scale: 1.8,
        duration: 1500, ease: 'Power2', onComplete: () => txt.destroy()
      });
    }

    reachGoal() {
      if (this.gameEnded) return;
      this.gameEnded = true;
      this.physics.pause();
      
      this.playTone(523.25, 'square', 0.2);
      this.time.delayedCall(200, () => this.playTone(659.25, 'square', 0.2));
      this.time.delayedCall(400, () => this.playTone(783.99, 'square', 0.4));
      
      this.showPopupText(this.player.x, this.player.y - 50, "¡NIVEL COMPLETADO!", '#FFD700');
      
      this.tweens.add({
        targets: this.flag,
        y: GH - 80,
        duration: 1000, ease: 'Linear'
      });

      const castleX = 2700 + 150;
      
      // Tween Mario down to the ground, then right to the castle
      this.tweens.add({
        targets: this.player,
        y: GH - 80, // on top of ground (ground top is GH - 64, Mario half-height is 16)
        duration: 500,
        ease: 'Linear',
        onComplete: () => {
          this.player.anims.play('mario_run', true);
          this.tweens.add({
            targets: this.player, 
            x: castleX, 
            duration: 1500,
            onComplete: () => {
              this.player.setAlpha(0);
              this.spawnFireworks(castleX, GH - 200);
              this.time.delayedCall(2000, onGameComplete);
            }
          });
        }
      });
    }

    spawnFireworks(x, y) {
      for (let i = 0; i < 4; i++) {
        this.time.delayedCall(i * 350, () => {
          this.playTone(1200 + Math.random() * 500, 'sine', 0.1);
          const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
          const color = colors[Math.floor(Math.random() * colors.length)];
          const particles = this.add.particles(0, 0, 'coin', {
            x: x + (Math.random() * 120 - 60),
            y: y + (Math.random() * 80 - 40),
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            lifespan: 1200,
            gravityY: 100,
            tint: color,
            quantity: 50,
            blendMode: 'ADD'
          });
          particles.explode();
          this.time.delayedCall(1500, () => particles.destroy());
        });
      }
    }

    playTone(freq, type, duration, gain = 0.1) {
      if (window.appMuted || !this.audioCtx) return;
      try {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
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

    update() {
      if (this.triviaActive || this.gameEnded) return;

      if (this.player.y > GH) {
        this.physics.pause();
        this.playTone(150, 'sawtooth', 0.5);
        this.time.delayedCall(1000, () => {
          this.player.setPosition(100, GH - 200);
          this.player.clearTint();
          this.physics.resume();
        });
        return;
      }

      const onGround = this.player.body.blocked.down || this.player.body.touching.down;
      const left = this.cursors.left.isDown || this.wasd.left.isDown || this.touchLeft;
      const right = this.cursors.right.isDown || this.wasd.right.isDown || this.touchRight;
      const jump = this.cursors.up.isDown || this.wasd.up.isDown || this.wasd.space.isDown || this.touchJump;

      if (left) {
        this.player.setVelocityX(-200);
        this.player.setFlipX(true);
        if (onGround) this.player.play('mario_run', true);
      } else if (right) {
        this.player.setVelocityX(200);
        this.player.setFlipX(false);
        if (onGround) this.player.play('mario_run', true);
      } else {
        this.player.setVelocityX(0);
        if (onGround) this.player.play('mario_idle', true);
      }

      if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || 
          Phaser.Input.Keyboard.JustDown(this.wasd.up) || 
          Phaser.Input.Keyboard.JustDown(this.wasd.space) || 
          (this.touchJump && onGround)) {
        if (onGround) {
          this.player.setVelocityY(-450);
          this.playTone(440, 'square', 0.1, 0.1);
        }
      }

      if (!onGround) {
        this.player.play('mario_jump', true);
        if (!jump && this.player.body.velocity.y < -150) {
          this.player.setVelocityY(this.player.body.velocity.y * 0.5);
        }
      }

      // Enemy AI
      this.enemies.children.iterate(e => {
        if (e && e.body) {
          if (e.body.blocked.right) e.setVelocityX(-50);
          else if (e.body.blocked.left) e.setVelocityX(50);
        }
      });
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GW,
    height: GH,
    parent: 'phaser-container',
    backgroundColor: '#5C94FC',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 1200 }, debug: false }
    },
    scene: [MarioScene],
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
  let tc = document.getElementById('touch-controls-m1');
  if (tc) tc.remove();
  
  tc = document.createElement('div');
  tc.id = 'touch-controls-m1';
  tc.style.cssText = `
    position:absolute;bottom:20px;left:0;right:0;
    display:flex;justify-content:space-between;padding:0 30px;
    pointer-events:none;z-index:900;
  `;
  tc.innerHTML = `
    <div style="display:flex;gap:15px;pointer-events:all;">
      <button id="tc-left" class="touch-btn" style="width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.25);backdrop-filter:blur(4px);font-size:1.4rem;">◀</button>
      <button id="tc-right" class="touch-btn" style="width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.25);backdrop-filter:blur(4px);font-size:1.4rem;">▶</button>
    </div>
    <button id="tc-jump" class="touch-btn" style="width:80px;height:80px;border-radius:50%;background:rgba(230,57,70,0.5);pointer-events:all;backdrop-filter:blur(4px);font-size:1.4rem;font-weight:bold;">A</button>
  `;
  container.style.position = 'relative';
  container.appendChild(tc);

  const setTouch = (id, prop, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    const updateScene = (value) => {
      const scene = game.scene.scenes[0];
      if (scene) scene[prop] = value;
    };
    el.addEventListener('touchstart', e => { e.preventDefault(); updateScene(val); });
    el.addEventListener('touchend', e => { e.preventDefault(); updateScene(false); });
    el.addEventListener('mousedown', () => { updateScene(val); });
    el.addEventListener('mouseup', () => { updateScene(false); });
    el.addEventListener('mouseleave', () => { updateScene(false); });
  };

  setTouch('tc-left', 'touchLeft', true);
  setTouch('tc-right', 'touchRight', true);
  
  const jumpBtn = document.getElementById('tc-jump');
  if (jumpBtn) {
    const updateJump = (val) => {
      const scene = game.scene.scenes[0];
      if (scene) scene.touchJump = val;
    };
    jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); updateJump(true); });
    jumpBtn.addEventListener('touchend', e => { e.preventDefault(); updateJump(false); });
    jumpBtn.addEventListener('mousedown', () => { updateJump(true); });
    jumpBtn.addEventListener('mouseup', () => { updateJump(false); });
  }
}
