// Cálculos del inventario de insumos de ósmosis (sin acceso a datos: funciones puras).
// stock = stock inicial + entradas + ajustes − salidas (las salidas vienen de los registros R-302)
// Los consumos de químicos no se suponen: la tasa se aprende de los registros.

export const DIAS_MIN = 7;          // días de datos antes de predecir
export const VENTANA_TASA = 60;     // la tasa usa los últimos 60 días (se adapta a cambios de operación)

export const num = (x) => (x == null || x === '' ? NaN : Number(String(x).replace(',', '.')));
export const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const D = (iso) => new Date(iso + 'T12:00:00');
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const sumarDias = (f, n) => { const d = D(f); d.setDate(d.getDate() + Math.round(n)); return iso(d); };
export const sumarMeses = (f, n) => { const d = D(f); d.setMonth(d.getMonth() + n); return iso(d); };
export const dias = (a, b) => Math.round((D(b) - D(a)) / 864e5);   // b − a
export const moduloDe = (cod) => { const m = String(cod || '').match(/(\d+)\s*$/); return m ? 'OI-' + m[1].slice(-2).padStart(2, '0') : ''; };
const suma = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);

// ---------- lectura de registros ----------
// Salidas del R-302: una por fila de las listas de químicos y de cambios
export function salidasR302(regs, desde) {
  const out = [];
  for (const r of regs) {
    if (r.codigo !== 'R-302' || !r.fechaOp || r.fechaOp < desde) continue;
    if (['anulado', 'borrador', 'rechazado'].includes(r.estado)) continue;
    for (const sid of ['r302q', 'r302c']) for (const f of (r.v?.[sid] || [])) {
      const can = num(f.can);
      if (!f.ins || !(can > 0)) continue;
      out.push({ tipo: 'salida', fecha: r.fechaOp, hora: r.hora || '', nombre: f.ins, modulo: f.mod || '', cantidad: can,
        dp: num(f.dp), motivo: f.mot || '', obs: f.obs || '', numero: r.numero || '', usuario: r.creadoPorNombre || '', estado: r.estado || '' });
    }
  }
  return out.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}

// Producción de permeado del R-301: promedio diario del flujo × horas de operación del día
export function produccionR301(regs, plantillas, horasDia = 20) {
  const ids = {};
  for (const p of plantillas) {
    const def = p.def || p.trabajo; if (!def) continue;
    let flujo = null, equipo = null;
    for (const s of def.secciones || []) for (const c of s.campos || []) {
      if (c.tipo === 'equipo' && !equipo) equipo = c.id;
      if (norm(s.titulo) === 'permeado' && norm(c.etiqueta) === 'flujo') flujo = c.id;
    }
    ids[p.id] = { flujo, equipo };
  }
  const acc = {};
  for (const r of regs) {
    if (r.codigo !== 'R-301' || ['anulado', 'borrador', 'rechazado'].includes(r.estado)) continue;
    const k = ids[r.plantillaId]; if (!k || !k.flujo) continue;
    const q = num(r.v?.[k.flujo]); if (!(q > 0)) continue;
    const mod = moduloDe(r.v?.[k.equipo]); if (!mod) continue;
    (acc[r.fechaOp + '|' + mod] ||= []).push(q);
  }
  return Object.entries(acc).map(([k, v]) => { const [fecha, modulo] = k.split('|'); return { fecha, modulo, m3: suma(v) / v.length * horasDia }; });
}

// ---------- stock ----------
export function stockAl(it, movs, salidas, fecha) {
  const n = norm(it.nombre);
  return (Number(it.stockInicial) || 0)
    + suma(movs.filter(m => m.insumo === it.id && m.fecha <= fecha), m => Number(m.cantidad) || 0)
    - suma(salidas.filter(s => norm(s.nombre) === n && s.fecha <= fecha), s => s.cantidad);
}

// reparte "Ambos" entre los dos módulos
const porModulo = (s, mods) => s.modulo === 'Ambos' || !s.modulo ? Object.fromEntries(mods.map(m => [m, s.cantidad / mods.length])) : { [s.modulo]: s.cantidad };

function estadoDe(r, hoy, seg) {
  if (r.stock <= 0 && r.tipo !== 'filtrante') return 'Sin stock';
  if (r.tasa == null) return r.respaldo && !r.sal.length ? 'Respaldo' : 'Calculando';
  if (r.pedir <= hoy) return 'Pedir ya';
  if (r.pedir <= sumarDias(hoy, 7)) return 'Pedir';
  if (r.pedir <= sumarDias(hoy, 30)) return 'Atención';
  return 'OK';
}
export const NIVEL = { 'Sin stock': 'bad', 'Pedir ya': 'bad', 'Vencido': 'bad', 'Pedir': 'warn', 'Atención': 'warn', 'OK': 'ok', 'Cubierto': 'ok', 'Calculando': 'mut', 'Respaldo': 'mut' };

// ---------- análisis ----------
export function analizar({ cfg, movs, salidas, prod, hoy, periodo = 30, modulos = ['OI-01', 'OI-02'] }) {
  const ini = cfg.fechaInicio, seg = Number(cfg.seguridad) || 0;
  const desdeP = sumarDias(hoy, -(periodo - 1));
  const items = cfg.items.map(it => {
    const n = norm(it.nombre);
    const sal = salidas.filter(s => norm(s.nombre) === n);
    const mv = movs.filter(m => m.insumo === it.id);
    const entradas = suma(mv.filter(m => m.tipo === 'entrada'), m => Number(m.cantidad) || 0);
    const ajustes = suma(mv.filter(m => m.tipo === 'ajuste'), m => Number(m.cantidad) || 0);
    const consumido = suma(sal, s => s.cantidad);
    const stock = (Number(it.stockInicial) || 0) + entradas + ajustes - consumido;
    const r = { ...it, sal, entradas, ajustes, consumido, stock, tasa: null, motivo: '', patron: null, modulos: {} };

    // consumo del periodo por módulo y por día
    const serie = {}; modulos.forEach(m => serie[m] = {});
    for (const s of sal) if (s.fecha >= desdeP) for (const [m, q] of Object.entries(porModulo(s, modulos))) if (serie[m]) serie[m][s.fecha] = (serie[m][s.fecha] || 0) + q;
    r.serie = serie;
    r.periodo = suma(sal.filter(s => s.fecha >= desdeP), s => s.cantidad);

    if (it.tipo === 'quimico') {
      const fechas = [...new Set(sal.map(s => s.fecha))];
      const span = sal.length ? dias(sal[0].fecha, hoy) + 1 : 0;
      if (!sal.length) r.motivo = 'Sin registros en el R-302';
      else if (span < DIAS_MIN || fechas.length < 2) r.motivo = `Calculando: ${span} de ${DIAS_MIN} días con datos`;
      else {
        const v = Math.min(span, VENTANA_TASA), desde = sumarDias(hoy, -(v - 1));
        r.tasa = suma(sal.filter(s => s.fecha >= desde), s => s.cantidad) / v;
        const eventos = new Set(sal.map(s => s.fecha + '|' + s.hora + '|' + s.modulo)).size;
        r.patron = { cada: (dias(fechas[0], fechas[fechas.length - 1])) / (fechas.length - 1), porDosis: consumido / eventos, dosis: eventos };
      }
    } else if (it.tipo === 'cartucho') {
      let tasa = 0, alguno = false;
      for (const m of modulos) {
        const ev = {}; sal.filter(s => s.modulo === m || s.modulo === 'Ambos').forEach(s => ev[s.fecha] = (ev[s.fecha] || 0) + (s.modulo === 'Ambos' ? s.cantidad / 2 : s.cantidad));
        const f = Object.keys(ev).sort();
        const info = { ultimo: f[f.length - 1] || null, cambios: f.length };
        if (f.length >= 2) {
          info.intervalo = dias(f[0], f[f.length - 1]) / (f.length - 1);
          info.porCambio = suma(f, x => ev[x]) / f.length;
          info.proximo = sumarDias(info.ultimo, info.intervalo);
          if (info.intervalo > 0) { tasa += info.porCambio / info.intervalo; alguno = true; }
        }
        r.modulos[m] = info;
      }
      if (alguno) r.tasa = tasa; else r.motivo = 'Calculando: se necesitan 2 cambios por módulo';
    } else if (it.tipo === 'filtrante') {
      const vida = Number(it.vidaMeses) || 18;
      for (const m of modulos) {
        const regs = sal.filter(s => s.modulo === m).map(s => s.fecha);
        const ultimo = [it.ultimoCambio?.[m] || '', ...regs].filter(Boolean).sort().pop() || null;
        const proximo = ultimo ? sumarMeses(ultimo, vida) : null;
        r.modulos[m] = { ultimo, proximo, vencido: proximo ? proximo < hoy : false, dias: proximo ? dias(hoy, proximo) : null };
      }
      const prox = modulos.map(m => ({ m, ...r.modulos[m] })).filter(x => x.proximo).sort((a, b) => a.proximo.localeCompare(b.proximo));
      r.proximos = prox;
      const sig = prox[0];
      r.carga = Number(it.carga) || 0;
      if (sig) {
        r.siguiente = sig;
        r.comprar = Math.max(0, r.carga - Math.max(r.stock, 0));
        r.pedir = sumarDias(sig.proximo, -(Number(it.reposicion) || 0) - seg);
        r.estado = sig.vencido ? 'Vencido' : r.comprar === 0 ? 'Cubierto' : r.pedir <= hoy ? 'Pedir ya' : r.pedir <= sumarDias(hoy, 7) ? 'Pedir' : r.pedir <= sumarDias(hoy, 60) ? 'Atención' : 'OK';
      } else r.estado = 'Calculando';
      return r;
    }
    if (r.tasa != null && r.tasa > 0) {
      r.autonomia = Math.max(r.stock, 0) / r.tasa;
      r.agota = sumarDias(hoy, r.autonomia);
      r.pedir = sumarDias(r.agota, -(Number(it.reposicion) || 0) - seg);
    } else if (r.tasa === 0) r.tasa = null;
    r.estado = estadoDe(r, hoy, seg);
    return r;
  });

  // cloro activo: ambos hipocloritos se expresan en kg de cloro
  const cl = items.filter(x => x.cloro);
  const disp = suma(cl, x => Math.max(x.stock, 0) * x.cloro);
  const tasaCl = suma(cl.filter(x => x.tasa), x => x.tasa * x.cloro);
  const cloro = cl.length ? { disp, tasa: tasaCl || null, autonomia: tasaCl ? disp / tasaCl : null, items: cl } : null;

  // comparación entre módulos (g de químico por m³ de permeado, en el periodo)
  const m3 = Object.fromEntries(modulos.map(m => [m, suma(prod.filter(p => p.modulo === m && p.fecha >= desdeP && p.fecha <= hoy), p => p.m3)]));
  const comparacion = items.filter(x => x.tipo === 'quimico').map(x => ({
    nombre: x.nombre, id: x.id,
    kg: Object.fromEntries(modulos.map(m => [m, suma(Object.values(x.serie[m] || {}))])),
    gm3: Object.fromEntries(modulos.map(m => [m, m3[m] > 0 ? suma(Object.values(x.serie[m] || {})) * 1000 / m3[m] : null]))
  }));

  // insumos escritos en el R-302 que no están en el catálogo
  const nombres = new Set(items.map(x => norm(x.nombre)));
  const ajenos = [...new Set(salidas.filter(s => !nombres.has(norm(s.nombre))).map(s => s.nombre))];

  return { items, cloro, comparacion, m3, ajenos, desdeP, hoy, periodo };
}

// stock diario (real) desde el inicio hasta hoy
export function historiaStock(it, movs, salidas, desde, hoy) {
  const out = []; let f = desde;
  while (f <= hoy) { out.push([f, stockAl(it, movs, salidas, f)]); f = sumarDias(f, 1); }
  return out;
}

export function mediaMovil(vals, n = 7) {
  return vals.map((_, i) => { if (i < n - 1) return null; const w = vals.slice(i - n + 1, i + 1); return suma(w) / n; });
}
