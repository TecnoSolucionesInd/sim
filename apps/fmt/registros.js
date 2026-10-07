// Módulo Registros: bandeja de registros llenados, detalle con la hoja oficial, aprobación y observación.
import { toast } from '../../core/core.js';
import { norm } from '../../core/maestros.js';
import * as D from './datos.js';
import { renderHoja } from './hoja.js';
import { IC, modal, imprimir, cargarXlsx, qrSvg, ajustarHoja } from './ui.js';
import { esc, firmasDe, revTxt } from './modelo.js';
import { fechaTxt, fechaISO, duracionTxt } from './logica.js';

const CSS = `
.rg-h{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.rg-h h1{font-size:34px;margin-top:10px}
.rg-f{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
.rg-f .field{height:42px;font-size:14px;border-radius:10px;padding:0 12px}
.rg-f select.field{padding-right:32px;background-position:right 10px center}
.rg-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:14px}
.rg-tabs button{flex-shrink:0;height:40px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#D5DDE5;font-size:14px;font-weight:500;display:inline-flex;align-items:center;gap:8px}
.rg-tabs button.on{background:var(--mint);border-color:var(--mint);color:var(--mint-ink)}
.rg-tabs button i{font-style:normal;font-size:12px;padding:1px 8px;border-radius:999px;background:rgba(0,0,0,.18)}
.rg-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr));gap:12px}
.rg-c{display:flex;flex-direction:column;gap:8px;text-align:left;padding:16px 18px;border-radius:18px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);color:var(--tx);transition:transform .2s var(--ease),border-color .2s;animation:rise .5s var(--ease) both}
.rg-c:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.26)}
.rg-c .r1{display:flex;justify-content:space-between;align-items:center;gap:8px}
.rg-c .nro{font-family:var(--f-mono);font-size:12.5px;color:var(--mint-2)}
.rg-c b{font-weight:500;font-size:15px;line-height:1.3}
.rg-c .mt{font-size:13px;color:var(--tx-2);line-height:1.45}
.rg-c .eqs{display:flex;flex-wrap:wrap;gap:6px}
.rg-c .eqs span{font-family:var(--f-mono);font-size:11.5px;padding:3px 8px;border-radius:7px;background:rgba(255,255,255,.08);color:var(--tx-2)}
.al-b{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;background:rgba(255,143,143,.15);color:#FFB3B3}
.rg-d{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.3fr);gap:22px;align-items:start}
.rg-d .panel{padding:20px;border-radius:20px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);margin-bottom:14px}
.rg-d .panel h3{margin:0 0 12px;font-family:var(--f-display);font-weight:600;font-size:15px}
.kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 14px;font-size:14px}
.kv span{color:var(--tx-3)}
.rg-prev{border-radius:18px;background:#56626F;border:1px solid rgba(255,255,255,.12);padding:14px;overflow:hidden;position:sticky;top:16px}
.hist{list-style:none;margin:0;padding:0}
.hist li{position:relative;padding:0 0 14px 22px;font-size:13.5px;line-height:1.45}
.hist li::before{content:"";position:absolute;left:5px;top:6px;width:8px;height:8px;border-radius:50%;background:var(--mint)}
.hist li::after{content:"";position:absolute;left:8.5px;top:16px;bottom:0;width:1px;background:rgba(255,255,255,.15)}
.hist li:last-child::after{display:none}
.hist li.obs::before{background:#FF8F8F}
.hist small{display:block;color:var(--tx-3);font-size:12px}
.rel{display:block;padding:12px 14px;border-radius:12px;background:rgba(14,22,30,.28);text-decoration:none;color:inherit;font-size:13.5px;margin-bottom:8px;line-height:1.45}
.rel b{font-family:var(--f-mono);font-size:12.5px;color:var(--mint-2);font-weight:500}
.acc{display:flex;gap:10px;flex-wrap:wrap}
@media (max-width:1100px){.rg-d{grid-template-columns:minmax(0,1fr)}.rg-prev{position:static}}
@media (max-width:900px){.rg-h h1{font-size:28px}}
`;

const EST = {
  enviado:   { label: 'Por revisar', bg: 'rgba(245,185,74,.16)', fg: '#FFCF73' },
  observado: { label: 'Observado',   bg: 'rgba(255,143,143,.14)', fg: '#FFB3B3' },
  aprobado:  { label: 'Aprobado',    bg: 'rgba(111,227,207,.16)', fg: '#8FF0DE' }
};
const pill = (e) => { const x = EST[e] || { label: e, bg: 'rgba(255,255,255,.08)', fg: '#DDE4EB' }; return `<span class="pill" style="background:${x.bg};color:${x.fg}">${x.label}</span>`; };

let A = null, MAIN = null;
let S = { tab: null, mes: fechaISO(new Date()).slice(0, 7), formato: '', q: '', mios: null };
let LISTA = [], CARGA = 0;
let DET = null;
let abrioURL = false;

const revisor = () => A.ctx.esAdmin || ['admin', 'supervisor'].includes(A.ctx.rol);
const uidU = () => A.ctx.user.uid;
const nombreU = () => A.ctx.perfil?.nombre || A.ctx.user.email;

export async function vistaRegistros(main, app) {
  A = app; MAIN = main;
  if (!document.getElementById('rgcss')) document.head.insertAdjacentHTML('beforeend', `<style id="rgcss">${CSS}</style>`);
  if (S.tab === null) S.tab = revisor() ? 'enviado' : 'todos';
  if (S.mios === null) S.mios = !revisor();
  if (!abrioURL) {
    abrioURL = true;
    const id = new URLSearchParams(location.search).get('r');
    if (id) { history.replaceState(null, '', location.pathname + location.hash); return abrirDetalle(id); }
  }
  if (DET) return pintarDetalle();
  pintarLista();
  await cargar();
}

async function cargar() {
  const n = ++CARGA;
  const box = MAIN.querySelector('#rgL');
  if (box) box.innerHTML = '<div class="skel" style="height:110px"></div><div class="skel" style="height:110px"></div>';
  try {
    let l;
    if (S.tab === 'enviado') l = await D.registrosPorEstado('enviado');
    else {
      const [y, m] = S.mes.split('-').map(Number);
      const fin = fechaISO(new Date(y, m, 0));
      l = await D.registrosEntre(`${S.mes}-01`, fin);
    }
    if (n !== CARGA) return;
    LISTA = l.sort((a, b) => String(b.enviado || '').localeCompare(String(a.enviado || '')));
  } catch (e) { LISTA = []; toast('No se pudieron leer los registros: ' + (e.code || e.message), 'err'); }
  pintarItems();
}

function filtrados() {
  const q = norm(S.q);
  return LISTA.filter(r => {
    if (S.tab !== 'todos' && S.tab !== 'enviado' && r.estado !== S.tab) return false;
    if (S.formato && r.codigo !== S.formato) return false;
    if (S.mios && r.creadoPor !== uidU()) return false;
    if (q && !norm(`${r.numero} ${r.nombre} ${(r.equipos || []).join(' ')} ${r.creadoPorNombre} ${r.ubicacion || ''}`).includes(q)) return false;
    return true;
  });
}

function pintarLista() {
  const cods = [...new Set(A.plantillas.filter(p => p.def).map(p => p.codigo))].sort();
  MAIN.innerHTML = `
    <div class="rg-h">
      <div><div class="eyebrow rise">Registro de formatos</div><h1 class="h-display rise d1">Registros</h1></div>
      <div class="acc rise d2"><button class="btn" id="rgX">${IC.xls}Excel</button></div>
    </div>
    <div class="rg-tabs rise d2" role="tablist">${[['enviado', 'Por revisar'], ['observado', 'Observados'], ['aprobado', 'Aprobados'], ['todos', 'Todos']].map(([k, l]) => `<button role="tab" data-tab="${k}" class="${S.tab === k ? 'on' : ''}" aria-selected="${S.tab === k}">${l}</button>`).join('')}</div>
    <div class="rg-f rise d3">
      ${S.tab === 'enviado' ? '' : `<label class="sr" for="rgM">Mes</label><input class="field" type="month" id="rgM" value="${S.mes}" style="width:auto">`}
      <label class="sr" for="rgF">Formato</label><select class="field" id="rgF" style="width:auto;max-width:240px"><option value="">Todos los formatos</option>${cods.map(c => `<option ${c === S.formato ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" id="rgMi" ${S.mios ? 'checked' : ''}>Solo los míos</label>
      <span style="flex-grow:1"></span>
      <label class="sr" for="rgQ">Buscar</label><input class="field" id="rgQ" type="search" placeholder="N°, equipo, técnico…" value="${esc(S.q)}" style="flex:0 1 260px;min-width:0">
    </div>
    <div class="rg-l" id="rgL"></div>
    <div id="rgN" class="muted" style="font-size:12.5px;margin-top:12px"></div>`;
  const $ = (s) => MAIN.querySelector(s);
  MAIN.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { const ant = S.tab; S.tab = b.dataset.tab; pintarLista(); if (ant === 'enviado' || S.tab === 'enviado') cargar(); else pintarItems(); });
  if ($('#rgM')) $('#rgM').onchange = (e) => { if (!e.target.value) return; S.mes = e.target.value; cargar(); };
  $('#rgF').onchange = (e) => { S.formato = e.target.value; pintarItems(); };
  $('#rgMi').onchange = (e) => { S.mios = e.target.checked; pintarItems(); };
  $('#rgQ').oninput = (e) => { S.q = e.target.value; pintarItems(); };
  $('#rgX').onclick = () => exportar(filtrados());
  pintarItems();
}

function pintarItems() {
  const box = MAIN.querySelector('#rgL');
  if (!box) return;
  const l = filtrados();
  box.innerHTML = l.slice(0, 300).map((r, i) => `<button class="rg-c" data-id="${r.id}" style="animation-delay:${Math.min(i, 12) * .03}s">
      <div class="r1"><span class="nro">${esc(r.numero || r.codigo)}</span>${pill(r.estado)}</div>
      <b>${esc(r.nombre)}</b>
      <div class="mt">${esc(fechaTxt(r.fechaOp))}${r.turno ? ' · Turno ' + esc(r.turno) : ''}${r.ubicacion ? ' · ' + esc(r.ubicacion) : ''}<br>${esc(r.creadoPorNombre || '')}</div>
      ${(r.equipos || []).length || r.nAlertas ? `<div class="eqs">${r.nAlertas ? `<span class="al-b">${IC.alert}${r.nAlertas}</span>` : ''}${(r.equipos || []).slice(0, 6).map(e => `<span>${esc(e)}</span>`).join('')}${(r.equipos || []).length > 6 ? '<span>…</span>' : ''}</div>` : ''}
    </button>`).join('') || `<div class="glass" style="padding:28px;text-align:center;grid-column:1/-1"><div class="muted">${S.tab === 'enviado' ? 'No hay registros por revisar.' : 'No hay registros con estos filtros.'}</div></div>`;
  box.querySelectorAll('[data-id]').forEach(b => b.onclick = () => abrirDetalle(b.dataset.id));
  const n = MAIN.querySelector('#rgN'); if (n) n.textContent = l.length ? `${l.length} registro${l.length > 1 ? 's' : ''}` : '';
}

// =====================================================================
// DETALLE
// =====================================================================
async function abrirDetalle(id) {
  MAIN.innerHTML = '<div style="display:flex;justify-content:center;padding:80px 0"><div class="spinner"></div></div>';
  try {
    const r = LISTA.find(x => x.id === id) || await D.leerRegistro(id);
    if (!r) throw new Error('No se encontró el registro.');
    const p = A.plantillas.find(x => x.id === r.plantillaId);
    let def = p && p.def && p.versionManual === r.version && p.revision === r.revision ? p.def : null;
    let prefijo = p?.prefijo || A.cfg.prefijo;
    if (!def) { const rv = await D.defDeRevision(r.plantillaId, r.version, r.revision); def = rv?.def; prefijo = rv?.prefijo || prefijo; }
    if (!def) throw new Error('No se encontró la revisión del formato con la que se llenó.');
    DET = { r, def, prefijo, fotos: null, rel: null, qr: '' };
    pintarDetalle();
    const [fotos, rel, qr] = await Promise.all([
      D.leerFotos(id).catch(() => ({})),
      D.registrosOrigen(id).catch(() => []),
      qrSvg(urlRegistro(id))
    ]);
    if (!DET || DET.r.id !== id) return;
    Object.assign(DET, { fotos, rel, qr });
    pintarDetalle();
  } catch (e) { toast(e.message, 'err'); DET = null; pintarLista(); cargar(); }
}

const urlRegistro = (id) => `${location.origin}${location.pathname}?r=${encodeURIComponent(id)}#registros`;

function hojaDe(det) {
  const { r, def } = det;
  const marca = r.estado === 'observado' ? 'OBSERVADO' : r.estado === 'enviado' ? 'POR REVISAR' : '';
  return renderHoja({ cfg: { ...A.cfg, prefijo: det.prefijo }, codigo: r.codigo, def, version: r.version, revision: r.revision, fecha: r.fechaRev, marca, reg: { ...r, fotos: det.fotos || {} }, qr: det.qr });
}

function pintarDetalle() {
  const { r, def } = DET;
  const fir = firmasDe(def);
  const durs = def.secciones.flatMap(s => s.campos || []).filter(c => c.tipo === 'duracion' && r.dur && r.dur[c.id] != null);
  const puedeAprobar = revisor() && r.estado === 'enviado' && (r.creadoPor !== uidU() || A.ctx.esAdmin);
  MAIN.innerHTML = `
    <div class="rg-h">
      <div><button class="btn sm" id="dVol" style="height:38px;padding:0 14px;font-size:13px">${IC.back}Registros</button>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px"><span class="mono" style="color:var(--mint-2);font-size:14px">${esc(r.numero || 'Por asignar')}</span>${pill(r.estado)}${r.nAlertas ? `<span class="al-b">${IC.alert}${r.nAlertas} alerta${r.nAlertas > 1 ? 's' : ''}</span>` : ''}</div>
        <h1 class="h-display" style="font-size:28px;margin-top:8px">${esc(r.nombre)}</h1></div>
      <div class="acc">
        <button class="btn" id="dPr">${IC.print}Imprimir / PDF</button>
        ${revisor() && r.estado === 'enviado' ? `<button class="btn btn-danger" id="dObs">Observar</button>` : ''}
        ${puedeAprobar ? `<button class="btn btn-primary" id="dApr">${IC.check}Aprobar</button>` : ''}
      </div>
    </div>
    ${revisor() && r.estado === 'enviado' && !puedeAprobar ? '<div class="alert warn" style="margin-bottom:16px">Un registro propio debe aprobarlo otro supervisor.</div>' : ''}
    <div class="rg-d">
      <div>
        ${r.estado === 'observado' && r.observacion ? `<div class="alert err" style="margin-bottom:14px"><b>Observación:</b> ${esc(r.observacion.comentario)}<div style="font-size:12.5px;opacity:.8;margin-top:4px">${esc(r.observacion.usuario)}</div></div>` : ''}
        <div class="panel"><h3>Datos del registro</h3><div class="kv">
          <span>Formato</span><div class="mono" style="font-size:13px">${esc(det_codigo())} · Rev. ${revTxt(r.revision)}</div>
          <span>Fecha</span><div>${esc(fechaTxt(r.fechaOp))}${r.turno ? ' · Turno ' + esc(r.turno) : ''}${r.hora ? ' · ' + esc(r.hora) : ''}</div>
          ${r.ubicacion ? `<span>Ubicación</span><div>${esc(r.ubicacion)}</div>` : ''}
          <span>Llenado por</span><div>${esc(r.creadoPorNombre || '')}</div>
          ${(r.equipos || []).length ? `<span>Equipos</span><div class="mono" style="font-size:13px">${esc(r.equipos.join(', '))}</div>` : ''}
          ${durs.map(c => `<span>${esc(c.etiqueta)}</span><div>${esc(duracionTxt(r.dur[c.id]))}</div>`).join('')}
          ${r.estado === 'aprobado' ? `<span>Aprobado por</span><div>${esc(r.aprobadoPorNombre || '')}</div>` : ''}
        </div></div>
        ${(r.alertas || []).length ? `<div class="panel"><h3>Alertas</h3><ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.55;color:#FFD0D0">${r.alertas.map(a => `<li>${esc(a)}</li>`).join('')}</ul>${r.observaciones ? `<div style="margin-top:10px;font-size:13.5px;color:var(--tx-2)"><b style="color:var(--tx)">Acción correctiva:</b> ${esc(r.observaciones)}</div>` : ''}</div>` : ''}
        ${relacionadosHtml(r)}
        <div class="panel"><h3>Historial</h3><ul class="hist">${(r.historial || []).map(h => `<li class="${h.estado === 'observado' ? 'obs' : ''}"><b>${esc((EST[h.estado] || {}).label === 'Por revisar' ? 'Enviado' : (EST[h.estado] || {}).label || h.estado)}</b> · ${esc(h.usuario || '')}<small>${esc(new Date(h.fechaHora).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }))}${h.comentario ? ' · ' + esc(h.comentario) : ''}</small></li>`).join('')}</ul></div>
      </div>
      <div><div class="rg-prev" id="dBox"><div id="dHoja">${hojaDe(DET)}</div></div></div>
    </div>`;
  const $ = (s) => MAIN.querySelector(s);
  ajustarHoja($('#dBox'), $('#dHoja'));
  $('#dVol').onclick = () => { DET = null; pintarLista(); cargar(); };
  $('#dPr').onclick = async () => {
    if (!DET.fotos) DET.fotos = await D.leerFotos(r.id).catch(() => ({}));
    if (!DET.qr) DET.qr = await qrSvg(urlRegistro(r.id));
    imprimir(hojaDe(DET), def.orientacion === 'horizontal', `${r.numero || r.codigo} ${r.nombre}`);
  };
  if ($('#dApr')) $('#dApr').onclick = () => aprobar(fir);
  if ($('#dObs')) $('#dObs').onclick = observar;
  MAIN.querySelectorAll('[data-rel]').forEach(a => a.onclick = (e) => { e.preventDefault(); abrirDetalle(a.dataset.rel); });
}
const det_codigo = () => `${DET.prefijo}/${DET.r.codigo}`;

function relacionadosHtml(r) {
  const items = [];
  if (r.origen?.id) items.push(`<a class="rel" href="?r=${encodeURIComponent(r.origen.id)}#registros" data-rel="${esc(r.origen.id)}"><b>${esc(r.origen.numero || '')}</b> ${esc(r.origen.nombre || '')}<div style="color:var(--tx-3);font-size:12px">Registro que lo originó</div></a>`);
  (DET.rel || []).forEach(x => items.push(`<a class="rel" href="?r=${encodeURIComponent(x.id)}#registros" data-rel="${esc(x.id)}"><b>${esc(x.numero || x.codigo)}</b> ${esc(x.nombre)} · ${pill(x.estado)}<div style="color:var(--tx-3);font-size:12px">Generado desde este registro</div></a>`));
  const firmasGen = DET.def.secciones.flatMap(s => s.campos || []).filter(c => c.tipo === 'siNo' && c.genera && r.v?.[c.id] === 'Sí');
  firmasGen.forEach(c => { if (!(DET.rel || []).some(x => x.codigo === c.genera)) items.push(`<div class="rel" style="border:1px dashed rgba(245,185,74,.4)"><b>${esc(c.genera)}</b> pendiente de llenar<div style="color:var(--tx-3);font-size:12px">${esc(c.etiqueta)}</div></div>`); });
  if (DET.rel === null && (r.origen?.id || firmasGen.length)) items.push('<div class="skel" style="height:44px"></div>');
  return items.length ? `<div class="panel"><h3>Relacionados</h3>${items.join('')}</div>` : '';
}

function aprobar(fir) {
  const i = fir.findIndex(f => f.modo === 'aprobador');
  const m = modal({
    titulo: 'Aprobar registro', ancho: 500,
    cuerpo: `<p class="muted" style="margin:0;line-height:1.6">${i >= 0 ? `Se registrará su firma electrónica en <b>${esc(fir[i].nombre)}</b> como <b>${esc(nombreU())}</b>.` : 'El registro quedará aprobado a su nombre.'} Después de aprobado no se puede modificar.</p>`,
    pie: `<button type="button" class="btn" data-x>Cancelar</button><button type="submit" class="btn btn-primary" id="aOk">${IC.check}Aprobar</button>`
  });
  m.form.onsubmit = async (e) => {
    e.preventDefault();
    const b = m.$('#aOk'); b.disabled = true; b.textContent = 'Aprobando…';
    try {
      Object.assign(DET.r, await D.aprobarRegistro(DET.r, { nombre: nombreU(), usuario: A.ctx.user.email, uid: uidU(), indiceFirma: i }));
      LISTA = LISTA.filter(x => x.id !== DET.r.id || S.tab !== 'enviado');
      m.cerrar(); toast(`${DET.r.numero} aprobado.`); pintarDetalle();
    } catch (er) { m.err('No se pudo aprobar: ' + (er.code || er.message)); b.disabled = false; b.textContent = 'Aprobar'; }
  };
}

function observar() {
  const m = modal({
    titulo: 'Observar registro', ancho: 540,
    cuerpo: `<label class="label" for="oCom">Qué debe corregir el técnico</label>
      <textarea class="field" id="oCom" rows="4" style="height:auto;padding:12px 16px;line-height:1.5" placeholder="La presión de descarga del CP-02 no coincide con el manómetro; verifique la lectura."></textarea>
      <div class="muted" style="font-size:12.5px;margin-top:10px">El registro vuelve a ${esc(DET.r.creadoPorNombre || 'quien lo llenó')} para que lo corrija y reenvíe.</div>`,
    pie: '<button type="button" class="btn" data-x>Cancelar</button><button type="submit" class="btn btn-danger" id="oOk">Observar</button>'
  });
  setTimeout(() => m.$('#oCom').focus(), 50);
  m.form.onsubmit = async (e) => {
    e.preventDefault();
    const comentario = m.$('#oCom').value.trim();
    if (!comentario) return m.err('Escriba qué debe corregirse.');
    const b = m.$('#oOk'); b.disabled = true; b.textContent = 'Guardando…';
    try {
      Object.assign(DET.r, await D.observarRegistro(DET.r, { nombre: nombreU(), comentario }));
      m.cerrar(); toast('Registro observado.'); pintarDetalle();
    } catch (er) { m.err('No se pudo observar: ' + (er.code || er.message)); b.disabled = false; b.textContent = 'Observar'; }
  };
}

window.addEventListener('resize', () => { const b = document.getElementById('dBox'); if (b) ajustarHoja(b, document.getElementById('dHoja')); });

async function exportar(l) {
  if (!l.length) return toast('No hay registros para exportar.', 'err');
  try {
    const X = await cargarXlsx();
    const filas = [['N° de registro', 'Código', 'Formato', 'Fecha', 'Turno', 'Hora', 'Ubicación', 'Equipos', 'Llenado por', 'Estado', 'Alertas', 'Acción correctiva', 'Aprobado por']]
      .concat(l.map(r => [r.numero || '', r.codigo, r.nombre, fechaTxt(r.fechaOp), r.turno || '', r.hora || '', r.ubicacion || '', (r.equipos || []).join(', '), r.creadoPorNombre || '', (EST[r.estado] || {}).label || r.estado, r.nAlertas || 0, r.observaciones || '', r.aprobadoPorNombre || '']));
    const ws = X.utils.aoa_to_sheet(filas);
    ws['!cols'] = [20, 8, 38, 11, 9, 7, 18, 22, 22, 12, 8, 40, 22].map(w => ({ wch: w }));
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'Registros');
    X.writeFile(wb, `Registros_${S.tab === 'enviado' ? 'por_revisar' : S.mes}.xlsx`);
  } catch (e) { toast(e.message, 'err'); }
}
