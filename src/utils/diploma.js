// =============================================
// EduPlay UBE — Generación de Diploma PDF
// Usa jsPDF + html2canvas
// =============================================

import { supabase } from '../supabaseClient.js';
import * as jspdfLib from 'jspdf';
import html2canvas from 'html2canvas';

const MODULE_TOPICS = {
  1: 'Personal Pronouns',
  2: 'Verb TO BE',
  3: 'Family Vocabulary',
  4: 'Adjectives and Opposites',
  5: 'Future Tenses (Will, Going To)',
  6: 'Modals & Conditionals',
  7: 'Past Tense',
  8: 'Vocabulary',
  9: 'Present Tense',
  10: 'Repaso General',
};

const MODULE_NAMES = {
  1: 'Super Mario',
  2: 'Pac-Man',
  3: 'TeTris',
  4: 'Penales',
  5: 'Roblox Obby',
  6: 'Duck Hunt',
  7: 'Home Run',
  8: 'Guayaquil Bike',
  9: 'Basketball',
  10: 'Ruleta: Ordenar Oraciones',
};

export async function generateDiplomaPDF(user, profile, moduleId, score, aciertos) {
  const topic = MODULE_TOPICS[moduleId] || 'Inglés';
  const moduleName = MODULE_NAMES[moduleId] || `Módulo ${moduleId}`;
  const fechaEmision = new Date().toLocaleDateString('es-EC', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const codigoVerif = `UBE-${Date.now().toString(36).toUpperCase()}-${moduleId}`;
  const studentName = profile
    ? `${profile.nombres} ${profile.apellidos}`
    : user?.email?.split('@')[0] || 'Estudiante';

  // Crear/mostrar template
  const template = document.getElementById('diploma-template');
  template.style.display = 'block';
  template.innerHTML = createDiplomaHTML(studentName, topic, moduleName, fechaEmision, score, aciertos, codigoVerif);

  // Esperar un momento para que el navegador renderice el HTML
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const targetElement = template.firstElementChild || template;
    
    // Safeguard for Vite CJS/ESM interop
    const _html2canvas = typeof html2canvas === 'function' ? html2canvas : (html2canvas.default || window.html2canvas);
    
    const canvas = await _html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 1122,
      height: 794
    });

    // Safeguard for jsPDF export
    const _jsPDF = jspdfLib.jsPDF || jspdfLib.default || window.jspdf?.jsPDF || window.jsPDF;
    const pdf = new _jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1122, 794]
    });

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 1122, 794);
    pdf.save(`Diploma_EduPlay_UBE_${moduleName.replace(/[^a-z0-9]/gi,'_')}.pdf`);

    // Registrar en BD
    if (user && user.id) {
      const { error } = await supabase.from('diplomas').insert({
        user_id: user.id,
        modulo_id: moduleId,
        tema: topic,
        puntaje: score,
        codigo_verificacion: codigoVerif
      }).select();
      if (error) throw error;
    }

  } finally {
    template.style.display = 'none';
    template.innerHTML = '';
  }
}

function createDiplomaHTML(studentName, topic, moduleName, fecha, score, aciertos, codigo) {
  return `
  <div style="
    width: 1122px; height: 794px;
    background: linear-gradient(135deg, #1a0a2e 0%, #2d0a20 50%, #1a0a2e 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Georgia', serif;
    position: relative;
    overflow: hidden;
  ">
    <!-- Borde decorativo exterior -->
    <div style="
      position:absolute;top:20px;right:20px;bottom:20px;left:20px;
      border: 3px solid #e63946;
      border-radius: 12px;
    "></div>
    <div style="
      position:absolute;top:26px;right:26px;bottom:26px;left:26px;
      border: 1px solid rgba(230,57,70,0.4);
      border-radius: 10px;
    "></div>

    <!-- Decoraciones esquinas -->
    <div style="position:absolute;top:30px;left:30px;color:#e63946;font-size:40px;opacity:0.6;">✦</div>
    <div style="position:absolute;top:30px;right:30px;color:#e63946;font-size:40px;opacity:0.6;">✦</div>
    <div style="position:absolute;bottom:30px;left:30px;color:#e63946;font-size:40px;opacity:0.6;">✦</div>
    <div style="position:absolute;bottom:30px;right:30px;color:#e63946;font-size:40px;opacity:0.6;">✦</div>

    <!-- Contenido central -->
    <div style="text-align:center; padding:40px; position:relative; z-index:2; max-width:900px;">

      <!-- Logo/Institución -->
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:20px;">
        <div style="
          width:60px;height:60px;
          background:linear-gradient(135deg,#e63946,#7c3aed);
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:28px;
        ">🎮</div>
        <div style="text-align:left;">
          <div style="font-family:'Arial',sans-serif;font-size:13px;color:#e63946;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
            Universidad Bolivariana del Ecuador
          </div>
          <div style="font-family:'Arial',sans-serif;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:1px;">
            Manu Play - UBE — Plataforma Educativa Gamificada
          </div>
        </div>
      </div>

      <!-- Título -->
      <div style="
        font-family:'Arial',sans-serif;font-size:11px;
        letter-spacing:6px;text-transform:uppercase;
        color:rgba(255,255,255,0.5);margin-bottom:8px;
      ">Certificado de Logro Académico</div>

      <div style="
        font-size:42px;font-weight:bold;
        color:#ffffff;
        letter-spacing:4px;margin-bottom:12px;
        font-family:'Georgia',serif;
      ">DIPLOMA</div>

      <!-- Línea decorativa -->
      <div style="
        height:2px;
        background-color: #e63946;
        margin: 0 auto 24px; width:60%;
      "></div>

      <!-- Se certifica -->
      <p style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:12px;font-family:'Arial',sans-serif;">
        Se certifica que el/la estudiante
      </p>

      <h2 style="
        font-size:32px;font-weight:bold;
        color:#ffd700;
        margin-bottom:12px;
        font-family:'Georgia',serif;
      ">${studentName}</h2>

      <p style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:8px;font-family:'Arial',sans-serif;">
        ha completado satisfactoriamente el módulo
      </p>

      <div style="
        background:rgba(230,57,70,0.15);
        border:1px solid rgba(230,57,70,0.5);
        border-radius:8px;
        padding:14px 30px;
        display:inline-block;
        margin-bottom:8px;
      ">
        <div style="font-size:16px;font-weight:bold;color:#e63946;font-family:'Arial',sans-serif;letter-spacing:1px;">
          ${moduleName}
        </div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);font-family:'Arial',sans-serif;margin-top:2px;">
          Tema: ${topic}
        </div>
      </div>

      <div style="display:flex;justify-content:center;gap:40px;margin:16px 0;">
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#e63946;font-family:'Arial',sans-serif;">${aciertos}/10</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);font-family:'Arial',sans-serif;letter-spacing:1px;text-transform:uppercase;">Aciertos</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#e63946;font-family:'Arial',sans-serif;">${score}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);font-family:'Arial',sans-serif;letter-spacing:1px;text-transform:uppercase;">Puntos</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#e63946;font-family:'Arial',sans-serif;">${fecha.split(' de ')[2]}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);font-family:'Arial',sans-serif;letter-spacing:1px;text-transform:uppercase;">Año</div>
        </div>
      </div>

      <!-- Firma y fecha -->
      <div style="
        height:1px;
        background-color: rgba(255,255,255,0.2);
        margin: 16px auto; width:70%;
      "></div>

      <div style="display:flex;justify-content:space-around;align-items:flex-end;margin-top:12px;">
        <div style="text-align:center;">
          <div style="width:120px;height:1px;background:rgba(255,255,255,0.4);margin:0 auto 4px;"></div>
          <div style="font-size:12px;color:white;font-weight:bold;font-family:'Arial',sans-serif;">Profe. Manuel Reyes</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);font-family:'Arial',sans-serif;">Responsable Académico</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:11px;color:rgba(255,255,255,0.5);font-family:'Arial',sans-serif;margin-bottom:2px;">Emitido el</div>
          <div style="font-size:12px;color:white;font-family:'Arial',sans-serif;">${fecha}</div>
        </div>
        <div style="text-align:center;">
          <div style="width:120px;height:1px;background:rgba(255,255,255,0.4);margin:0 auto 4px;"></div>
          <div style="font-size:12px;color:white;font-weight:bold;font-family:'Arial',sans-serif;">Universidad Bolivariana</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);font-family:'Arial',sans-serif;">del Ecuador (UBE)</div>
        </div>
      </div>

      <div style="
        font-size:9px;color:rgba(255,255,255,0.3);
        font-family:'Arial',sans-serif;margin-top:10px;
        letter-spacing:1px;
      ">Código de verificación: ${codigo}</div>
    </div>
  </div>`;
}
