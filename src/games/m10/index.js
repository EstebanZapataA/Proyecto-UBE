import Phaser from 'phaser';

export function createGame(gameState, onTriviaRequest, onGameComplete, W = 700, H = 480) {
  const container = document.getElementById('phaser-container');

  class RouletteScene extends Phaser.Scene {
    constructor() { super('RouletteScene'); }

    preload() {
      this.load.image('ecuador_bg', '/assets/ecuador_bg.png');
    }

    create() {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.cameras.main.setBackgroundColor('#1e1b4b'); // Fondo oscuro
      this.add.image(W/2, H/2, 'ecuador_bg').setOrigin(0.5).setDisplaySize(W, H).setAlpha(0.4);
      this.generateTextures();
      
      this.state = 'IDLE'; // IDLE, SPINNING, DRAGGING, RESULT
      this.round = 0;
      
      // Partículas
      this.emitter = this.add.particles(0, 0, 'star', {
        speed: { min: 200, max: 600 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        blendMode: 'ADD',
        emitting: false,
        lifespan: { min: 1500, max: 3000 },
        gravityY: 400,
        tint: [ 0xffff00, 0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0x00ffff ]
      });

      // Crear Ruleta
      this.wheelContainer = this.add.container(W/2, H/2 - 40);
      
      const wheelShape = this.add.sprite(0, 0, 'wheel');
      this.wheelContainer.add(wheelShape);
      
      const ecuadorThemes = ['Costa', 'Sierra', 'Oriente', 'Galápagos', 'Cacao', 'Encebollado', 'Cóndor', 'Volcán', 'Ecuador'];
      const numSlices = 9;
      for (let i = 0; i < numSlices; i++) {
        const angle = (i + 0.5) * (360 / numSlices);
        const rad = Phaser.Math.DegToRad(angle);
        const radius = 200;
        const tx = Math.cos(rad) * radius;
        const ty = Math.sin(rad) * radius;
        const text = this.add.text(tx, ty, ecuadorThemes[i], {
          fontFamily: 'Inter', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setAngle(angle);
        this.wheelContainer.add(text);
      }
      
      const pointer = this.add.sprite(W/2, H/2 - 40 - 280, 'pointer').setOrigin(0.5, 1);
      
      this.spinBtn = this.add.text(W/2, H - 50, 'GIRAR RULETA', {
        fontFamily: 'Orbitron', fontSize: '24px', backgroundColor: '#ec4899',
        color: '#fff', padding: { x: 20, y: 10 }, borderRadius: '8px'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      this.spinBtn.on('pointerdown', () => this.spinWheel());

      // Contenedor para Drag & Drop (oración)
      this.dndContainer = this.add.container(0, 0);
      this.dndContainer.setVisible(false);
      
      this.wordBlocks = [];
      this.dropZones = [];
      this.wordBlocks = [];
      this.dropZones = [];
      this.currentQuestion = null;
      
      this.verifyBtn = this.createButton(W/2, H - 40, 'VERIFICAR', 0x10b981, () => this.verifyAnswer());
      this.verifyBtn.setVisible(false);
      
      // Contenedor de Mensajes Pop-up
      this.msgContainer = this.add.container(W/2, H/4 - 10).setDepth(100).setScale(0).setVisible(false);
      const msgBg = this.add.graphics();
      msgBg.fillStyle(0x1e293b, 0.9);
      msgBg.fillRoundedRect(-200, -60, 400, 120, 20);
      msgBg.lineStyle(4, 0xffffff, 1);
      msgBg.strokeRoundedRect(-200, -60, 400, 120, 20);
      
      this.msgTitle = this.add.text(0, -20, '¡Correcto!', { fontFamily: 'Orbitron', fontSize: '28px', color: '#10b981', fontStyle: 'bold' }).setOrigin(0.5);
      this.msgDesc = this.add.text(0, 20, 'Desc', { fontFamily: 'Inter', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
      this.msgContainer.add([msgBg, this.msgTitle, this.msgDesc]);
      
      this.nextBtn = this.createButton(W/2, H - 40, 'SIGUIENTE', 0x3b82f6, () => this.nextRound());
      this.nextBtn.setVisible(false);

      // Manejo de Drag & Drop en la escena
      this.input.on('dragstart', (pointer, gameObject) => {
        if (this.state !== 'DRAGGING') return;
        this.children.bringToTop(gameObject);
        gameObject.setAlpha(0.7);
      });

      this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (this.state !== 'DRAGGING') return;
        gameObject.x = dragX;
        gameObject.y = dragY;
      });

      this.input.on('dragenter', (pointer, gameObject, dropZone) => {
        if (this.state !== 'DRAGGING') return;
        dropZone.setTint(0x00ff00);
      });

      this.input.on('dragleave', (pointer, gameObject, dropZone) => {
        if (this.state !== 'DRAGGING') return;
        dropZone.clearTint();
      });

      this.input.on('drop', (pointer, gameObject, dropZone) => {
        if (this.state !== 'DRAGGING') return;
        dropZone.clearTint();
        
        // Intercambiar si la zona ya tiene un bloque
        const existingBlock = this.wordBlocks.find(b => b.currentZone === dropZone);
        if (existingBlock && existingBlock !== gameObject) {
          existingBlock.x = gameObject.input.dragStartX;
          existingBlock.y = gameObject.input.dragStartY;
          existingBlock.currentZone = gameObject.currentZone;
        }

        gameObject.x = dropZone.x;
        gameObject.y = dropZone.y;
        gameObject.currentZone = dropZone;
      });

      this.input.on('dragend', (pointer, gameObject, dropped) => {
        if (this.state !== 'DRAGGING') return;
        gameObject.setAlpha(1);
        if (!dropped) {
          gameObject.currentZone = null;
          gameObject.x = gameObject.originalX;
          gameObject.y = gameObject.originalY;
        }
      });
    }

    spinWheel() {
      if (this.state !== 'IDLE' || this.round >= 10) return;
      this.state = 'SPINNING';
      this.spinBtn.setVisible(false);
      
      const spins = Phaser.Math.Between(3, 5);
      const randomAngle = Phaser.Math.Between(0, 360);
      
      let lastAngle = 0;
      this.tweens.add({
        targets: this.wheelContainer,
        angle: 360 * spins + randomAngle,
        duration: 3000,
        ease: 'Cubic.easeOut',
        onUpdate: (tween, target) => {
          if (Math.abs(target.angle - lastAngle) > 20) {
            this.playTick();
            lastAngle = target.angle;
          }
        },
        onComplete: () => {
          this.startDragAndDrop();
        }
      });
    }

    playTick() {
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + 0.05);
    }

    playVictorySound() {
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.type = 'triangle';
        
        const startTime = this.audioCtx.currentTime + i * 0.15;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    }

    playErrorSound() {
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.type = 'sawtooth';
      
      const startTime = this.audioCtx.currentTime;
      osc.frequency.setValueAtTime(150, startTime);
      osc.frequency.linearRampToValueAtTime(100, startTime + 0.3);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    }

    startDragAndDrop() {
      this.state = 'DRAGGING';
      this.wheelContainer.setVisible(false);
      
      this.dndContainer.setVisible(true);
      this.verifyBtn.setVisible(true);
      
      this.currentQuestion = gameState.questions[gameState.questionIndex];
      const words = [...this.currentQuestion.opciones];
      // Desordenar palabras si vienen en orden
      Phaser.Utils.Array.Shuffle(words);
      
      // Título
      const title = this.add.text(W/2, 50, this.currentQuestion.enunciado, {
        fontFamily: 'Inter', fontSize: '20px', color: '#fff', align: 'center', wordWrap: { width: W - 40 }
      }).setOrigin(0.5);
      this.dndContainer.add(title);
      
      // Zonas de caída (Drop Zones) y Bloques (Words)
      const numWords = words.length;
      const zoneWidth = 120; // Increased width for longer words
      const spacing = 10;
      const totalWidth = numWords * zoneWidth + (numWords - 1) * spacing;
      const startX = (W - totalWidth) / 2;
      
      for (let i = 0; i < numWords; i++) {
        // Zona
        const zx = startX + i * (zoneWidth + spacing);
        const zy = H / 2 - 20;
        const zoneSprite = this.add.sprite(zx, zy, 'dropzone').setInteractive({ dropZone: true }).setOrigin(0, 0);
        zoneSprite.expectedWord = this.currentQuestion.opciones[i];
        this.dropZones.push(zoneSprite);
        this.dndContainer.add(zoneSprite);
        
        // Bloque
        const bx = startX + i * (zoneWidth + spacing);
        const by = H - 150; 
        const block = this.add.container(bx, by);
        block.setSize(zoneWidth, 40);
        
        const bg = this.add.graphics();
        bg.fillStyle(0xf59e0b, 1);
        bg.fillRoundedRect(0, 0, zoneWidth, 40, 20);
        bg.lineStyle(3, 0xffffff, 1);
        bg.strokeRoundedRect(0, 0, zoneWidth, 40, 20);
        
        const txt = this.add.text(zoneWidth/2, 20, words[i], { fontFamily: 'Inter', fontSize: '18px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        
        block.add([bg, txt]);
        block.wordText = words[i];
        block.currentZone = null;
        block.originalX = bx;
        block.originalY = by;
        
        block.setInteractive({ 
          hitArea: new Phaser.Geom.Rectangle(0, 0, zoneWidth, 40), 
          hitAreaCallback: Phaser.Geom.Rectangle.Contains, 
          useHandCursor: true, 
          draggable: true 
        });
        
        this.wordBlocks.push(block);
        this.dndContainer.add(block);
      }
    }

    verifyAnswer() {
      if (this.state !== 'DRAGGING') return;
      
      // Comprobar si todas las zonas tienen un bloque
      const filledZones = this.dropZones.filter(z => this.wordBlocks.some(b => b.currentZone === z));
      if (filledZones.length < this.dropZones.length) {
        this.showMessage('Atención', 'Coloca todas las palabras en los espacios', '#f59e0b', false);
        return;
      }
      
      this.state = 'VALIDATING';
      this.verifyBtn.setVisible(false);
      
      // Reconstruir la oración basada en el orden de las zonas (x)
      this.dropZones.sort((a, b) => a.x - b.x);
      
      const correctWords = this.currentQuestion.explicacion.trim().split(' ');
      let allCorrect = true;
      
      this.dropZones.forEach((zone, idx) => {
        const block = this.wordBlocks.find(b => b.currentZone === zone);
        const correctWordText = correctWords[idx] || '';
        
        const blockNorm = block.wordText.toLowerCase().replace(/[^a-z0-9]/g, '');
        const correctNorm = correctWordText.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const bg = block.list[0];
        if (bg && bg.clear) {
          bg.clear();
          if (blockNorm === correctNorm) {
            bg.fillStyle(0x10b981, 1); // Verde si está en su posición correcta
          } else {
            bg.fillStyle(0xe63946, 1); // Rojo si es incorrecto
            allCorrect = false;
            
            // Vibrar bloque incorrecto
            this.tweens.add({
              targets: block,
              x: block.x + 8,
              yoyo: true,
              repeat: 3,
              duration: 50
            });
          }
          bg.fillRoundedRect(0, 0, 120, 40, 20);
          bg.lineStyle(3, 0xffffff, 1);
          bg.strokeRoundedRect(0, 0, 120, 40, 20);
        }
      });
      
      if (allCorrect) {
        this.showMessage('¡Correcto!', this.currentQuestion.explicacion, '#10b981', true);
        this.emitter.setPosition(W/2, H/2);
        this.emitter.explode(200);
        this.playVictorySound();
        
        // Animación de salto celebratorio
        this.wordBlocks.forEach((b, i) => {
          if (b.currentZone) {
            this.tweens.add({
              targets: b,
              y: b.y - 20,
              yoyo: true,
              duration: 200,
              delay: i * 100,
              ease: 'Sine.easeInOut'
            });
          }
        });
        
        gameState.hits++;
        gameState.score += 100;
      } else {
        this.showMessage('Incorrecto', 'La oración correcta es:\n' + this.currentQuestion.explicacion, '#e63946', true);
        this.playErrorSound();
        this.cameras.main.shake(300, 0.015); // Tiembla la pantalla
      }
      
      // Actualizar HUD via DOM
      const hudHits = document.getElementById('hud-hits');
      const hudScore = document.getElementById('hud-score');
      if (hudHits) hudHits.textContent = gameState.hits;
      if (hudScore) hudScore.textContent = gameState.score;
      
      gameState.questionIndex++;
      const hudQ = document.getElementById('hud-questions');
      if (hudQ) hudQ.textContent = Math.min(gameState.questionIndex, 10) + '/10';
    }

    showMessage(title, desc, color, showNext) {
      this.msgTitle.setText(title);
      this.msgTitle.setColor(color);
      this.msgDesc.setText(desc);
      this.msgContainer.setVisible(true);
      
      this.tweens.add({
        targets: this.msgContainer,
        scale: 1,
        duration: 400,
        ease: 'Back.easeOut'
      });
      
      if (showNext) {
        this.nextBtn.setVisible(true);
      } else {
        setTimeout(() => {
          if (this.state === 'DRAGGING') {
            this.tweens.add({
              targets: this.msgContainer,
              scale: 0,
              duration: 200,
              onComplete: () => this.msgContainer.setVisible(false)
            });
          }
        }, 2000);
      }
    }

    nextRound() {
      this.round++;
      
      this.tweens.add({
        targets: this.msgContainer,
        scale: 0,
        duration: 200,
        onComplete: () => this.msgContainer.setVisible(false)
      });
      
      this.nextBtn.setVisible(false);
      
      if (this.round >= 10 || gameState.questionIndex >= gameState.questions.length) {
        this.showFinalCelebration();
        return;
      }
      
      // Limpiar DND
      this.dndContainer.removeAll(true);
      this.dndContainer.setVisible(false);
      this.wordBlocks = [];
      this.dropZones = [];
      
      // Volver a la ruleta
      this.state = 'IDLE';
      this.wheelContainer.setVisible(true);
      this.wheelContainer.setAngle(0);
      this.spinBtn.setVisible(true);
    }

    generateTextures() {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      
      // Estrella
      g.clear();
      g.fillStyle(0xffd700, 1);
      g.fillPoint(5, 5, 10);
      g.generateTexture('star', 10, 10);
      
      // Ruleta
      g.clear();
      const numSlices = 9;
      const colors = [0xe63946, 0x7c3aed, 0x0ea5e9, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xef4444, 0x14b8a6, 0xf97316];
      for (let i = 0; i < numSlices; i++) {
        g.fillStyle(colors[i % colors.length], 1);
        g.slice(300, 300, 280, Phaser.Math.DegToRad(i * (360/numSlices)), Phaser.Math.DegToRad((i+1) * (360/numSlices)), false);
        g.fillPath();
        
        g.lineStyle(4, 0xffffff, 1);
        g.slice(300, 300, 280, Phaser.Math.DegToRad(i * (360/numSlices)), Phaser.Math.DegToRad((i+1) * (360/numSlices)), false);
        g.strokePath();
      }
      g.fillStyle(0xffffff, 1);
      g.fillCircle(300, 300, 30);
      g.generateTexture('wheel', 600, 600);
      
      // Puntero
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(0, 0, 20, 0, 10, 30);
      g.generateTexture('pointer', 20, 30);
      
      // Zona de Drop
      g.clear();
      g.fillStyle(0x000000, 0.4);
      g.fillRoundedRect(0, 0, 120, 40, 15);
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeRoundedRect(0, 0, 120, 40, 15);
      g.generateTexture('dropzone', 120, 40);
    }

    createButton(x, y, text, color, onClick) {
      const btn = this.add.container(x, y).setDepth(200);
      const bg = this.add.graphics();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-80, -25, 160, 50, 25);
      bg.lineStyle(3, 0xffffff, 1);
      bg.strokeRoundedRect(-80, -25, 160, 50, 25);
      
      const txt = this.add.text(0, 0, text, { fontFamily: 'Orbitron', fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      btn.add([bg, txt]);
      
      btn.setInteractive(new Phaser.Geom.Rectangle(-80, -25, 160, 50), Phaser.Geom.Rectangle.Contains);
      btn.input.cursor = 'pointer';
      
      btn.on('pointerdown', () => {
        this.tweens.add({ targets: btn, scale: 0.9, yoyo: true, duration: 50 });
        onClick();
      });
      
      return btn;
    }

    showFinalCelebration() {
      this.state = 'RESULT';
      this.dndContainer.setVisible(false);
      
      const finalMsg = this.add.text(W/2, H/2 - 50, '¡MODULO COMPLETADO!', {
        fontFamily: 'Orbitron', fontSize: '36px', color: '#f59e0b', fontStyle: 'bold', stroke: '#fff', strokeThickness: 4
      }).setOrigin(0.5).setScale(0);
      
      this.tweens.add({
        targets: finalMsg,
        scale: 1,
        duration: 1000,
        ease: 'Elastic.easeOut',
        onComplete: () => {
          this.emitter.setPosition(W/2, H/2);
          this.emitter.explode(300);
          this.playVictorySound();
          setTimeout(() => {
            if (onGameComplete) onGameComplete();
          }, 3000);
        }
      });
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: container,
    backgroundColor: '#1e1b4b',
    scene: RouletteScene,
    physics: { default: 'arcade', arcade: { debug: false } }
  };

  const game = new Phaser.Game(config);
  return game;
}
