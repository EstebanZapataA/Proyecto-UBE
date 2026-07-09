// =============================================
// EduPlay UBE — Vista de módulos de Inglés
// =============================================

import { supabase } from '../supabaseClient.js';

const MODULE_CONFIG = [
  {
    id: 1,
    nombre: 'Super Mario',
    tema: 'Personal Pronouns',
    tipo: 'plataformas',
    icon: 'mario.jpg',
    color: 'var(--red-ube)',
    desc: 'Corre, salta y recoge monedas respondiendo preguntas sobre pronombres personales en inglés.'
  },
  {
    id: 2,
    nombre: 'Pac-Man',
    tema: 'Verb TO BE',
    tipo: 'laberinto',
    icon: 'pacman.jpg',
    color: '#7c3aed',
    desc: 'Navega el laberinto, recoge frutas y responde sobre el verbo TO BE. ¡Cuidado con los enemigos!'
  },
  {
    id: 3,
    nombre: 'TeTris',
    tema: 'Family Vocabulary',
    tipo: 'bloques',
    icon: 'tetris.jpg',
    color: '#0ea5e9',
    desc: 'Completa líneas de bloques y demuestra tu conocimiento del vocabulario familiar en inglés.'
  },
  {
    id: 4,
    nombre: 'Penales',
    tema: 'Adjectives & Opposites',
    tipo: 'penales',
    icon: 'penales.png',
    color: '#10b981',
    desc: 'Lanza 10 penales respondiendo sobre adjetivos y sus opuestos. ¡Anota el gol!'
  },
  {
    id: 5,
    nombre: 'Roblox Obby',
    tema: 'Future Tenses',
    tipo: 'plataformas',
    icon: 'roblox.png',
    color: '#f59e0b',
    desc: 'Supera el circuito de obstáculos con Pelotocino usando will, going to y Present Continuous.'
  },
  {
    id: 6,
    nombre: 'Duck Hunt',
    tema: 'Modals & Conditionals',
    tipo: 'penales',
    icon: 'penales.png',
    color: '#8b5cf6',
    desc: 'Apunta y dispara a los patos mientras aprendes sobre verbos modales y el primer condicional.'
  },
  {
    id: 7,
    nombre: 'Home Run',
    tema: 'Past Tense',
    tipo: 'beisbol',
    icon: 'baseball.png',
    color: '#ef4444',
    desc: '¡Batea un Home Run respondiendo correctamente preguntas sobre el pasado simple!'
  },
  {
    id: 8,
    nombre: 'Guayaquil Bike',
    tema: 'Vocabulary',
    tipo: 'bicicleta',
    icon: 'bg-guayaquil.png',
    color: '#14b8a6',
    desc: 'Pedalea y salta obstáculos en Guayaquil respondiendo vocabulario básico en inglés.'
  },
  {
    id: 9,
    nombre: 'Basketball',
    tema: 'Present Tense',
    tipo: 'baloncesto',
    icon: 'basketball.png',
    color: '#f97316',
    desc: 'Anota canastas respondiendo correctamente preguntas sobre el tiempo presente en inglés.'
  },
  {
    id: 10,
    nombre: 'Ruleta',
    tema: 'Ordenar Oraciones',
    tipo: 'ruleta',
    icon: 'roblox.png', // Reusing an icon for now, since we don't have a specific one
    color: '#ec4899',
    desc: 'Gira la ruleta y construye oraciones arrastrando y soltando las palabras en el orden correcto.'
  }
];

export async function renderModulesView(container, user, profile, progress, onGameStart, onNavigate) {
  // Determinar estado de cada módulo
  const getModuleState = (modId) => {
    if (modId === 1) {
      const p = progress[1];
      if (p?.aprobado) return 'approved';
      if (p?.completado) return 'completed';
      return 'available';
    }
    const prevApproved = progress[modId - 1]?.aprobado;
    if (!prevApproved) return 'locked';
    const p = progress[modId];
    if (p?.aprobado) return 'approved';
    if (p?.completado) return 'completed';
    return 'available';
  };

  const stateLabel = { locked: '🔒 Bloqueado', available: '🔓 Disponible', completed: '⭐ Completado', approved: '✅ Aprobado' };
  const stateCss = { locked: 'status-locked', available: 'status-available', completed: 'status-completed', approved: 'status-approved' };
  const cardCss = { locked: 'locked', available: 'available', completed: 'available', approved: 'approved' };

  container.innerHTML = `
    <h1 class="view-title">🇬🇧 INGLÉS</h1>
    <p class="view-subtitle">5 módulos secuenciales · Primero de Bachillerato · Nivel A1–A2</p>

    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;max-width:500px;margin-bottom:24px;">
      <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">📋 INSTRUCCIONES Y REGLAS</p>
      <ul style="font-size:0.82rem;color:var(--text-secondary);list-style:none;display:flex;flex-direction:column;gap:4px;">
        <li>✅ Cada módulo tiene 10 preguntas de opción múltiple</li>
        <li>🎯 Necesitas ≥7/10 aciertos para aprobar (+100 pts cada acierto)</li>
        <li>⏱️ Bonus por tiempo: termina más rápido para sumar puntos extra</li>
        <li>🏆 Tu mejor puntaje queda registrado en el ranking</li>
      </ul>
    </div>

    <div class="modules-grid">
      ${MODULE_CONFIG.map(mod => {
        const state = getModuleState(mod.id);
        const p = progress[mod.id];
        return `
          <div class="module-card ${cardCss[state]}" id="module-card-${mod.id}">
            <div class="module-card-header">
              <span class="module-number">MÓDULO ${mod.id}</span>
              <span class="module-status-badge ${stateCss[state]}">${stateLabel[state]}</span>
            </div>
            <div class="module-icon"><img src="/${mod.icon}" style="width:48px;height:48px;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.1));"></div>
            <h3 class="module-name">${mod.nombre}</h3>
            <p class="module-theme">${mod.tema}</p>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;line-height:1.5;">${mod.desc}</p>

            ${p ? `
            <div class="module-stats">
              <div class="module-stat">
                <span class="module-stat-value" style="color:${mod.color}">${p.aciertos}/10</span>
                <span class="module-stat-label">Aciertos</span>
              </div>
              <div class="module-stat">
                <span class="module-stat-value" style="color:${mod.color}">${p.puntaje}</span>
                <span class="module-stat-label">Puntos</span>
              </div>
              <div class="module-stat">
                <span class="module-stat-value" style="color:${mod.color}">${formatTime(p.tiempo_segundos)}</span>
                <span class="module-stat-label">Tiempo</span>
              </div>
            </div>
            ` : `<div style="height:16px;"></div>`}

            <button
              class="module-play-btn"
              ${state === 'locked' ? 'disabled' : ''}
              onclick="${state !== 'locked' ? `window.startModule(${mod.id})` : ''}"
              style="${state !== 'locked' ? `background: linear-gradient(135deg, ${mod.color}, color-mix(in srgb, ${mod.color} 70%, black));` : ''}"
            >
              ${state === 'locked' ? '🔒 Completa el módulo anterior' :
                state === 'approved' ? '🔄 Reintentar' : '▶ JUGAR'}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  window.startModule = (moduleId) => {
    onGameStart(moduleId, profile);
  };
}

function formatTime(seconds) {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}
