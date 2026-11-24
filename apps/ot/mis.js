// Órdenes de trabajo — Mis trabajos (pensado para el celular del técnico)
import { SISTEMAS, sistemaPorId } from '../../core/maestros.js';
import * as M from './modelo.js';
import { esc, IC, modal, buscadorEquipos } from './ui.js';
import { abrirOT, ordenar } from './ordenes.js';
import { otsPorOcurrencia, base } from './pmp.js';

export function vMis(S) {
  const main = S.ctx.main, yo = S.yo;
  const todas = S.lista();
  const mio = (o) => yo && ((o.asignados || []).includes(yo.id) || (o.tecnicos || []).some(t => t.id === yo.id));
  const grupos = yo ? [
    { t: 'En ejecución', l: todas.filter(o => o.estado === 'ejecucion' && mio(o)) },
    { t: 'Asignados a mí', l: todas.filter(o => ['pendiente', 'programada', 'espera'].includes(o.estado) && mio(o)) },
    { t: `Pendientes de ${M.espDe(yo.especialidad).l.toLowerCase()} sin asignar`, l: todas.filter(o => o.estado === 'pendiente' && !(o.asignados || []).length && (o.especialidades || []).includes(yo.especialidad)) },
    { t: 'Esperando verificación', l: todas.filter(o => o.estado === 'ejecutada' && mio(o)) }
  ] : [];
  // Preventivo de esta semana de mi especialidad que aún no tiene OT
  const porOcc = otsPorOcurrencia(S);
  const prev = yo && S.pmp ? M.ocurrenciasSemana([...S.pmp.values()], M.lunesDe())
    .filter(o => !o.hecha && !o.no && !porOcc.has(M.clavePMP(o.t.id, o.s)) && M.espTarea(o.t).includes(yo.especialidad))
    .sort((a, b) => (b.atrasada - a.atrasada) || String(a.t.eq).localeCompare(b.t.eq)) : [];
  const hoy = M.ahoraLocal().slice(0, 10);
  const hhHoy = yo ? todas.filter(o => String(o.inicio || '').startsWith(hoy)).reduce((a, o) => a + (+(o.tecnicos || []).find(t => t.id === yo.id)?.hh || 0), 0) : 0;

  main.innerHTML = `
    <div class="ot-head">
      <div><div class="eyebrow">Mis trabajos</div><h1 class="ot-h1">${yo ? `Hola, ${esc(yo.nombre.split(' ')[0])}` : 'Mis trabajos'}</h1>
        ${yo ? `<div class="ot-sub">${esc(M.espDe(yo.especialidad).l)} · ${esc(yo.grupo || '')} · hoy ${M.nf(hhHoy, 2)} HH registradas</div>` : ''}</div>
    </div>
    ${miRol(S, yo, hoy)}
    ${S.ctx.puedeEscribir ? `<div class="ot-big">
      <button class="ot-bigb" id="bRep"><span>${IC.mas}</span><b>Reportar un trabajo</b><small>Correctivo, emergencia o actividad propia</small></button>
      <button class="ot-bigb sec" id="bDet"><span>${IC.edit}</span><b>Registrar con detalle</b><small>Formulario completo, también trabajos ya hechos</small></button>
    </div>` : ''}
    ${yo ? '' : `<div class="ot-aviso">Su usuario no está vinculado a una persona del módulo Personal, por eso no se muestran trabajos asignados.${S.gestiona ? ' Vincúlelo con su correo en Personal.' : ' Pida al administrador que lo vincule.'}</div>`}
    ${grupos.map(g => `<section class="ot-mis"><h2>${esc(g.t)} <span>${g.l.length}</span></h2>
      ${g.l.length ? `<div class="ot-mlist">${g.l.sort(ordenar).map(o => tarjetaMia(o)).join('')}</div>` : '<div class="ot-vacio sm">Nada por ahora.</div>'}</section>`).join('')}
    ${yo ? `<section class="ot-mis"><h2>Preventivo de esta semana <span>${prev.length}</span></h2>
      ${prev.length ? `<div class="ot-mlist">${prev.map(o => `<div class="ot-mcard ${o.atrasada ? 'late' : ''}" style="--c:#1B86C4">
        <div class="ot-c1"><span class="ot-num">${esc(o.t.eq)}</span><span class="ot-ori" style="--c:#1B86C4">PMP · ${esc(o.t.rutina || '')}</span>${o.atrasada ? '<span class="ot-pill ot-late" style="--c:#B91C1C">Atrasada</span>' : ''}</div>
        <div class="ot-c2">${esc(o.t.tarea)}</div>
        <div class="ot-c3"><span>${IC.eq}${esc(o.t.eqDesc || '')}</span><span>${IC.reloj}${M.nf(M.hhTarea(o.t), 1)} HH previstas</span></div>
        <button class="btn btn-primary ot-mact" data-pmp="${esc(M.clavePMP(o.t.id, o.s))}">${IC.play} Iniciar</button></div>`).join('')}</div>` : '<div class="ot-vacio sm">No hay preventivos pendientes de su especialidad esta semana.</div>'}</section>` : ''}`;

  main.querySelectorAll('[data-ot]').forEach(b => b.onclick = () => abrirOT(S, S.ords.get(b.dataset.ot)));
  main.querySelectorAll('[data-ini]').forEach(b => b.onclick = async (ev) => {
    ev.stopPropagation();
    const o = S.ords.get(b.dataset.ini); b.disabled = true;
    try {
      const tec = (o.tecnicos || []).slice();
      if (!tec.some(t => t.id === yo.id)) tec.push({ id: yo.id, nombre: yo.nombre, especialidad: yo.especialidad, tipo: yo.tipo || 'mant', hh: null });
      const asign = [...new Set([...(o.asignados || []), yo.id])];
      await S.api.actualizar(o, { estado: 'ejecucion', inicio: o.inicio || M.ahoraLocal(), tecnicos: tec, asignados: asign }, 'Inició el trabajo');
      S.ctx.toast(`${o.numero} iniciada.`);
    } catch (e) { S.ctx.toast(e.message || 'No se pudo iniciar.', 'err'); b.disabled = false; }
  });
  main.querySelectorAll('[data-fin]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); abrirOT(S, S.ords.get(b.dataset.fin)); });
  main.querySelectorAll('[data-pmp]').forEach(b => b.onclick = async () => {
    const o = prev.find(x => M.clavePMP(x.t.id, x.s) === b.dataset.pmp); b.disabled = true;
    try {
      const ahora = M.ahoraLocal();
      const r = await S.api.crear({ ...base(), ...M.otDesdePMP(o, SISTEMAS), estado: 'ejecucion', inicio: ahora, asignados: [yo.id],
        tecnicos: [{ id: yo.id, nombre: yo.nombre, especialidad: yo.especialidad, tipo: yo.tipo || 'mant', hh: null }] }, 'Inició el preventivo');
      S.ctx.toast(`${r.numero} iniciada.`);
    } catch (e) { S.ctx.toast(e.message || 'No se pudo iniciar.', 'err'); b.disabled = false; }
  });
  const bR = main.querySelector('#bRep'); if (bR) bR.onclick = () => reporteRapido(S);
  const bD = main.querySelector('#bDet'); if (bD) bD.onclick = () => abrirOT(S, null);
}

// Mi rol de guardia de esta semana (si el supervisor ya lo publicó)
function miRol(S, yo, hoy) {
  const sem = M.lunesDe(), f = yo ? M.filaRol(S.rol, yo.id, sem) : null;
  if (!f) return '';
  return `<div class="ot-mirol" aria-label="Mi rol de esta semana">${f.map((c, i) => { const k = M.codRol(c), d = M.masDias(sem, i);
    return `<span class="${d === hoy ? 'hoy' : ''}" title="${esc(k?.l || 'Sin asignar')}"><small>${M.DIAS_SEM[i]} ${M.deLocal(d).getDate()}</small><b style="--c:${k?.c || '#8A96A2'};--bg:${k?.bg || '#EEF2F5'}">${esc(c || '·')}</b></span>`; }).join('')}</div>`;
}

function tarjetaMia(o) {
  const p = M.prioDe(o.prioridad), r = M.retrasada(o);
  const accion = ['pendiente', 'programada'].includes(o.estado) ? `<button class="btn btn-primary ot-mact" data-ini="${esc(o.id)}">${IC.play} Iniciar</button>`
    : o.estado === 'ejecucion' ? `<button class="btn btn-primary ot-mact" data-fin="${esc(o.id)}">${IC.stop} Terminar</button>` : '';
  const tiempo = o.fin ? `Terminó ${M.fh(o.fin)}` : o.estado === 'ejecucion' && o.inicio ? `En curso desde ${M.fh(o.inicio)}` : o.fechaProg ? `Programada ${M.fh(o.fechaProg, false)}` : o.fechaLimite ? `Límite ${M.fh(o.fechaLimite)}` : '';
  return `<div class="ot-mcard ${r ? 'late' : ''}" data-ot="${esc(o.id)}" role="button" tabindex="0" style="--c:${p.c}">
    <div class="ot-c1"><span class="ot-num">${esc(o.numero)}</span><span class="ot-prio" style="--c:${p.c}">${p.corto}</span>${r ? '<span class="ot-pill ot-late" style="--c:#B91C1C">Retrasada</span>' : ''}${o.estado === 'espera' ? `<span class="ot-pill" style="--c:#B77908">En espera</span>` : ''}</div>
    <div class="ot-c2">${esc(o.descripcion)}</div>
    <div class="ot-c3"><span>${IC.eq}${esc(o.equipoCod || o.areaTrabajo || '—')}</span>${tiempo ? `<span>${IC.reloj}${esc(tiempo)}</span>` : ''}</div>
    ${accion}
  </div>`;
}

// Reporte rápido desde el celular: lo mínimo para registrar; el resto lo completa el supervisor
function reporteRapido(S) {
  const yo = S.yo;
  const areas = [...new Set([...S.ubic, ...(S.cfg.areasExtra || []).map(a => a.nombre)])].sort((a, b) => a.localeCompare(b, 'es'));
  const m = modal({
    titulo: 'Reportar un trabajo', ancho: 560,
    cuerpo: `<div class="ot-form ot-rapido">
      <div><label class="label">Tipo</label><div class="ot-tog" id="rT">
        <button type="button" class="on" data-v="correctivo" style="--c:#D65050">Correctivo</button>
        <button type="button" data-v="emergencia" style="--c:#B91C1C">Emergencia</button>
        <button type="button" data-v="propia" style="--c:#0B9A8B">Actividad propia</button></div></div>
      <div><label class="label">Equipo</label><div id="rEq"></div></div>
      <div class="ot-g2" id="rSin">
        <div><label class="label" for="rZ">Zona</label><select class="field" id="rZ"><option value="">Elegir…</option>${SISTEMAS.map(s => `<option>${esc(s.nombre)}</option>`).join('')}</select></div>
        <div><label class="label" for="rA">Área de trabajo</label><input class="field" id="rA" list="rAl" placeholder="Sala o instalación"><datalist id="rAl">${areas.map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
      </div>
      <div><label class="label" for="rD">¿Qué se hizo o qué falla hay?</label><textarea class="field ot-ta" id="rD" rows="3"></textarea></div>
      <div><label class="label">Especialidad</label><div class="ot-tog" id="rE">${M.ESPECIALIDADES.filter(e => e.id !== 'Tercero').map(e => `<button type="button" class="${yo?.especialidad === e.id ? 'on' : ''}" data-v="${esc(e.id)}" style="--c:${e.c}">${esc(e.l)}</button>`).join('')}</div></div>
      ${yo ? `<label class="check"><input type="checkbox" id="rYa" checked> Empiezo ahora (queda en ejecución a mi nombre)</label>` : ''}
    </div>`,
    pie: `<button class="btn" data-no>Cancelar</button><button class="btn btn-primary" data-si>Registrar</button>`
  });
  let eq = null;
  buscadorEquipos(m.$('#rEq'), S.eq, (e) => {
    eq = e;
    if (e) { const s = sistemaPorId(e.sistema); if (s) m.$('#rZ').value = s.nombre; if (e.ubicacion) m.$('#rA').value = e.ubicacion; }
  });
  m.$$('#rT button, #rE button').forEach(b => b.onclick = () => {
    if (b.parentElement.id === 'rT') m.$$('#rT button').forEach(x => x.classList.toggle('on', x === b)); else b.classList.toggle('on');
  });
  m.$('[data-no]').onclick = m.cerrar;
  m.$('[data-si]').onclick = async () => {
    const origen = m.$('#rT .on').dataset.v;
    const crit = origen === 'emergencia' ? 'mc' : M.critDeEquipo(eq);
    const prio = origen === 'emergencia' ? 'P1' : M.prioDeCrit(crit);
    const ahora = M.ahoraLocal(), empieza = !!m.$('#rYa')?.checked;
    const ot = {
      fecha: ahora, origen, tipo: M.origenDe(origen).tipo, ref: '', zona: m.$('#rZ').value, areaTrabajo: m.$('#rA').value.trim(),
      sistema: SISTEMAS.find(s => s.nombre === m.$('#rZ').value)?.id ?? null,
      equipoId: eq?.id || null, equipoCod: eq?.codigo || '', equipoDesc: eq?.descripcion || '',
      solicitante: { area: 'Mantenimiento', nombre: yo?.nombre || S.ctx.perfil?.nombre || '' }, descripcion: m.$('#rD').value.trim(),
      especialidades: m.$$('#rE .on').map(b => b.dataset.v), hhEstimadas: null, prioridad: prio, criticidad: crit,
      fechaLimite: M.fechaLimite(ahora, prio, S.cfg), fechaProg: '', asignados: empieza ? [yo.id] : [],
      estado: empieza ? 'ejecucion' : 'pendiente', inicio: empieza ? ahora : '', fin: '',
      tecnicos: empieza ? [{ id: yo.id, nombre: yo.nombre, especialidad: yo.especialidad, tipo: yo.tipo || 'mant', hh: null }] : [],
      tercero: null, materiales: [], sinMateriales: false, causa: '', condicionFinal: '', observaciones: '', nFotos: 0
    };
    const err = M.erroresRegistro(ot);
    if (err.length) { S.ctx.toast(err[0], 'err'); return; }
    m.$('[data-si]').disabled = true;
    try { const r = await S.api.crear(ot, empieza ? 'Reportó e inició el trabajo' : 'Reportó el trabajo'); S.ctx.toast(`${r.numero} registrada.`); m.cerrar(); }
    catch (e) { S.ctx.toast(e.message || 'No se pudo registrar.', 'err'); m.$('[data-si]').disabled = false; }
  };
}
