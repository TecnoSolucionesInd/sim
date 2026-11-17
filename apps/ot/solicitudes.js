// Órdenes de trabajo — Solicitudes de las áreas usuarias
// El solicitante registra su pedido y sigue su estado; el supervisor lo acepta (crea la OT) o lo rechaza con motivo.
import { SISTEMAS, sistemaPorId } from '../../core/maestros.js';
import * as M from './modelo.js';
import { esc, IC, modal, confirmar, buscadorEquipos, pillEstado } from './ui.js';
import { abrirOT } from './ordenes.js';

let GR = 'nueva';
const GRUPOS = [{ id: 'nueva', l: 'Por evaluar' }, { id: 'aceptada', l: 'Aceptadas' }, { id: 'atendida', l: 'Atendidas' }, { id: 'rechazada', l: 'Rechazadas' }, { id: 'todas', l: 'Todas' }];

export function vSolicitudes(S) {
  const main = S.ctx.main, g = S.gestiona, uid = S.ctx.user.uid;
  const todas = S.solicitudes().map(s => ({ ...s, est: M.estadoSolicitud(s, s.otId ? S.ords.get(s.otId) : null) }));
  const visibles = g ? todas : todas.filter(s => s.creadoUid === uid);
  const cuenta = (id) => visibles.filter(s => id === 'todas' || s.est === id).length;
  if (!g) GR = 'todas';
  const lista = visibles.filter(s => GR === 'todas' || s.est === GR).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  main.innerHTML = `
    <div class="ot-head">
      <div><div class="eyebrow">Solicitudes</div><h1 class="ot-h1">${g ? 'Solicitudes de las áreas' : 'Mis solicitudes'}</h1>
        <div class="ot-sub">${g ? 'Acepte para crear la orden de trabajo o rechace indicando el motivo.' : 'Pida un trabajo a Mantenimiento y siga en qué estado está.'}</div></div>
      ${S.ctx.puedeEscribir ? `<button class="btn btn-primary" id="bSol">${IC.mas} Nueva solicitud</button>` : ''}
    </div>
    ${g ? `<div class="ot-chips" style="margin-bottom:14px">${GRUPOS.map(x => `<button class="chip ${GR === x.id ? 'on' : ''}" data-g="${x.id}">${x.l} <span class="ot-cnt">${cuenta(x.id)}</span></button>`).join('')}</div>` : ''}
    <div class="ot-lista">${lista.length ? lista.map(s => tarjeta(s, S)).join('') : `<div class="ot-vacio" style="grid-column:1/-1">${g ? 'No hay solicitudes en este grupo.' : 'Aún no ha registrado solicitudes.'}</div>`}</div>`;
  main.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { GR = b.dataset.g; vSolicitudes(S); });
  main.querySelectorAll('[data-sol]').forEach(b => b.onclick = () => detalle(S, todas.find(s => s.id === b.dataset.sol)));
  const bS = main.querySelector('#bSol'); if (bS) bS.onclick = () => nuevaSolicitud(S);
}

function tarjeta(s, S) {
  const u = M.urgDe(s.urgencia), e = M.estSolDe(s.est), ot = s.otId ? S.ords.get(s.otId) : null;
  return `<button class="ot-card" data-sol="${esc(s.id)}" style="--c:${u.c}">
    <div class="ot-c1"><span class="ot-num">${esc(s.numero)}</span><span class="ot-prio" style="--c:${u.c}">${esc(u.l)}</span><span class="ot-ori" style="--c:#5564D8">${esc(s.areaSolicitante)}</span><span class="ot-sp"></span><span class="ot-pill" style="--c:${e.c}">${esc(e.l)}</span></div>
    <div class="ot-c2">${esc(s.descripcion)}</div>
    <div class="ot-c3"><span>${IC.eq}${esc(s.equipoCod ? `${s.equipoCod} · ${s.equipoDesc}` : s.areaTrabajo || '—')}</span><span>${IC.user}${esc(s.solicitante || '—')}</span><span>${IC.reloj}${esc(M.fh(s.fecha))}</span></div>
    ${s.otNumero ? `<div class="ot-c3"><span>${IC.ok}${esc(s.otNumero)}</span>${ot ? pillEstado(ot) : ''}</div>` : ''}
    ${s.estado === 'rechazada' && s.motivo ? `<div class="ot-c3 ot-rojo">Motivo: ${esc(s.motivo)}</div>` : ''}
  </button>`;
}

function detalle(S, s) {
  const g = S.gestiona, u = M.urgDe(s.urgencia), ot = s.otId ? S.ords.get(s.otId) : null;
  const m = modal({
    titulo: `${esc(s.numero)} <span class="ot-mtit"><span class="ot-pill" style="--c:${M.estSolDe(s.est).c}">${esc(M.estSolDe(s.est).l)}</span></span>`,
    sub: `${esc(s.areaSolicitante)} · ${esc(s.solicitante || '')} · ${esc(M.fh(s.fecha))}`, ancho: 620,
    cuerpo: `<dl class="ot-dl">
      <dt>Urgencia</dt><dd><span class="ot-prio" style="--c:${u.c}">${esc(u.l)}</span></dd>
      <dt>Equipo o lugar</dt><dd>${esc(s.equipoCod ? `${s.equipoCod} · ${s.equipoDesc}` : '—')}<br><small>${esc([s.zona, s.areaTrabajo].filter(Boolean).join(' · '))}</small></dd>
      <dt>Pedido</dt><dd>${esc(s.descripcion)}</dd>
      ${s.otNumero ? `<dt>Orden de trabajo</dt><dd>${esc(s.otNumero)} ${ot ? pillEstado(ot) : ''}</dd>` : ''}
      ${s.motivo ? `<dt>Motivo del rechazo</dt><dd>${esc(s.motivo)}</dd>` : ''}
      ${s.evaluadoPor ? `<dt>Evaluada por</dt><dd>${esc(s.evaluadoPor)} · ${esc(M.fh(s.evaluado))}</dd>` : ''}
    </dl>`,
    pie: g && s.estado === 'nueva' ? `<button class="btn btn-danger" data-a="rech">Rechazar</button><button class="btn btn-primary" data-a="acep">${IC.ok} Aceptar y crear OT</button>`
      : `${ot ? '<button class="btn" data-a="ver">Ver la OT</button>' : ''}<button class="btn" data-a="cerrar">Cerrar</button>`
  });
  const on = (a, fn) => { const b = m.$(`[data-a="${a}"]`); if (b) b.onclick = fn; };
  on('cerrar', m.cerrar);
  on('ver', () => { m.cerrar(); abrirOT(S, ot); });
  on('rech', async () => {
    const r = await confirmar({ titulo: 'Rechazar solicitud', texto: 'El solicitante verá el motivo.', si: 'Rechazar', peligro: true, campo: '<input class="field" data-campo required placeholder="Motivo: no corresponde a Mantenimiento, duplicada…">' });
    if (!r) return;
    try { await S.api.actualizarSolicitud(s.id, { estado: 'rechazada', motivo: r, evaluadoPor: S.usuario, evaluado: M.ahoraLocal() }); S.ctx.toast('Solicitud rechazada.'); m.cerrar(); }
    catch (e) { S.ctx.toast(e.message || 'No se pudo guardar.', 'err'); }
  });
  on('acep', () => {
    m.cerrar();
    const eq = s.equipoId ? S.eq.find(e => e.id === s.equipoId) : null;
    const crit = s.urgencia === 'emergencia' ? 'mc' : eq ? M.critDeEquipo(eq) : 'medio';
    const prio = M.urgDe(s.urgencia).prio;
    abrirOT(S, null, {
      origen: 'solicitud', tipo: 'correctivo', ref: s.numero, solicitudId: s.id, solicitudNumero: s.numero,
      zona: s.zona, sistema: s.sistema ?? null, areaTrabajo: s.areaTrabajo, equipoId: s.equipoId || null, equipoCod: s.equipoCod || '', equipoDesc: s.equipoDesc || '',
      solicitante: { area: s.areaSolicitante, nombre: s.solicitante }, descripcion: s.descripcion, especialidades: [],
      prioridad: prio, criticidad: crit
    }, { alRegistrar: (r) => S.api.actualizarSolicitud(s.id, { estado: 'aceptada', otId: r.id, otNumero: r.numero, evaluadoPor: S.usuario, evaluado: M.ahoraLocal() }) });
  });
}

function nuevaSolicitud(S) {
  const areas = [...new Set([...S.ubic, ...(S.cfg.areasExtra || []).map(a => a.nombre)])].sort((a, b) => a.localeCompare(b, 'es'));
  let recordada = ''; try { recordada = localStorage.getItem('ot-area-sol') || ''; } catch { }
  const m = modal({
    titulo: 'Nueva solicitud', ancho: 600,
    cuerpo: `<div class="ot-form ot-rapido">
      <div class="ot-g2">
        <div><label class="label" for="sA">Área que solicita *</label><select class="field" id="sA">${(S.cfg.areasSolicitantes || []).map(a => `<option ${a === recordada ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></div>
        <div><label class="label" for="sN">Solicitante *</label><input class="field" id="sN" value="${esc(S.gestiona ? '' : S.ctx.perfil?.nombre || '')}" placeholder="Nombre de quien pide"></div>
      </div>
      <div><label class="label">Equipo (si el pedido es sobre un equipo)</label><div id="sEq"></div></div>
      <div class="ot-g2">
        <div><label class="label" for="sZ">Zona *</label><select class="field" id="sZ"><option value="">Elegir…</option>${SISTEMAS.map(x => `<option>${esc(x.nombre)}</option>`).join('')}</select></div>
        <div><label class="label" for="sL">Lugar *</label><input class="field" id="sL" list="sLl" placeholder="Sala, línea o instalación"><datalist id="sLl">${areas.map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
      </div>
      <div><label class="label" for="sD">¿Qué necesita? *</label><textarea class="field ot-ta" id="sD" rows="4" placeholder="Describa el problema o el trabajo que necesita"></textarea></div>
      <div><label class="label">Urgencia</label><div class="ot-tog" id="sU">${M.URGENCIAS.map((u, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-v="${u.id}" style="--c:${u.c}">${u.l}</button>`).join('')}</div>
        <div class="ot-hint" style="margin-top:6px">Emergencia: detiene la producción o pone en riesgo la inocuidad o la seguridad.</div></div>
    </div>`,
    pie: `<button class="btn" data-no>Cancelar</button><button class="btn btn-primary" data-si>Enviar solicitud</button>`
  });
  let eq = null;
  buscadorEquipos(m.$('#sEq'), S.eq, (e) => {
    eq = e;
    if (e) { const z = sistemaPorId(e.sistema); if (z) m.$('#sZ').value = z.nombre; if (e.ubicacion) m.$('#sL').value = e.ubicacion; }
  });
  m.$$('#sU button').forEach(b => b.onclick = () => m.$$('#sU button').forEach(x => x.classList.toggle('on', x === b)));
  m.$('[data-no]').onclick = m.cerrar;
  m.$('[data-si]').onclick = async () => {
    const sol = {
      fecha: M.ahoraLocal(), areaSolicitante: m.$('#sA').value, solicitante: m.$('#sN').value.trim(),
      zona: m.$('#sZ').value, sistema: SISTEMAS.find(x => x.nombre === m.$('#sZ').value)?.id ?? null, areaTrabajo: m.$('#sL').value.trim(),
      equipoId: eq?.id || null, equipoCod: eq?.codigo || '', equipoDesc: eq?.descripcion || '',
      descripcion: m.$('#sD').value.trim(), urgencia: m.$('#sU .on').dataset.v
    };
    const falta = !sol.areaSolicitante ? 'el área' : !sol.solicitante ? 'el nombre del solicitante' : !sol.zona ? 'la zona' : !sol.areaTrabajo ? 'el lugar' : !sol.descripcion ? 'qué necesita' : '';
    if (falta) return S.ctx.toast(`Falta ${falta}.`, 'err');
    m.$('[data-si]').disabled = true;
    try {
      try { localStorage.setItem('ot-area-sol', sol.areaSolicitante); } catch { }
      const r = await S.api.crearSolicitud(sol, S.ctx.user.uid);
      S.ctx.toast(`${r.numero} enviada a Mantenimiento.`); m.cerrar();
    } catch (e) { S.ctx.toast(e.message || 'No se pudo enviar.', 'err'); m.$('[data-si]').disabled = false; }
  };
}
