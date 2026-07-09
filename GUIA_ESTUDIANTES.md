# EduPlay UBE - Guía para Estudiantes

¡Bienvenido! Este es el código fuente de la plataforma gamificada **EduPlay UBE**. Has recibido esta plantilla para que puedas configurar tu propio entorno, aprender cómo funciona y **crear tus propios minijuegos**.

Sigue estas instrucciones paso a paso para configurar tu entorno de desarrollo.

---

## Parte 1: Configurar la Base de Datos (Supabase)

Esta plataforma utiliza Supabase (un backend as a Service basado en PostgreSQL) para guardar los usuarios, puntajes y diplomas.

1.  Crea una cuenta gratuita en [Supabase](https://supabase.com/).
2.  Crea un nuevo proyecto.
3.  Ve a la sección de **SQL Editor** en el menú izquierdo de tu proyecto de Supabase.
4.  Copia todo el contenido del archivo `supabase/schema.sql` (que viene incluido en esta carpeta).
5.  Pégalo en el editor SQL de Supabase y dale a **Run** (Ejecutar).
    *   *Esto creará automáticamente todas las tablas necesarias: `perfiles`, `modulos`, `intentos`, `diplomas` y configurará las reglas de seguridad.*
6.  Ve a **Authentication -> Providers** y habilita **Google**.
    *   Necesitarás obtener tu *Client ID* y *Client Secret* desde Google Cloud Console (la propia plataforma te irá guiando con instrucciones en pantalla si te faltan datos).

## Parte 2: Conectar tu Proyecto

Para que el código local se comunique con tu base de datos de Supabase, necesitas tus claves API.

1.  En tu proyecto de Supabase, ve a **Project Settings (Configuración) -> API**.
2.  En la raíz de este proyecto (la misma carpeta donde está este archivo), renombra el archivo `.env.example` a `.env`.
3.  Abre el archivo `.env` y reemplaza los valores de ejemplo con la URL y la Clave Pública (anon key) de tu proyecto:
    ```env
    VITE_SUPABASE_URL=https://tu-codigo-de-proyecto.supabase.co
    VITE_SUPABASE_ANON_KEY=eyJhbG... (tu clave larga)
    ```

## Parte 3: Arrancar el Proyecto Localmente

Necesitas tener [Node.js](https://nodejs.org/) instalado en tu computadora.

1.  Abre tu terminal (o la de tu editor de código como Antigravity o VSCode).
2.  Asegúrate de estar en la carpeta del proyecto.
3.  Instala las dependencias ejecutando:
    ```bash
    npm install
    ```
4.  Una vez finalizado, arranca el servidor de desarrollo:
    ```bash
    npm run dev
    ```
5.  Abre la URL que te muestra en consola (por lo general `http://localhost:3000` o `http://localhost:5173`) en tu navegador. ¡Listo! Ya deberías ver la plataforma funcionando con tu base de datos.

---

## Parte 4: ¿Cómo crear un NUEVO minijuego?

Si el profesor te pide que crees tu propio módulo de juego (por ejemplo, el **Módulo 11**), estos son los archivos clave que debes modificar:

### 1. La Lógica del Juego (`src/games/m11/index.js`)
*   Crea una carpeta nueva en `src/games/` llamada `m11`.
*   Copia el archivo `index.js` de otro juego similar (por ejemplo, `m1` para un juego de plataformas) y pégalo en tu nueva carpeta.
*   Modifica las mecánicas, preguntas, imágenes y sonidos de ese archivo. **OJO:** Antigravity puede ayudarte mucho aquí pidiéndole cambios específicos.

### 2. Registrar el Juego en el Menú (`src/ui/modules.js`)
*   Abre el archivo `src/ui/modules.js`.
*   Busca la variable `MODULE_CONFIG`.
*   Agrega un nuevo bloque (objeto) al final de la lista con la información de tu juego:
    ```javascript
    {
      id: 11,
      nombre: 'Mi Nuevo Juego',
      tema: 'Tema que estoy enseñando',
      tipo: 'el_tipo_de_juego',
      icon: 'roblox.png', // o una nueva imagen en la carpeta assets
      color: '#ff0000',
      desc: 'Descripción corta de mi juego.'
    }
    ```

### 3. Registrar el Juego para los Diplomas
Para que el juego te otorgue un diploma con el nombre y tema correctos al pasarlo:
1.  Abre `src/utils/diploma.js`. Agrega el ID y el nombre a `MODULE_NAMES` y el tema a `MODULE_TOPICS`.
2.  Abre `src/ui/diplomas.js`. Haz lo mismo en las constantes de la parte superior del archivo para que aparezca bien en la pestaña "Mis Diplomas".

---

¡Eso es todo! Diviértete aprendiendo, rompiendo código y construyendo nuevos juegos educativos. 🚀
