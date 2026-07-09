import './styles.css';

const subjects = [
  { name: 'Matematicas', status: 'En construccion' },
  { name: 'Historia', status: 'En construccion' },
  { name: 'Geografia', status: 'En construccion' },
  { name: 'Lenguaje', status: 'En construccion' },
  { name: 'Ingles', status: 'Activo' },
  { name: 'Ciencias Naturales', status: 'En construccion' },
];

const modules = [
  {
    id: 1,
    title: 'Personal Pronouns',
    game: 'Pixel Run',
    topic: 'I, you, he, she, it, we, they',
    score: 8,
    unlocked: true,
  },
  {
    id: 2,
    title: 'Verb TO BE',
    game: 'Maze Muncher',
    topic: 'am, is, are en contexto',
    score: 0,
    unlocked: true,
  },
  {
    id: 3,
    title: 'Family Vocabulary',
    game: 'Block Stack',
    topic: 'mother, uncle, cousin, daughter',
    score: 0,
    unlocked: false,
  },
  {
    id: 4,
    title: 'Adjectives and Opposites',
    game: 'Penalty Master',
    topic: 'big/small, fast/slow, old/new',
    score: 0,
    unlocked: false,
  },
];

const questions = [
  {
    prompt: 'Choose the correct pronoun: Maria is my friend. ___ is kind.',
    options: ['She', 'He', 'They', 'We'],
    answer: 'She',
  },
  {
    prompt: 'Complete the sentence: I ___ a student at UBE.',
    options: ['am', 'is', 'are', 'be'],
    answer: 'am',
  },
  {
    prompt: 'Which word means "hermano" in English?',
    options: ['Brother', 'Mother', 'Aunt', 'Cousin'],
    answer: 'Brother',
  },
];

function renderApp() {
  const app = document.querySelector('#app');
  app.innerHTML = `
    <main class="shell">
      <aside class="sidebar" aria-label="Asignaturas">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">MP</span>
          <div>
            <p>Manu Play</p>
            <strong>UBE</strong>
          </div>
        </div>
        <nav class="subject-list">
          ${subjects.map((subject) => `
            <button class="subject ${subject.status === 'Activo' ? 'is-active' : ''}" type="button" data-subject="${subject.name}">
              <span>${subject.name}</span>
              <small>${subject.status}</small>
            </button>
          `).join('')}
        </nav>
      </aside>

      <section class="workspace">
        <header class="hero">
          <div>
            <p class="eyebrow">Primero de Bachillerato</p>
            <h1>Ingles se aprende jugando, modulo por modulo.</h1>
            <p class="hero-copy">Ruta gamificada con trivia, puntaje y diplomas para practicar vocabulario y estructuras basicas.</p>
          </div>
          <div class="progress-panel" aria-label="Progreso de Ingles">
            <span>Avance</span>
            <strong>1 / 4</strong>
            <div class="meter"><span style="width: 25%"></span></div>
          </div>
        </header>

        <section class="module-grid" aria-label="Modulos de Ingles">
          ${modules.map((module) => `
            <article class="module-card ${module.unlocked ? '' : 'is-locked'}">
              <div class="module-topline">
                <span>Modulo ${module.id}</span>
                <span>${module.unlocked ? 'Disponible' : 'Bloqueado'}</span>
              </div>
              <h2>${module.title}</h2>
              <p>${module.topic}</p>
              <div class="game-row">
                <strong>${module.game}</strong>
                <span>${module.score}/10</span>
              </div>
              <button type="button" ${module.unlocked ? '' : 'disabled'} data-module="${module.id}">
                ${module.unlocked ? 'Practicar ahora' : 'Completa el anterior'}
              </button>
            </article>
          `).join('')}
        </section>

        <section class="practice" aria-live="polite">
          <div>
            <p class="eyebrow">Trivia rapida</p>
            <h2 id="question-title">${questions[0].prompt}</h2>
          </div>
          <div class="answers">
            ${questions[0].options.map((option) => `<button type="button" data-answer="${option}">${option}</button>`).join('')}
          </div>
          <p id="feedback" class="feedback">Selecciona una respuesta para probar el flujo de practica.</p>
        </section>
      </section>
    </main>
  `;

  bindInteractions();
}

function bindInteractions() {
  document.querySelectorAll('[data-subject]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.subject !== 'Ingles') {
        showFeedback('Esta asignatura estara disponible proximamente.');
      }
    });
  });

  document.querySelectorAll('[data-module]').forEach((button) => {
    button.addEventListener('click', () => {
      const module = modules.find((item) => item.id === Number(button.dataset.module));
      showFeedback(`Practica iniciada: ${module.game} - ${module.title}.`);
    });
  });

  document.querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      const isCorrect = button.dataset.answer === questions[0].answer;
      showFeedback(isCorrect ? 'Correcto. Puntaje ganado: +100.' : 'Intenta otra vez. Revisa la pista del modulo.');
      button.classList.toggle('is-correct', isCorrect);
      button.classList.toggle('is-wrong', !isCorrect);
    });
  });
}

function showFeedback(message) {
  const feedback = document.querySelector('#feedback');
  feedback.textContent = message;
}

renderApp();
