// Órdenes de trabajo — Personal y Configuración
import { SISTEMAS } from '../../core/maestros.js';
import * as M from './modelo.js';
import { esc, IC, modal, confirmar } from './ui.js';

// ---------------- Personal ----------------
export function vPersonal(S) {
  const main = S.ctx.main, admin = S.admin;
  const ps = S.personas().sort((a, b) => (a.tipo === 'oper') - (b.tipo === 'oper') || a.especialidad.localeCompare(b.especialidad) || a.nombre.localeCompare(b.nombre, 'es'));
  const activos = ps.filter(p => p.activo !== false);
  const porEsp = M.ESPECIALIDADES.filter(e => e.id !== 'Tercero').map(e => ({ e, hh: activos.filter(p => p.especialidad === e.id).reduce((a, p) => a + M.hhSemana(p, S.cfg), 0), n: activos.filter(p => p.especialidad === e.id && p.tipo !== 'oper').length }));
  const total = porEsp.reduce((a, x) => a + x.hh, 0);
  main.innerHTML = `
    <div class="ot-head">
      <div><div class="eyebrow">Personal</div><h1 class="ot-h1">Técnicos y capacidad</h1>
        <div class="ot-sub">Capacidad base: ${M.nf(total, 0)} HH por semana con el personal de mantenimiento activo.</div></div>
      ${admin ? `<button class="btn btn-primary" id="bNP">${IC.mas} Agregar persona</button>` : ''}
    </div>
    <div class="ot-kpis">${porEsp.filter(x => x.n || x.hh).map(x => `<div class="ot-kpi" style="--c:${x.e.c}"><span>${esc(x.e.l)}</span><b>${M.nf(x.hh, 0)}<small> HH/sem</small></b></div>`).join('') || '<div class="ot-vacio sm" style="grid-column:1/-1">Registre al personal para calcular la capacidad.</div>'}</div>
    <div class="ot-tabla"><table class="table">
      <thead><tr><th>Nombre</th><th>Especialidad</th><th>Tipo</th><th>Grupo</th><th class="r">Turno</th><th class="r">Turnos/sem</th><th class="r">Dedicación</th><th class="r">HH/sem</th><th>Usuario</th></tr></thead>
      <tbody>${ps.map(p => `<tr data-p="${esc(p.id)}" class="${p.activo === false ? 'inact' : ''}">
        <td><b>${esc(p.nombre)}</b>${p.activo === false ? ' <small>(inactivo)</small>' : ''}</td><td>${esc(M.espDe(p.especialidad).l)}</td>
        <td>${p.tipo === 'oper' ? 'Operación' : 'Mantenimiento'}</td><td>${esc(p.grupo || '—')}</td>
        <td class="r num">${M.nf(p.horasTurno || S.cfg.horasTurno, 1)} h</td><td class="r num">${p.turnosSemana || S.cfg.turnosSemana}</td>
        <td class="r num">${p.dedicacion ?? (p.tipo === 'oper' ? 0 : 100)} %</td><td class="r num"><b>${M.nf(M.hhSemana(p, S.cfg), 0)}</b></td>
        <td>${p.email ? esc(p.email) : '<span class="ot-hint">sin vincular</span>'}</td></tr>`).join('') || '<tr><td colspan="9" class="ot-vacio">Aún no hay personal registrado.</td></tr>'}</tbody>
    </table></div>
    <p class="ot-hint" style="margin-top:12px">En las semanas que tienen rol de guardia, la capacidad sale de los días de turno del rol; en las demás, de los turnos por semana de esta tabla.</p>
    <p class="ot-hint" style="margin-top:6px">El personal de operación (congelamiento, calderos, planta de hielo, ósmosis) queda con 0 % de dedicación: puede registrar trabajos cuando la producción está baja o nula y esas horas se cuentan aparte como apoyo de operación.</p>`;
  if (admin) {
    main.querySelector('#bNP').onclick = () => fichaPersona(S, null);
    main.querySelectorAll('[data-p]').forEach(tr => { tr.style.cursor = 'pointer'; tr.onclick = () => fichaPersona(S, S.per.get(tr.dataset.p)); });
  }
}

function fichaPersona(S, p) {
  const v = p || { nombre: '', especialidad: 'Frigorista', tipo: 'mant', grupo: 'Turno 1', horasTurno: S.cfg.horasTurno, turnosSemana: S.cfg.turnosSemana, dedicacion: 100, email: '', activo: true };
  const m = modal({
    titulo: p ? 'Editar persona' : 'Agregar persona', ancho: 620,
    cuerpo: `<div class="ot-form"><div class="ot-g2">
      <div class="ot-span2"><label class="label" for="pN">Nombre completo *</label><input class="field" id="pN" value="${esc(v.nombre)}"></div>
      <div><label class="label" for="pE">Especialidad *</label><select class="field" id="pE">${M.ESPECIALIDADES.filter(e => e.id !== 'Tercero').map(e => `<option value="${esc(e.id)}" ${v.especialidad === e.id ? 'selected' : ''}>${esc(e.l)}</option>`).join('')}</select></div>
      <div><label class="label" for="pT">Tipo</label><select class="field" id="pT">${M.TIPOS_PERSONAL.map(t => `<option value="${t.id}" ${v.tipo === t.id ? 'selected' : ''}>${t.l}</option>`).join('')}</select></div>
      <div><label class="label" for="pG">Grupo</label><select class="field" id="pG">${M.GRUPOS.map(g => `<option ${v.grupo === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div><label class="label" for="pD">Dedicación a mantenimiento (%)</label><input class="field" type="number" min="0" max="100" step="5" id="pD" value="${v.dedicacion ?? 100}"></div>
      <div><label class="label" for="pH">Horas por turno</label><input class="field" type="number" min="1" max="24" step="0.5" id="pH" value="${v.horasTurno ?? 12}"></div>
      <div><label class="label" for="pS">Turnos por semana</label><input class="field" type="number" min="0" max="7" step="1" id="pS" value="${v.turnosSemana ?? 6}"></div>
      <div class="ot-span2"><label class="label" for="pM">Correo de su usuario en el SIM</label><input class="field" type="email" id="pM" value="${esc(v.email)}" placeholder="Para que vea sus trabajos en Mis trabajos"></div>
      <div class="ot-span2"><label class="label">Ausencias (vacaciones, descanso médico, permisos)</label><div id="pAus" class="ot-rows"></div>
        <button type="button" class="btn" id="pAusA">${IC.mas} Agregar ausencia</button>
        <div class="ot-hint" style="margin-top:6px">Los días de ausencia se descuentan de su capacidad en esa semana y se marcan solos al generar el rol de guardia.</div></div>
      <div class="ot-span2"><label class="check"><input type="checkbox" id="pA" ${v.activo !== false ? 'checked' : ''}> Activo</label></div>
      <div class="ot-span2 ot-hint" id="pCap"></div>
    </div></div>`,
    pie: `<button class="btn" data-no>Cancelar</button><button class="btn btn-primary" data-si>Guardar</button>`
  });
  const aus = (v.ausencias || []).map(a => ({ ...a }));
  const pintarAus = () => {
    m.$('#pAus').innerHTML = aus.map((a, i) => `<div class="ot-row ot-ausrow">
      <input class="field" type="date" data-a="${i}" data-k="desde" value="${esc(a.desde)}" aria-label="Desde">
      <input class="field" type="date" data-a="${i}" data-k="hasta" value="${esc(a.hasta)}" aria-label="Hasta">
      <select class="field" data-a="${i}" data-k="motivo">${M.MOTIVOS_AUSENCIA.map(x => `<option ${a.motivo === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <button type="button" class="btn btn-icon" data-aq="${i}" aria-label="Quitar">${IC.x}</button></div>`).join('');
    m.$$('#pAus [data-a]').forEach(x => x.onchange = () => { aus[+x.dataset.a][x.dataset.k] = x.value; });
    m.$$('#pAus [data-aq]').forEach(b => b.onclick = () => { aus.splice(+b.dataset.aq, 1); pintarAus(); });
  };
  m.$('#pAusA').onclick = () => { const h = M.ahoraLocal().slice(0, 10); aus.push({ desde: h, hasta: h, motivo: 'Vacaciones' }); pintarAus(); };
  pintarAus();
  const leer = () => ({ id: p?.id, ausencias: aus.filter(a => a.desde).map(a => ({ desde: a.desde, hasta: a.hasta && a.hasta >= a.desde ? a.hasta : a.desde, motivo: a.motivo || 'Otro' })), nombre: m.$('#pN').value.trim().replace(/\s+/g, ' '), especialidad: m.$('#pE').value, tipo: m.$('#pT').value, grupo: m.$('#pG').value,
    dedicacion: +m.$('#pD').value, horasTurno: +m.$('#pH').value, turnosSemana: +m.$('#pS').value, email: m.$('#pM').value.trim().toLowerCase(), activo: m.$('#pA').checked });
  const cap = () => { m.$('#pCap').textContent = `Capacidad: ${M.nf(M.hhSemana(leer(), S.cfg), 1)} HH por semana.`; };
  m.$$('input,select').forEach(x => x.addEventListener('input', cap));
  m.$('#pT').addEventListener('change', () => { m.$('#pD').value = m.$('#pT').value === 'oper' ? 0 : 100; cap(); });
  cap();
  m.$('[data-no]').onclick = m.cerrar;
  m.$('[data-si]').onclick = async () => {
    const x = leer();
    if (!x.nombre) return S.ctx.toast('Falta el nombre.', 'err');
    if (x.email && S.personas().some(o => o.id !== p?.id && o.email === x.email)) return S.ctx.toast('Ese correo ya está vinculado a otra persona.', 'err');
    try { await S.api.guardarPersona(x); S.ctx.toast('Persona guardada.'); m.cerrar(); }
    catch (e) { S.ctx.toast(e.message || 'No se pudo guardar.', 'err'); }
  };
}

// ---------------- Configuración ----------------
export function vConfig(S) {
  const main = S.ctx.main, c = S.cfg, admin = S.admin, dis = admin ? '' : 'disabled';
  const extra = (c.areasExtra || []).map(a => ({ ...a }));
  main.innerHTML = `
    <div class="ot-head"><div><div class="eyebrow">Configuración</div><h1 class="ot-h1">Parámetros de trabajo</h1></div>
      ${admin ? `<button class="btn btn-primary" id="bG">Guardar cambios</button>` : ''}</div>
    <div class="ot-cfg">
      <section class="glass"><h3>Plazos por prioridad</h3><p class="ot-hint">Horas desde que se registra la OT. Fijan la fecha límite y el indicador de retraso.</p>
        <div class="ot-g2">${M.PRIORIDADES.map(p => `<div><label class="label" for="c${p.id}">${p.l}</label><input class="field" type="number" min="1" step="1" id="c${p.id}" value="${c.plazos?.[p.id] ?? p.h}" ${dis}></div>`).join('')}</div></section>
      <section class="glass"><h3>Turnos</h3><p class="ot-hint">Valores por defecto para el personal nuevo; cada persona puede tener los suyos.</p>
        <div class="ot-g2"><div><label class="label" for="cH">Horas por turno</label><input class="field" type="number" min="1" max="24" step="0.5" id="cH" value="${c.horasTurno}" ${dis}></div>
        <div><label class="label" for="cS">Turnos por semana por persona</label><input class="field" type="number" min="1" max="7" id="cS" value="${c.turnosSemana}" ${dis}></div></div></section>
      <section class="glass"><h3>Áreas solicitantes</h3><p class="ot-hint">Una por línea.</p>
        <textarea class="field ot-ta" id="cAs" rows="8" ${dis}>${esc((c.areasSolicitantes || []).join('\n'))}</textarea></section>
      <section class="glass"><h3>Áreas de trabajo sin equipos</h3><p class="ot-hint">Las ubicaciones de la base de Equipos ya están incluidas (${S.ubic.length}). Agregue aquí pasillos, techos, servicios u otras zonas sin equipo.</p>
        <div id="cEx" class="ot-rows"></div>${admin ? `<button class="btn" id="cExA">${IC.mas} Agregar área</button>` : ''}</section>
      <section class="glass ot-span2c"><h3>Catálogo de materiales</h3>
        <p class="ot-hint">Al registrar materiales en una OT se buscan por código o descripción. ${admin ? 'Copie desde Excel las columnas <b>Código, Descripción y Unidad</b>, en ese orden, y péguelas aquí (o suba un CSV). Reemplaza el catálogo completo.' : ''}</p>
        <div class="ot-matres" id="cMatRes"></div>
        ${admin ? `<textarea class="field ot-ta mono" id="cMat" rows="6" placeholder="REP-00125&#9;Rodamiento 6205 2RS&#9;und&#10;LUB-00031&#9;Aceite para compresor ISO 68&#9;gal"></textarea>
        <div class="ot-add" style="margin-top:10px"><button class="btn btn-primary" id="cMatG" disabled>Reemplazar catálogo</button><label class="btn" style="cursor:pointer">Subir CSV<input type="file" accept=".csv,.txt,text/csv" id="cMatF" hidden></label><span class="ot-hint" id="cMatN"></span></div>` : ''}
      </section>
      ${admin ? `<section class="glass"><h3>Resúmenes del dashboard</h3><p class="ot-hint">El dashboard lee un resumen por mes que se actualiza solo con cada OT. Si alguna vez no cuadra con la bandeja, reconstrúyalos (lee todas las OT una vez).</p>
        <button class="btn" id="cRes">Reconstruir resúmenes</button></section>` : ''}
    </div>`;
  const pintar = () => {
    main.querySelector('#cEx').innerHTML = extra.map((a, i) => `<div class="ot-row ot-exrow"><input class="field" data-x="${i}" value="${esc(a.nombre)}" placeholder="Nombre del área" ${dis}>
      <select class="field" data-z="${i}" ${dis}><option value="">Zona…</option>${SISTEMAS.map(s => `<option value="${s.id}" ${Number(a.sistema) === s.id && a.sistema !== null && a.sistema !== '' ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select>
      ${admin ? `<button class="btn btn-icon" data-q="${i}" aria-label="Quitar">${IC.x}</button>` : ''}</div>`).join('') || '<div class="ot-hint">Ninguna por ahora.</div>';
    main.querySelectorAll('[data-x]').forEach(i => i.oninput = () => { extra[+i.dataset.x].nombre = i.value; });
    main.querySelectorAll('[data-z]').forEach(s => s.onchange = () => { extra[+s.dataset.z].sistema = s.value === '' ? null : +s.value; });
    main.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { extra.splice(+b.dataset.q, 1); pintar(); });
  };
  pintar();
  const pintarCat = () => {
    const n = (S.catalogo || []).length;
    main.querySelector('#cMatRes').innerHTML = n ? `<b>${M.nf(n, 0)}</b> materiales en el catálogo. <span class="ot-hint">Ej.: ${(S.catalogo || []).slice(0, 3).map(x => esc(M.etiquetaMat(x))).join(' · ')}</span>` : '<span class="ot-hint">Aún no hay catálogo: los materiales se escriben a mano y se sugieren los ya usados en otras OT.</span>';
  };
  pintarCat();
  if (!admin) return;
  let nuevos = [];
  const prev = () => { nuevos = M.leerCatalogo(main.querySelector('#cMat').value); main.querySelector('#cMatN').textContent = nuevos.length ? `${nuevos.length} materiales leídos${nuevos.some(x => !x.c) ? ' (algunos sin código)' : ''}.` : ''; main.querySelector('#cMatG').disabled = !nuevos.length; };
  main.querySelector('#cMat').oninput = prev;
  main.querySelector('#cMatF').onchange = async (ev) => { const f = ev.target.files[0]; if (!f) return; main.querySelector('#cMat').value = await f.text(); prev(); ev.target.value = ''; };
  main.querySelector('#cMatG').onclick = async (ev) => {
    const n = (S.catalogo || []).length;
    if (n && !(await confirmar({ titulo: 'Reemplazar catálogo', texto: `El catálogo actual (${n} materiales) se reemplaza por ${nuevos.length}. Las OT ya registradas no cambian.`, si: 'Reemplazar' }))) return;
    ev.target.disabled = true;
    const lista = nuevos;
    try { await S.api.guardarCatalogo(lista); S.catalogo = lista; main.querySelector('#cMat').value = ''; prev(); pintarCat(); S.ctx.toast(`Catálogo guardado: ${lista.length} materiales.`); }
    catch (e) { S.ctx.toast(e.message || 'No se pudo guardar el catálogo.', 'err'); ev.target.disabled = false; }
  };
  main.querySelector('#cExA').onclick = () => { extra.push({ nombre: '', sistema: null }); pintar(); };
  main.querySelector('#cRes').onclick = async (ev) => {
    ev.target.disabled = true;
    try { const r = await S.api.reconstruirResumenes(); S.ctx.toast(`Resúmenes reconstruidos: ${r.ot} OT en ${r.meses} meses. Vuelva a abrir el dashboard.`); }
    catch (e) { S.ctx.toast(e.message || 'No se pudo reconstruir.', 'err'); }
    ev.target.disabled = false;
  };
  main.querySelector('#bG').onclick = async () => {
    const n = {
      plazos: Object.fromEntries(M.PRIORIDADES.map(p => [p.id, Math.max(1, +main.querySelector('#c' + p.id).value || p.h)])),
      horasTurno: +main.querySelector('#cH').value || 12, turnosSemana: +main.querySelector('#cS').value || 6,
      areasSolicitantes: main.querySelector('#cAs').value.split('\n').map(s => s.trim()).filter(Boolean),
      areasExtra: extra.filter(a => a.nombre.trim()).map(a => ({ nombre: a.nombre.trim(), sistema: a.sistema ?? null }))
    };
    try { await S.api.guardarConfig(n); Object.assign(S.cfg, n); S.ctx.toast('Configuración guardada.'); }
    catch (e) { S.ctx.toast(e.message || 'No se pudo guardar.', 'err'); }
  };
}
