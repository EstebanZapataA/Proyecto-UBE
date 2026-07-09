// =============================================
// EduPlay UBE — Vista de Mis Diplomas
// =============================================

import { supabase } from '../supabaseClient.js';
import { generateDiplomaPDF } from '../utils/diploma.js';

const MODULE_NAMES = {
  1: 'Super Mario',
  2: 'Pac-Man',
  3: 'TeTris',
  4: 'Penales',
  5: 'Roblox Obby',
  6: 'Duck Hunt',
  7: 'Home Run',
  8: 'Guayaquil Bike',
  9: 'Basketball',
  10: 'Ruleta: Ordenar Oraciones',
};

const MODULE_TOPICS = {
  1: 'Personal Pronouns',
  2: 'Verb TO BE',
  3: 'Family Vocabulary',
  4: 'Adjectives and Opposites',
  5: 'Future Tenses (Will, Going To)',
  6: 'Modals & Conditionals',
  7: 'Past Tense',
  8: 'Vocabulary',
  9: 'Present Tense',
  10: 'Repaso General',
};

export async function renderDiplomasView(container, user, profile) {
  container.innerHTML = `
    <div class="view-header">
      <h2 class="view-title">🎓 Mis Diplomas</h2>
      <p class="text-muted">Aquí encontrarás todos los diplomas de los módulos que has aprobado.</p>
    </div>
    <div id="diplomas-loading" style="text-align: center; padding: 40px;">
      <span class="spinner" style="border-color: var(--primary) transparent var(--primary) transparent; width: 40px; height: 40px;"></span>
      <p style="margin-top: 15px; color: var(--text-muted);">Buscando tus diplomas...</p>
    </div>
    <div id="diplomas-grid" class="modules-grid" style="display: none; margin-top: 20px;"></div>
    <div id="diplomas-empty" style="display: none; text-align: center; padding: 50px 20px; background: var(--bg-card); border-radius: 12px; margin-top: 20px;">
      <div style="font-size: 48px; margin-bottom: 15px;">😢</div>
      <h3 style="color: var(--text-primary); margin-bottom: 10px;">Aún no tienes diplomas</h3>
      <p style="color: var(--text-muted);">Juega los módulos y obtén al menos 7 aciertos para ganar tu primer diploma.</p>
    </div>
  `;

  // Fetch approved attempts
  const { data, error } = await supabase
    .from('intentos')
    .select('modulo_id, puntaje, aciertos')
    .eq('user_id', user.id)
    .eq('aprobado', true)
    .order('puntaje', { ascending: false });

  document.getElementById('diplomas-loading').style.display = 'none';

  if (error || !data || data.length === 0) {
    document.getElementById('diplomas-empty').style.display = 'block';
    return;
  }

  // Get highest score per module
  const bestAttempts = {};
  data.forEach(attempt => {
    if (!bestAttempts[attempt.modulo_id] || attempt.puntaje > bestAttempts[attempt.modulo_id].puntaje) {
      bestAttempts[attempt.modulo_id] = attempt;
    }
  });

  const diplomas = Object.values(bestAttempts).sort((a, b) => a.modulo_id - b.modulo_id);
  const grid = document.getElementById('diplomas-grid');
  grid.style.display = 'grid'; // Uses the same grid layout as modules-grid

  grid.innerHTML = diplomas.map(d => `
    <div class="module-card">
      <div class="module-icon" style="background: linear-gradient(135deg, #7c3aed, #e63946);">🎓</div>
      <div class="module-info">
        <h3 class="module-title">${MODULE_NAMES[d.modulo_id] || `Módulo ${d.modulo_id}`}</h3>
        <p class="module-desc">${MODULE_TOPICS[d.modulo_id] || 'Inglés'}</p>
        <div class="module-meta">
          <span>🎯 ${d.aciertos}/10 Aciertos</span>
          <span>🏆 ${d.puntaje} pts</span>
        </div>
        <button class="btn btn-primary" id="btn-diploma-${d.modulo_id}" onclick="window.downloadHistoricalDiploma(${d.modulo_id}, ${d.puntaje}, ${d.aciertos})" style="margin-top: 15px; width: 100%;">
          📄 Descargar PDF
        </button>
      </div>
    </div>
  `).join('');

  // Global function to trigger download
  window.downloadHistoricalDiploma = async (moduleId, score, aciertos) => {
    const btn = document.getElementById(`btn-diploma-${moduleId}`);
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Generando...';
    btn.disabled = true;

    try {
      await generateDiplomaPDF(user, profile, moduleId, score, aciertos);
    } catch (err) {
      console.error('Error generating diploma:', err);
      alert('Hubo un error al generar el diploma: ' + (err.message || err) + '\\n\\nPor favor, intenta de nuevo.');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  };
}
