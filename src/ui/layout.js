// =============================================
// EduPlay UBE — Layout principal (sidebar + contenido)
// =============================================

import { supabase } from '../supabaseClient.js';
import { renderSidebar } from './sidebar.js';
import { renderModulesView } from './modules.js';
import { renderLeaderboard } from './leaderboard.js';
import { renderCredits } from './credits.js';
import { renderDiplomasView } from './diplomas.js';
import { renderProfileModal } from './profile.js';

export async function renderMainLayout(user, profile, onGameStart) {
  const app = document.getElementById('app');

  const initials = profile
    ? `${profile.nombres?.[0] || ''}${profile.apellidos?.[0] || ''}`
    : user.email?.[0]?.toUpperCase() || '?';

  const displayName = profile
    ? `${profile.nombres} ${profile.apellidos}`
    : user.email?.split('@')[0] || 'Estudiante';

  app.innerHTML = `
    <div id="main-view" class="active">
      <!-- SIDEBAR -->
      <aside id="sidebar"></aside>
      <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>

      <!-- CONTENIDO -->
      <div id="content-area">
        <!-- HEADER -->
        <header id="header">
          <button class="header-hamburger" id="hamburger-btn" onclick="toggleSidebar()" style="
            display:none; background:transparent; border:1px solid var(--border);
            border-radius:6px; padding:6px 10px; color:var(--text-primary);
            cursor:pointer; font-size:1.1rem; margin-right:8px;
          ">☰</button>
          <h2 class="header-title">Manu Play <span>UBE</span></h2>
          <span style="flex:1"></span>

          <button class="header-mute-btn" id="theme-btn" title="Cambiar Tema" style="margin-right: 10px;">☀️</button>
          <button class="header-mute-btn" id="mute-btn" title="Silenciar/Activar audio" style="margin-right: 15px;">🔊</button>

          <div style="position: relative;" id="profile-menu-container">
            <div id="profile-btn" style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:4px 8px; border-radius:8px; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
              <div class="sidebar-avatar" style="width:32px; height:32px; font-size:0.8rem; margin:0;">
                ${user.user_metadata?.avatar_url
                  ? `<img src="${user.user_metadata.avatar_url}" alt="avatar" />`
                  : initials
                }
              </div>
              <div class="header-user-name" style="font-size:0.85rem; font-weight:600; color:var(--text-primary); display:none;">
                ${displayName}
              </div>
            </div>
            
            <div id="profile-dropdown" style="display: none; position: absolute; top: calc(100% + 5px); right: 0; background: var(--bg-glass); border: 1px solid var(--border); border-radius: 8px; width: 180px; padding: 8px 0; box-shadow: var(--shadow-card); z-index: 1000; flex-direction: column; backdrop-filter: blur(10px);">
              <button id="btn-menu-perfil" style="background:transparent; border:none; color:var(--text-primary); padding:10px 16px; text-align:left; cursor:pointer; width:100%; font-size:0.9rem; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">👤 Actualizar Perfil</button>
              <div style="height: 1px; background: var(--border); margin: 4px 0;"></div>
              <button id="btn-menu-logout" style="background:transparent; border:none; color:var(--red-ube); padding:10px 16px; text-align:left; cursor:pointer; width:100%; font-size:0.9rem; transition: background 0.2s;" onmouseover="this.style.background='rgba(230,57,70,0.1)'" onmouseout="this.style.background='transparent'">⏻ Cerrar Sesión</button>
            </div>
          </div>
        </header>

        <!-- VISTAS -->
        <div class="view active" id="view-ingles"></div>
        <div class="view" id="view-ranking"></div>
        <div class="view" id="view-creditos"></div>
        <div class="view" id="view-diplomas"></div>
        <div class="view" id="view-construccion">
          <div class="construction-view">
            <div class="construction-icon">🚧</div>
            <h2 class="construction-title">EN CONSTRUCCIÓN</h2>
            <p class="text-muted">Esta asignatura estará disponible próximamente.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- VISTA DE JUEGO (fuera del layout) -->
    <div id="game-view"></div>

    <!-- MODAL TRIVIA -->
    <div id="trivia-modal"></div>

    <!-- Template diploma (oculto) -->
    <div id="diploma-template"></div>
  `;

  // Responsive hamburguesa y nombre de usuario
  if (window.innerWidth <= 768) {
    document.getElementById('hamburger-btn').style.display = 'flex';
  } else {
    const nameEl = document.querySelector('.header-user-name');
    if (nameEl) nameEl.style.display = 'block';
  }
  window.addEventListener('resize', () => {
    const hbtn = document.getElementById('hamburger-btn');
    if (hbtn) hbtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    
    const nameEl = document.querySelector('.header-user-name');
    if (nameEl) nameEl.style.display = window.innerWidth <= 768 ? 'none' : 'block';
  });

  window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('visible');
  };
  window.closeSidebar = () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  };

  // Mute global
  let muted = false;
  window.appMuted = false;
  document.getElementById('mute-btn').addEventListener('click', () => {
    muted = !muted;
    window.appMuted = muted;
    document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
    // Notificar al juego activo
    if (window.activePhaserGame) {
      window.activePhaserGame.sound.setMute(muted);
    }
  });

  // Setup tema
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    const savedTheme = localStorage.getItem('eduplay_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeBtn.textContent = savedTheme === 'light' ? '🌙' : '☀️';

    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('eduplay_theme', next);
      themeBtn.textContent = next === 'light' ? '🌙' : '☀️';
    });
  }

  // Menú de Perfil
  const profileBtn = document.getElementById('profile-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = profileDropdown.style.display === 'flex';
      profileDropdown.style.display = isVisible ? 'none' : 'flex';
    });

    document.addEventListener('click', () => {
      profileDropdown.style.display = 'none';
    });

    document.getElementById('btn-menu-perfil').addEventListener('click', () => {
      renderProfileModal(user, profile);
      profileDropdown.style.display = 'none';
    });

    document.getElementById('btn-menu-logout').addEventListener('click', () => {
      if (typeof window.handleLogout === 'function') {
        window.handleLogout();
      }
      profileDropdown.style.display = 'none';
    });
  }

  // Cargar progreso de módulos
  const progress = await loadProgress(user.id);

  // Renderizar sidebar
  renderSidebar(user, profile, progress, onNavigate);

  // Vista inicial: Inglés
  onNavigate('ingles');

  async function onNavigate(section) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    const sidebarItem = document.querySelector(`.sidebar-item[data-section="${section}"]`);
    if (sidebarItem) sidebarItem.classList.add('active');

    if (section === 'ingles') {
      const view = document.getElementById('view-ingles');
      view.classList.add('active');
      const freshProgress = await loadProgress(user.id);
      await renderModulesView(view, user, profile, freshProgress, onGameStart, onNavigate);
    } else if (section === 'diplomas') {
      const view = document.getElementById('view-diplomas');
      view.classList.add('active');
      await renderDiplomasView(view, user, profile);
    } else if (section === 'ranking') {
      const view = document.getElementById('view-ranking');
      view.classList.add('active');
      await renderLeaderboard(view, user.id);
    } else if (section === 'creditos') {
      const view = document.getElementById('view-creditos');
      view.classList.add('active');
      renderCredits(view);
    } else {
      document.getElementById('view-construccion').classList.add('active');
    }
    if (window.innerWidth <= 768) window.closeSidebar();
  }

  async function loadProgress(userId) {
    const { data } = await supabase
      .from('intentos')
      .select('modulo_id, aprobado, puntaje, aciertos, tiempo_segundos')
      .eq('user_id', userId)
      .eq('completado', true)
      .order('puntaje', { ascending: false });

    const progress = {};
    if (data) {
      data.forEach(i => {
        if (!progress[i.modulo_id] || i.puntaje > progress[i.modulo_id].puntaje) {
          progress[i.modulo_id] = i;
        }
      });
    }
    return progress;
  }
}
