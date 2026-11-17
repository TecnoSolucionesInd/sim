// Órdenes de trabajo — bandeja, formulario y cambios de estado
import { SISTEMAS, sistemaPorId } from '../../core/maestros.js';
import * as M from './modelo.js';
import { reducirFoto } from './datos.js';
import { esc, IC, modal, confirmar, buscadorEquipos, pillEstado, tagPrio, tagCrit, tagOrigen, tagEsp } from './ui.js';

const F = { grupo: 'abiertas', origen: '', esp: '', prio: '', q: '', soloRet: false };
const GRUPOS_EST = [
  { id: 'abiertas', l: 'Abiertas' }, { id: 'pendiente', l: 'Pendientes' }, { id: 'programada', l: 'Programadas' },
  { id: 'ejecucion', l: 'En ejecución' }, { id: 'espera', l: 'En espera' }, { id: 'ejecutada', l: 'Por verificar' },
  { id: 'cerrada', l: 'Cerradas' }, { id: 'anulada', l: 'Anuladas' }, { id: 'todas', l: 'Todas' }
];
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ORD_PRIO = { P1: 0, P2: 1, P3: 2, P4: 3 };
export const ordenar = (a, b) => (M.retrasada(b) - M.retrasada(a)) || (ORD_PRIO[a.prioridad] - ORD_PRIO[b.prioridad]) || String(a.fechaLimite || '').localeCompare(String(b.fechaLimite || ''));

// ---------------- bandeja ----------------
export function vOrdenes(S) {
  const main = S.ctx.main;
  const todas = S.lista();
  const mes = M.mesDe(M.ahoraLocal());
  const k = {
    abiertas: todas.filter(o => M.esAbierta(o.estado)).length,
    ret: todas.filter(o => M.retrasada(o)).length,
    ejec: todas.filter(o => o.estado === 'ejecucion').length,
    esp: todas.filter(o => o.estado === 'espera').length,
    ver: todas.filter(o => o.estado === 'ejecutada').length,
    cer: todas.filter(o => o.estado === 'cerrada' && M.mesDe(o.fin || o.fecha) === mes).length
  };
  main.innerHTML = `
    <div class="ot-head">
      <div><div class="eyebrow">Órdenes de trabajo</div><h1 class="ot-h1">Bandeja de trabajos</h1></div>
      ${S.ctx.puedeEscribir ? `<button class="btn btn-primary" id="bNueva">${IC.mas} Nueva OT</button>` : ''}
    </div>
    <div class="ot-kpis">
      ${kpi('Abiertas', k.abiertas, '#1B86C4', 'abiertas')}
      ${kpi('Retrasadas', k.ret, '#B91C1C', 'ret')}
      ${kpi('En ejecución', k.ejec, '#0B9A8B', 'ejecucion')}
      ${kpi('En espera', k.esp, '#B77908', 'espera')}
      ${kpi('Por verificar', k.ver, '#5564D8', 'ejecutada')}
      ${kpi('Cerradas en el mes', k.cer, '#087F74', 'cerrada')}
    </div>
    <div class="ot-fil">
      <div class="ot-chips" role="tablist">${GRUPOS_EST.map(g => `<button class="chip ${F.grupo === g.id ? 'on' : ''}" data-g="${g.id}">${g.l}</button>`).join('')}</div>
      <div class="ot-fil2">
        <div class="ot-bus ot-busq"><span class="ot-bus-i">${IC.buscar}</span><input class="field" id="fQ" type="search" placeholder="Buscar por N°, equipo, descripción o técnico" value="${esc(F.q)}"></div>
        <select class="field" id="fO" aria-label="Origen"><option value="">Todos los orígenes</option>${M.ORIGENES.map(o => `<option value="${o.id}" ${F.origen === o.id ? 'selected' : ''}>${o.l}</option>`).join('')}</select>
        <select class="field" id="fE" aria-label="Especialidad"><option value="">Todas las especialidades</option>${M.ESPECIALIDADES.map(e => `<option value="${esc(e.id)}" ${F.esp === e.id ? 'selected' : ''}>${e.l}</option>`).join('')}</select>
        <select class="field" id="fP" aria-label="Prioridad"><option value="">Toda prioridad</option>${M.PRIORIDADES.map(p => `<option value="${p.id}" ${F.prio === p.id ? 'selected' : ''}>${p.l}</option>`).join('')}</select>
        <label class="check"><input type="checkbox" id="fR" ${F.soloRet ? 'checked' : ''}> Solo retrasadas</label>
      </div>
    </div>
    <div id="lista" class="ot-lista"></div>`;
  const pintar = () => {
    const q = norm(F.q).split(/\s+/).filter(Boolean);
    const r = todas.filter(o => (F.grupo === 'todas' || (F.grupo === 'abiertas' ? M.esAbierta(o.estado) : o.estado === F.grupo))
      && (!F.origen || o.origen === F.origen) && (!F.esp || (o.especialidades || []).includes(F.esp)) && (!F.prio || o.prioridad === F.prio)
      && (!F.soloRet || M.retrasada(o))
      && (!q.length || q.every(t => norm(`${o.numero} ${o.equipoCod} ${o.equipoDesc} ${o.descripcion} ${o.areaTrabajo} ${(o.tecnicos || []).map(x => x.nombre).join(' ')} ${o.solicitante?.nombre || ''}`).includes(t))))
      .sort(ordenar);
    main.querySelector('#lista').innerHTML = r.length ? r.map(o => tarjeta(o, S)).join('')
      : `<div class="ot-vacio">${todas.length ? 'No hay trabajos con estos filtros.' : 'Aún no hay órdenes de trabajo registradas.'}</div>`;
    main.querySelectorAll('[data-ot]').forEach(b => b.onclick = () => abrirOT(S, S.ords.get(b.dataset.ot)));
  };
  pintar();
  main.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { F.grupo = b.dataset.g; vOrdenes(S); });
  main.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { if (b.dataset.k === 'ret') { F.soloRet = true; F.grupo = 'abiertas'; } else { F.soloRet = false; F.grupo = b.dataset.k; } vOrdenes(S); });
  main.querySelector('#fQ').oninput = (e) => { F.q = e.target.value; pintar(); };
  main.querySelector('#fO').onchange = (e) => { F.origen = e.target.value; pintar(); };
  main.querySelector('#fE').onchange = (e) => { F.esp = e.target.value; pintar(); };
  main.querySelector('#fP').onchange = (e) => { F.prio = e.target.value; pintar(); };
  main.querySelector('#fR').onchange = (e) => { F.soloRet = e.target.checked; pintar(); };
  const bN = main.querySelector('#bNueva'); if (bN) bN.onclick = () => abrirOT(S, null);
}
const kpi = (l, v, c, k) => `<button class="ot-kpi" style="--c:${c}" data-k="${k}"><span>${l}</span><b>${v}</b></button>`;

export function tarjeta(o, S) {
  const p = M.prioDe(o.prioridad);
  const tec = (o.tecnicos || []).map(t => t.nombre).concat((o.asignados || []).filter(id => !(o.tecnicos || []).some(t => t.id === id)).map(id => S.per.get(id)?.nombre).filter(Boolean));
  const lim = M.esAbierta(o.estado) && o.estado !== 'ejecutada' && o.fechaLimite ? `Límite ${M.fh(o.fechaLimite)}` : o.fin ? `Terminó ${M.fh(o.fin)}` : '';
  return `<button class="ot-card ${M.retrasada(o) ? 'late' : ''}" data-ot="${esc(o.id)}" style="--c:${p.c}">
    <div class="ot-c1"><span class="ot-num">${esc(o.numero || '—')}</span>${tagPrio(o.prioridad)}${tagOrigen(o.origen)}<span class="ot-sp"></span>${pillEstado(o)}</div>
    <div class="ot-c2">${esc(o.descripcion)}</div>
    <div class="ot-c3">
      <span>${IC.eq}${esc(o.equipoCod ? `${o.equipoCod} · ${o.equipoDesc}` : o.areaTrabajo || '—')}</span>
      ${tec.length ? `<span>${IC.user}${esc(tec.join(', '))}</span>` : ''}
      ${lim ? `<span>${IC.reloj}${esc(lim)}</span>` : ''}
    </div>
    <div class="ot-c4">${(o.especialidades || []).map(tagEsp).join('')}${tagCrit(o.criticidad)}</div>
  </button>`;
}

// ---------------- detalle / formulario ----------------
const nuevaOT = (S, base = {}) => {
  const ahora = M.ahoraLocal();
  return {
    fecha: ahora, origen: 'correctivo', tipo: 'correctivo', ref: '', zona: '', areaTrabajo: '', sistema: null,
    equipoId: null, equipoCod: '', equipoDesc: '', solicitante: { area: 'Mantenimiento', nombre: S.ctx.perfil?.nombre || '' },
    descripcion: '', especialidades: S.yo ? [S.yo.especialidad] : [], hhEstimadas: null, prioridad: 'P3', criticidad: 'medio',
    fechaProg: '', asignados: [], estado: 'pendiente', inicio: '', fin: '', tecnicos: [], tercero: null, materiales: [],
    sinMateriales: false, causa: '', condicionFinal: '', observaciones: '', nFotos: 0, ...base
  };
};

export async function abrirOT(S, ot, base = {}) {
  const nuevo = !ot;
  const o = nuevo ? nuevaOT(S, base) : JSON.parse(JSON.stringify(ot));
  const g = S.gestiona;
  const participa = S.yo && ((o.asignados || []).includes(S.yo.id) || (o.tecnicos || []).some(t => t.id === S.yo.id));
  const editable = S.ctx.puedeEscribir && (nuevo || (g && o.estado !== 'anulada') || (['pendiente', 'programada', 'ejecucion', 'espera'].includes(o.estado) && (participa || o.creadoPor === S.usuario)));
  const verEjec = nuevo ? false : ['ejecucion', 'espera', 'ejecutada', 'cerrada'].includes(o.estado) || !!o.inicio;
  const dis = editable ? '' : 'disabled';
  const areas = [...new Set([...S.ubic, ...(S.cfg.areasExtra || []).map(a => a.nombre)])].sort((a, b) => a.localeCompare(b, 'es'));
  const eqSel = o.equipoId ? S.eq.find(e => e.id === o.equipoId) || { codigo: o.equipoCod, descripcion: o.equipoDesc } : null;

  const m = modal({
    ancho: 880,
    titulo: nuevo ? 'Nueva orden de trabajo' : `${esc(o.numero)} <span class="ot-mtit">${pillEstado(o)}</span>`,
    sub: nuevo ? 'Los campos con * son obligatorios para registrar.' : `${esc(M.origenDe(o.origen).l)} · registrada ${esc(M.fh(o.fecha))}${o.fechaLimite && M.esAbierta(o.estado) ? ` · límite ${esc(M.fh(o.fechaLimite))}` : ''}`,
    cuerpo: `
    <form class="ot-form" autocomplete="off" onsubmit="return false">
      <fieldset ${dis}>
      <section><h3><i>1</i>Identificación</h3><div class="ot-g3">
        <div><label class="label" for="oF">Fecha y hora *</label><input class="field" type="datetime-local" id="oF" value="${esc(o.fecha)}"></div>
        <div><label class="label" for="oO">Origen *</label><select class="field" id="oO">${(o.origen === 'pmp' ? M.ORIGENES : M.ORIGENES_MANUALES).map(x => `<option value="${x.id}" ${o.origen === x.id ? 'selected' : ''}>${x.l}</option>`).join('')}</select></div>
        <div><label class="label" for="oT">Tipo de mantenimiento</label><select class="field" id="oT">${M.TIPOS_MANT.map(x => `<option value="${x.id}" ${o.tipo === x.id ? 'selected' : ''}>${x.l}</option>`).join('')}</select></div>
        <div class="ot-span3" id="wRef" ${['auditoria', 'solicitud', 'pmp'].includes(o.origen) ? '' : 'hidden'}><label class="label" for="oRf">Referencia del origen</label><input class="field" id="oRf" value="${esc(o.ref)}" placeholder="N° de observación, informe, auditoría o pedido"></div>
      </div></section>

      <section><h3><i>2</i>Activo</h3><div class="ot-g3">
        <div class="ot-span3"><label class="label">Equipo o activo</label><div id="oEq"></div></div>
        <div><label class="label" for="oZ">Zona *</label><select class="field" id="oZ"><option value="">Elegir…</option>${SISTEMAS.map(s => `<option value="${esc(s.nombre)}" ${o.zona === s.nombre ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></div>
        <div class="ot-span2"><label class="label" for="oA">Área de trabajo *</label><input class="field" id="oA" list="oAl" value="${esc(o.areaTrabajo)}" placeholder="Sala, línea o instalación"><datalist id="oAl">${areas.map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
      </div></section>

      <section><h3><i>3</i>Pedido</h3><div class="ot-g3">
        <div><label class="label" for="oSa">Área solicitante *</label><select class="field" id="oSa">${(S.cfg.areasSolicitantes || []).map(a => `<option ${o.solicitante?.area === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></div>
        <div class="ot-span2"><label class="label" for="oSn">Solicitante</label><input class="field" id="oSn" value="${esc(o.solicitante?.nombre)}" placeholder="Nombre de quien pide el trabajo"></div>
        <div class="ot-span3"><label class="label" for="oD">Descripción de la actividad *</label><textarea class="field ot-ta" id="oD" rows="3" placeholder="Qué se debe hacer o qué falla se encontró">${esc(o.descripcion)}</textarea></div>
      </div></section>

      <section><h3><i>4</i>Planificación</h3><div class="ot-g3">
        <div class="ot-span3"><label class="label">Especialidad requerida *</label><div class="ot-tog" id="oEs">${M.ESPECIALIDADES.map(e => `<button type="button" class="${(o.especialidades || []).includes(e.id) ? 'on' : ''}" data-v="${esc(e.id)}" style="--c:${e.c}">${esc(e.l)}</button>`).join('')}</div></div>
        <div><label class="label" for="oPr">Prioridad *</label><select class="field" id="oPr">${M.PRIORIDADES.map(p => `<option value="${p.id}" ${o.prioridad === p.id ? 'selected' : ''}>${p.l} (${plazoTxt(M.plazoH(p.id, S.cfg))})</option>`).join('')}</select></div>
        <div><label class="label" for="oC">Criticidad *</label><select class="field" id="oC">${M.CRITICIDADES.map(c => `<option value="${c.id}" ${o.criticidad === c.id ? 'selected' : ''} title="${esc(c.d)}">${c.l}</option>`).join('')}</select></div>
        <div><label class="label" for="oHe">HH estimadas</label><input class="field" type="number" min="0" step="0.5" id="oHe" value="${o.hhEstimadas ?? ''}" placeholder="Opcional"></div>
        <div><label class="label" for="oFp">Fecha programada</label><input class="field" type="date" id="oFp" value="${esc(o.fechaProg)}"></div>
        <div class="ot-span2"><label class="label">Técnicos asignados</label><div class="ot-tog sm" id="oAs"></div></div>
        <div class="ot-span3 ot-hint" id="oPlz"></div>
      </div></section>

      ${nuevo ? `<label class="check ot-ya"><input type="checkbox" id="oYa"> El trabajo ya se ejecutó: registrar horas y cierre ahora</label>` : ''}
      <section id="sEj" ${verEjec ? '' : 'hidden'}><h3><i>5</i>Ejecución y cierre</h3><div class="ot-g3">
        <div><label class="label" for="oI">Hora de inicio</label><input class="field" type="datetime-local" id="oI" value="${esc(o.inicio)}"></div>
        <div><label class="label" for="oFi">Hora de término</label><input class="field" type="datetime-local" id="oFi" value="${esc(o.fin)}"></div>
        <div class="ot-dur"><span>Duración</span><b id="oDur">—</b><span>Horas hombre</span><b id="oHH">—</b></div>
        <div class="ot-span3"><label class="label">Técnicos y horas hombre</label>
          <div id="oTec" class="ot-rows"></div>
          <div class="ot-add"><select class="field" id="oTecSel"><option value="">Agregar técnico…</option></select></div>
          <div class="ot-hint">Cada técnico toma la duración completa; corrija sus horas si entró tarde o salió antes.</div>
          <div class="ot-aviso" id="oCruce" hidden></div></div>
        <div class="ot-span3"><label class="check"><input type="checkbox" id="oTer" ${o.tercero?.proveedor ? 'checked' : ''}> Participó un tercero o proveedor</label></div>
        <div class="ot-span3 ot-g4" id="wTer" ${o.tercero?.proveedor ? '' : 'hidden'}>
          <div class="ot-span2"><label class="label" for="oTp">Proveedor</label><input class="field" id="oTp" value="${esc(o.tercero?.proveedor)}"></div>
          <div><label class="label" for="oTn">Personas</label><input class="field" type="number" min="1" id="oTn" value="${o.tercero?.personas ?? ''}"></div>
          <div><label class="label" for="oTh">HH del tercero</label><input class="field" type="number" min="0" step="0.5" id="oTh" value="${o.tercero?.hh ?? ''}"></div>
          <div class="ot-span4"><label class="label" for="oTd">PSR / OSR</label><input class="field" id="oTd" value="${esc(o.tercero?.doc)}" placeholder="0001-00000"></div>
        </div>
        <div class="ot-span3"><label class="label">Materiales utilizados</label>
          <div id="oMat" class="ot-rows"></div>
          <div class="ot-add"><button type="button" class="btn" id="oMatAdd">${IC.mas} Agregar material</button><label class="check"><input type="checkbox" id="oSinM" ${o.sinMateriales ? 'checked' : ''}> Sin materiales</label></div></div>
        <div><label class="label" for="oCf">Condición final del equipo</label><select class="field" id="oCf"><option value="">Elegir…</option>${M.CONDICIONES.map(c => `<option value="${c.id}" ${o.condicionFinal === c.id ? 'selected' : ''}>${c.l}</option>`).join('')}</select></div>
        <div class="ot-span2"><label class="label" for="oCa">Causa (correctivos y emergencias)</label><input class="field" id="oCa" value="${esc(o.causa)}" placeholder="Qué originó la falla"></div>
        <div class="ot-span3"><label class="label" for="oOb">Observaciones</label><textarea class="field ot-ta" id="oOb" rows="2">${esc(o.observaciones)}</textarea></div>
      </div></section>
      </fieldset>

      <section><h3><i>${IC.foto}</i>Fotos</h3><div class="ot-fotos" id="oFotos"></div>
        ${editable ? `<label class="btn ot-fbtn">${IC.foto} Agregar foto<input type="file" accept="image/*" id="oFoto" hidden></label>` : ''}</section>

      ${nuevo ? '' : `<details class="ot-hist"><summary>Historial (${(o.historial || []).length})</summary>${(o.historial || []).slice().reverse().map(h => `<div><b>${esc(M.fh(h.t))}</b> ${esc(h.por)} · ${esc(h.accion)}${h.detalle ? ` — ${esc(h.detalle)}` : ''}</div>`).join('')}</details>`}
    </form>`,
    pie: acciones(o, S, nuevo, editable)
  });

  // ---- comportamiento del formulario
  const $ = m.$;
  const fotosNuevas = [];
  let eqActual = eqSel;
  buscadorEquipos($('#oEq'), S.eq, (e) => {
    eqActual = e;
    if (e) {
      const sis = sistemaPorId(e.sistema);
      if (sis) $('#oZ').value = sis.nombre;
      if (e.ubicacion) $('#oA').value = e.ubicacion;
      $('#oC').value = M.critDeEquipo(e);
      if ($('#oO').value !== 'emergencia') $('#oPr').value = M.prioDeCrit($('#oC').value);
      plazo();
      const abiertas = S.lista().filter(x => x.equipoId === e.id && M.esAbierta(x.estado) && x.id !== o.id);
      if (abiertas.length) S.ctx.toast(`${e.codigo} ya tiene ${abiertas.length} OT abierta${abiertas.length > 1 ? 's' : ''}: ${abiertas.map(x => x.numero).join(', ')}`, 'err');
    }
  }, eqSel);
  if (!editable) $('#oEq input').disabled = true;

  const plazo = () => {
    const desde = $('#oF').value || M.ahoraLocal();
    $('#oPlz').textContent = `Plazo por prioridad: ${plazoTxt(M.plazoH($('#oPr').value, S.cfg))}. Fecha límite: ${M.fh(M.fechaLimite(desde, $('#oPr').value, S.cfg))}.`;
  };
  plazo();
  ['#oF', '#oPr'].forEach(s => $(s).addEventListener('change', plazo));
  $('#oC').addEventListener('change', () => { $('#oPr').value = $('#oO').value === 'emergencia' ? 'P1' : M.prioDeCrit($('#oC').value); plazo(); });
  $('#oO').addEventListener('change', () => {
    const v = $('#oO').value;
    $('#oT').value = M.origenDe(v).tipo;
    $('#wRef').hidden = !['auditoria', 'solicitud', 'pmp'].includes(v);
    if (v === 'emergencia') { $('#oPr').value = 'P1'; $('#oC').value = 'mc'; plazo(); }
    if (v !== 'solicitud' && !$('#oSa').value) $('#oSa').value = 'Mantenimiento';
  });
  $('#oEs').querySelectorAll('button').forEach(b => b.onclick = () => { if (!editable) return; b.classList.toggle('on'); pintarAsignables(); });

  const asignados = new Set(o.asignados || []);
  const pintarAsignables = () => {
    const esp = [...$('#oEs').querySelectorAll('.on')].map(b => b.dataset.v);
    const ps = S.personas().filter(p => p.activo !== false && (asignados.has(p.id) || !esp.length || esp.includes(p.especialidad)));
    $('#oAs').innerHTML = ps.length ? ps.map(p => `<button type="button" class="${asignados.has(p.id) ? 'on' : ''}" data-p="${esc(p.id)}" style="--c:${M.espDe(p.especialidad).c}">${esc(p.nombre)}${p.tipo === 'oper' ? ' · op.' : ''}</button>`).join('')
      : '<span class="ot-hint">No hay personal registrado para esa especialidad (módulo Personal).</span>';
    $('#oAs').querySelectorAll('[data-p]').forEach(b => b.onclick = () => { if (!editable) return; asignados.has(b.dataset.p) ? asignados.delete(b.dataset.p) : asignados.add(b.dataset.p); b.classList.toggle('on'); });
  };
  pintarAsignables();

  // técnicos con horas
  const tec = (o.tecnicos || []).map(t => ({ ...t }));
  const dur = () => M.horasEntre($('#oI').value, $('#oFi').value);
  const pintarTec = () => {
    const d = dur();
    $('#oTec').innerHTML = tec.length ? tec.map((t, i) => `<div class="ot-row"><span class="ot-rn" style="--c:${M.espDe(t.especialidad).c}"><b>${esc(t.nombre)}</b><small>${esc(M.espDe(t.especialidad).l)}${t.tipo === 'oper' ? ' · operación' : ''}</small></span>
      <label class="ot-hh"><input class="field" type="number" min="0" step="0.25" data-i="${i}" value="${t.hh ?? ''}" ${dis}><span>HH</span></label>
      ${editable ? `<button type="button" class="btn btn-icon" data-q="${i}" aria-label="Quitar">${IC.x}</button>` : ''}</div>`).join('') : '<div class="ot-hint">Sin técnicos registrados.</div>';
    $('#oTec').querySelectorAll('input[data-i]').forEach(inp => inp.oninput = () => { const t = tec[+inp.dataset.i]; t.hh = inp.value === '' ? null : +inp.value; t.auto = false; resumen(); });
    $('#oTec').querySelectorAll('[data-q]').forEach(b => b.onclick = () => { tec.splice(+b.dataset.q, 1); pintarTec(); llenarSel(); });
    resumen();
  };
  const llenarSel = () => {
    const ya = new Set(tec.map(t => t.id));
    $('#oTecSel').innerHTML = '<option value="">Agregar técnico…</option>' + S.personas().filter(p => p.activo !== false && !ya.has(p.id))
      .sort((a, b) => (asignados.has(b.id) - asignados.has(a.id)) || a.nombre.localeCompare(b.nombre, 'es'))
      .map(p => `<option value="${esc(p.id)}">${esc(p.nombre)} · ${esc(M.espDe(p.especialidad).l)}</option>`).join('');
  };
  $('#oTecSel').onchange = () => {
    const p = S.per.get($('#oTecSel').value); if (!p) return;
    const d = dur();
    tec.push({ id: p.id, nombre: p.nombre, especialidad: p.especialidad, tipo: p.tipo || 'mant', hh: d, auto: true });
    pintarTec(); llenarSel();
  };
  const resumen = () => {
    const d = dur();
    $('#oDur').textContent = d === null ? '—' : `${M.nf(d, 2)} h`;
    const t = M.totales({ inicio: $('#oI').value, fin: $('#oFi').value, tecnicos: tec, tercero: $('#oTer').checked ? { proveedor: $('#oTp').value, hh: $('#oTh').value } : null });
    $('#oHH').textContent = t.hhTotal ? `${M.nf(t.hhTotal, 2)} HH` : '—';
    const cr = M.cruces({ id: o.id, inicio: $('#oI').value, fin: $('#oFi').value, tecnicos: tec }, S.lista());
    $('#oCruce').hidden = !cr.length; $('#oCruce').innerHTML = cr.map(esc).join('<br>');
  };
  ['#oI', '#oFi'].forEach(s => $(s).addEventListener('change', () => { const d = dur(); tec.forEach(t => { if (t.auto && d !== null) t.hh = d; }); pintarTec(); }));
  $('#oTer').onchange = () => { $('#wTer').hidden = !$('#oTer').checked; resumen(); };
  ['#oTh', '#oTp'].forEach(s => $(s).addEventListener('input', resumen));
  pintarTec(); llenarSel();

  // materiales
  const mat = (o.materiales || []).map(x => ({ ...x }));
  const pintarMat = () => {
    $('#oMat').innerHTML = mat.length ? mat.map((x, i) => `<div class="ot-row ot-mrow">
      <input class="field" data-m="${i}" data-k="desc" value="${esc(x.desc)}" placeholder="Material o repuesto" ${dis}>
      <input class="field" type="number" min="0" step="any" data-m="${i}" data-k="cant" value="${x.cant ?? ''}" placeholder="Cant." ${dis}>
      <input class="field" data-m="${i}" data-k="und" value="${esc(x.und)}" placeholder="Und." ${dis}>
      <input class="field" data-m="${i}" data-k="ped" value="${esc(x.ped)}" placeholder="PED" ${dis}>
      ${editable ? `<button type="button" class="btn btn-icon" data-mq="${i}" aria-label="Quitar">${IC.x}</button>` : ''}</div>`).join('') : '';
    $('#oMat').querySelectorAll('[data-m]').forEach(inp => inp.oninput = () => { mat[+inp.dataset.m][inp.dataset.k] = inp.dataset.k === 'cant' ? (inp.value === '' ? null : +inp.value) : inp.value; });
    $('#oMat').querySelectorAll('[data-mq]').forEach(b => b.onclick = () => { mat.splice(+b.dataset.mq, 1); pintarMat(); });
  };
  $('#oMatAdd').onclick = () => { mat.push({ desc: '', cant: null, und: 'und', ped: '' }); $('#oSinM').checked = false; pintarMat(); $('#oMat').querySelector('.ot-row:last-child input')?.focus(); };
  pintarMat();

  const ya = $('#oYa');
  if (ya) ya.onchange = () => {
    $('#sEj').hidden = !ya.checked;
    if (ya.checked && !$('#oI').value) { $('#oI').value = $('#oF').value; }
    if (ya.checked && S.yo && !tec.some(t => t.id === S.yo.id)) { tec.push({ id: S.yo.id, nombre: S.yo.nombre, especialidad: S.yo.especialidad, tipo: S.yo.tipo || 'mant', hh: dur(), auto: true }); pintarTec(); llenarSel(); }
    m.$('[data-a="registrar"]').textContent = ya.checked ? 'Registrar y enviar a verificación' : 'Registrar OT';
  };

  // fotos
  const pintarFotos = async () => {
    const box = $('#oFotos');
    const guardadas = !nuevo && o.nFotos ? await S.api.fotos(o.id).catch(() => []) : [];
    const todas = [...guardadas.map(f => f.data), ...fotosNuevas];
    box.innerHTML = todas.length ? todas.map(d => `<a href="${d}" target="_blank" rel="noopener"><img src="${d}" alt="Foto del trabajo"></a>`).join('') : '<span class="ot-hint">Sin fotos.</span>';
  };
  pintarFotos();
  const inF = $('#oFoto');
  if (inF) inF.onchange = async () => {
    const f = inF.files[0]; if (!f) return;
    try {
      const data = await reducirFoto(f);
      if (nuevo) fotosNuevas.push(data);
      else { await S.api.agregarFoto(o.id, data); o.nFotos = (o.nFotos || 0) + 1; await S.api.actualizar(o, { nFotos: o.nFotos }, 'Agregó una foto'); }
      pintarFotos();
    } catch (e) { S.ctx.toast(e.message || 'No se pudo guardar la foto.', 'err'); }
    inF.value = '';
  };

  // ---- lectura del formulario
  const leer = () => {
    const ter = $('#oTer').checked && $('#oTp').value.trim() ? { proveedor: $('#oTp').value.trim(), personas: +$('#oTn').value || null, hh: +$('#oTh').value || 0, doc: $('#oTd').value.trim() } : null;
    const x = {
      fecha: $('#oF').value, origen: $('#oO').value, tipo: $('#oT').value, ref: $('#oRf').value.trim(),
      zona: $('#oZ').value, areaTrabajo: $('#oA').value.trim(), sistema: SISTEMAS.find(s => s.nombre === $('#oZ').value)?.id ?? null,
      equipoId: eqActual?.id || null, equipoCod: eqActual?.codigo || '', equipoDesc: eqActual?.descripcion || '',
      solicitante: { area: $('#oSa').value, nombre: $('#oSn').value.trim() }, descripcion: $('#oD').value.trim(),
      especialidades: [...$('#oEs').querySelectorAll('.on')].map(b => b.dataset.v), prioridad: $('#oPr').value, criticidad: $('#oC').value,
      hhEstimadas: $('#oHe').value === '' ? null : +$('#oHe').value, fechaProg: $('#oFp').value, asignados: [...asignados],
      inicio: $('#oI').value, fin: $('#oFi').value, tecnicos: tec.map(({ auto, ...t }) => t), tercero: ter,
      materiales: mat.filter(x => String(x.desc || '').trim()), sinMateriales: $('#oSinM').checked,
      condicionFinal: $('#oCf').value, causa: $('#oCa').value.trim(), observaciones: $('#oOb').value.trim()
    };
    // la fecha límite se recalcula si cambia la prioridad o la fecha (salvo que la OT esté en espera)
    if (nuevo || x.prioridad !== o.prioridad || x.fecha !== o.fecha) x.fechaLimite = M.fechaLimite(x.fecha, x.prioridad, S.cfg);
    Object.assign(x, M.totales(x));
    return x;
  };
  const errores = (lista) => { if (!lista.length) return false; m.$('.ot-merr')?.remove(); m.$('.ot-mf').insertAdjacentHTML('afterbegin', `<div class="ot-merr">${lista.map(esc).join('<br>')}</div>`); return true; };

  // ---- acciones
  const hacer = async (btn, fn) => {
    const b = m.$(`[data-a="${btn}"]`); if (b) b.disabled = true;
    try { await fn(); } catch (e) { console.error(e); S.ctx.toast(e.message || 'No se pudo guardar. Revise la conexión.', 'err'); }
    finally { if (b) b.disabled = false; }
  };
  const on = (a, fn) => { const b = m.$(`[data-a="${a}"]`); if (b) b.onclick = () => hacer(a, fn); };

  on('cancelar', async () => m.cerrar());
  on('registrar', async () => {
    const x = leer();
    if (errores(M.erroresRegistro(x))) return;
    let estado = x.asignados.length && x.fechaProg ? 'programada' : 'pendiente';
    if (ya?.checked) { if (errores(M.erroresCierre(x))) return; estado = 'ejecutada'; }
    const r = await S.api.crear({ ...x, estado, nFotos: fotosNuevas.length }, ya?.checked ? 'Registró el trabajo ya ejecutado' : 'Registró la OT');
    for (const f of fotosNuevas) await S.api.agregarFoto(r.id, f);
    S.ctx.toast(`${r.numero} registrada.`); m.cerrar();
  });
  on('guardar', async () => {
    const x = leer();
    if (errores(M.erroresRegistro(x))) return;
    if (o.estado === 'cerrada') { const r = await confirmar({ titulo: 'Corregir OT cerrada', texto: 'El cambio quedará en el historial con su nombre.', si: 'Guardar corrección', campo: '<input class="field" data-campo required placeholder="Motivo de la corrección">' }); if (!r) return; await S.api.actualizar(o, x, 'Corrigió la OT cerrada', r); }
    else await S.api.actualizar(o, x, 'Editó la OT');
    S.ctx.toast('Cambios guardados.'); m.cerrar();
  });
  on('programar', async () => {
    const x = leer();
    if (errores(M.erroresRegistro(x))) return;
    if (!x.fechaProg || !x.asignados.length) return errores(['Para programar indique la fecha programada y al menos un técnico asignado.']);
    await S.api.actualizar(o, { ...x, estado: 'programada' }, 'Programó la OT', `${x.fechaProg} · ${x.asignados.map(id => S.per.get(id)?.nombre).filter(Boolean).join(', ')}`);
    S.ctx.toast('OT programada.'); m.cerrar();
  });
  on('iniciar', async () => {
    const x = leer();
    if (errores(M.erroresRegistro(x))) return;
    x.inicio = x.inicio || M.ahoraLocal();
    if (S.yo && !x.tecnicos.some(t => t.id === S.yo.id)) x.tecnicos.push({ id: S.yo.id, nombre: S.yo.nombre, especialidad: S.yo.especialidad, tipo: S.yo.tipo || 'mant', hh: null });
    await S.api.actualizar(o, { ...x, estado: 'ejecucion' }, 'Inició el trabajo');
    S.ctx.toast('Trabajo iniciado.'); m.cerrar();
  });
  on('espera', async () => {
    const motivo = await confirmar({ titulo: 'Poner en espera', texto: 'El plazo se detiene mientras la OT está en espera.', si: 'Poner en espera',
      campo: `<select class="field" data-campo required><option value="">Motivo…</option>${M.MOTIVOS_ESPERA.map(x => `<option>${x}</option>`).join('')}</select>` });
    if (!motivo) return;
    await S.api.actualizar(o, { ...leer(), estado: 'espera', esperaDesde: M.ahoraLocal(), motivoEspera: motivo }, 'Puso la OT en espera', motivo);
    S.ctx.toast('OT en espera.'); m.cerrar();
  });
  on('reanudar', async () => {
    const x = leer();
    await S.api.actualizar(o, { ...x, estado: 'ejecucion', fechaLimite: M.limiteTrasEspera(o), esperaDesde: null }, 'Reanudó el trabajo');
    S.ctx.toast('Trabajo reanudado.'); m.cerrar();
  });
  on('terminar', async () => {
    const x = leer();
    x.fin = x.fin || M.ahoraLocal();
    if (!$('#oFi').value) { $('#oFi').value = x.fin; tec.forEach(t => { if (t.hh == null || t.auto) t.hh = dur(); }); pintarTec(); Object.assign(x, { tecnicos: tec.map(({ auto, ...t }) => t) }, M.totales({ ...x, tecnicos: tec })); }
    if (errores([...M.erroresRegistro(x), ...M.erroresCierre(x)])) return;
    await S.api.actualizar(o, { ...x, estado: 'ejecutada', ejecutadoPor: S.usuario }, 'Terminó el trabajo', `${M.nf(x.hhTotal, 2)} HH`);
    S.ctx.toast('Trabajo terminado: pasa a verificación del supervisor.'); m.cerrar();
  });
  on('verificar', async () => {
    const x = leer();
    if (errores([...M.erroresRegistro(x), ...M.erroresCierre(x)])) return;
    await S.api.actualizar(o, { ...x, estado: 'cerrada', verificadoPor: S.usuario, verificado: M.ahoraLocal() }, 'Verificó y cerró la OT');
    S.ctx.toast('OT cerrada.'); m.cerrar();
  });
  on('devolver', async () => {
    const r = await confirmar({ titulo: 'Devolver al técnico', texto: 'La OT vuelve a "En ejecución" para que se complete o corrija.', si: 'Devolver', campo: '<input class="field" data-campo required placeholder="Qué se debe corregir">' });
    if (!r) return;
    await S.api.actualizar(o, { estado: 'ejecucion' }, 'Devolvió la OT', r);
    S.ctx.toast('OT devuelta.'); m.cerrar();
  });
  on('anular', async () => {
    const r = await confirmar({ titulo: 'Anular OT', texto: `¿Anular ${esc(o.numero)}? Queda en el historial y no cuenta en los indicadores.`, si: 'Anular', peligro: true, campo: '<input class="field" data-campo required placeholder="Motivo: duplicada, ya no se requiere…">' });
    if (!r) return;
    await S.api.actualizar(o, { estado: 'anulada', motivoAnulacion: r }, 'Anuló la OT', r);
    S.ctx.toast('OT anulada.'); m.cerrar();
  });
  return m;
}

const plazoTxt = (h) => h < 48 ? `${h} h` : `${Math.round(h / 24)} días`;

function acciones(o, S, nuevo, editable) {
  const b = (a, t, cls = '') => `<button class="btn ${cls}" data-a="${a}">${t}</button>`;
  if (nuevo) return b('cancelar', 'Cancelar') + b('registrar', 'Registrar OT', 'btn-primary');
  if (!editable) return b('cancelar', 'Cerrar');
  const g = S.gestiona, out = [];
  if (g && ['pendiente', 'programada'].includes(o.estado)) out.push(b('anular', 'Anular', 'btn-danger'));
  if (o.estado !== 'ejecutada' || g) out.push(b('guardar', o.estado === 'cerrada' ? 'Corregir' : 'Guardar'));
  if (g && o.estado === 'pendiente') out.push(b('programar', `${IC.cal} Programar`));
  if (['pendiente', 'programada'].includes(o.estado)) out.push(b('iniciar', `${IC.play} Iniciar`, 'btn-primary'));
  if (o.estado === 'ejecucion') out.push(b('espera', `${IC.pausa} En espera`), b('terminar', `${IC.stop} Terminar`, 'btn-primary'));
  if (o.estado === 'espera') out.push(b('reanudar', `${IC.play} Reanudar`, 'btn-primary'));
  if (g && o.estado === 'ejecutada') out.push(b('devolver', 'Devolver'), b('verificar', `${IC.ok} Verificar y cerrar`, 'btn-primary'));
  return out.join('');
}
