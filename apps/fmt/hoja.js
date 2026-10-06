// Renderizador de la hoja del formato (vista previa e impresión).
// renderHoja(datos) devuelve el HTML de una hoja A4 con el encabezado de control documental.

import { esc, rangoTxt, revTxt, mesAbrev, codigoCompleto } from './modelo.js';

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
`;

const caja = (t) => `<span><i class="hj-b"></i>${esc(t)}</span>`;

function campoHtml(cf, def) {
  const req = cf.requerido ? '<sup> *</sup>' : '';
  const lab = `<label>${esc(cf.etiqueta || 'Campo sin nombre')}${req}</label>`;
  const ay = cf.ayuda ? `<div class="hj-ay">${esc(cf.ayuda)}</div>` : '';
  let cuerpo;
  switch (cf.tipo) {
    case 'textoLargo': cuerpo = '<div class="hj-ln alto"></div>'; break;
    case 'numero': {
      const r = rangoTxt(cf);
      cuerpo = `<div class="hj-ln"><span></span><span>${esc(cf.unidad || '')}${r ? ` · Rango ${esc(r)}` : ''}</span></div>`;
      break;
    }
    case 'seleccion': cuerpo = `<div class="hj-ops">${(cf.opciones || []).map(caja).join('')}</div>`; break;
    case 'siNo': cuerpo = `<div class="hj-ops">${caja('Sí')}${caja('No')}</div>`; break;
    case 'conforme': cuerpo = `<div class="hj-ops">${caja('Conforme')}${caja('No conforme')}${caja('N.A.')}</div>`; break;
    case 'fecha': cuerpo = '<div class="hj-ln"><span></span><span>dd/mm/aaaa</span></div>'; break;
    case 'hora': cuerpo = '<div class="hj-ln"><span></span><span>hh:mm</span></div>'; break;
    case 'fechaHora': cuerpo = '<div class="hj-ln"><span></span><span>dd/mm/aaaa · hh:mm</span></div>'; break;
    case 'duracion': cuerpo = '<div class="hj-ln"><span></span><span>h:mm</span></div>'; break;
    case 'equipo': cuerpo = '<div class="hj-ln"><span></span><span>Código · descripción</span></div>'; break;
    case 'foto': cuerpo = '<div class="hj-foto">Foto adjunta en el sistema</div>'; break;
    default: cuerpo = '<div class="hj-ln"></div>';
  }
  return lab + cuerpo + ay;
}

function seccionHtml(s, def, cols) {
  const tit = `<div class="hj-sech">${esc(s.titulo || 'Sección')}</div>`;
  if (s.tipo === 'campos') {
    if (!s.campos.length) return `<div class="hj-sec">${tit}<div class="hj-vacio">Sin campos</div></div>`;
    const n = [2, 3].includes(Number(s.columnas)) ? Number(s.columnas) : cols;
    return `<div class="hj-sec">${tit}<div class="hj-grid" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${
      s.campos.map(cf => `<div class="hj-f" style="${cf.ancho === 2 ? 'grid-column:1/-1' : ''}">${campoHtml(cf, def)}</div>`).join('')
    }</div></div>`;
  }
  if (s.tipo === 'tabla') {
    const w = Math.max(10, Math.min(24, Math.floor(70 / Math.max(1, s.columnas.length))));
    return `<div class="hj-sec">${tit}<table class="hj-t">
      <thead><tr><th class="l" style="width:${s.columnas.length > 4 ? 26 : 30}%">Parámetro</th><th style="width:8%">Unidad</th><th style="width:11%">Rango</th>${s.columnas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${s.filas.length ? s.filas.map(fl => `<tr>
        <td class="l">${esc(fl.etiqueta || 'Parámetro')}${fl.tipo === 'seleccion' && fl.opciones.length ? `<small>${fl.opciones.map(esc).join(' / ')}</small>` : ''}</td>
        <td class="c">${esc(fl.unidad || '')}</td><td class="r">${esc(fl.tipo === 'numero' ? rangoTxt(fl) : '')}</td>
        ${s.columnas.map(() => '<td></td>').join('')}</tr>`).join('')
        : `<tr><td colspan="${3 + s.columnas.length}" class="c">Sin parámetros</td></tr>`}</tbody></table></div>`;
  }
  if (s.tipo === 'checklist') {
    return `<div class="hj-sec">${tit}<table class="hj-t">
      <thead><tr><th style="width:6%">N°</th><th class="l">Ítem de verificación</th><th style="width:7%">C</th><th style="width:7%">NC</th><th style="width:7%">N.A.</th><th style="width:27%">Observación</th></tr></thead>
      <tbody>${s.items.length ? s.items.map((x, i) => `<tr><td class="c">${i + 1}</td><td class="l">${esc(x.texto || 'Ítem')}</td><td class="c"><i class="hj-b"></i></td><td class="c"><i class="hj-b"></i></td><td class="c"><i class="hj-b"></i></td><td></td></tr>`).join('')
        : '<tr><td colspan="6" class="c">Sin ítems</td></tr>'}</tbody></table></div>`;
  }
  if (s.tipo === 'lista') {
    const n = Math.max(1, Math.min(20, Number(s.filasImpresas) || 5));
    return `<div class="hj-sec">${tit}<table class="hj-t">
      <thead><tr><th style="width:6%">N°</th>${s.columnas.map(c => `<th class="${c.tipo === 'texto' ? 'l' : ''}" style="${c.tipo === 'numero' ? 'width:14%' : ''}">${esc(c.nombre || 'Columna')}</th>`).join('')}</tr></thead>
      <tbody>${Array.from({ length: n }, (_, i) => `<tr><td class="c">${i + 1}</td>${s.columnas.map(() => '<td></td>').join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  return '';
}

/**
 * datos: { cfg, codigo, def, version, revision, fecha, marca }
 *  - version/revision/fecha: valores del encabezado (revision numérica; fecha 'aaaa-mm')
 *  - marca: texto de marca de agua (p. ej. 'BORRADOR') o vacío
 */
export function renderHoja({ cfg, codigo, def, version, revision, fecha, marca = '' }) {
  const h = def.orientacion === 'horizontal';
  const cols = h ? 3 : 2;
  const dg = def.datosGenerales || {};
  const gen = [['N° de registro', ''], ['Fecha', '']];
  if (dg.turno) gen.push(['Turno', (cfg.turnos || []).length ? `<span class="hj-ops" style="margin:0">${cfg.turnos.map(caja).join('')}</span>` : '']);
  if (dg.hora) gen.push(['Hora', '']);
  const logo = cfg.logo ? `<img src="${cfg.logo}" alt="">` : `<span>${esc(cfg.empresa || '')}</span>`;
  const firmas = def.firmas || [];
  return `<div class="hoja ${h ? 'h' : ''}">
    ${marca ? `<div class="hj-marca"><span>${esc(marca)}</span></div>` : ''}
    <div class="hj-cab">
      <div class="hj-logo">${logo}</div>
      <div class="hj-tit"><b>${esc(def.nombre || 'Formato sin nombre')}</b><small>${esc(cfg.departamento || '')}${cfg.planta ? ' · ' + esc(cfg.planta) : ''}</small></div>
      <div class="hj-cod">
        <div><span>CÓDIGO:</span><em>${esc(codigoCompleto(cfg, codigo || 'R-000'))}</em></div>
        <div><span>VERSIÓN:</span><em>${esc(version || '—')}</em></div>
        <div><span>REVISIÓN:</span><em>${esc(revTxt(revision))}</em></div>
        <div><span>FECHA:</span><em>${esc(mesAbrev(fecha))}</em></div>
      </div>
    </div>
    <div class="hj-gen" style="grid-template-columns:${gen.map(g => g[0] === 'Turno' ? '1.4fr' : '1fr').join(' ')}">
      ${gen.map(g => `<div><label>${g[0]}:</label>${g[1] || '<i></i>'}</div>`).join('')}
    </div>
    ${(def.secciones || []).map(s => seccionHtml(s, def, cols)).join('') || '<div class="hj-sec"><div class="hj-vacio">Agregue secciones al formato</div></div>'}
    ${def.observaciones ? '<div class="hj-sec"><div class="hj-sech">Observaciones / acción correctiva</div><div class="hj-obs">Obligatoria cuando un valor está fuera de rango o un ítem es no conforme.</div></div>' : ''}
    ${firmas.length ? `<div class="hj-fir" style="grid-template-columns:repeat(${firmas.length},minmax(0,1fr))">${firmas.map(f => `<div><h6>${esc(f)}</h6><p>Nombre:<i></i></p><p class="firma">Firma:</p><p style="padding-bottom:1.6mm">Fecha y hora:<i></i></p></div>`).join('')}</div>` : ''}
    <div class="hj-pie"><span>Documento controlado · ${esc(codigoCompleto(cfg, codigo || 'R-000'))} · Versión ${esc(version || '—')} · Revisión ${esc(revTxt(revision))}</span><span>${esc(cfg.empresa || '')}</span></div>
  </div>`;
}
