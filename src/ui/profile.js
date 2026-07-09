// =============================================
// EduPlay UBE — Mi Perfil
// =============================================

import { supabase } from '../supabaseClient.js';

export function renderProfileModal(user, profile) {
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
    width: 90%; max-width: 500px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid var(--border);
    transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    backdrop-filter: blur(20px);
  `;
  
  modal.innerHTML = `
    <h2 style="font-family:'Orbitron',sans-serif; margin-bottom: 5px;">👤 MI PERFIL</h2>
    <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom: 20px;">Actualiza tu información personal</p>

    <div id="profile-alert" class="alert"></div>
    
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nombres</label>
        <input type="text" id="edit-nombres" class="form-input" value="${profile?.nombres || ''}" placeholder="Juan Carlos" />
      </div>
      <div class="form-group">
        <label class="form-label">Apellidos</label>
        <input type="text" id="edit-apellidos" class="form-input" value="${profile?.apellidos || ''}" placeholder="García López" />
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
        <input type="text" id="edit-paralelo" class="form-input" value="${profile?.paralelo || ''}" placeholder="A" maxlength="5" />
      </div>
    </div>
    
    <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 10px;">
      <button class="btn btn-ghost" id="btn-cancel-profile">Cancelar</button>
      <button class="btn btn-primary" id="btn-update-profile">Actualizar Perfil</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  });
  
  const closeModal = () => {
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    setTimeout(() => overlay.remove(), 200);
  };

  document.getElementById('btn-cancel-profile').onclick = closeModal;

  document.getElementById('btn-update-profile').onclick = async () => {
    const nombres = document.getElementById('edit-nombres').value.trim();
    const apellidos = document.getElementById('edit-apellidos').value.trim();
    const paralelo = document.getElementById('edit-paralelo').value.trim();
    const alertEl = document.getElementById('profile-alert');

    if (!nombres || !apellidos) {
      alertEl.className = 'alert alert-error visible';
      alertEl.textContent = 'Nombres y apellidos son obligatorios.';
      return;
    }

    const btn = document.getElementById('btn-update-profile');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Guardando...';
    btn.disabled = true;
    alertEl.className = 'alert';

    const { data, error } = await supabase.from('profiles').update({
      nombres,
      apellidos,
      paralelo: paralelo || 'A',
    }).eq('id', user.id).select().single();

    btn.disabled = false;
    btn.innerHTML = originalText;

    if (error) {
      alertEl.className = 'alert alert-error visible';
      alertEl.textContent = 'Error al actualizar el perfil. Intenta de nuevo.';
      console.error(error);
    } else {
      if (profile) {
        profile.nombres = data.nombres;
        profile.apellidos = data.apellidos;
        profile.paralelo = data.paralelo;
      }
      
      const initials = `${profile.nombres?.[0] || ''}${profile.apellidos?.[0] || ''}`;
      const displayName = `${profile.nombres} ${profile.apellidos}`;
      
      const avatarEl = document.querySelector('#profile-btn .sidebar-avatar');
      if (avatarEl && !user.user_metadata?.avatar_url) avatarEl.textContent = initials;
      
      const nameEl = document.querySelector('#profile-btn .header-user-name');
      if (nameEl) nameEl.textContent = displayName;

      alertEl.className = 'alert alert-success visible';
      alertEl.textContent = 'Perfil actualizado exitosamente.';
      
      setTimeout(() => closeModal(), 1000);
    }
  };
}
