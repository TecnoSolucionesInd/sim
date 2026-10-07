// Renderizador de la hoja del formato (vista previa e impresión).
// renderHoja(datos) devuelve el HTML de una hoja A4 con el encabezado de control documental.

import { esc, rangoTxt, revTxt, mesAbrev, codigoCompleto, turnosDe, firmasDe, tablaDeEquipos, pideUbicacion, ESTADOS_COLUMNA } from './modelo.js';
import { columnasTabla, etiquetaCol, estadoColumna, fueraDeRango, minutosEntre, duracionTxt, fechaTxt, fechaHoraTxt } from './logica.js';

export const HOJA_CSS = `
.hoja{position:relative;box-sizing:border-box;background:#fff;color:#14202B;font-family:'IBM Plex Sans',Arial,sans-serif;font-size:9pt;line-height:1.3;padding:8mm 10mm 7mm;width:210mm;min-height:297mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;overflow:hidden}
.hoja.h{width:297mm;min-height:210mm}
.hoja *{box-sizing:border-box}
.hoja table{border-collapse:collapse;width:100%}
.hj-cab{display:grid;grid-template-columns:34mm minmax(0,1fr) 56mm;border:0.9pt solid #1E3A5C}
.hj-logo{border-right:0.9pt solid #1E3A5C;display:flex;align-items:center;justify-content:center;padding:2mm;text-align:center}
.hj-logo img{max-width:100%;max-height:17mm;object-fit:contain}
.hj-logo span{font-family:'Sora',Arial,sans-serif;font-weight:700;font-size:8pt;line-height:1.25;color:#1E3A5C}
.hj-tit{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2.5mm 4mm}
.hj-tit b{font-family:'Sora',Arial,sans-serif;font-weight:700;font-size:12pt;letter-spacing:.2pt;text-transform:uppercase;line-height:1.2}
.hj-tit small{display:block;margin-top:1.2mm;font-size:8pt;color:#4A5866}
.hj-cod{border-left:0.9pt solid #1E3A5C;font-size:8pt}
.hj-cod div{display:grid;grid-template-columns:19mm minmax(0,1fr);border-bottom:0.6pt solid #9AA8B6;min-height:5.2mm;align-items:center}
.hj-cod div:last-child{border-bottom:0}
.hj-cod span{padding:0.6mm 2mm;font-weight:600;color:#1E3A5C;background:#EEF2F6;height:100%;display:flex;align-items:center;border-right:0.6pt solid #9AA8B6}
.hj-cod em{font-style:normal;padding:0.6mm 2mm;font-family:'JetBrains Mono',monospace;font-size:7.8pt}
.hj-gen{display:grid;border:0.9pt solid #1E3A5C;border-top:0;font-size:8pt}
.hj-gen div{padding:1.4mm 2.4mm;border-right:0.6pt solid #9AA8B6;display:flex;gap:2mm;align-items:flex-end;min-height:7mm}
.hj-gen div:last-child{border-right:0}
.hj-gen label{color:#4A5866;font-weight:600;white-space:nowrap}
.hj-gen i{flex-grow:1;border-bottom:0.6pt solid #7B8896;min-height:4mm;font-style:normal}
.hj-sec{margin-top:2.6mm;break-inside:avoid-page}
.hj-sech{background:#1E3A5C;color:#fff;font-family:'Sora',Arial,sans-serif;font-weight:600;font-size:8pt;letter-spacing:.8pt;text-transform:uppercase;padding:1.4mm 2.5mm}
.hj-grid{display:grid;border:0.6pt solid #9AA8B6;border-top:0;overflow:hidden}
.hj-f{padding:1.4mm 2.5mm 1.6mm;border-right:0.6pt solid #C9D2DB;border-bottom:0.6pt solid #C9D2DB;min-width:0;margin:0 -0.6pt -0.6pt 0}
.hj-f label{display:block;font-size:7.6pt;font-weight:600;color:#33414F}
.hj-f label sup{color:#B4232C;font-size:7pt}
.hj-ln{border-bottom:0.6pt solid #7B8896;min-height:5.4mm;display:flex;align-items:flex-end;justify-content:space-between;gap:2mm;font-size:7.6pt;color:#6B7886;padding-bottom:0.5mm}
.hj-ln.alto{min-height:10.5mm;border:0.6pt solid #9AA8B6;border-radius:1mm;margin-top:1mm;align-items:flex-start;padding:1mm 1.5mm}
.hj-foto{margin-top:1mm;height:14mm;border:0.6pt dashed #9AA8B6;border-radius:1mm;display:flex;align-items:center;justify-content:center;font-size:7.4pt;color:#6B7886}
.hj-ops{display:flex;flex-wrap:wrap;gap:1mm 4mm;margin-top:1.6mm;font-size:8pt}
.hj-ops span{display:inline-flex;align-items:center;gap:1.4mm}
.hj-b{display:inline-block;width:3.2mm;height:3.2mm;border:0.7pt solid #33414F;border-radius:0.5mm;flex-shrink:0}
.hj-ay{font-size:7pt;color:#6B7886;font-style:italic;margin-top:0.8mm}
.hj-t th{background:#EEF2F6;color:#1E3A5C;font-size:7.6pt;font-weight:600;text-align:center;padding:1.3mm 1.6mm;border:0.6pt solid #9AA8B6}
.hj-t td{border:0.6pt solid #9AA8B6;padding:0.9mm 1.8mm;font-size:8pt;height:5.8mm;vertical-align:middle}
.hj-t th.l,.hj-t td.l{text-align:left}
.hj-t td.c{text-align:center;color:#4A5866}
.hj-t td.r{text-align:center;font-family:'JetBrains Mono',monospace;font-size:7.4pt;color:#4A5866;white-space:nowrap}
.hj-t td small{display:block;font-size:6.8pt;color:#6B7886}
.hj-obs{border:0.6pt solid #9AA8B6;border-top:0;min-height:12mm;padding:1.5mm 2.5mm;font-size:7.4pt;color:#6B7886}
.hj-fir{display:grid;gap:3mm;margin-top:2.8mm;break-inside:avoid-page}
.hj-fir>div{border:0.6pt solid #9AA8B6}
.hj-fir h6{margin:0;background:#EEF2F6;color:#1E3A5C;font-size:7.6pt;font-weight:600;padding:1.3mm 2.5mm;border-bottom:0.6pt solid #9AA8B6;text-transform:uppercase;letter-spacing:.4pt}
.hj-fir p{margin:0;padding:1.4mm 2.5mm 0;font-size:7.4pt;color:#4A5866;display:flex;gap:2mm;align-items:flex-end}
.hj-fir p i{flex-grow:1;border-bottom:0.6pt solid #7B8896;min-height:4mm}
.hj-fir .firma{height:10mm}
.hj-pie{display:flex;justify-content:space-between;gap:4mm;margin-top:3.5mm;padding-top:1.5mm;border-top:0.6pt solid #9AA8B6;font-size:7pt;color:#6B7886}
.hj-marca{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2}
.hj-marca span{transform:rotate(-30deg);font-family:'Sora',Arial,sans-serif;font-weight:700;font-size:64pt;letter-spacing:6pt;color:rgba(180,35,44,.10);white-space:nowrap}
.hj-vacio{border:0.6pt dashed #9AA8B6;border-top:0;padding:3mm;font-size:7.6pt;color:#8A96A3;text-align:center}
.hj-v{color:#0E1A26;font-weight:500;font-size:8.4pt}
.hj-ln.alto .hj-v{white-space:pre-wrap;font-weight:400}
.hj-b.on{background:#1E3A5C;border-color:#1E3A5C;position:relative}
.hj-b.on::after{content:"";position:absolute;left:0.95mm;top:0.25mm;width:0.9mm;height:1.8mm;border:solid #fff;border-width:0 0.5mm 0.5mm 0;transform:rotate(45deg)}
.hj-ops span.on{font-weight:600;color:#0E1A26}
.hj-al{color:#B4232C!important;font-weight:700!important}
.hj-t td.al{background:#FBE9EA;color:#B4232C;font-weight:700}
.hj-t td.na{color:#8A96A3;background:#F4F6F8;text-align:center}
.hj-t td.vv{text-align:center;font-weight:500;color:#0E1A26}
.hj-t td.est{text-align:center;font-size:7pt;font-weight:600;color:#1E3A5C;background:#F4F6F8}
.hj-t td.est.no{color:#8A5A00;background:#FFF4DC}
.hj-t th small{display:block;font-weight:400;font-size:6.6pt;color:#4A5866;margin-top:0.3mm}
.hj-foto img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.hj-foto.con{height:34mm;border-style:solid;padding:1mm;background:#fff}
.hj-obs .hj-v{white-space:pre-wrap;font-weight:400;font-size:8pt}
.hj-fir .firma{display:flex;align-items:center;gap:2mm}
.hj-fir .firma img{max-height:12mm;max-width:70%;object-fit:contain;margin:-1mm 0}
.hj-sello{display:inline-flex;flex-direction:column;border:0.6pt solid #1E3A5C;border-radius:1mm;padding:0.6mm 2mm;color:#1E3A5C;font-size:6.6pt;line-height:1.25}
.hj-sello b{font-size:7pt}
.hj-fir .pend{color:#8A96A3;font-style:italic;font-size:7pt}
.hj-pie.qr{align-items:center}
.hj-qr{display:flex;align-items:center;gap:2mm;text-align:right}
.hj-qr svg,.hj-qr img{width:17mm;height:17mm;display:block}
`;

const caja = (t, on = false) => `<span class="${on ? 'on' : ''}"><i class="hj-b ${on ? 'on' : ''}"></i>${esc(t)}</span>`;
const vv = (t, cls = '') => `<span class="hj-v ${cls}">${esc(t)}</span>`;

function campoHtml(cf, R) {
  const req = cf.requerido ? '<sup> *</sup>' : '';
  const lab = `<label>${esc(cf.etiqueta || 'Campo sin nombre')}${req}</label>`;
  const ay = cf.ayuda && !R ? `<div class="hj-ay">${esc(cf.ayuda)}</div>` : '';
  const x = R ? R.v[cf.id] : undefined;
  const hay = x != null && x !== '';
  let cuerpo;
  switch (cf.tipo) {
    case 'textoLargo': cuerpo = `<div class="hj-ln alto">${hay ? vv(x) : ''}</div>`; break;
    case 'numero': {
      const r = rangoTxt(cf);
      const al = hay && fueraDeRango(cf, x);
      cuerpo = `<div class="hj-ln"><span>${hay ? vv(String(x).replace('.', ','), al ? 'hj-al' : '') : ''}</span><span>${esc(cf.unidad || '')}${r ? ` · Rango ${esc(r)}` : ''}</span></div>`;
      break;
    }
    case 'seleccion': cuerpo = `<div class="hj-ops">${(cf.opciones || []).map(o => caja(o, x === o)).join('')}</div>`; break;
    case 'siNo': cuerpo = `<div class="hj-ops">${caja('Sí', x === 'Sí')}${caja('No', x === 'No')}</div>`; break;
    case 'conforme': cuerpo = `<div class="hj-ops">${caja('Conforme', x === 'Conforme')}${caja('No conforme', x === 'No conforme')}${caja('N.A.', x === 'N.A.')}</div>`; break;
    case 'fecha': cuerpo = `<div class="hj-ln"><span>${hay ? vv(fechaTxt(x)) : ''}</span><span>${R ? '' : 'dd/mm/aaaa'}</span></div>`; break;
    case 'hora': cuerpo = `<div class="hj-ln"><span>${hay ? vv(x) : ''}</span><span>${R ? '' : 'hh:mm'}</span></div>`; break;
    case 'fechaHora': cuerpo = `<div class="hj-ln"><span>${hay ? vv(fechaHoraTxt(x)) : ''}</span><span>${R ? '' : 'dd/mm/aaaa · hh:mm'}</span></div>`; break;
    case 'duracion': {
      const m = R ? minutosEntre(R.v[cf.desde], R.v[cf.hasta]) : null;
      cuerpo = `<div class="hj-ln"><span>${m != null ? vv(duracionTxt(m), m < 0 ? 'hj-al' : '') : ''}</span><span>${R ? '' : 'h:mm'}</span></div>`;
      break;
    }
    case 'equipo': cuerpo = `<div class="hj-ln"><span>${x && x.codigo ? vv(`${x.codigo} · ${x.descripcion || ''}`) : ''}</span><span>${R ? '' : 'Código · descripción'}</span></div>`; break;
    case 'referencia': cuerpo = `<div class="hj-ln"><span>${hay ? vv(x) : ''}</span><span>${R ? '' : 'N° de registro'}</span></div>`; break;
    case 'foto': {
      const img = R && R.fotos ? R.fotos[cf.id] : null;
      cuerpo = img ? `<div class="hj-foto con"><img src="${img}" alt=""></div>` : `<div class="hj-foto">${R ? (x ? 'Foto en el sistema' : 'Sin foto') : 'Foto adjunta en el sistema'}</div>`;
      break;
    }
    default: cuerpo = `<div class="hj-ln">${hay ? vv(x) : ''}</div>`;
  }
  return lab + cuerpo + ay;
}

function seccionHtml(s, def, cols, R, equipos) {
  const tit = `<div class="hj-sech">${esc(s.titulo || 'Sección')}</div>`;
  if (s.tipo === 'campos') {
    if (!s.campos.length) return `<div class="hj-sec">${tit}<div class="hj-vacio">Sin campos</div></div>`;
    const n = [2, 3].includes(Number(s.columnas)) ? Number(s.columnas) : cols;
    return `<div class="hj-sec">${tit}<div class="hj-grid" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${
      s.campos.map(cf => `<div class="hj-f" style="${cf.ancho === 2 ? 'grid-column:1/-1' : ''}">${campoHtml(cf, R)}</div>`).join('')
    }</div></div>`;
  }
  if (s.tipo === 'tabla') {
    let columnas;
    if (R) columnas = R.v[s.id]?.cols || [];
    else {
      columnas = columnasTabla(s, equipos || [], '');
      if (!columnas.length && tablaDeEquipos(s)) columnas = [1, 2, 3].map(i => ({ id: 'x' + i, codigo: '', descripcion: `Equipo ${i}` }));
    }
    const t = R ? (R.v[s.id] || {}) : {};
    const filas = s.filas;
    const head = columnas.map(c => `<th>${esc(c.codigo || c.descripcion)}${c.codigo && c.descripcion ? `<small>${esc(c.descripcion)}</small>` : ''}</th>`).join('');
    const filaEstado = s.estadoEquipo ? `<tr><td class="l">Estado del equipo</td><td class="c"></td><td class="r"></td>${columnas.map(c => {
      if (!R) return `<td class="c" style="font-size:6.6pt">${ESTADOS_COLUMNA.map(e => e.corto).join(' / ')}</td>`;
      const e = estadoColumna(R, s, c);
      return `<td class="est ${e !== 'operando' ? 'no' : ''}">${esc((ESTADOS_COLUMNA.find(x => x.id === e) || {}).label || '')}</td>`;
    }).join('')}</tr>` : '';
    return `<div class="hj-sec">${tit}<table class="hj-t">
      <thead><tr><th class="l" style="width:${columnas.length > 4 ? 24 : 28}%">Parámetro</th><th style="width:7%">Unidad</th><th style="width:10%">Rango</th>${head}</tr></thead>
      <tbody>${filaEstado}${filas.length ? filas.map(fl => `<tr>
        <td class="l">${esc(fl.etiqueta || 'Parámetro')}${fl.tipo === 'seleccion' && fl.opciones.length && !R ? `<small>${fl.opciones.map(esc).join(' / ')}</small>` : ''}</td>
        <td class="c">${esc(fl.unidad || '')}</td><td class="r">${esc(fl.tipo === 'numero' ? rangoTxt(fl) : '')}</td>
        ${columnas.map(c => {
          if (!R) return '<td></td>';
          if (estadoColumna(R, s, c) !== 'operando') return '<td class="na">—</td>';
          const x = t.c?.[fl.id]?.[c.id];
          if (x == null || x === '') return '<td class="na"></td>';
          const al = fl.tipo === 'numero' && fueraDeRango(fl, x);
          return `<td class="vv ${al ? 'al' : ''}">${esc(fl.tipo === 'numero' ? String(x).replace('.', ',') : x)}</td>`;
        }).join('')}</tr>`).join('')
        : `<tr><td colspan="${3 + columnas.length}" class="c">Sin parámetros</td></tr>`}</tbody></table></div>`;
  }
  if (s.tipo === 'checklist') {
    const t = R ? (R.v[s.id] || {}) : {};
    const box = (on) => `<i class="hj-b ${on ? 'on' : ''}"></i>`;
    return `<div class="hj-sec">${tit}<table class="hj-t">
      <thead><tr><th style="width:6%">N°</th><th class="l">Ítem de verificación</th><th style="width:7%">C</th><th style="width:7%">NC</th><th style="width:7%">N.A.</th><th style="width:27%">Observación</th></tr></thead>
      <tbody>${s.items.length ? s.items.map((x, i) => { const r = t[x.id] || {}; return `<tr><td class="c">${i + 1}</td><td class="l">${esc(x.texto || 'Ítem')}</td><td class="c">${box(r.r === 'C')}</td><td class="c ${r.r === 'NC' ? 'al' : ''}">${box(r.r === 'NC')}</td><td class="c">${box(r.r === 'NA')}</td><td class="l">${esc(r.obs || '')}</td></tr>`; }).join('')
        : '<tr><td colspan="6" class="c">Sin ítems</td></tr>'}</tbody></table></div>`;
  }
  if (s.tipo === 'lista') {
    const filas = R ? (R.v[s.id] || []).filter(f => s.columnas.some(c => String(f[c.id] ?? '').trim())) : [];
    const n = R ? Math.max(1, filas.length) : Math.max(1, Math.min(20, Number(s.filasImpresas) || 5));
    return `<div class="hj-sec">${tit}<table class="hj-t">
      <thead><tr><th style="width:6%">N°</th>${s.columnas.map(c => `<th class="${c.tipo === 'texto' ? 'l' : ''}" style="${c.tipo === 'numero' ? 'width:14%' : ''}">${esc(c.nombre || 'Columna')}</th>`).join('')}</tr></thead>
      <tbody>${R && !filas.length ? `<tr><td colspan="${s.columnas.length + 1}" class="na">Sin registros</td></tr>`
        : Array.from({ length: n }, (_, i) => `<tr><td class="c">${i + 1}</td>${s.columnas.map(c => `<td class="${c.tipo === 'numero' ? 'vv' : 'l'}">${esc(filas[i]?.[c.id] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  return '';
}

function firmaHtml(f, i, R) {
  const x = R ? (R.firmas || [])[i] || {} : null;
  let nombre = '', firma = '', fecha = '';
  if (R) {
    if (f.modo === 'manuscrita') {
      nombre = x.nombre || '';
      firma = x.imagen ? `<img src="${x.imagen}" alt="">` : '';
      fecha = x.fechaHora ? fechaHoraTxt(x.fechaHora) : '';
    } else if (x.nombre) {
      nombre = x.nombre;
      firma = `<span class="hj-sello"><b>Firmado electrónicamente</b><span>${esc(x.usuario || x.nombre)}</span></span>`;
      fecha = x.fechaHora ? fechaHoraTxt(x.fechaHora) : '';
    } else if (f.modo === 'aprobador') firma = '<span class="pend">Pendiente de verificación</span>';
  }
  return `<div><h6>${esc(f.nombre)}</h6>
    <p>Nombre:${nombre ? `<span class="hj-v" style="font-size:7.8pt">${esc(nombre)}</span>` : '<i></i>'}</p>
    <p class="firma">Firma:${firma}</p>
    <p style="padding-bottom:1.6mm">Fecha y hora:${fecha ? `<span class="hj-v" style="font-size:7.8pt">${esc(fecha)}</span>` : '<i></i>'}</p></div>`;
}

/**
 * datos: { cfg, codigo, def, version, revision, fecha, marca, equipos, reg, qr }
 *  - version/revision/fecha: valores del encabezado (revision numérica; fecha 'aaaa-mm')
 *  - marca: texto de marca de agua (p. ej. 'BORRADOR') o vacío
 *  - equipos: base de equipos (columnas de tablas en el formato en blanco)
 *  - reg: registro lleno { numero, fechaOp, turno, hora, ubicacion, v, observaciones, firmas, fotos } (opcional)
 *  - qr: SVG o imagen del código QR del registro (opcional)
 */
export function renderHoja({ cfg, codigo, def, version, revision, fecha, marca = '', equipos = [], reg = null, qr = '' }) {
  const R = reg ? { ...reg, v: reg.v || {} } : null;
  const h = def.orientacion === 'horizontal';
  const cols = h ? 3 : 2;
  const dg = def.datosGenerales || {};
  const tur = turnosDe(cfg).map(t => t.nombre);
  const gen = [['N° de registro', R ? (R.numero ? vv(R.numero) : '<span class="hj-v" style="color:#8A96A3;font-weight:400">Por asignar</span>') : ''], ['Fecha', R && R.fechaOp ? vv(fechaTxt(R.fechaOp)) : '']];
  if (dg.turno) gen.push(['Turno', tur.length ? `<span class="hj-ops" style="margin:0">${tur.map(t => caja(t, R && R.turno === t)).join('')}</span>` : '']);
  if (dg.hora) gen.push(['Hora', R && R.hora ? vv(R.hora) : '']);
  if (pideUbicacion(def)) gen.push(['Ubicación', R && R.ubicacion ? vv(R.ubicacion) : '']);
  const logo = cfg.logo ? `<img src="${cfg.logo}" alt="">` : `<span>${esc(cfg.empresa || '')}</span>`;
  const firmas = firmasDe(def);
  const cod = codigoCompleto(cfg, codigo || 'R-000');
  return `<div class="hoja ${h ? 'h' : ''}">
    ${marca ? `<div class="hj-marca"><span style="${marca.length > 10 ? 'font-size:46pt' : ''}">${esc(marca)}</span></div>` : ''}
    <div class="hj-cab">
      <div class="hj-logo">${logo}</div>
      <div class="hj-tit"><b>${esc(def.nombre || 'Formato sin nombre')}</b><small>${esc(cfg.departamento || '')}${cfg.planta ? ' · ' + esc(cfg.planta) : ''}</small></div>
      <div class="hj-cod">
        <div><span>CÓDIGO:</span><em>${esc(cod)}</em></div>
        <div><span>VERSIÓN:</span><em>${esc(version || '—')}</em></div>
        <div><span>REVISIÓN:</span><em>${esc(revTxt(revision))}</em></div>
        <div><span>FECHA:</span><em>${esc(mesAbrev(fecha))}</em></div>
      </div>
    </div>
    <div class="hj-gen" style="grid-template-columns:${gen.map(g => g[0] === 'Turno' ? '1.4fr' : g[0] === 'N° de registro' && R ? '1.3fr' : '1fr').join(' ')}">
      ${gen.map(g => `<div><label>${g[0]}:</label>${g[1] || '<i></i>'}</div>`).join('')}
    </div>
    ${(def.secciones || []).map(s => seccionHtml(s, def, cols, R, equipos)).join('') || '<div class="hj-sec"><div class="hj-vacio">Agregue secciones al formato</div></div>'}
    ${def.observaciones ? `<div class="hj-sec"><div class="hj-sech">Observaciones / acción correctiva</div><div class="hj-obs">${R ? (R.observaciones ? vv(R.observaciones) : '<span style="color:#8A96A3">Sin observaciones</span>') : 'Obligatoria cuando un valor está fuera de rango o un ítem es no conforme.'}</div></div>` : ''}
    ${firmas.length ? `<div class="hj-fir" style="grid-template-columns:repeat(${firmas.length},minmax(0,1fr))">${firmas.map((f, i) => firmaHtml(f, i, R)).join('')}</div>` : ''}
    <div class="hj-pie ${qr ? 'qr' : ''}"><span>Documento controlado · ${esc(cod)} · Versión ${esc(version || '—')} · Revisión ${esc(revTxt(revision))}${R && R.numero ? `<br>Registro ${esc(R.numero)} · ${esc(cfg.empresa || '')}` : ''}</span>${qr ? `<span class="hj-qr"><span>Verifique el original<br>escaneando el código</span>${qr}</span>` : `<span>${esc(cfg.empresa || '')}</span>`}</div>
  </div>`;
}
