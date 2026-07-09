-- =========================================================
-- EduPlay UBE — Esquema completo de base de datos
-- Supabase / PostgreSQL
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =========================================================

-- ---------- TABLA: profiles ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombres      text not null,
  apellidos    text not null,
  email        text not null default '',
  institucion  text not null default 'Universidad Bolivariana del Ecuador (UBE)',
  curso        text not null default 'Primero de Bachillerato',
  paralelo     text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ---------- TABLA: asignaturas ----------
create table if not exists public.asignaturas (
  id      serial primary key,
  nombre  text not null,
  slug    text not null unique,
  estado  text not null default 'construccion'
          check (estado in ('activa','construccion')),
  icono   text,
  orden   int  not null default 0
);

-- ---------- TABLA: modulos ----------
create table if not exists public.modulos (
  id                serial primary key,
  asignatura_id     int  not null references public.asignaturas(id) on delete cascade,
  nombre            text not null,
  tipo_juego        text not null
                    check (tipo_juego in ('plataformas','laberinto','bloques','penales','beisbol','bicicleta')),
  tema              text not null,
  orden             int  not null,
  prerrequisito_id  int  references public.modulos(id),
  num_preguntas     int  not null default 10,
  umbral_aprobacion int  not null default 7
);

-- ---------- TABLA: preguntas ----------
create table if not exists public.preguntas (
  id              serial primary key,
  modulo_id       int  not null references public.modulos(id) on delete cascade,
  enunciado       text not null,
  opciones        jsonb not null,
  indice_correcto int  not null check (indice_correcto between 0 and 3),
  explicacion     text,
  orden           int
);

-- ---------- TABLA: intentos ----------
create table if not exists public.intentos (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  modulo_id       int  not null references public.modulos(id) on delete cascade,
  puntaje         int  not null default 0,
  aciertos        int  not null default 0,
  total_preguntas int  not null default 10,
  tiempo_segundos int  not null default 0,
  completado      boolean not null default false,
  aprobado        boolean not null default false,
  fecha           timestamptz not null default now()
);

-- ---------- TABLA: diplomas ----------
create table if not exists public.diplomas (
  id                  bigserial primary key,
  user_id             uuid not null references auth.users(id) on delete cascade,
  modulo_id           int  not null references public.modulos(id),
  tema                text not null,
  puntaje             int,
  fecha_emision       timestamptz not null default now(),
  codigo_verificacion text unique
);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.profiles    enable row level security;
alter table public.asignaturas enable row level security;
alter table public.modulos     enable row level security;
alter table public.preguntas   enable row level security;
alter table public.intentos    enable row level security;
alter table public.diplomas    enable row level security;

-- Eliminar políticas existentes si las hay (idempotente)
drop policy if exists "perfil_select_propio"  on public.profiles;
drop policy if exists "perfil_insert_propio"  on public.profiles;
drop policy if exists "perfil_update_propio"  on public.profiles;
drop policy if exists "asignaturas_lectura"   on public.asignaturas;
drop policy if exists "modulos_lectura"       on public.modulos;
drop policy if exists "preguntas_lectura"     on public.preguntas;
drop policy if exists "intentos_insert_propio" on public.intentos;
drop policy if exists "intentos_select_propio" on public.intentos;
drop policy if exists "diplomas_insert_propio" on public.diplomas;
drop policy if exists "diplomas_select_propio" on public.diplomas;

-- profiles: cada usuario gestiona SOLO su propio perfil
create policy "perfil_select_propio" on public.profiles
  for select using (auth.uid() = id);
create policy "perfil_insert_propio" on public.profiles
  for insert with check (auth.uid() = id);
create policy "perfil_update_propio" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- catálogo: lectura para usuarios autenticados
create policy "asignaturas_lectura" on public.asignaturas
  for select using (auth.role() = 'authenticated');
create policy "modulos_lectura" on public.modulos
  for select using (auth.role() = 'authenticated');
create policy "preguntas_lectura" on public.preguntas
  for select using (auth.role() = 'authenticated');

-- intentos: cada usuario inserta/lee SOLO los suyos
create policy "intentos_insert_propio" on public.intentos
  for insert with check (auth.uid() = user_id);
create policy "intentos_select_propio" on public.intentos
  for select using (auth.uid() = user_id);

-- diplomas: cada usuario inserta/lee SOLO los suyos
create policy "diplomas_insert_propio" on public.diplomas
  for insert with check (auth.uid() = user_id);
create policy "diplomas_select_propio" on public.diplomas
  for select using (auth.uid() = user_id);

-- =========================================================
-- FUNCIONES DE RANKING (SECURITY DEFINER)
-- =========================================================
drop function if exists public.get_leaderboard(int);
create or replace function public.get_leaderboard(p_modulo_id int)
returns table(
  posicion        bigint,
  estudiante      text,
  puntaje         int,
  tiempo_segundos int,
  fecha           timestamptz,
  email           text,
  institucion     text,
  curso           text,
  paralelo        text,
  avatar_url      text
)
language sql
security definer
set search_path = public
as $$
  with mejores as (
    select distinct on (i.user_id)
      i.user_id,
      i.puntaje,
      i.tiempo_segundos,
      i.fecha,
      (pr.nombres || ' ' || pr.apellidos) as estudiante,
      pr.email,
      pr.institucion,
      pr.curso,
      pr.paralelo,
      pr.avatar_url
    from public.intentos i
    join public.profiles pr on pr.id = i.user_id
    where i.modulo_id = p_modulo_id
      and i.completado = true
    order by i.user_id, i.puntaje desc, i.tiempo_segundos asc
  )
  select
    row_number() over (order by puntaje desc, tiempo_segundos asc) as posicion,
    estudiante, puntaje, tiempo_segundos, fecha,
    email, institucion, curso, paralelo, avatar_url
  from mejores
  order by puntaje desc, tiempo_segundos asc;
$$;

drop function if exists public.get_leaderboard_global();
create or replace function public.get_leaderboard_global()
returns table(
  posicion        bigint,
  estudiante      text,
  puntaje_total   bigint,
  email           text,
  institucion     text,
  curso           text,
  paralelo        text,
  avatar_url      text
)
language sql
security definer
set search_path = public
as $$
  with mejores as (
    select distinct on (i.user_id, i.modulo_id)
      i.user_id, i.modulo_id, i.puntaje,
      (pr.nombres || ' ' || pr.apellidos) as estudiante,
      pr.email, pr.institucion, pr.curso, pr.paralelo, pr.avatar_url
    from public.intentos i
    join public.profiles pr on pr.id = i.user_id
    where i.completado = true
    order by i.user_id, i.modulo_id, i.puntaje desc, i.tiempo_segundos asc
  ),
  sumas as (
    select user_id, 
           max(estudiante) as estudiante, 
           sum(puntaje)::bigint as puntaje_total,
           max(email) as email,
           max(institucion) as institucion,
           max(curso) as curso,
           max(paralelo) as paralelo,
           max(avatar_url) as avatar_url
    from mejores group by user_id
  )
  select row_number() over (order by puntaje_total desc) as posicion,
         estudiante, puntaje_total, email, institucion, curso, paralelo, avatar_url
  from sumas order by puntaje_total desc;
$$;

-- =========================================================
-- DATOS SEMILLA (SEED)
-- =========================================================

-- Asignaturas (Usamos OVERRIDING SYSTEM VALUE o insert explícito para mantener los IDs)
insert into public.asignaturas (id, nombre, slug, estado, icono, orden) values
  (1, 'Matemáticas',       'matematicas',       'construccion', '➗', 1),
  (2, 'Historia',          'historia',          'construccion', '📜', 2),
  (3, 'Geografía',         'geografia',         'construccion', '🌍', 3),
  (4, 'Lenguaje',          'lenguaje',          'construccion', '📖', 4),
  (5, 'Inglés',            'ingles',            'activa',       '🇬🇧', 5),
  (6, 'Ciencias Naturales','ciencias-naturales','construccion', '🔬', 6)
on conflict (id) do update set nombre = excluded.nombre, slug = excluded.slug;

-- Módulos de Inglés (id de Inglés = 5 por el orden del insert)
-- Usamos IDs explícitos (1 a 5) porque el frontend de Phaser los llama directamente.

-- Módulo 1 (sin prerrequisito)
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (1, 5, 'Pixel Run: Pronouns', 'plataformas', 'Personal Pronouns', 1, null, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;

-- Módulo 2
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (2, 5, 'Maze Muncher: TO BE', 'laberinto', 'Verb TO BE', 2, 1, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;

-- Módulo 3
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (3, 5, 'Block Stack: Family', 'bloques', 'Family Vocabulary', 3, 2, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;

-- Módulo 4
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (4, 5, 'Penalty Master: Opposites', 'penales', 'Adjectives and Opposites', 4, 3, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;

-- Módulo 5
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (5, 5, 'Roblox Obby', 'plataformas', 'Future Tenses', 5, 4, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;

-- Módulo 6
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (6, 5, 'Duck Hunt', 'penales', 'Modals & Conditionals', 6, 5, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;

-- Módulo 7
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (7, 5, 'Home Run', 'beisbol', 'Past Tense', 7, 6, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;

-- Módulo 8
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (8, 5, 'Guayaquil Bike', 'bicicleta', 'Vocabulary', 8, 7, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;

-- Módulo 9
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (9, 5, 'Basketball: Present Tense', 'penales', 'Present Tense', 9, 8, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;

-- Módulo 10
insert into public.modulos (id, asignatura_id, nombre, tipo_juego, tema, orden, prerrequisito_id, num_preguntas, umbral_aprobacion)
values (10, 5, 'Ruleta: Ordenar Oraciones', 'plataformas', 'Repaso General', 10, 9, 10, 7)
on conflict (id) do update set nombre = excluded.nombre;


-- =========================================================
-- BANCO DE PREGUNTAS (ahora 80 preguntas)
-- =========================================================

-- Módulo 1: Personal Pronouns (id=1)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('___ am a student.',                          '["I","He","They","We"]',         0, '"I" is the first person singular.', 1),
  ('___ is my brother.',                         '["She","He","It","You"]',         1, '"He" is used for males.', 2),
  ('___ are my classmates.',                     '["He","She","They","I"]',         2, '"They" refers to multiple people.', 3),
  ('The cat is hungry. ___ wants food.',         '["He","She","They","It"]',        3, '"It" for animals/things.', 4),
  ('___ are a good teacher.',                    '["I","We","You","It"]',           2, '"You" is second person.', 5),
  ('María and I study together. ___ are friends.','["They","We","You","He"]',       1, '"We" includes the speaker.', 6),
  ('___ is my mother.',                          '["He","It","She","They"]',        2, '"She" for females.', 7),
  ('Which pronoun replaces "the book"?',         '["He","It","She","They"]',        1, '"It" for objects.', 8),
  ('___ like ice cream. (about yourself)',       '["I","He","She","It"]',           0, '"I" refers to yourself.', 9),
  ('Replace "Tom and Anna": ___ are here.',      '["We","You","They","It"]',        2, '"They" for 3rd person plural.', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Pixel Run: Pronouns'
on conflict do nothing;

-- Módulo 2: Verb TO BE (id=2)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('I ___ happy today.',            '["is","are","am","be"]',         2, '"am" with I.', 1),
  ('She ___ a doctor.',             '["am","is","are","be"]',         1, '"is" with she/he/it.', 2),
  ('They ___ at school.',           '["is","am","are","be"]',         2, '"are" with they.', 3),
  ('We ___ good friends.',          '["are","is","am","be"]',         0, '"are" with we.', 4),
  ('He ___ very tall.',             '["are","am","is","be"]',         2, '"is" with he.', 5),
  ('You ___ my best friend.',       '["is","am","are","be"]',         2, '"are" with you.', 6),
  ('It ___ a big dog.',             '["are","is","am","be"]',         1, '"is" with it.', 7),
  ('___ you ready?',                '["Is","Am","Are","Be"]',         2, '"Are" for questions with you.', 8),
  ('Negative form of "I am":',      '["I am not","I not am","I are not","I no am"]', 0, 'I am not / I''m not.', 9),
  ('Ana and Luis ___ students.',    '["is","am","are","be"]',         2, '"are" for plural.', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Maze Muncher: TO BE'
on conflict do nothing;

-- Módulo 3: Family Vocabulary (id=3)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('My father''s mother is my ___.', '["aunt","grandmother","sister","cousin"]', 1, 'Father''s mother = grandmother.', 1),
  ('My mother''s brother is my ___.' ,'["uncle","father","nephew","cousin"]',    0, 'Mother''s brother = uncle.', 2),
  ('My parents'' other son is my ___.' ,'["uncle","brother","cousin","nephew"]', 1, 'Another son of parents = brother.', 3),
  ('My aunt''s children are my ___.' ,'["brothers","nephews","cousins","uncles"]', 2, 'Aunt''s children = cousins.', 4),
  ('The son of my brother is my ___.' ,'["uncle","nephew","cousin","grandfather"]', 1, 'Brother''s son = nephew.', 5),
  ('My grandmother and grandfather are my ___.' ,'["parents","cousins","grandparents","siblings"]', 2, 'Both = grandparents.', 6),
  ('My mother''s husband is my ___.' ,'["uncle","brother","father","cousin"]', 2, 'Mother''s husband = father.', 7),
  ('My sister''s daughter is my ___.' ,'["niece","aunt","mother","cousin"]', 0, 'Sister''s daughter = niece.', 8),
  ('My female child is my ___.' ,'["son","daughter","sister","mother"]', 1, 'Female child = daughter.', 9),
  ('My father''s brother is my ___.' ,'["uncle","cousin","nephew","grandfather"]', 0, 'Father''s brother = uncle.', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Block Stack: Family'
on conflict do nothing;

-- Módulo 4: Adjectives and Opposites (id=4)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('The opposite of BIG is ___.',       '["large","small","huge","wide"]',      1, 'big ↔ small', 1),
  ('The opposite of HOT is ___.',       '["warm","cool","cold","dry"]',         2, 'hot ↔ cold', 2),
  ('The opposite of HAPPY is ___.',     '["glad","sad","angry","tired"]',       1, 'happy ↔ sad', 3),
  ('The opposite of FAST is ___.',      '["quick","slow","early","late"]',      1, 'fast ↔ slow', 4),
  ('The opposite of TALL is ___.',      '["high","short","long","big"]',        1, 'tall ↔ short', 5),
  ('The opposite of OLD (person) is ___.' ,'["new","young","ancient","aged"]',  1, 'old ↔ young', 6),
  ('The opposite of GOOD is ___.',      '["nice","bad","great","fine"]',        1, 'good ↔ bad', 7),
  ('The opposite of EASY is ___.',      '["simple","difficult","light","clear"]', 1, 'easy ↔ difficult', 8),
  ('The opposite of OPEN is ___.',      '["shut","closed","locked","wide"]',    1, 'open ↔ closed', 9),
  ('The opposite of EXPENSIVE is ___.' ,'["cheap","costly","rich","dear"]',     0, 'expensive ↔ cheap', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Penalty Master: Opposites'
on conflict do nothing;

-- Módulo 5: Future Tenses (id=5)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('I think it ___ rain tomorrow.', '["will","is going to","is","are going to"]', 0, 'Use "will" for predictions based on beliefs.', 1),
  ('Look at those dark clouds! It ___.', '["will rain","is going to rain","rains","raining"]', 1, 'Use "going to" for predictions based on present evidence.', 2),
  ('I ___ to the doctor at 4 PM tomorrow. I have an appointment.', '["will go","go","am going","goes"]', 2, 'Use Present Continuous for fixed arrangements/appointments.', 3),
  ('"We don''t have any milk." "Oh, really? I ___ buy some."', '["am going to","buy","will","am buying"]', 2, 'Use "will" for spontaneous decisions made at the moment of speaking.', 4),
  ('She ___ travel to Europe next summer. She bought the tickets.', '["will","is going to","is traveling","travels"]', 1, 'Use "going to" (or Present Continuous) for firm plans and intentions.', 5),
  ('What time ___ your train leave tomorrow?', '["is","does","will","going to"]', 1, 'Use Present Simple for scheduled events like timetables.', 6),
  ('I promise I ___ tell anyone your secret.', '["won''t","am not going to","don''t","am not telling"]', 0, 'Use "will" (won''t) for promises.', 7),
  ('They ___ a party on Friday night. The invitations are sent.', '["will have","are having","have","having"]', 1, 'Use Present Continuous for organized plans with other people.', 8),
  ('Watch out! You ___ drop that glass!', '["will","are going to","are dropping","drop"]', 1, 'Use "going to" when something is about to happen right now.', 9),
  ('I ___ you with your bags; they look heavy.', '["will help","am helping","help","am going to help"]', 0, 'Use "will" for offers of help.', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Roblox Obby'
on conflict do nothing;

-- Módulo 6: Modals & Conditionals (id=6)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('You ___ wear a seatbelt when you drive.', '["can","should","have to","would"]', 2, '"have to" expresses a strong obligation or rule.', 1),
  ('If it rains tomorrow, we ___ stay at home.', '["will","would","can","are"]', 0, 'First conditional: if + present, will + infinitive.', 2),
  ('She ___ speak three languages fluently.', '["should","must","can","have to"]', 2, '"can" is used for ability.', 3),
  ('If you study hard, you ___ the exam.', '["passed","will pass","pass","would pass"]', 1, 'First conditional: consequence uses "will".', 4),
  ('You ___ eat so much junk food; it''s bad for you.', '["don''t have to","shouldn''t","can''t","won''t"]', 1, '"shouldn''t" is used for giving advice.', 5),
  ('___ I use your phone, please?', '["Must","Will","Should","Can"]', 3, '"Can" is used to ask for permission informally.', 6),
  ('If she ___ me, I will help her.', '["asks","will ask","ask","asked"]', 0, 'First conditional: if clause uses present simple.', 7),
  ('I ___ get up early tomorrow because it''s Sunday.', '["mustn''t","shouldn''t","don''t have to","can''t"]', 2, '"don''t have to" means there is no obligation.', 8),
  ('What ___ you do if you miss the bus?', '["do","did","will","are"]', 2, 'First conditional question: "What will you do...?"', 9),
  ('You ___ be quiet in the library.', '["can","must","will","should"]', 1, '"must" expresses a strong internal obligation or rule.', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Duck Hunt'
on conflict do nothing;

-- Módulo 7: Past Tense (id=7)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('I ___ to the park yesterday.', '["go","goes","went","going"]', 2, 'The past tense of "go" is "went".', 1),
  ('She ___ a letter to her friend last week.', '["write","wrote","written","writes"]', 1, 'The past tense of "write" is "wrote".', 2),
  ('___ you see the movie last night?', '["Do","Did","Are","Was"]', 1, 'Use "did" to form a question in the past simple.', 3),
  ('They ___ play tennis last Sunday.', '["didn''t","doesn''t","aren''t","weren''t"]', 0, '"didn''t" is the negative auxiliary for past simple verbs.', 4),
  ('He ___ his homework before dinner.', '["finish","finishing","finished","finishes"]', 2, '"finished" is the regular past tense of "finish".', 5),
  ('We ___ a great time at the party.', '["had","have","has","having"]', 0, 'The past tense of "have" is "had".', 6),
  ('What ___ she say to you?', '["did","do","was","does"]', 0, 'Use "did" for past simple questions.', 7),
  ('I ___ very tired yesterday.', '["am","were","was","is"]', 2, 'The past tense of "am" is "was".', 8),
  ('They ___ at home last night.', '["was","were","did","are"]', 1, 'The past tense of "are" is "were".', 9),
  ('He ___ the ball very hard.', '["hits","hit","hitted","hitting"]', 1, '"hit" is an irregular verb and its past tense is also "hit".', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Home Run'
on conflict do nothing;

-- Módulo 8: Vocabulary (id=8)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('How do you say "manzana" in English?', '["Apple","Banana","Orange","Grape"]', 0, '"Apple" is the correct translation for "manzana".', 1),
  ('What is the English word for "perro"?', '["Cat","Dog","Bird","Fish"]', 1, '"Dog" translates to "perro".', 2),
  ('Which word means "feliz"?', '["Sad","Angry","Happy","Tired"]', 2, '"Happy" means "feliz".', 3),
  ('What color is a typical fire truck?', '["Blue","Red","Green","Yellow"]', 1, 'Fire trucks are typically "Red".', 4),
  ('How do you say "libro" in English?', '["Book","Notebook","Pen","Pencil"]', 0, '"Book" translates to "libro".', 5),
  ('What is the word for "agua" in English?', '["Milk","Juice","Water","Tea"]', 2, '"Water" is the correct translation.', 6),
  ('Which word means "rápido"?', '["Slow","Fast","Cold","Hot"]', 1, '"Fast" means "rápido".', 7),
  ('What is the English word for "casa"?', '["Car","House","Tree","Street"]', 1, '"House" translates to "casa".', 8),
  ('How do you say "sol" in English?', '["Moon","Star","Sun","Cloud"]', 2, '"Sun" translates to "sol".', 9),
  ('Which word means "amigo"?', '["Enemy","Friend","Brother","Teacher"]', 1, '"Friend" means "amigo".', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Guayaquil Bike'
on conflict do nothing;

-- Módulo 9: Present Tense (id=9)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('She ___ tennis every weekend.', '["play","plays","playing","is play"]', 1, 'Use "plays" with third person singular (she).', 1),
  ('___ they like pizza?', '["Do","Does","Are","Is"]', 0, 'Use "Do" to ask questions for they/we/you/I.', 2),
  ('He ___ not work on Sundays.', '["do","are","does","is"]', 2, 'Use "does not" or "doesn''t" for third person singular.', 3),
  ('We ___ to school by bus.', '["goes","going","go","are go"]', 2, 'Use "go" with we.', 4),
  ('___ she watch TV in the evening?', '["Do","Does","Is","Are"]', 1, 'Use "Does" for third person singular in questions.', 5),
  ('I ___ understand the question.', '["doesn''t","not","don''t","am not"]', 2, 'Use "don''t" for negative present simple with I.', 6),
  ('My brother ___ a lot of books.', '["read","reads","reading","are read"]', 1, 'Use "reads" because my brother is "he".', 7),
  ('Where ___ you live?', '["do","does","are","is"]', 0, 'Use "do" for questions with you.', 8),
  ('The sun ___ in the east.', '["rise","rises","is rise","rising"]', 1, 'Fact: Use third person singular "rises" for "the sun" (it).', 9),
  ('They ___ to the cinema very often.', '["doesn''t go","not go","don''t go","aren''t go"]', 2, 'Use "don''t go" with they.', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Basketball: Present Tense'
on conflict do nothing;

-- Módulo 10: Ruleta: Ordenar Oraciones (id=10)
insert into public.preguntas (modulo_id, enunciado, opciones, indice_correcto, explicacion, orden)
select m.id, q.enunciado, q.opciones::jsonb, q.ic, q.expl, q.ord
from public.modulos m,
(values
  ('Ordena la oración sobre pronombres', '["am", "student", "I", "a"]', 0, 'I am a student', 1),
  ('Ordena la oración con verbo TO BE', '["is", "My", "tall", "brother"]', 0, 'My brother is tall', 2),
  ('Ordena la oración sobre familia', '["love", "I", "mother", "my"]', 0, 'I love my mother', 3),
  ('Ordena la oración con opuestos', '["car", "The", "fast", "is"]', 0, 'The car is fast', 4),
  ('Ordena la oración en futuro', '["will", "go", "We", "tomorrow"]', 0, 'We will go tomorrow', 5),
  ('Ordena la oración con modal', '["can", "She", "well", "swim"]', 0, 'She can swim well', 6),
  ('Ordena la oración en pasado', '["played", "They", "yesterday", "soccer"]', 0, 'They played soccer yesterday', 7),
  ('Ordena la oración con vocabulario', '["apple", "The", "red", "is"]', 0, 'The apple is red', 8),
  ('Ordena la oración en presente', '["reads", "He", "book", "a"]', 0, 'He reads a book', 9),
  ('Ordena la oración general', '["are", "You", "friend", "my"]', 0, 'You are my friend', 10)
) as q(enunciado, opciones, ic, expl, ord)
where m.nombre = 'Ruleta: Ordenar Oraciones'
on conflict do nothing;

-- =========================================================
-- Verificación (ejecutar para confirmar)
-- =========================================================
-- select count(*) from public.asignaturas;  -- debe = 6
-- select count(*) from public.modulos;      -- debe = 10
-- select count(*) from public.preguntas;    -- debe = 100
