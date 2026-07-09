// =============================================
// EduPlay UBE — main.js
// Entry point: gestión de estado y autenticación
// =============================================

import './style.css';
import { supabase } from './supabaseClient.js';
import { renderAuthView } from './auth/index.js';
import { renderMainLayout } from './ui/layout.js';
import { launchGame } from './games/GameManager.js';

async function init() {
  // Simular carga con la pantalla de loading
  await sleep(1200);

  // Escuchar cambios de autenticación
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (session?.user) {
        await loadApp(session.user);
      } else {
        showAuth();
      }
    } else if (event === 'SIGNED_OUT') {
      currentUserId = null;
      showAuth();
    }
  });

  // Verificar sesión inicial
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await loadApp(session.user);
  } else {
    showAuth();
  }
}

function showAuth() {
  renderAuthView(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await loadApp(session.user);
  });
}

let currentUserId = null;

async function loadApp(user) {
  if (currentUserId === user.id) return; // Evitar recargar la UI si ya está cargada para este usuario
  currentUserId = user.id;
  // Obtener o crear perfil
  let profile = await getOrCreateProfile(user);

  // Si el perfil está incompleto (solo login Google), pedir datos
  if (!profile?.nombres || !profile?.apellidos) {
    profile = await requestProfileCompletion(user, profile);
  }

  const onGameStart = (moduleId, prof) => {
    launchGame(moduleId, user, prof || profile, (section) => {
      // Recargar el layout después del juego
      loadApp(user);
      if (section === 'ranking') {
        setTimeout(() => window.sidebarNavigate?.('ranking'), 300);
      }
    });
  };

  renderMainLayout(user, profile, onGameStart);
}

async function getOrCreateProfile(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (data) return data;

  // Para usuarios de Google, intentar extraer nombre del metadata
  const meta = user.user_metadata || {};
  const nombres = meta.full_name?.split(' ').slice(0, -1).join(' ') || meta.name || '';
  const apellidos = meta.full_name?.split(' ').slice(-1).join('') || '';

  if (nombres && apellidos) {
    const { data: created } = await supabase.from('profiles').upsert({
      id: user.id,
      nombres,
      apellidos,
      email: user.email || '',
      institucion: 'Universidad Bolivariana del Ecuador (UBE)',
      curso: 'Primero de Bachillerato',
      paralelo: 'A',
      avatar_url: meta.avatar_url || null,
    }).select().single();
    return created;
  }

  return null;
}

async function requestProfileCompletion(user, existingProfile) {
  return new Promise((resolve) => {
    const app = document.getElementById('app');
    const meta = user.user_metadata || {};

    app.innerHTML = `
      <div id="auth-view">
        <div class="auth-container">
          <div class="auth-logo">
            <span class="auth-logo-icon">👤</span>
            <h1 class="auth-logo-title">Completa tu <span>Perfil</span></h1>
            <span class="auth-logo-sub">Necesitamos algunos datos para tu diploma</span>
          </div>
          <div class="auth-card">
            <div id="profile-alert" class="alert"></div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nombres</label>
                <input type="text" id="p-nombres" class="form-input" value="${existingProfile?.nombres || ''}" placeholder="Juan Carlos" />
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos</label>
                <input type="text" id="p-apellidos" class="form-input" value="${existingProfile?.apellidos || ''}" placeholder="García López" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Institución</label>
              <input type="text" class="form-input" value="Universidad Bolivariana del Ecuador (UBE)" disabled />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Curso</label>
                <input type="text" class="form-input" value="Primero de Bachillerato" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">Paralelo</label>
                <input type="text" id="p-paralelo" class="form-input" value="${existingProfile?.paralelo || ''}" placeholder="A" maxlength="5" />
              </div>
            </div>
            <button class="btn btn-primary" id="btn-save-profile">Guardar y Continuar</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-save-profile').onclick = async () => {
      const nombres = document.getElementById('p-nombres').value.trim();
      const apellidos = document.getElementById('p-apellidos').value.trim();
      const paralelo = document.getElementById('p-paralelo').value.trim();
      const alertEl = document.getElementById('profile-alert');

      if (!nombres || !apellidos) {
        alertEl.className = 'alert alert-error visible';
        alertEl.textContent = 'Nombres y apellidos son obligatorios.';
        return;
      }

      const btn = document.getElementById('btn-save-profile');
      btn.innerHTML = '<span class="spinner"></span> Guardando...';
      btn.disabled = true;

      const { data, error } = await supabase.from('profiles').upsert({
        id: user.id,
        nombres,
        apellidos,
        email: user.email || '',
        paralelo: paralelo || 'A',
        institucion: 'Universidad Bolivariana del Ecuador (UBE)',
        curso: 'Primero de Bachillerato',
        avatar_url: meta.avatar_url || null,
      }).select().single();

      if (error) {
        alertEl.className = 'alert alert-error visible';
        alertEl.textContent = 'Error al guardar perfil. Intenta de nuevo.';
        btn.innerHTML = 'Guardar y Continuar';
        btn.disabled = false;
      } else {
        resolve(data);
      }
    };
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Iniciar aplicación
init().catch(console.error);
