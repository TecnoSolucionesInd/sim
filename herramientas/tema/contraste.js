// Lista los textos visibles con poco contraste contra su fondo real.
() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const mezcla = (s, d) => ({ r: s.r * s.a + d.r * (1 - s.a), g: s.g * s.a + d.g * (1 - s.a), b: s.b * s.a + d.b * (1 - s.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const fondo = (el) => { const capas = []; let e = el, img = false;
    while (e && e.nodeType === 1) { const cs = getComputedStyle(e), c = parse(cs.backgroundColor); if (cs.backgroundImage && cs.backgroundImage.includes('gradient') && e !== document.body) { img = true; const g = cs.backgroundImage.match(/rgba?\([^)]+\)/g); if (g) { const cc = parse(g[0]); if (cc && cc.a > 0) capas.push(cc); } } if (c && c.a > 0) { capas.push(c); if (c.a === 1) break; } e = e.parentElement; }
    let base = { r: 242, g: 245, b: 247, a: 1 }; for (let i = capas.length - 1; i >= 0; i--) base = mezcla(capas[i], base); return base; };
  const out = [], vistos = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode, t = n.textContent.trim(); if (t.length < 2) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE', 'OPTION'].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (el.closest('.sim-side,.sim-float')) continue;
    const bg = fondo(el), fc = parse(cs.color); if (!fc) continue; const fg = mezcla(fc, bg);
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio < 3.2) { const k = cs.color + '|' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + '|' + el.className; if (vistos.has(k)) continue; vistos.add(k); out.push(`${ratio.toFixed(1)}  "${t.slice(0, 34)}"  color ${cs.color}  fondo rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})  <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 40)}">`); } }
  return out;
}
