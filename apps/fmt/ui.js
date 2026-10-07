// Utilidades de interfaz compartidas por los módulos de Registro de formatos.
import { esc } from './modelo.js';
import { HOJA_CSS } from './hoja.js';

const I = (d, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
export const IC = {
  mas: I('M12 5v14M5 12h14'), up: I('M12 19V5M6 11l6-6 6 6', 16), down: I('M12 5v14M6 13l6 6 6-6', 16),
  x: I('M6 6l12 12M18 6L6 18', 16), del: I('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', 16),
  edit: I('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4', 16), back: I('M19 12H5M11 6l-6 6 6 6'),
  print: I('M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z'), send: I('M5 12l14-7-5 15-3-6zM11 14l3-3'),
  more: I('M5 12h.01M12 12h.01M19 12h.01', 20), xls: I('M4 4h16v16H4zM4 10h16M10 4v16'),
  hist: I('M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7M3 4v4h4'), copy: I('M9 9h11v11H9zM5 15H4V4h11v1'),
  cam: I('M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'), check: I('M5 12l5 5 9-10'),
  alert: I('M12 3l10 18H2zM12 10v5M12 18h.01'), chev: I('M9 6l6 6-6 6'), clock: I('M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'),
  cloud: I('M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9zM12 11v5M9.5 13.5L12 11l2.5 2.5'),
  wifiOff: I('M2 8a15 15 0 0 1 5-3M22 8a15 15 0 0 0-9.5-4M5 12a10 10 0 0 1 3-2M19 12a10 10 0 0 0-4-2.4M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M3 3l18 18'),
  search: I('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4'), file: I('M14 3H6v18h12V7zM14 3v4h4'),
  ok: I('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6'), eye: I('M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z')
};

// Se imprime desde un iframe aislado: solo las hojas, con su tamaño de página.
export function imprimir(html, horizontal, titulo = 'Formato') {
  document.getElementById('printFrame')?.remove();
  const f = document.createElement('iframe');
  f.id = 'printFrame';
  f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  f.srcdoc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap">
    <style>@page{size:A4 ${horizontal ? 'landscape' : 'portrait'};margin:0}html,body{margin:0;background:#fff}${HOJA_CSS}.hoja{min-height:0}.hoja+.hoja{break-before:page}</style>
    </head><body>${html}<script>${AJUSTE}<\/script></body></html>`;
  f.onload = async () => {
    try {
      await Promise.race([f.contentDocument.fonts.ready, new Promise(r => setTimeout(r, 2500))]);
      await Promise.all([...f.contentDocument.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
    } catch (e) {}
    const t0 = document.title;
    document.title = titulo;
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => { document.title = t0; }, 1000); }, 120);
  };
  document.body.appendChild(f);
}

// Reduce la hoja para que quepa en una sola página A4 (hasta 72 %), compensando el ancho
const AJUSTE = `function ajustarHojas(){document.querySelectorAll('.hoja').forEach(function(h){
  var hz=h.classList.contains('h'),mm=96/25.4,alto=(hz?210:297)*mm,ancho=hz?297:210;
  h.style.zoom='';h.style.width='';
  var k=alto/h.scrollHeight;
  if(k<1){k=Math.max(0.72,k*0.995);h.style.zoom=k;h.style.width=(ancho/k)+'mm';}
});}
ajustarHojas();window.addEventListener('load',ajustarHojas);if(document.fonts)document.fonts.ready.then(ajustarHojas);`;

export function modal({ titulo, cuerpo, pie, ancho = 640 }) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<form class="modal" novalidate style="max-width:${ancho}px">
    <div class="modal-h"><div style="font-family:var(--f-display);font-weight:600;font-size:20px">${titulo}</div>
      <button type="button" class="btn btn-icon" data-x aria-label="Cerrar">${IC.x}</button></div>
    <div class="modal-b">${cuerpo}<div class="alert err" data-err style="margin-top:16px" hidden></div></div>
    <div class="modal-f">${pie}</div></form>`;
  document.body.appendChild(bg);
  const cerrar = () => bg.remove();
  bg.querySelectorAll('[data-x]').forEach(b => b.onclick = cerrar);
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) cerrar(); });
  const $ = (s) => bg.querySelector(s);
  const err = (t) => { const e = $('[data-err]'); e.hidden = !t; e.textContent = t || ''; if (t) e.scrollIntoView({ block: 'nearest' }); };
  return { bg, $, cerrar, err, form: bg.querySelector('form') };
}

export function confirmar(titulo, texto, { boton = 'Confirmar', peligro = false } = {}) {
  return new Promise((res) => {
    const m = modal({ titulo, cuerpo: `<p class="muted" style="margin:0;line-height:1.6">${texto}</p>`, pie: `<button type="button" class="btn" data-x>Cancelar</button><button type="submit" class="btn ${peligro ? 'btn-danger' : 'btn-primary'}">${boton}</button>`, ancho: 480 });
    m.bg.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => res(false)));
    m.form.onsubmit = (e) => { e.preventDefault(); m.cerrar(); res(true); };
  });
}

function cargarScript(src, global, msg) {
  if (window[global]) return Promise.resolve(window[global]);
  const k = '__carga_' + global;
  if (!window[k]) window[k] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res(window[global]);
    s.onerror = () => { window[k] = null; rej(new Error(msg)); };
    document.head.appendChild(s);
  });
  return window[k];
}
export const cargarXlsx = () => cargarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX', 'No se pudo cargar el generador de Excel.');
export const cargarQR = () => cargarScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', 'qrcode', 'No se pudo cargar el generador de QR.');

// SVG del código QR (vacío si la librería no está disponible)
export async function qrSvg(texto) {
  try {
    const qrcode = await cargarQR();
    const q = qrcode(0, 'M');
    q.addData(texto); q.make();
    return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
  } catch { return ''; }
}

// Lee una imagen y la reduce: máximo `lado` px y JPEG o PNG
export function reducirImagen(file, { ancho = 480, alto = 200, tipo = 'image/png', calidad = 0.85 } = {}) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const k = Math.min(1, ancho / img.width, alto / img.height);
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const cx = cv.getContext('2d');
        if (tipo === 'image/jpeg') { cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); }
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL(tipo, calidad));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
export const reducirFoto = (file) => reducirImagen(file, { ancho: 1280, alto: 1280, tipo: 'image/jpeg', calidad: 0.68 });

// Vista previa escalada de una hoja dentro de una caja
export function ajustarHoja(box, inner) {
  if (!box || !inner || !inner.firstElementChild) return;
  const hoja = inner.firstElementChild;
  const ancho = box.clientWidth - 28;
  if (ancho <= 0) return;
  const k = Math.min(1, ancho / hoja.offsetWidth);
  inner.style.transformOrigin = 'top left';
  inner.style.transform = `scale(${k})`;
  inner.style.width = hoja.offsetWidth + 'px';
  box.style.height = (hoja.offsetHeight * k + 28) + 'px';
}
