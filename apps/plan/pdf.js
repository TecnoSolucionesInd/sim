// Plan de mantenimiento — informes PDF de evidencias (A4 horizontal, jsPDF)
const PC = {
  navy: [27, 41, 62], acc: [59, 180, 229], acc2: [30, 90, 168], ink: [29, 39, 51], mut: [107, 119, 133],
  line: [221, 228, 236], soft: [243, 246, 250],
  fin: [46, 196, 166], cur: [74, 163, 255], pro: [245, 181, 74], def: [139, 155, 176], atr: [255, 107, 107]
};
const ETC = { 'Antes': PC.pro, 'Durante': PC.cur, 'Después': PC.fin };
const tx = (s) => String(s ?? '').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...');
const D = (s) => { if (!s) return null; const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c); };
const fmt = (d) => d ? d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Por definir';
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const slug = (s) => tx(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').slice(0, 50);

let LOGO = null;
async function logo() {
  if (LOGO) return LOGO;
  try {
    const b = await (await fetch(new URL('./logo.png', import.meta.url))).blob();
    LOGO = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
  } catch { LOGO = null; }
  return LOGO;
}

// ctx: { parada, A, E, est, ST, hoy, foto(eid) }
function nuevoDoc() {
  if (!window.jspdf) throw new Error('No se pudo cargar el generador de PDF.');
  return new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
}
const evDe = (c, aid) => c.E.filter(e => e.aid === aid)
  .sort((a, b) => ['Antes', 'Durante', 'Después'].indexOf(a.etapa) - ['Antes', 'Durante', 'Después'].indexOf(b.etapa) || (a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : (a.ord || 0) - (b.ord || 0)));

function cabecera(doc, c, tag, titulo, sub) {
  doc.setFillColor(...PC.navy); doc.rect(0, 0, 297, 31, 'F');
  doc.setDrawColor(37, 53, 77); doc.setLineWidth(.12);
  for (let x = 0; x <= 297; x += 5) doc.line(x, 0, x, 31);
  for (let y = 0; y <= 31; y += 5) doc.line(0, y, 297, y);
  doc.setFillColor(...PC.acc); doc.rect(0, 31, 297, 1.1, 'F');
  doc.setFillColor(255, 255, 255); doc.roundedRect(10, 7.5, 55, 16, 2, 2, 'F');
  if (LOGO) { try { doc.addImage(LOGO, 'PNG', 13.5, 9.5, 48, 12); } catch {} }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...PC.acc);
  doc.text(tx(tag).toUpperCase(), 73, 12, { charSpace: .7 });
  doc.setTextColor(255, 255, 255);
  let ln = doc.setFontSize(15).splitTextToSize(tx(titulo), 150);
  if (ln.length > 1) ln = doc.setFontSize(12).splitTextToSize(tx(titulo), 150).slice(0, 2);
  doc.text(ln, 73, ln.length > 1 ? 17.5 : 19.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(190, 203, 219);
  doc.text(tx(sub), 73, ln.length > 1 ? 27.5 : 25.5);
  doc.text(doc.splitTextToSize(tx(c.parada.nombre), 70)[0], 287, 13, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); doc.setFontSize(9);
  doc.text('Corte: ' + fmt(c.hoy), 287, 19.5, { align: 'right' });
}
function pies(doc) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PC.line); doc.setLineWidth(.3); doc.line(10, 201, 287, 201);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...PC.mut);
    doc.text('Departamento de Mantenimiento · Planta Paita', 10, 206);
    doc.text(`Página ${i} de ${n}`, 287, 206, { align: 'right' });
  }
}
function datosActividad(doc, c, t, y) {
  const k = c.est(t), i = D(t.ini), f = D(t.fin);
  const F = [['N.°', String(t.n)], ['Fase', t.fase], ['Responsable', t.resp || 'Por asignar'], ['Inicio', i ? fmt(i) : 'Por definir'],
    ['Fin', f ? fmt(f) : 'Por definir'], ['Avance', (t.av || 0) + ' %'], ['Estado', c.ST[k].label]];
  const g = 2.5, w = (277 - g * (F.length - 1)) / F.length;
  F.forEach(([l, v], x) => {
    const X = 10 + x * (w + g);
    doc.setFillColor(...PC.soft); doc.setDrawColor(...PC.line); doc.setLineWidth(.25); doc.roundedRect(X, y, w, 15, 1.6, 1.6, 'FD');
    doc.setFillColor(...(l === 'Estado' ? PC[k] : PC.acc)); doc.rect(X, y + 2.5, .9, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.2); doc.setTextColor(...PC.mut); doc.text(tx(l).toUpperCase(), X + 3.5, y + 5.6, { charSpace: .3 });
    doc.setFontSize(9.5); doc.setTextColor(...(l === 'Estado' ? PC[k] : PC.ink)); doc.text(doc.splitTextToSize(tx(v), w - 5)[0], X + 3.5, y + 11.6);
  });
}
function fotos(doc, L, y0, desde) {
  const cols = 3, g = 5, w = (277 - g * (cols - 1)) / cols, h = (197 - y0 - g) / 2, ih = h - 15.5;
  L.forEach((e, x) => {
    const cc = x % cols, r = Math.floor(x / cols), X = 10 + cc * (w + g), Y = y0 + r * (h + g);
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...PC.line); doc.setLineWidth(.3); doc.roundedRect(X, Y, w, h, 2, 2, 'FD');
    doc.setFillColor(...PC.soft); doc.rect(X + 2, Y + 2, w - 4, ih, 'F');
    if (e.data && e.w && e.h) {
      const bw = w - 4, bh = ih, s = Math.min(bw / e.w, bh / e.h), iw = e.w * s, hh = e.h * s;
      try { doc.addImage(e.data, 'JPEG', X + 2 + (bw - iw) / 2, Y + 2 + (bh - hh) / 2, iw, hh, undefined, 'FAST'); } catch {}
    }
    const py = Y + ih + 4.2, col = ETC[e.etapa] || PC.acc;
    doc.setFillColor(...col); doc.roundedRect(X + 3, py, 17, 4.6, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255); doc.text(tx(e.etapa), X + 11.5, py + 3.2, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...PC.mut);
    doc.text(`Foto ${desde + x} · ${fmt(D(e.fecha))}`, X + w - 3, py + 3.2, { align: 'right' });
    doc.setFontSize(7.6); doc.setTextColor(...(e.desc ? PC.ink : PC.mut));
    doc.text(doc.splitTextToSize(tx(e.desc || 'Sin descripción'), w - 6).slice(0, 1), X + 3, py + 9.4);
  });
}
async function conFotos(c, L) {
  return Promise.all(L.map(async e => ({ ...e, data: await c.foto(e.id) })));
}
async function paginasActividad(doc, c, t, primera) {
  const L = await conFotos(c, evDe(c, t.id));
  const tag = 'Registro de evidencias fotográficas', tit = `${t.n}. ${t.nom}`, sub = 'Departamento de Mantenimiento · Planta Paita';
  if (!primera) doc.addPage();
  cabecera(doc, c, tag, tit, sub);
  datosActividad(doc, c, t, 37);
  if (!L.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...PC.mut);
    doc.text('Sin evidencias registradas para esta actividad.', 148.5, 110, { align: 'center' });
    return;
  }
  fotos(doc, L.slice(0, 6), 57, 1);
  for (let p = 6; p < L.length; p += 6) { doc.addPage(); cabecera(doc, c, tag + ' (continuación)', tit, sub); fotos(doc, L.slice(p, p + 6), 38, p + 1); }
}
function portada(doc, c) {
  const n = c.A.length, k = { fin: 0, cur: 0, pro: 0, def: 0, atr: 0 };
  c.A.forEach(t => k[c.est(t)]++);
  const av = n ? c.A.reduce((s, t) => s + (+t.av || 0), 0) / n : 0;
  cabecera(doc, c, 'Registro de evidencias fotográficas', c.parada.nombre, 'Departamento de Mantenimiento · Planta Paita');
  const K = [['Avance general', av.toFixed(0) + ' %', PC.acc], ['Finalizadas', `${k.fin} / ${n}`, PC.fin], ['En curso', String(k.cur + k.atr), PC.cur],
    ['Programadas', String(k.pro), PC.pro], ['Por definir', String(k.def), PC.def], ['Fotos registradas', String(c.E.length), PC.acc2]];
  const g = 3, w = (277 - g * 5) / 6;
  K.forEach(([l, v, cl], x) => {
    const X = 10 + x * (w + g);
    doc.setFillColor(...PC.soft); doc.setDrawColor(...PC.line); doc.setLineWidth(.25); doc.roundedRect(X, 37, w, 16, 2, 2, 'FD');
    doc.setFillColor(...cl); doc.rect(X, 39, 1.1, 12, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...PC.mut); doc.text(l.toUpperCase(), X + 4.5, 42.2, { charSpace: .3 });
    doc.setFontSize(14); doc.setTextColor(...PC.ink); doc.text(v, X + 4.5, 49.6);
  });
  const cols = [['N.°', 12], ['Actividad', 117], ['Fase', 30], ['Responsable', 30], ['Periodo', 46], ['Estado', 26], ['Fotos', 16]];
  let y = 58;
  const head = () => {
    doc.setFillColor(...PC.navy); doc.roundedRect(10, y, 277, 7.5, 1.5, 1.5, 'F');
    let X = 10; doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    cols.forEach(([l, ww]) => { doc.text(l.toUpperCase(), X + 2.5, y + 5, { charSpace: .3 }); X += ww; });
    y += 7.5;
  };
  head();
  [...c.A].sort((a, b) => a.n - b.n).forEach((t, r) => {
    if (y > 194) { doc.addPage(); cabecera(doc, c, 'Registro de evidencias fotográficas', 'Resumen de actividades (continuación)', 'Departamento de Mantenimiento · Planta Paita'); y = 38; head(); }
    const kk = c.est(t), i = D(t.ini), f = D(t.fin), nf = c.E.filter(e => e.aid === t.id).length;
    if (r % 2) { doc.setFillColor(...PC.soft); doc.rect(10, y, 277, 4.95, 'F'); }
    let X = 10;
    const v = [String(t.n), t.nom, t.fase, t.resp || 'Por asignar', i ? `${fmt(i)} - ${f ? fmt(f) : 'por definir'}` : 'Por definir', c.ST[kk].label, String(nf)];
    doc.setFontSize(7.4);
    cols.forEach(([, ww], x) => {
      const neg = x === 5 || (x === 6 && nf);
      doc.setFont('helvetica', neg ? 'bold' : 'normal');
      doc.setTextColor(...(x === 5 ? PC[kk] : x === 6 && nf ? PC.acc2 : PC.ink));
      doc.text(doc.splitTextToSize(tx(v[x]), ww - 4)[0], X + 2.5, y + 3.5); X += ww;
    });
    doc.setDrawColor(...PC.line); doc.setLineWidth(.2); doc.line(10, y + 4.95, 287, y + 4.95); y += 4.95;
  });
}

export async function pdfActividad(c, t) {
  await logo();
  const doc = nuevoDoc();
  await paginasActividad(doc, c, t, true);
  pies(doc);
  doc.save(`Evidencias_${String(t.n).padStart(2, '0')}_${slug(t.nom)}.pdf`);
}
export async function pdfCompleto(c) {
  await logo();
  const doc = nuevoDoc();
  portada(doc, c);
  for (const t of [...c.A].sort((a, b) => a.n - b.n)) {
    if (c.E.some(e => e.aid === t.id)) await paginasActividad(doc, c, t, false);
  }
  pies(doc);
  doc.save(`Evidencias_${slug(c.parada.nombre)}_${iso(c.hoy)}.pdf`);
}
