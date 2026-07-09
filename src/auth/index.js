// =============================================
// EduPlay UBE — Página de Autenticación
// Login con Google + Email/Password
// =============================================

import { supabase } from '../supabaseClient.js';

export function renderAuthView(onSuccess) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div id="auth-view">
      <div class="auth-container">
        <div class="auth-logo">
          <span class="auth-logo-icon">🎮</span>
          <h1 class="auth-logo-title">Manu Play <span>UBE</span></h1>
          <span class="auth-logo-sub">Universidad Bolivariana del Ecuador</span>
        </div>

        <div class="auth-card">
          <div class="auth-tabs">
            <button class="auth-tab active" id="tab-login" onclick="switchTab('login')">Iniciar Sesión</button>
            <button class="auth-tab" id="tab-register" onclick="switchTab('register')">Registrarse</button>
          </div>

          <!-- PANEL LOGIN -->
          <div class="auth-panel active" id="panel-login">
            <button class="btn btn-google" id="btn-google" onclick="handleGoogleLogin()">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>

            <div class="divider">o con tu correo</div>

            <div id="alert-login" class="alert"></div>

            <div class="form-group">
              <label class="form-label">Correo Electrónico</label>
              <input type="email" id="login-email" class="form-input" placeholder="tu@correo.com" />
            </div>
            <div class="form-group">
              <label class="form-label">Contraseña</label>
              <input type="password" id="login-password" class="form-input" placeholder="••••••••" />
            </div>

            <button class="btn btn-primary" id="btn-login" onclick="handleEmailLogin()">
              Iniciar Sesión
            </button>

            <button class="btn btn-ghost mt-4" style="width:100%;font-size:0.8rem;" onclick="handleForgotPassword()">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <!-- PANEL REGISTRO -->
          <div class="auth-panel" id="panel-register">
            <button class="btn btn-google" id="btn-google-reg" onclick="handleGoogleLogin()">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Registrarse con Google
            </button>

            <div class="divider">o crea una cuenta</div>

            <div id="alert-register" class="alert"></div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nombres</label>
                <input type="text" id="reg-nombres" class="form-input" placeholder="Juan Carlos" />
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos</label>
                <input type="text" id="reg-apellidos" class="form-input" placeholder="García López" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Correo Electrónico (Gmail preferido)</label>
              <input type="email" id="reg-email" class="form-input" placeholder="tu@gmail.com" />
            </div>
            <div class="form-group">
              <label class="form-label">Contraseña (mínimo 8 caracteres)</label>
              <input type="password" id="reg-password" class="form-input" placeholder="••••••••" />
            </div>
            <div class="form-group">
              <label class="form-label">Institución</label>
              <input type="text" id="reg-institucion" class="form-input" value="Universidad Bolivariana del Ecuador (UBE)" disabled />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Curso</label>
                <input type="text" id="reg-curso" class="form-input" value="Primero de Bachillerato" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">Paralelo</label>
                <input type="text" id="reg-paralelo" class="form-input" placeholder="A" maxlength="5" />
              </div>
            </div>

            <button class="btn btn-primary" id="btn-register" onclick="handleEmailRegister()">
              Crear Cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Exponer funciones globales para los onclick del HTML
  window.switchTab = (tab) => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`panel-${tab}`).classList.add('active');
  };

  window.handleGoogleLogin = async () => {
    // Mostrar indicador de carga
    const btns = document.querySelectorAll('.btn-google');
    btns.forEach(b => { b.innerHTML = '<span class="spinner"></span> Conectando...'; b.disabled = true; });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });

    btns.forEach(b => {
      b.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg> Continuar con Google`;
      b.disabled = false;
    });

    if (error) {
      // Detectar si es el proveedor deshabilitado o un error de configuración
      const isProviderDisabled = error.message?.includes('provider') ||
                                  error.message?.includes('not enabled') ||
                                  error.status === 400;
      if (isProviderDisabled) {
        showGoogleSetupModal();
      } else {
        showAlert('login', 'error', `Error: ${error.message}`);
      }
    }
  };

  function showGoogleSetupModal() {
    // Crear modal de instrucciones
    const existing = document.getElementById('google-setup-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'google-setup-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;padding:20px;
      animation:fadeIn 0.2s ease;
    `;
    modal.innerHTML = `
      <div style="
        background:#130820;border:1px solid rgba(230,57,70,0.5);
        border-radius:16px;padding:32px;max-width:520px;width:100%;
        box-shadow:0 0 60px rgba(230,57,70,0.15);
      ">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:3rem;margin-bottom:8px;">⚙️</div>
          <h2 style="font-family:'Orbitron',sans-serif;color:#f0f0f8;font-size:1.2rem;letter-spacing:2px;margin-bottom:6px;">
            CONFIGURAR GOOGLE LOGIN
          </h2>
          <p style="color:#a8a8c0;font-size:0.85rem;">
            El proveedor de Google no está activado en Supabase. Sigue estos pasos:
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
          ${[
            ['1', 'Ve a <strong>supabase.com</strong> → Tu proyecto → <strong>Authentication</strong>'],
            ['2', 'Clic en <strong>Providers</strong> → busca <strong>Google</strong>'],
            ['3', 'Activa el toggle <strong>"Enable sign in with Google"</strong>'],
            ['4', 'Ingresa tu <strong>Client ID</strong> y <strong>Client Secret</strong> de Google Cloud Console'],
            ['5', 'En Google Cloud Console → OAuth 2.0 → agrega como URI de redirección:<br><code style="background:#1a0a2e;padding:3px 8px;border-radius:4px;font-size:0.8rem;color:#e63946;">${window.location.origin}</code>'],
          ].map(([n, text]) => `
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <span style="
                min-width:26px;height:26px;border-radius:50%;
                background:rgba(230,57,70,0.2);border:1px solid rgba(230,57,70,0.5);
                display:flex;align-items:center;justify-content:center;
                font-size:0.75rem;font-weight:700;color:#e63946;
              ">${n}</span>
              <p style="color:#a8a8c0;font-size:0.85rem;line-height:1.5;">${text}</p>
            </div>
          `).join('')}
        </div>

        <div style="background:rgba(250,204,21,0.08);border:1px solid rgba(250,204,21,0.2);border-radius:8px;padding:12px;margin-bottom:20px;">
          <p style="color:#fde68a;font-size:0.82rem;line-height:1.5;">
            💡 <strong>Mientras tanto</strong>, puedes registrarte y entrar con <strong>correo electrónico + contraseña</strong>. Todas las funciones del juego funcionan igual.
          </p>
        </div>

        <div style="display:flex;gap:10px;">
          <a href="https://supabase.com/dashboard/project/neerblnkgzkgvkaixbbm/auth/providers"
             target="_blank"
             style="flex:1;background:linear-gradient(135deg,#e63946,#b02030);color:white;border:none;
                    border-radius:8px;padding:11px;font-family:'Inter',sans-serif;font-size:0.88rem;
                    font-weight:600;cursor:pointer;text-decoration:none;display:flex;align-items:center;
                    justify-content:center;gap:6px;">
            🔗 Abrir Supabase Auth
          </a>
          <button onclick="document.getElementById('google-setup-modal').remove()"
                  style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                         color:#a8a8c0;border-radius:8px;padding:11px;font-family:'Inter',sans-serif;
                         font-size:0.88rem;font-weight:600;cursor:pointer;">
            Usar correo/contraseña
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  window.handleEmailLogin = async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    if (!email || !password) {
      return showAlert('login', 'error', 'Completa todos los campos.');
    }

    btn.innerHTML = '<span class="spinner"></span> Ingresando...';
    btn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      btn.innerHTML = 'Iniciar Sesión';
      btn.disabled = false;
      showAlert('login', 'error', 'Credenciales inválidas. Verifica tu correo y contraseña.');
    } else {
      onSuccess();
    }
  };

  window.handleEmailRegister = async () => {
    const nombres = document.getElementById('reg-nombres').value.trim();
    const apellidos = document.getElementById('reg-apellidos').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const paralelo = document.getElementById('reg-paralelo').value.trim();
    const btn = document.getElementById('btn-register');

    if (!nombres || !apellidos || !email || !password) {
      return showAlert('register', 'error', 'Completa todos los campos obligatorios.');
    }
    if (password.length < 8) {
      return showAlert('register', 'error', 'La contraseña debe tener al menos 8 caracteres.');
    }
    if (!email.includes('@')) {
      return showAlert('register', 'error', 'Ingresa un correo electrónico válido.');
    }

    btn.innerHTML = '<span class="spinner"></span> Creando cuenta...';
    btn.disabled = true;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombres, apellidos, paralelo }
      }
    });

    if (error) {
      btn.innerHTML = 'Crear Cuenta';
      btn.disabled = false;
      showAlert('register', 'error', error.message);
      return;
    }

    if (data.user) {
      // Crear perfil en la tabla profiles
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nombres,
        apellidos,
        email,
        paralelo: paralelo || 'A',
        institucion: 'Universidad Bolivariana del Ecuador (UBE)',
        curso: 'Primero de Bachillerato'
      });

      showAlert('register', 'success', '¡Cuenta creada! Revisa tu correo para confirmar y luego inicia sesión.');
      btn.innerHTML = 'Crear Cuenta';
      btn.disabled = false;
      setTimeout(() => window.switchTab('login'), 2000);
    }
  };

  window.handleForgotPassword = async () => {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      return showAlert('login', 'error', 'Ingresa tu correo para recuperar contraseña.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) {
      showAlert('login', 'error', error.message);
    } else {
      showAlert('login', 'success', 'Te enviamos un enlace de recuperación a tu correo.');
    }
  };

  function showAlert(panel, type, message) {
    const el = document.getElementById(`alert-${panel}`);
    el.className = `alert alert-${type} visible`;
    el.textContent = message;
    setTimeout(() => el.classList.remove('visible'), 5000);
  }
}
