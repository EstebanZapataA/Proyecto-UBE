// =============================================
// EduPlay UBE — Administrador de Juegos
// Lanza/destruye instancias Phaser por módulo
// =============================================

import { supabase } from '../supabaseClient.js';
import { loadTrivia } from '../utils/trivia.js';
import { generateDiplomaPDF } from '../utils/diploma.js';

const MODULE_CONFIG = {
  1: { name: 'Super Mario',     theme: 'Personal Pronouns',   color: '#e63946' },
  2: { name: 'Pac-Man',     theme: 'Verb TO BE',           color: '#7c3aed' },
  3: { name: 'TeTris',     theme: 'Family Vocabulary',    color: '#0ea5e9' },
  4: { name: 'Penales', theme: 'Adjectives & Opposites', color: '#10b981' },
  5: { name: 'Roblox Obby', theme: 'Future Tenses', color: '#f59e0b' },
  6: { name: 'Duck Hunt', theme: 'Modals & Conditionals', color: '#8b5cf6' },
  7: { name: 'Home Run', theme: 'Past Tense', color: '#ef4444' },
  8: { name: 'Guayaquil Bike', theme: 'Vocabulary', color: '#14b8a6' },
  9: { name: 'Basketball', theme: 'Present Tense', color: '#f97316' },
  10:{ name: 'Ruleta', theme: 'Sentence Ordering', color: '#ec4899' },
};

export async function launchGame(moduleId, user, profile, onExit) {
  // Ocultar layout, mostrar vista de juego
  document.getElementById('main-view').classList.remove('active');
  const gameView = document.getElementById('game-view');
  gameView.classList.add('active');

  const mod = MODULE_CONFIG[moduleId];
  const questions = await loadTrivia(moduleId);

  // Crear topbar del juego
  gameView.innerHTML = `
    <div class="game-topbar">
      <div class="game-hud">
        <div class="hud-item">
          <span class="hud-value" id="hud-questions">0/10</span>
          <span class="hud-label">Preguntas</span>
        </div>
        <div class="hud-item">
          <span class="hud-value" id="hud-hits">0</span>
          <span class="hud-label">Aciertos</span>
        </div>
        <div class="hud-item">
          <span class="hud-value" id="hud-score">0</span>
          <span class="hud-label">Puntos</span>
        </div>
        <div class="hud-item">
          <span class="hud-value" id="hud-timer">0:00</span>
          <span class="hud-label">Tiempo</span>
        </div>
      </div>
      <span class="game-title-bar" style="color:${mod.color}">${mod.name}</span>
      <button class="game-exit-btn" onclick="window.exitGame()">✕ Salir</button>
    </div>
    <div id="phaser-container"></div>
  `;

  // Estado del juego
  const gameState = {
    moduleId,
    questions,
    questionIndex: 0,
    hits: 0,
    score: 0,
    startTime: Date.now(),
    timerInterval: null,
    phaserGame: null,
  };

  // Limpiar timer anterior si existe
  if (window.activeTimerInterval) {
    clearInterval(window.activeTimerInterval);
  }

  // Cronómetro
  window.activeTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const el = document.getElementById('hud-timer');
    if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
  gameState.timerInterval = window.activeTimerInterval;

  // Cargar escena de juego — esperar a que el DOM esté pintado
  const phaserModule = await getGameScene(moduleId);

  // Esperar dos frames para asegurar que #phaser-container tenga dimensiones reales
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const container = document.getElementById('phaser-container');
  if (!container) {
    console.error('phaser-container no encontrado en el DOM');
    return;
  }

  // Medir el contenedor después de dos frames de layout
  const W = container.offsetWidth  || window.innerWidth;
  const H = container.offsetHeight || (window.innerHeight - 52);

  const game = await phaserModule.createGame(gameState, onTriviaRequest, onGameComplete, W, H);
  gameState.phaserGame = game;
  window.activePhaserGame = game;
  if (window.appMuted) game.sound.setMute(true);

  // Phaser's FIT scale mode handles resize automatically
  const onResize = () => {};
  window.addEventListener('resize', onResize);
  game._eduplayResizeHandler = onResize;


  // Función de trivia
  window.exitGame = () => {
    cleanup(gameState);
    document.getElementById('game-view').classList.remove('active');
    document.getElementById('game-view').innerHTML = '';
    document.getElementById('main-view').classList.add('active');
    window.activePhaserGame = null;
    onExit();
  };

  function onTriviaRequest(onAnswer) {
    showTriviaModal(gameState, onAnswer);
  }

  async function onGameComplete() {
    clearInterval(gameState.timerInterval);
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const bonusTiempo = Math.max(0, (180 - elapsed)) * 2;
    const puntajeFinal = gameState.hits * 100 + bonusTiempo;
    const aprobado = gameState.hits >= 7;

    // Guardar intento
    try {
      const { error } = await supabase.from('intentos').insert({
        user_id: user.id,
        modulo_id: moduleId,
        puntaje: puntajeFinal,
        aciertos: gameState.hits,
        total_preguntas: 10,
        tiempo_segundos: elapsed,
        completado: true,
        aprobado
      });
      if (error) throw error;
    } catch (e) {
      console.error('Error guardando intento:', e);
      alert('Hubo un error al guardar tu puntuación. Por favor, asegúrate de estar conectado y vuelve a intentarlo.');
    }

    // Limpiar juego
    cleanup(gameState);

    // Mostrar resultados
    showResults(puntajeFinal, gameState.hits, elapsed, aprobado, moduleId, user, profile, onExit);
  }
}

function showTriviaModal(gameState, onAnswer) {
  const modal = document.getElementById('trivia-modal');
  if (!modal) {
    if (onAnswer) onAnswer(false);
    return;
  }
  
  // If out of questions, just resume game so it doesn't block forever
  if (gameState.questionIndex >= gameState.questions.length) {
    if (onAnswer) onAnswer(true);
    return;
  }

  const q = gameState.questions[gameState.questionIndex];
  const letters = ['A', 'B', 'C', 'D'];
  const modCfg = MODULE_CONFIG[gameState.moduleId];

  modal.innerHTML = `
    <div class="trivia-confetti" id="trivia-confetti"></div>
    <div class="trivia-card">
      <div class="trivia-progress">
        <span class="trivia-counter">Pregunta ${gameState.questionIndex + 1} / 10</span>
        <span class="trivia-topic">${modCfg.theme}</span>
      </div>
      <div class="trivia-question">${q.enunciado}</div>
      <div class="trivia-options">
        ${q.opciones.map((op, i) => `
          <button class="trivia-option" id="opt-${i}" onclick="window.triviaAnswer(${i})">
            <span class="option-letter">${letters[i]}</span>
            ${op}
          </button>
        `).join('')}
      </div>
      <div class="trivia-feedback" id="trivia-feedback"></div>
    </div>
  `;

  modal.classList.add('active');

  let answered = false;
  window.triviaAnswer = (selectedIdx) => {
    if (answered) return;
    answered = true;

    // Deshabilitar opciones
    document.querySelectorAll('.trivia-option').forEach(btn => btn.onclick = null);

    const isCorrect = selectedIdx === q.indice_correcto;
    const feedback = document.getElementById('trivia-feedback');

    // Colorear opciones
    document.getElementById(`opt-${q.indice_correcto}`).classList.add('correct');
    if (!isCorrect) {
      document.getElementById(`opt-${selectedIdx}`).classList.add('incorrect');
    }

    feedback.className = `trivia-feedback visible ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = isCorrect
      ? `<div style="font-size: 1.4rem; margin-bottom: 8px; color: #6ee7b7; text-shadow: 0 0 10px rgba(110,231,183,0.5);">🎉 ¡Excelente! Respuesta correcta. 🌟</div>
         <div style="font-size: 1rem; font-weight: normal; line-height: 1.5; color: rgba(255,255,255,0.9); background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 12px; border-radius: 8px; margin-bottom: 16px;"><strong>💡 Explicación:</strong> ${q.explicacion || ''}</div>
         <button class="trivia-continue-btn" onclick="window.triviaContinue(${isCorrect})" style="padding: 12px 28px; border-radius: 8px; border: none; background: linear-gradient(135deg, #10b981, #059669); color: white; cursor: pointer; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(16,185,129,0.4); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Continuar con el juego ➔</button>`
      : `<div style="font-size: 1.4rem; margin-bottom: 8px; color: #fca5a5; text-shadow: 0 0 10px rgba(252,165,165,0.5);">❌ Incorrecto. La correcta era: <strong style="color: #fff; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">${q.opciones[q.indice_correcto]}</strong></div>
         <div style="font-size: 1rem; font-weight: normal; line-height: 1.5; color: rgba(255,255,255,0.9); background: rgba(230,57,70,0.1); border: 1px solid rgba(230,57,70,0.3); padding: 12px; border-radius: 8px; margin-bottom: 16px;"><strong>💡 Explicación:</strong> ${q.explicacion || ''}</div>
         <button class="trivia-continue-btn" onclick="window.triviaContinue(${isCorrect})" style="padding: 12px 28px; border-radius: 8px; border: none; background: linear-gradient(135deg, #e63946, #b02030); color: white; cursor: pointer; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(230,57,70,0.4); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Continuar con el juego ➔</button>`;

    // Confetti explosion for correct answers
    if (isCorrect) {
      spawnTriviaConfetti();
      gameState.hits++;
      gameState.score += 100;
      document.getElementById('hud-hits').textContent = gameState.hits;
      document.getElementById('hud-score').textContent = gameState.score;
    }
    gameState.questionIndex++;
    document.getElementById('hud-questions').textContent = `${gameState.questionIndex}/10`;

    window.triviaContinue = (correct) => {
      modal.classList.remove('active');
      modal.innerHTML = '';
      onAnswer(correct);
    };
  };
}

function spawnTriviaConfetti() {
  const container = document.getElementById('trivia-confetti');
  if (!container) return;
  
  const colors = ['#FFD700', '#FF6B6B', '#43B047', '#00D4FF', '#FF69B4', '#FFA500', '#9B59B6', '#FF4500', '#00FF88', '#FFE66D'];
  const shapes = ['square', 'circle', 'triangle', 'star'];
  
  for (let i = 0; i < 150; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const size = 10 + Math.random() * 15;
    
    if (shape === 'star') {
      piece.innerHTML = '★';
      piece.style.color = color;
      piece.style.fontSize = `${size * 2}px`;
      piece.style.background = 'transparent';
      piece.style.textShadow = `0 0 ${size}px ${color}, 0 0 ${size/2}px #ffffff`;
    } else {
      piece.style.background = color;
    }

    piece.style.cssText += `
      left: ${left}%;
      top: -20px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      animation-delay: ${delay}s;
      animation-duration: ${1.5 + Math.random() * 2}s;
      ${shape === 'circle' ? 'border-radius: 50%;' : ''}
      ${shape === 'triangle' ? `
        width: 0; height: 0; background: none;
        border-left: ${size/2}px solid transparent;
        border-right: ${size/2}px solid transparent;
        border-bottom: ${size}px solid ${color};
      ` : ''}
    `;
    
    container.appendChild(piece);
  }
  
  // Clean up confetti after animation
  setTimeout(() => {
    if (container) container.innerHTML = '';
  }, 3500);
}


function showResults(score, hits, elapsed, aprobado, moduleId, user, profile, onExit) {
  const gameView = document.getElementById('game-view');
  const mainView = document.getElementById('main-view');
  const mod = MODULE_CONFIG[moduleId];

  gameView.classList.remove('active');
  gameView.innerHTML = '';
  mainView.classList.add('active');
  window.activePhaserGame = null;

  // Inyectar vista de resultados en el contenido
  const contentArea = document.getElementById('content-area');
  const existingViews = contentArea.querySelectorAll('.view');
  existingViews.forEach(v => v.classList.remove('active'));

  const resultsView = document.createElement('div');
  resultsView.className = 'view active';
  resultsView.id = 'view-results';
  resultsView.innerHTML = `
    <div id="results-view">
      <div class="results-card">
        <span class="results-icon">${aprobado ? '🏆' : '⭐'}</span>
        <h1 class="results-title">${aprobado ? '¡APROBADO!' : 'COMPLETADO'}</h1>
        <p class="results-subtitle">${mod.name} · ${mod.theme}</p>

        <div class="results-stats">
          <div class="result-stat">
            <div class="result-stat-value">${hits}</div>
            <div class="result-stat-label">Aciertos</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value">${10 - hits}</div>
            <div class="result-stat-label">Errores</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value">${score}</div>
            <div class="result-stat-label">Puntos</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value">${formatTime(elapsed)}</div>
            <div class="result-stat-label">Tiempo</div>
          </div>
        </div>

        ${!aprobado ? `
          <div class="alert alert-info visible" style="margin-bottom:16px;">
            💡 Necesitas al menos 7/10 aciertos para aprobar. ¡Inténtalo de nuevo!
          </div>
        ` : `
          <div class="alert alert-success visible" style="margin-bottom:16px;">
            🎉 ¡Excelente! Has aprobado el módulo. Se ha desbloqueado el siguiente módulo.
          </div>
        `}

        <div class="results-actions">
          ${aprobado ? `
          <button class="btn btn-pdf" onclick="window.downloadDiploma()">
            📄 Descargar Diploma
          </button>
          ` : ''}
          <button class="btn btn-primary" onclick="window.goToModules()">
            📚 Ver Módulos
          </button>
          <button class="btn btn-ghost" onclick="window.goToRanking()">
            🏆 Ver Ranking
          </button>
        </div>
      </div>
    </div>
  `;
  contentArea.appendChild(resultsView);

  window.downloadDiploma = async () => {
    const btn = resultsView.querySelector('.btn-pdf');
    btn.innerHTML = '<span class="spinner"></span> Generando...';
    btn.disabled = true;
    try {
      await generateDiplomaPDF(user, profile, moduleId, score, hits);
    } catch (err) {
      console.error('Error generating diploma:', err);
      alert('Hubo un error al generar el diploma: ' + (err.message || err) + '\n\nPor favor, intenta de nuevo.');
    } finally {
      btn.innerHTML = '📄 Descargar Diploma';
      btn.disabled = false;
    }
  };

  window.goToModules = () => {
    resultsView.remove();
    onExit();
  };

  window.goToRanking = () => {
    resultsView.remove();
    onExit('ranking');
  };
}

async function getGameScene(moduleId) {
  switch (moduleId) {
    case 1: return import('../games/m1/index.js');
    case 2: return import('../games/m2/index.js');
    case 3: return import('../games/m3/index.js');
    case 4: return import('../games/m4/index.js');
    case 5: return import('../games/m5/index.js');
    case 6: return import('../games/m6/index.js');
    case 7: return import('../games/m7/index.js');
    case 8: return import('../games/m8/index.js');
    case 9: return import('../games/m9/index.js');
    case 10: return import('../games/m10/index.js');
    default: return import('../games/m1/index.js');
  }
}


function cleanup(gameState) {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  if (gameState.phaserGame) {
    if (gameState.phaserGame._eduplayResizeHandler) {
      window.removeEventListener('resize', gameState.phaserGame._eduplayResizeHandler);
    }
    
    // Cerrar cualquier AudioContext activo en las escenas para evitar que el sonido se quede pegado
    if (gameState.phaserGame.scene && gameState.phaserGame.scene.scenes) {
      gameState.phaserGame.scene.scenes.forEach(scene => {
        if (scene.audioCtx && scene.audioCtx.state !== 'closed') {
          try {
            scene.audioCtx.close();
          } catch (e) {
            console.error('Error closing audioCtx:', e);
          }
        }
      });
    }

    gameState.phaserGame.destroy(true);
    gameState.phaserGame = null;
  }
  const modal = document.getElementById('trivia-modal');
  if (modal) { modal.classList.remove('active'); modal.innerHTML = ''; }
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
