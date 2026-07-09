// =============================================
// EduPlay UBE — Leaderboard / Ranking
// =============================================

import { supabase } from '../supabaseClient.js';

const MODULE_NAMES = {
  1: 'Pixel Run: Pronouns',
  2: 'Maze Muncher: TO BE',
  3: 'Block Stack: Family',
  4: 'Penalty Master: Opposites',
  5: 'Roblox Obby',
  6: 'Duck Hunt',
  7: 'Home Run',
  9: 'Basketball: Present Tense',
  10: 'Ruleta: Ordenar Oraciones',
};

export async function renderLeaderboard(container, userId) {
  container.innerHTML = `
    <h1 class="view-title">🏆 RANKING</h1>
    <p class="view-subtitle">Los mejores jugadores de Manu Play - UBE</p>

    <div class="leaderboard-tabs" style="display:flex; flex-wrap:nowrap; gap:8px; margin-bottom:20px; overflow-x:auto; padding: 4px 4px 12px 4px; max-width:100%;">
      <button class="lb-tab active" onclick="switchLbTab('global', this)" style="flex: 0 0 auto; white-space: nowrap;">🌐 Global</button>
      ${Object.keys(MODULE_NAMES).map(id => `
        <button class="lb-tab" onclick="switchLbTab(${id}, this)" style="flex: 0 0 auto; white-space: nowrap;">Módulo ${id}</button>
      `).join('')}
    </div>

    <div id="lb-content">
      <div style="text-align:center;padding:40px;color:var(--text-muted);">
        <span class="spinner" style="width:30px;height:30px;border-width:3px;"></span>
        <p style="margin-top:12px;">Cargando ranking...</p>
      </div>
    </div>
  `;

  window.switchLbTab = (tab, btn) => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loadTab(tab);
  };

  await loadTab('global');

  async function loadTab(tab) {
    const content = document.getElementById('lb-content');
    content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">
      <span class="spinner" style="width:30px;height:30px;border-width:3px;display:inline-block;"></span>
    </div>`;

    try {
      let data, error;

      if (tab === 'global') {
        ({ data, error } = await supabase.rpc('get_leaderboard_global'));
        if (error) throw error;
        content.innerHTML = renderGlobalTable(data || [], userId);
      } else {
        ({ data, error } = await supabase.rpc('get_leaderboard', { p_modulo_id: tab }));
        if (error) throw error;
        content.innerHTML = renderModuleTable(data || [], tab, userId);
      }
    } catch (err) {
      content.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-muted);">
          <p>😔 No hay datos disponibles aún.</p>
          <p style="font-size:0.8rem;margin-top:8px;">¡Sé el primero en completar un módulo!</p>
        </div>`;
    }
  }

  function renderGlobalTable(rows, myId) {
    if (!rows.length) return emptyState();
    return `
      <div class="leaderboard-table-wrap">
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Estudiante</th>
              <th>Puntaje Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr class="${r.es_yo ? 'my-row' : ''}">
                <td>${rankBadge(r.posicion)}</td>
                <td>
                  <div style="display:flex; align-items:center; gap:10px;">
                    ${r.avatar_url ? `<img src="${r.avatar_url}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : `<div style="width:32px; height:32px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${r.estudiante.charAt(0)}</div>`}
                    <div style="text-align: left;">
                      <strong>${r.estudiante}</strong> ${r.es_yo ? '<span style="color:var(--primary); font-size:0.8rem;">← Tú</span>' : ''}<br>
                      <span style="font-size:0.75rem; color:var(--text-muted);">${r.curso || ''} ${r.paralelo ? '- ' + r.paralelo : ''} | ${r.institucion || ''}</span>
                    </div>
                  </div>
                </td>
                <td><span class="score-value">${r.puntaje_total}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderModuleTable(rows, modId, myId) {
    if (!rows.length) return emptyState();
    const modName = MODULE_NAMES[modId] || `Módulo ${modId}`;
    return `
      <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px;">📌 ${modName}</p>
      <div class="leaderboard-table-wrap">
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Estudiante</th>
              <th>Puntaje</th>
              <th>Tiempo</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${rankBadge(r.posicion)}</td>
                <td>
                  <div style="display:flex; align-items:center; gap:10px;">
                    ${r.avatar_url ? `<img src="${r.avatar_url}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : `<div style="width:32px; height:32px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${r.estudiante.charAt(0)}</div>`}
                    <div style="text-align: left;">
                      <strong>${r.estudiante}</strong><br>
                      <span style="font-size:0.75rem; color:var(--text-muted);">${r.curso || ''} ${r.paralelo ? '- ' + r.paralelo : ''} | ${r.institucion || ''}</span>
                    </div>
                  </div>
                </td>
                <td><span class="score-value">${r.puntaje}</span></td>
                <td style="font-family:'Orbitron',sans-serif;font-size:0.8rem;">${formatTime(r.tiempo_segundos)}</td>
                <td style="font-size:0.8rem;color:var(--text-muted);">${formatDate(r.fecha)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function rankBadge(pos) {
    if (pos <= 3) {
      return `<span class="rank-badge rank-${pos}">${['🥇','🥈','🥉'][pos-1]}</span>`;
    }
    return `<span class="rank-badge rank-other">${pos}</span>`;
  }

  function emptyState() {
    return `<div style="text-align:center;padding:48px;color:var(--text-muted);">
      <div style="font-size:3rem;margin-bottom:12px;">🏆</div>
      <p>Aún no hay puntajes registrados.</p>
      <p style="font-size:0.8rem;margin-top:8px;">¡Completa un módulo para aparecer aquí!</p>
    </div>`;
  }
}

function formatTime(s) {
  if (!s) return '--:--';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}
