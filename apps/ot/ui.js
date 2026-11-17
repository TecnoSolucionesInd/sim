// Órdenes de trabajo — utilidades de interfaz
import { estDe, prioDe, critDe, origenDe, espDe, retrasada } from './modelo.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const I = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
export const IC = {
  mas: I('M12 5v14M5 12h14'), x: I('M18 6L6 18M6 6l12 12'), play: I('M7 4v16l13-8z'), stop: I('M6 6h12v12H6z'),
  ok: I('M20 6L9 17l-5-5'), pausa: I('M8 5v14M16 5v14'), cal: I('M4 6h16v14H4zM4 10h16M9 3v4M15 3v4'),
  user: I('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'), eq: I('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'),
  reloj: I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2'), foto: I('M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'),
  buscar: I('M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3'), edit: I('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'),
  atras: I('M15 18l-6-6 6-6'), alerta: I('M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z')
};

export const pillEstado = (ot) => {
  const e = estDe(ot.estado), r = retrasada(ot);
  return `<span class="ot-pill" style="--c:${e.c}">${esc(e.l)}</span>${r ? `<span class="ot-pill ot-late" style="--c:#B91C1C">Retrasada</span>` : ''}`;
};
export const tagPrio = (id) => { const p = prioDe(id); return `<span class="ot-prio" style="--c:${p.c}" title="${esc(p.l)}">${esc(p.corto)}</span>`; };
export const tagCrit = (id) => { const c = critDe(id); return `<span class="ot-crit" style="--c:${c.c}">${esc(c.l)}</span>`; };
export const tagOrigen = (id) => { const o = origenDe(id); return `<span class="ot-ori" style="--c:${o.c}">${esc(o.l)}</span>`; };
export const tagEsp = (id) => { const e = espDe(id); return `<span class="ot-esp" style="--c:${e.c}">${esc(e.l)}</span>`; };

// Ventana modal; en celular ocupa toda la pantalla
export function modal({ titulo, sub = '', cuerpo, pie = '', ancho = 760 }) {
  const bg = document.createElement('div');
  bg.className = 'ot-mbg';
  bg.innerHTML = `<div class="ot-modal" role="dialog" aria-modal="true" style="max-width:${ancho}px">
    <div class="ot-mh"><div style="min-width:0"><h2>${titulo}</h2>${sub ? `<div class="ot-msub">${sub}</div>` : ''}</div>
      <button class="btn btn-icon ot-x" aria-label="Cerrar">${IC.x}</button></div>
    <div class="ot-mb">${cuerpo}</div>
    ${pie ? `<div class="ot-mf">${pie}</div>` : ''}
  </div>`;
  document.body.appendChild(bg);
  document.body.classList.add('ot-sin-scroll');
  const cerrar = () => { bg.remove(); if (!document.querySelector('.ot-mbg')) document.body.classList.remove('ot-sin-scroll'); };
  bg.querySelector('.ot-x').onclick = cerrar;
  bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  return { el: bg, $: (s) => bg.querySelector(s), $$: (s) => [...bg.querySelectorAll(s)], cerrar };
}

// Confirmación dentro de la página (sin cuadros del navegador)
export function confirmar({ titulo, texto, si = 'Confirmar', peligro = false, campo = null }) {
  return new Promise((res) => {
    const m = modal({
      titulo: esc(titulo), ancho: 480,
      cuerpo: `<p style="margin:0 0 ${campo ? 14 : 0}px;line-height:1.55;color:var(--tx-2)">${texto}</p>${campo || ''}`,
      pie: `<button class="btn" data-no>Cancelar</button><button class="btn ${peligro ? 'btn-danger' : 'btn-primary'}" data-si>${esc(si)}</button>`
    });
    const fin = (v) => { m.cerrar(); res(v); };
    m.$('[data-no]').onclick = () => fin(null);
    m.$('.ot-x').onclick = () => fin(null);
    m.$('[data-si]').onclick = () => {
      const inp = m.$('[data-campo]');
      if (inp && inp.required && !inp.value.trim()) { inp.focus(); inp.classList.add('ot-err'); return; }
      fin(inp ? inp.value.trim() : true);
    };
  });
}

// Buscador de equipos (código, descripción, ubicación)
export function buscadorEquipos(cont, equipos, alElegir, inicial = null) {
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  cont.innerHTML = `<div class="ot-bus"><span class="ot-bus-i">${IC.buscar}</span>
    <input class="field" type="search" placeholder="Código o nombre del equipo" autocomplete="off" value="${inicial ? esc(`${inicial.codigo} · ${inicial.descripcion}`) : ''}">
    <div class="ot-bus-r" hidden></div></div>`;
  const inp = cont.querySelector('input'), box = cont.querySelector('.ot-bus-r');
  const pintar = () => {
    const q = norm(inp.value).split(/\s+/).filter(Boolean);
    const r = equipos.filter(e => e.estado !== 'baja' && q.every(t => norm(`${e.codigo} ${e.descripcion} ${e.ubicacion} ${e.tipo}`).includes(t))).slice(0, 8);
    box.innerHTML = (r.length ? r.map(e => `<button type="button" data-id="${esc(e.id)}"><b>${esc(e.codigo)}</b><span>${esc(e.descripcion)}</span><small>${esc(e.ubicacion || '')}</small></button>`).join('')
      : '<div class="ot-bus-v">Sin coincidencias</div>') + `<button type="button" data-id="" class="ot-bus-sin">Trabajo sin equipo (zona o instalación)</button>`;
    box.hidden = false;
    box.querySelectorAll('button').forEach(b => b.onmousedown = (ev) => {
      ev.preventDefault();
      const e = equipos.find(x => x.id === b.dataset.id) || null;
      inp.value = e ? `${e.codigo} · ${e.descripcion}` : '';
      box.hidden = true; alElegir(e);
    });
  };
  inp.oninput = pintar; inp.onfocus = pintar;
  inp.onblur = () => setTimeout(() => { box.hidden = true; }, 120);
}
