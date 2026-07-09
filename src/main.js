import './styles.css';

const modules = [
  {
    title: 'Fundamentos de la UBE',
    description: 'Repasa identidad institucional, valores y rutas de aprendizaje con actividades cortas.',
    action: 'Iniciar modulo',
  },
  {
    title: 'Retos de conocimiento',
    description: 'Practica preguntas de bachillerato y gana progreso conforme completas cada desafio.',
    action: 'Ver retos',
  },
  {
    title: 'Diploma de avance',
    description: 'Genera una constancia visual cuando completes las actividades principales.',
    action: 'Preparar diploma',
  },
];

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="shell">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__copy">
        <p class="eyebrow">Universidad Bolivariana del Ecuador</p>
        <h1 id="hero-title">Manu Play UBE</h1>
        <p class="lead">
          Plataforma gamificada de aprendizaje para estudiantes de Primero de Bachillerato.
        </p>
        <div class="hero__actions">
          <a class="button button--primary" href="#modulos">Explorar modulos</a>
          <a class="button button--ghost" href="./GUIA_ESTUDIANTES.md">Guia estudiantil</a>
        </div>
      </div>
      <div class="hero__media" aria-hidden="true">
        <img src="/portada.png" alt="" />
      </div>
    </section>

    <section id="modulos" class="modules" aria-labelledby="modules-title">
      <div class="section-heading">
        <p class="eyebrow">Aprende jugando</p>
        <h2 id="modules-title">Modulos disponibles</h2>
      </div>
      <div class="module-grid">
        ${modules
          .map(
            (module) => `
              <article class="module-card">
                <h3>${module.title}</h3>
                <p>${module.description}</p>
                <button type="button">${module.action}</button>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  </main>
`;

document.querySelectorAll('.module-card button').forEach((button) => {
  button.addEventListener('click', () => {
    button.textContent = 'Disponible pronto';
    button.disabled = true;
  });
});
