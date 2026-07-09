// =============================================
// EduPlay UBE — Sidebar de asignaturas
// =============================================

import { supabase } from '../supabaseClient.js';

window.handleLogout = () => {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999; opacity: 0; transition: opacity 0.2s ease;
  `;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: var(--bg-glass); padding: 30px; border-radius: 16px;
    width: 90%; max-width: 360px; text-align: center;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid var(--border);
    transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    backdrop-filter: blur(20px);
  `;
  
  modal.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 15px;">👋</div>
    <h3 style="color: var(--text-primary); margin-bottom: 10px; font-size: 1.5rem;">¿Cerrar sesión?</h3>
    <p style="color: var(--text-muted); margin-bottom: 25px;">Asegúrate de haber terminado tus actividades.</p>
    <div style="display: flex; gap: 15px; justify-content: center;">
      <button id="btn-cancel-logout" class="btn btn-ghost" style="flex: 1;">Cancelar</button>
      <button id="btn-confirm-logout" class="btn btn-primary" style="flex: 1; background: var(--red-ube); border: none;">Salir</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Animate in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  });
  
  const closeModal = () => {
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    setTimeout(() => overlay.remove(), 200);
  };

  document.getElementById('btn-cancel-logout').onclick = closeModal;
  
  document.getElementById('btn-confirm-logout').onclick = async () => {
    const btn = document.getElementById('btn-confirm-logout');
    btn.innerHTML = '<span class="spinner" style="border-color: #fff transparent #fff transparent; width: 16px; height: 16px;"></span>';
    btn.disabled = true;
    await supabase.auth.signOut();
    window.location.reload();
  };
};

const SUBJECTS = [
  { key: 'matematicas', label: 'Matemáticas', icon: '➗', active: false },
  { key: 'historia',    label: 'Historia',    icon: '📜', active: false },
  { key: 'geografia',   label: 'Geografía',   icon: '🌍', active: false },
  { key: 'lenguaje',    label: 'Lenguaje',    icon: '📖', active: false },
  { key: 'ingles',      label: 'Inglés',      icon: '🇬🇧', active: true  },
  { key: 'ciencias',    label: 'Ciencias Naturales', icon: '🔬', active: false },
];

export function renderSidebar(user, profile, progress, onNavigate) {
  const sidebar = document.getElementById('sidebar');
  const completedModules = Object.values(progress).filter(p => p.aprobado).length;
  const totalModules = 10;

  const initials = profile
    ? `${profile.nombres?.[0] || ''}${profile.apellidos?.[0] || ''}`
    : user.email?.[0]?.toUpperCase() || '?';

  const displayName = profile
    ? `${profile.nombres} ${profile.apellidos}`
    : user.email?.split('@')[0] || 'Estudiante';

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <span class="sidebar-logo-icon">🎮</span>
      <span class="sidebar-logo-text">Manu Play <span>UBE</span></span>
    </div>

    <p class="sidebar-section-label">Asignaturas</p>

    <nav class="sidebar-nav">
      ${SUBJECTS.map(s => `
        <button
          class="sidebar-item ${s.active ? '' : 'disabled'}"
          data-section="${s.active ? s.key : 'construccion'}"
          onclick="${s.active ? `window.sidebarNavigate('${s.key}')` : `window.sidebarNavigate('construccion')`}"
        >
          <span class="sidebar-item-icon">${s.icon}</span>
          <span class="sidebar-item-label">${s.label}</span>
          ${!s.active ? '<span class="sidebar-badge">🚧 Pronto</span>' : ''}
        </button>
      `).join('')}

      <div class="sidebar-section">
        <button
          class="sidebar-item"
          data-section="diplomas"
          onclick="window.sidebarNavigate('diplomas')"
          style="margin-bottom: 5px;"
        >
          <span class="sidebar-item-icon">🎓</span>
          <span class="sidebar-item-label">Mis Diplomas</span>
        </button>

        <button
          class="sidebar-item"
          data-section="ranking"
          onclick="window.sidebarNavigate('ranking')"
        >
          <span class="sidebar-item-icon">🏆</span>
          <span class="sidebar-item-label">Ranking</span>
        </button>

        <button
          class="sidebar-item"
          data-section="creditos"
          onclick="window.sidebarNavigate('creditos')"
          style="margin-top: 5px;"
        >
          <span class="sidebar-item-icon">🌟</span>
          <span class="sidebar-item-label">Créditos</span>
        </button>
      </div>
    </nav>

    ${completedModules > 0 ? `
    <div style="padding: 0 12px; margin-bottom:8px;">
      <div class="sidebar-progress">
        <div class="sidebar-progress-label">
          <span>🇬🇧 Progreso Inglés</span>
          <span style="color:var(--red-ube);font-weight:700;">${completedModules}/${totalModules}</span>
        </div>
        <div class="sidebar-progress-bar">
          <div class="sidebar-progress-fill" style="width:${(completedModules/totalModules)*100}%"></div>
        </div>
      </div>
    </div>
    ` : ''}
  `;

  window.sidebarNavigate = (section) => {
    onNavigate(section);
  };
}
