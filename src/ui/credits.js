export function renderCredits(container) {
  container.innerHTML = `
    <div style="padding: 40px; max-width: 800px; margin: 0 auto; animation: fadeInUp 0.5s ease;">
      <h2 style="font-family: 'Orbitron', sans-serif; font-size: 2.5rem; color: var(--text-primary); margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 2.5rem;">🌟</span> Créditos
      </h2>
      
      <div class="module-card" style="padding: 40px; text-align: center; border-radius: var(--radius-xl); background: var(--bg-glass);">
        <div style="width: 120px; height: 120px; margin: 0 auto 20px; border-radius: 50%; border: 4px solid var(--border-accent); box-shadow: var(--shadow-glow); overflow: hidden; background: var(--bg-glass);">
          <img src="/foto.png" alt="Manuel Reyes" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        
        <h3 style="font-size: 1.8rem; color: var(--text-primary); margin-bottom: 8px;">Profe. Manuel Reyes</h3>
        <p style="color: var(--red-ube); font-weight: bold; font-size: 1.1rem; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px;">
          Desarrollador y Responsable Académico
        </p>
        
        <p style="color: var(--text-secondary); line-height: 1.8; margin-bottom: 30px; font-size: 1.05rem;">
          Esta plataforma de aprendizaje interactivo ("Manu Play UBE") ha sido diseñada y desarrollada 
          como un esfuerzo para llevar la gamificación al proceso educativo, haciendo que aprender 
          inglés sea una experiencia inmersiva, dinámica y sobre todo, divertida para los estudiantes 
          de Primero de Bachillerato.
        </p>

        <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 30px;">
          <div style="background: rgba(255,255,255,0.05); padding: 15px 25px; border-radius: 12px; border: 1px solid var(--border);">
            <div style="font-size: 1.5rem; margin-bottom: 5px;">🎮</div>
            <div style="font-weight: 600; color: var(--text-primary);">Phaser 3</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Motor de Juegos</div>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 15px 25px; border-radius: 12px; border: 1px solid var(--border);">
            <div style="font-size: 1.5rem; margin-bottom: 5px;">⚡</div>
            <div style="font-weight: 600; color: var(--text-primary);">Supabase</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Base de Datos</div>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 15px 25px; border-radius: 12px; border: 1px solid var(--border);">
            <div style="font-size: 1.5rem; margin-bottom: 5px;">🎓</div>
            <div style="font-weight: 600; color: var(--text-primary);">UBE</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Apoyo Institucional</div>
          </div>
        </div>
        
        <div style="border-top: 1px solid var(--border); padding-top: 20px; color: var(--text-muted); font-size: 0.9rem;">
          &copy; ${new Date().getFullYear()} Universidad Bolivariana del Ecuador. Todos los derechos reservados.
        </div>
      </div>
    </div>
  `;
}
