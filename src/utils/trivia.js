// =============================================
// EduPlay UBE — Carga de preguntas de trivia
// desde Supabase, con fallback local
// =============================================

import { supabase } from '../supabaseClient.js';

// Banco local de preguntas (fallback si la BD no tiene datos aún)
const LOCAL_QUESTIONS = {
  1: [ // Personal Pronouns
    { enunciado: '___ am a student.', opciones: ['I','He','They','We'], indice_correcto: 0, explicacion: '"I" is the first person singular pronoun.' },
    { enunciado: '___ is my brother.', opciones: ['She','He','It','You'], indice_correcto: 1, explicacion: '"He" is used for males.' },
    { enunciado: '___ are my classmates.', opciones: ['He','She','They','I'], indice_correcto: 2, explicacion: '"They" refers to multiple people.' },
    { enunciado: 'The cat is hungry. ___ wants food.', opciones: ['He','She','They','It'], indice_correcto: 3, explicacion: '"It" is used for animals (in general).' },
    { enunciado: '___ are a good teacher.', opciones: ['I','We','You','It'], indice_correcto: 2, explicacion: '"You" is second person singular/plural.' },
    { enunciado: 'María and I study together. ___ are friends.', opciones: ['They','We','You','He'], indice_correcto: 1, explicacion: '"We" includes the speaker.' },
    { enunciado: '___ is my mother.', opciones: ['He','It','She','They'], indice_correcto: 2, explicacion: '"She" is used for females.' },
    { enunciado: 'Which pronoun replaces "the book"?', opciones: ['He','It','She','They'], indice_correcto: 1, explicacion: '"It" is used for objects.' },
    { enunciado: '___ like ice cream. (about yourself)', opciones: ['I','He','She','It'], indice_correcto: 0, explicacion: '"I" refers to yourself.' },
    { enunciado: 'Replace "Tom and Anna": ___ are here.', opciones: ['We','You','They','It'], indice_correcto: 2, explicacion: '"They" replaces multiple people (3rd person).' },
  ],
  2: [ // Verb TO BE
    { enunciado: 'I ___ happy today.', opciones: ['is','are','am','be'], indice_correcto: 2, explicacion: '"am" is used with "I".' },
    { enunciado: 'She ___ a doctor.', opciones: ['am','is','are','be'], indice_correcto: 1, explicacion: '"is" is used with he/she/it.' },
    { enunciado: 'They ___ at school.', opciones: ['is','am','are','be'], indice_correcto: 2, explicacion: '"are" is used with they/we/you.' },
    { enunciado: 'We ___ good friends.', opciones: ['are','is','am','be'], indice_correcto: 0, explicacion: '"are" is used with we.' },
    { enunciado: 'He ___ very tall.', opciones: ['are','am','is','be'], indice_correcto: 2, explicacion: '"is" goes with he/she/it.' },
    { enunciado: 'You ___ my best friend.', opciones: ['is','am','are','be'], indice_correcto: 2, explicacion: '"are" goes with you.' },
    { enunciado: 'It ___ a big dog.', opciones: ['are','is','am','be'], indice_correcto: 1, explicacion: '"is" goes with it.' },
    { enunciado: '___ you ready?', opciones: ['Is','Am','Are','Be'], indice_correcto: 2, explicacion: '"Are" for questions with you.' },
    { enunciado: 'Negative form of "I am":', opciones: ['I am not','I not am','I are not','I no am'], indice_correcto: 0, explicacion: 'The negative is "I am not" or "I\'m not".' },
    { enunciado: 'Ana and Luis ___ students.', opciones: ['is','am','are','be'], indice_correcto: 2, explicacion: '"are" for plural subjects.' },
  ],
  3: [ // Family Vocabulary
    { enunciado: "My father's mother is my ___.", opciones: ['aunt','grandmother','sister','cousin'], indice_correcto: 1, explicacion: "Father's mother = grandmother." },
    { enunciado: "My mother's brother is my ___.", opciones: ['uncle','father','nephew','cousin'], indice_correcto: 0, explicacion: "Mother's brother = uncle." },
    { enunciado: "My parents' other son is my ___.", opciones: ['uncle','brother','cousin','nephew'], indice_correcto: 1, explicacion: "Another son of your parents = brother." },
    { enunciado: 'My aunt\'s children are my ___.', opciones: ['brothers','nephews','cousins','uncles'], indice_correcto: 2, explicacion: "Aunt's children = cousins." },
    { enunciado: 'The son of my brother is my ___.', opciones: ['uncle','nephew','cousin','grandfather'], indice_correcto: 1, explicacion: "Brother's son = nephew." },
    { enunciado: 'My grandmother and grandfather are my ___.', opciones: ['parents','cousins','grandparents','siblings'], indice_correcto: 2, explicacion: "Both grandparents together = grandparents." },
    { enunciado: "My mother's husband is my ___.", opciones: ['uncle','brother','father','cousin'], indice_correcto: 2, explicacion: "Mother's husband = father." },
    { enunciado: "My sister's daughter is my ___.", opciones: ['niece','aunt','mother','cousin'], indice_correcto: 0, explicacion: "Sister's daughter = niece." },
    { enunciado: 'My female child is my ___.', opciones: ['son','daughter','sister','mother'], indice_correcto: 1, explicacion: "Female child = daughter." },
    { enunciado: "My father's brother is my ___.", opciones: ['uncle','cousin','nephew','grandfather'], indice_correcto: 0, explicacion: "Father's brother = uncle." },
  ],
  4: [ // Adjectives and Opposites
    { enunciado: 'The opposite of BIG is ___.', opciones: ['large','small','huge','wide'], indice_correcto: 1, explicacion: 'big ↔ small' },
    { enunciado: 'The opposite of HOT is ___.', opciones: ['warm','cool','cold','dry'], indice_correcto: 2, explicacion: 'hot ↔ cold' },
    { enunciado: 'The opposite of HAPPY is ___.', opciones: ['glad','sad','angry','tired'], indice_correcto: 1, explicacion: 'happy ↔ sad' },
    { enunciado: 'The opposite of FAST is ___.', opciones: ['quick','slow','early','late'], indice_correcto: 1, explicacion: 'fast ↔ slow' },
    { enunciado: 'The opposite of TALL is ___.', opciones: ['high','short','long','big'], indice_correcto: 1, explicacion: 'tall ↔ short' },
    { enunciado: 'The opposite of OLD (a person) is ___.', opciones: ['new','young','ancient','aged'], indice_correcto: 1, explicacion: 'old ↔ young' },
    { enunciado: 'The opposite of GOOD is ___.', opciones: ['nice','bad','great','fine'], indice_correcto: 1, explicacion: 'good ↔ bad' },
    { enunciado: 'The opposite of EASY is ___.', opciones: ['simple','difficult','light','clear'], indice_correcto: 1, explicacion: 'easy ↔ difficult' },
    { enunciado: 'The opposite of OPEN is ___.', opciones: ['shut','closed','locked','wide'], indice_correcto: 1, explicacion: 'open ↔ closed' },
    { enunciado: 'The opposite of EXPENSIVE is ___.', opciones: ['cheap','costly','rich','dear'], indice_correcto: 0, explicacion: 'expensive ↔ cheap' },
  ],
  5: [ // Future Tenses
    { enunciado: 'I think it ___ rain tomorrow.', opciones: ['will','is going to','is','are going to'], indice_correcto: 0, explicacion: 'Use "will" for predictions based on beliefs.' },
    { enunciado: 'Look at those dark clouds! It ___.', opciones: ['will rain','is going to rain','rains','raining'], indice_correcto: 1, explicacion: 'Use "going to" for predictions based on present evidence.' },
    { enunciado: 'I ___ to the doctor at 4 PM tomorrow. I have an appointment.', opciones: ['will go','go','am going','goes'], indice_correcto: 2, explicacion: 'Use Present Continuous for fixed arrangements/appointments.' },
    { enunciado: '"We don\'t have any milk." "Oh, really? I ___ buy some."', opciones: ['am going to','buy','will','am buying'], indice_correcto: 2, explicacion: 'Use "will" for spontaneous decisions made at the moment of speaking.' },
    { enunciado: 'She ___ travel to Europe next summer. She bought the tickets.', opciones: ['will','is going to','is traveling','travels'], indice_correcto: 1, explicacion: 'Use "going to" (or Present Continuous) for firm plans and intentions.' },
    { enunciado: 'What time ___ your train leave tomorrow?', opciones: ['is','does','will','going to'], indice_correcto: 1, explicacion: 'Use Present Simple for scheduled events like timetables.' },
    { enunciado: 'I promise I ___ tell anyone your secret.', opciones: ['won\'t','am not going to','don\'t','am not telling'], indice_correcto: 0, explicacion: 'Use "will" (won\'t) for promises.' },
    { enunciado: 'They ___ a party on Friday night. The invitations are sent.', opciones: ['will have','are having','have','having'], indice_correcto: 1, explicacion: 'Use Present Continuous for organized plans with other people.' },
    { enunciado: 'Watch out! You ___ drop that glass!', opciones: ['will','are going to','are dropping','drop'], indice_correcto: 1, explicacion: 'Use "going to" when something is about to happen right now.' },
    { enunciado: 'I ___ you with your bags; they look heavy.', opciones: ['will help','am helping','help','am going to help'], indice_correcto: 0, explicacion: 'Use "will" for offers of help.' },
  ],
  6: [ // Modals & Conditionals
    { enunciado: 'You ___ wear a seatbelt when you drive.', opciones: ['can','should','have to','would'], indice_correcto: 2, explicacion: '"have to" expresses a strong obligation or rule.' },
    { enunciado: 'If it rains tomorrow, we ___ stay at home.', opciones: ['will','would','can','are'], indice_correcto: 0, explicacion: 'First conditional: if + present, will + infinitive.' },
    { enunciado: 'She ___ speak three languages fluently.', opciones: ['should','must','can','have to'], indice_correcto: 2, explicacion: '"can" is used for ability.' },
    { enunciado: 'If you study hard, you ___ the exam.', opciones: ['passed','will pass','pass','would pass'], indice_correcto: 1, explicacion: 'First conditional: consequence uses "will".' },
    { enunciado: 'You ___ eat so much junk food; it\'s bad for you.', opciones: ['don\'t have to','shouldn\'t','can\'t','won\'t'], indice_correcto: 1, explicacion: '"shouldn\'t" is used for giving advice.' },
    { enunciado: '___ I use your phone, please?', opciones: ['Must','Will','Should','Can'], indice_correcto: 3, explicacion: '"Can" is used to ask for permission informally.' },
    { enunciado: 'If she ___ me, I will help her.', opciones: ['asks','will ask','ask','asked'], indice_correcto: 0, explicacion: 'First conditional: if clause uses present simple.' },
    { enunciado: 'I ___ get up early tomorrow because it\'s Sunday.', opciones: ['mustn\'t','shouldn\'t','don\'t have to','can\'t'], indice_correcto: 2, explicacion: '"don\'t have to" means there is no obligation.' },
    { enunciado: 'What ___ you do if you miss the bus?', opciones: ['do','did','will','are'], indice_correcto: 2, explicacion: 'First conditional question: "What will you do...?"' },
    { enunciado: 'You ___ be quiet in the library.', opciones: ['can','must','will','should'], indice_correcto: 1, explicacion: '"must" expresses a strong internal obligation or rule.' }
  ],
  7: [ // Past Tense
    { enunciado: 'I ___ to the park yesterday.', opciones: ['go','goes','went','going'], indice_correcto: 2, explicacion: 'The past tense of "go" is "went".' },
    { enunciado: 'She ___ a letter to her friend last week.', opciones: ['write','wrote','written','writes'], indice_correcto: 1, explicacion: 'The past tense of "write" is "wrote".' },
    { enunciado: '___ you see the movie last night?', opciones: ['Do','Did','Are','Was'], indice_correcto: 1, explicacion: 'Use "did" to form a question in the past simple.' },
    { enunciado: 'They ___ play tennis last Sunday.', opciones: ['didn\'t','doesn\'t','aren\'t','weren\'t'], indice_correcto: 0, explicacion: '"didn\'t" is the negative auxiliary for past simple verbs.' },
    { enunciado: 'He ___ his homework before dinner.', opciones: ['finish','finishing','finished','finishes'], indice_correcto: 2, explicacion: '"finished" is the regular past tense of "finish".' },
    { enunciado: 'We ___ a great time at the party.', opciones: ['had','have','has','having'], indice_correcto: 0, explicacion: 'The past tense of "have" is "had".' },
    { enunciado: 'What ___ she say to you?', opciones: ['did','do','was','does'], indice_correcto: 0, explicacion: 'Use "did" for past simple questions.' },
    { enunciado: 'I ___ very tired yesterday.', opciones: ['am','were','was','is'], indice_correcto: 2, explicacion: 'The past tense of "am" is "was".' },
    { enunciado: 'They ___ at home last night.', opciones: ['was','were','did','are'], indice_correcto: 1, explicacion: 'The past tense of "are" is "were".' },
    { enunciado: 'He ___ the ball very hard.', opciones: ['hits','hit','hitted','hitting'], indice_correcto: 1, explicacion: '"hit" is an irregular verb and its past tense is also "hit".' },
  ],
};

export async function loadTrivia(moduleId) {
  try {
    const { data, error } = await supabase
      .from('preguntas')
      .select('*')
      .eq('modulo_id', moduleId)
      .order('orden', { ascending: true, nullsFirst: false });

    if (!error && data && data.length >= 10) {
      // Eliminar duplicados por enunciado
      const uniqueData = [];
      const seen = new Set();
      for (const q of data) {
        if (!seen.has(q.enunciado)) {
          seen.add(q.enunciado);
          uniqueData.push(q);
        }
      }
      
      // Mezclar aleatoriamente
      return shuffle([...uniqueData]);
    }
  } catch (e) {
    console.warn('No se pudieron cargar preguntas de BD, usando banco local:', e.message);
  }

  // Fallback: preguntas locales
  const local = LOCAL_QUESTIONS[moduleId] || LOCAL_QUESTIONS[1];
  return shuffle([...local]);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
