/**
 * PASILLO VERDE · Backend en Google Sheets + Apps Script
 * ------------------------------------------------------
 * Qué hace:
 *  1. doPost  → recibe respuestas, reportes y escaneos desde la app y los guarda en la hoja "eventos".
 *  2. doGet   → entrega a la app los resultados agregados (por turno y pauta, nunca por persona).
 *  3. revisarAlertas  → (automático, 2 veces al día) si un tema baja del umbral en un turno,
 *                       avisa por correo al líder de ese turno con la charla de 5 minutos.
 *  4. resumenSemanal  → (automático, lunes) envía a los líderes el resumen de la semana.
 *
 * Privacidad: la app no envía nombres ni datos personales. Solo turno, área y la acción.
 */

const HOJA_EVENTOS = 'eventos';
const HOJA_CONFIG = 'config';
const HOJA_ALERTAS = 'alertas';
const COLS = ['fecha','tipo','turno','area','pauta','pregunta','correcta','confianza',
              'zona','x','y','tipo_reporte','barrera','nota','escenario','nodo','situacion'];

// Texto fiel del Anexo A (fuente única) — solo las pautas del perfil Bodega
const PAUTAS = {
  'P-01': 'Los elementos de protección personal (casco, gafas, protección auditiva y botas) son obligatorios en todas las zonas demarcadas en amarillo.',
  'P-02': 'Nadie interviene una máquina si no está detenida y bloqueada con candado y tarjeta personal.',
  'P-03': 'En bodega solo se camina por los pasillos peatonales demarcados en verde; está prohibido cruzar por las zonas de montacargas.',
  'P-04': 'Visitantes y contratistas deben portar la escarapela visible y estar acompañados por un colaborador en las áreas de producción.',
  'P-10': 'La carga no puede superar la altura marcada en el vehículo ni bloquear la visibilidad.',
  'P-11': 'Rutas, horarios y contenido de los despachos no se comparten en redes sociales ni con terceros.',
  'P-12': 'Todo incidente, casi accidente o situación sospechosa se reporta en un plazo máximo de 24 horas al líder inmediato o a la línea interna de seguridad.',
  'P-13': 'En una evacuación se suspende la tarea, no se usan ascensores, se sigue la ruta señalizada y cada persona se reporta con su líder en el punto de encuentro.'
};

/* ============ 1. CONFIGURACIÓN INICIAL (ejecutar una sola vez) ============ */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  hoja_(ss, HOJA_EVENTOS, COLS);
  hoja_(ss, HOJA_ALERTAS, ['fecha','turno','pauta','% correctas','% seguros y equivocados','respuestas','enviado a']);
  const cfg = hoja_(ss, HOJA_CONFIG, ['clave','valor','para qué sirve']);
  if (cfg.getLastRow() < 2) {
    cfg.getRange(2, 1, 6, 3).setValues([
      ['umbral', 60, '% mínimo de respuestas correctas antes de alertar'],
      ['min_respuestas', 5, 'No se alerta con menos respuestas (evita falsas alarmas y protege la privacidad)'],
      ['dias_ventana', 7, 'Días hacia atrás que se analizan'],
      ['email_lider_dia', '', 'Correo del líder del turno día (de prueba)'],
      ['email_lider_noche', '', 'Correo del líder del turno noche (de prueba)'],
      ['url_app', '', 'Enlace público de la app']
    ]);
  }
  // Disparadores automáticos (se borran los anteriores para no duplicar)
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('revisarAlertas').timeBased().everyDays(1).atHour(5).create();   // antes del turno día
  ScriptApp.newTrigger('revisarAlertas').timeBased().everyDays(1).atHour(17).create();  // antes del turno noche
  ScriptApp.newTrigger('resumenSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).create();
  Logger.log('Listo: hojas y automatizaciones creadas.');
}

function hoja_(ss, nombre, encabezados) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold').setBackground('#0B7A43').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function config_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_CONFIG);
  const out = {};
  if (!sh) return out;
  sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 2).getValues().forEach(([k, v]) => { if (k) out[k] = v; });
  return out;
}

/* ============ 2. RECIBIR DATOS DE LA APP ============ */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let datos = JSON.parse(e.postData.contents || '[]');
    if (!Array.isArray(datos)) datos = [datos];
    datos = datos.slice(0, 200); // límite por envío
    const filas = datos.map(fila_);
    if (filas.length) {
      const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_EVENTOS);
      sh.getRange(sh.getLastRow() + 1, 1, filas.length, COLS.length).setValues(filas);
    }
    return json_({ ok: true, guardados: filas.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function fila_(ev) {
  const v = x => (x === undefined || x === null) ? '' : x;
  return [
    new Date(ev.ts || Date.now()), limpio_(ev.type), limpio_(ev.turno), limpio_(ev.area),
    limpio_(ev.pauta), limpio_(ev.q), v(ev.ok), v(ev.conf),
    limpio_(ev.zona), v(ev.x), v(ev.y), limpio_(ev.tipo), limpio_(ev.barrera),
    limpio_(String(v(ev.nota)).slice(0, 280)), limpio_(ev.esc), limpio_(ev.nodo), limpio_(ev.sit)
  ];
}

// Evita "inyección de fórmulas": un texto que empiece por = + - @ se guarda como texto
function limpio_(x) {
  if (x === undefined || x === null) return '';
  const s = String(x);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/* ============ 3. ENTREGAR RESULTADOS AGREGADOS A LA APP ============ */
function doGet() {
  const cfg = config_();
  const filas = eventos_(Number(cfg.dias_ventana) || 28);
  const resp = { dia: {}, noche: {} }, qr = {}, barreras = {}, puntos = [], atendidas = {};
  filas.forEach(r => {
    const tipo = r[1], turno = r[2] === 'noche' ? 'noche' : 'dia';
    if (tipo === 'respuesta' && r[4]) {
      const c = resp[turno][r[4]] = resp[turno][r[4]] || { n: 0, ok: 0, cw: 0 };
      c.n++;
      if (r[6] === true || r[6] === 'TRUE') c.ok++;
      else if (Number(r[7]) === 2) c.cw++;
    }
    if (tipo === 'qr' && r[8]) qr[r[8]] = (qr[r[8]] || 0) + 1;
    if (tipo === 'reporte') {
      if (r[9] !== '' && r[10] !== '') puntos.push({ x: Number(r[9]), y: Number(r[10]), k: r[11] === 'barrera' ? 'barrera' : 'casi' });
      if (r[12]) barreras[r[12]] = (barreras[r[12]] || 0) + 1;
    }
    // El líder marca una barrera como atendida (o la reabre)
    if (tipo === 'barrera_atendida' && r[12]) atendidas[r[12]] = r[0].getTime();
    if (tipo === 'barrera_reabierta' && r[12]) delete atendidas[r[12]];
  });
  return json_({ ok: true, actualizado: new Date(), eventos: filas.length, resp, qr, barreras, puntos, atendidas });
}

function eventos_(dias) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_EVENTOS);
  if (!sh || sh.getLastRow() < 2) return [];
  const desde = Date.now() - dias * 864e5;
  return sh.getRange(2, 1, sh.getLastRow() - 1, COLS.length).getValues()
           .filter(r => r[0] instanceof Date && r[0].getTime() >= desde);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ============ 4. AUTOMATIZACIÓN: ALERTAS POR TURNO ============ */
function revisarAlertas() {
  const cfg = config_();
  const umbral = Number(cfg.umbral) || 60, minN = Number(cfg.min_respuestas) || 5;
  const agg = { dia: {}, noche: {} };
  eventos_(Number(cfg.dias_ventana) || 7).forEach(r => {
    if (r[1] !== 'respuesta' || !r[4]) return;
    const t = r[2] === 'noche' ? 'noche' : 'dia';
    const c = agg[t][r[4]] = agg[t][r[4]] || { n: 0, ok: 0, cw: 0 };
    c.n++;
    if (r[6] === true || r[6] === 'TRUE') c.ok++; else if (Number(r[7]) === 2) c.cw++;
  });
  const shA = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_ALERTAS);
  ['dia', 'noche'].forEach(t => {
    const debiles = Object.keys(agg[t])
      .map(p => ({ p, n: agg[t][p].n, pc: Math.round(agg[t][p].ok / agg[t][p].n * 100), cw: Math.round(agg[t][p].cw / agg[t][p].n * 100) }))
      .filter(x => x.n >= minN && x.pc < umbral)
      .sort((a, b) => a.pc - b.pc);
    if (!debiles.length) return;
    const correo = cfg['email_lider_' + t];
    debiles.forEach(d => shA.appendRow([new Date(), t, d.p, d.pc, d.cw, d.n, correo || '(sin correo configurado)']));
    if (correo) {
      const d = debiles[0];
      MailApp.sendEmail({
        to: correo,
        subject: `Pasillo Verde · Turno ${t === 'noche' ? 'noche' : 'día'}: reforzar ${d.p}`,
        htmlBody: correoCharla_(t, d, debiles, cfg.url_app)
      });
    }
  });
}

function correoCharla_(t, d, todas, url) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px">
  <div style="background:#0B7A43;color:#fff;padding:16px;border-radius:10px 10px 0 0"><b>Pasillo Verde</b> · Alerta del turno ${t === 'noche' ? 'noche' : 'día'}</div>
  <div style="border:1px solid #ddd;border-top:0;padding:16px;border-radius:0 0 10px 10px">
   <p>En los últimos días, <b>solo el ${d.pc}%</b> de las respuestas sobre <b>${d.p}</b> fueron correctas, y el <b>${d.cw}%</b> respondió mal estando muy seguro.</p>
   <h3 style="margin-bottom:4px">Charla de 5 minutos para el inicio del turno</h3>
   <ol>
    <li><b>La pauta, textual:</b> ${PAUTAS[d.p] || d.p}</li>
    <li><b>Dato del equipo:</b> ${d.pc}% de respuestas correctas; ${d.cw}% equivocados con seguridad.</li>
    <li><b>Pregunta al grupo:</b> ¿Qué situación de esta semana tuvo que ver con esta pauta? ¿Qué hizo difícil cumplirla?</li>
    <li><b>Cierre:</b> repetir la pauta en voz alta.</li>
   </ol>
   ${todas.length > 1 ? `<p style="color:#555">Otros temas bajo el umbral: ${todas.slice(1).map(x => x.p + ' (' + x.pc + '%)').join(', ')}.</p>` : ''}
   ${url ? `<p><a href="${url}#tablero">Ver la Vista Empresa</a></p>` : ''}
   <p style="color:#888;font-size:12px">Resultados por turno, nunca por persona. Generado automáticamente.</p>
  </div></div>`;
}

/* ============ 5. AUTOMATIZACIÓN: RESUMEN SEMANAL ============ */
function resumenSemanal() {
  const cfg = config_();
  const filas = eventos_(7);
  const resp = filas.filter(r => r[1] === 'respuesta');
  const ok = resp.filter(r => r[6] === true || r[6] === 'TRUE').length;
  const reportes = filas.filter(r => r[1] === 'reporte');
  const barreras = {};
  reportes.forEach(r => { if (r[12]) barreras[r[12]] = (barreras[r[12]] || 0) + 1; });
  const topB = Object.entries(barreras).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
   <h2 style="color:#0B7A43">Pasillo Verde · Resumen semanal de bodega</h2>
   <p><b>${resp.length}</b> respuestas · <b>${resp.length ? Math.round(ok / resp.length * 100) : 0}%</b> correctas (línea base: 55%)</p>
   <p><b>${reportes.length}</b> reportes en el mapa · <b>${filas.filter(r => r[1] === 'qr').length}</b> consultas por QR</p>
   ${topB.length ? `<p><b>Barreras más reportadas:</b><br>${topB.map(([b, n]) => '• ' + b + ' (' + n + ')').join('<br>')}</p>` : ''}
   ${cfg.url_app ? `<p><a href="${cfg.url_app}#tablero">Abrir la Vista Empresa</a></p>` : ''}
  </div>`;
  [cfg.email_lider_dia, cfg.email_lider_noche].filter(Boolean).forEach(to =>
    MailApp.sendEmail({ to, subject: 'Pasillo Verde · Resumen semanal', htmlBody: html }));
}

/* ============ 6. PRUEBA RÁPIDA (opcional) ============ */
function probarAlerta() {
  // Inserta 6 respuestas de prueba (turno noche, P-03, mayoría incorrectas) y corre la revisión
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_EVENTOS);
  const filas = [];
  for (let i = 0; i < 6; i++) filas.push(fila_({ type: 'respuesta', turno: 'noche', area: 'bodega', pauta: 'P-03', q: 'q1', ok: i === 0, conf: 2, ts: Date.now() }));
  sh.getRange(sh.getLastRow() + 1, 1, filas.length, COLS.length).setValues(filas);
  revisarAlertas();
}
