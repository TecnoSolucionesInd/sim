// Cálculos de Agua de planta (funciones puras) a partir del formato R-303.
// Caudalímetros mecánicos: cada muestra trae lectura inicial y final con su hora. Todas las lecturas,
// en orden de tiempo, forman la curva del totalizador; con ella se obtiene lo producido o consumido
// entre dos momentos cualesquiera (dentro de una muestra o entre muestras).
// La producción de ósmosis tiene un solo caudalímetro para los dos módulos.
import { area, capacidad, disponibilidad, R303 } from '../../core/agua.js';

export const num = (x) => (x == null || x === '' ? NaN : Number(String(x).replace(',', '.')));
const ok = (x) => Number.isFinite(x);
const suma = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);
export const isoDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fecha = (s) => { if (!s) return NaN; const d = new Date(String(s).length <= 16 ? s + ':00' : s); return d.getTime(); };

// Momento del registro: el turno de noche que pasa la medianoche se registra con la fecha de inicio del turno
export function momento(r, turnos = []) {
  const h = String(r.hora || '00:00').slice(0, 5);
  const d = new Date(`${r.fechaOp}T${h}:00`);
  const t = turnos.find(x => x.nombre && String(x.nombre).toLowerCase() === String(r.turno || '').toLowerCase());
  if (t && t.inicio && h < t.inicio && t.inicio >= '12:00') d.setDate(d.getDate() + 1);
  return d;
}

// caudal teórico de ósmosis según los módulos que estaban produciendo durante la muestra
export const caudalEsperado = (est, P) => suma(P.modulos.filter(m => est[m.id] === 'Produciendo'), m => m.caudal);

function muestra(v, k) {
  const ti = fecha(v[k.tIni]), tf = fecha(v[k.tFin]), li = num(v[k.lIni]), lf = num(v[k.lFin]);
  const dt = (tf - ti) / 36e5, vol = lf - li;
  return { ti, tf, li, lf, dt, vol, q: ok(dt) && dt > 0 && ok(vol) && vol >= 0 ? vol / dt : NaN };
}

// Muestras ordenadas en el tiempo
export function lecturas(regs, P, turnos) {
  return regs
    .filter(r => r.codigo === 'R-303' && r.fechaOp && !['anulado', 'borrador', 'rechazado'].includes(r.estado))
    .map(r => {
      const v = r.v || {}, d = momento(r, turnos);
      const pozos = {};
      P.pozos.forEach(p => {
        const h = num(v[R303.altura(p.id)]);
        pozos[p.id] = ok(h) ? { h, vol: Math.max(0, Math.min(h, p.alto)) * area(p), pct: Math.max(0, Math.min(1, h / p.alto)) } : null;
      });
      const est = Object.fromEntries(P.modulos.map(m => [m.id, v[R303.estado(m.id)] || '']));
      const o = muestra(v, R303.medidor.o), c = muestra(v, R303.medidor.c);
      const esp = caudalEsperado(est, P);
      // el nivel se mide al cerrar la muestra
      const t = ok(o.tf) ? Math.max(o.tf, ok(c.tf) ? c.tf : 0) : d.getTime();
      return {
        id: r.id, numero: r.numero || '', t, d: new Date(t), turno: r.turno || '', usuario: r.creadoPorNombre || '',
        pozos, est, o, c, esp, ef: esp > 0 && ok(o.q) ? o.q / (esp * 1) : NaN, destino: v[R303.destino] || '',
        stock: P.pozos.every(p => pozos[p.id]) ? suma(P.pozos, p => pozos[p.id].vol) : NaN
      };
    })
    .sort((a, b) => a.t - b.t);
}

// Curva de un totalizador: todas las lecturas (inicial y final) en orden; un retroceso se toma como cambio de medidor
export function curva(L, k) {
  const pts = [];
  L.forEach(x => { const m = x[k]; if (ok(m.ti) && ok(m.li)) pts.push([m.ti, m.li]); if (ok(m.tf) && ok(m.lf)) pts.push([m.tf, m.lf]); });
  pts.sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const p of pts) { const u = out[out.length - 1]; if (u && p[0] === u[0]) continue; if (u && p[1] < u[1]) out.push([p[0], p[1], 'reinicio']); else out.push(p); }
  return out;
}
// tramos entre lecturas consecutivas del totalizador
export function tramos(pts) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [ta, la] = pts[i - 1], [tb, lb, f] = pts[i], dt = (tb - ta) / 36e5;
    if (f === 'reinicio' || !(dt > 0) || dt > 24) continue;
    out.push({ ta, tb, dt, vol: lb - la, q: (lb - la) / dt, dia: isoDia(new Date(tb)) });
  }
  return out;
}
// lectura del totalizador en un momento (interpolada); null fuera de la curva
export function lecturaEn(pts, t) {
  if (!pts.length || t < pts[0][0] || t > pts[pts.length - 1][0]) return null;
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) {
    const [ta, la] = pts[i - 1], [tb, lb, f] = pts[i];
    if (f === 'reinicio') return null;
    return tb === ta ? lb : la + (lb - la) * (t - ta) / (tb - ta);
  }
  return pts[pts.length - 1][1];
}

export function analisis(L, P) {
  const po = curva(L, 'o'), pc = curva(L, 'c');
  const To = tramos(po), Tc = tramos(pc);
  const caudalTotal = suma(P.modulos, m => m.caudal), disp = disponibilidad(P.retrolavado);
  // balance entre muestras: lo que entró − lo que salió frente al cambio de volumen en pozos
  const bal = [];
  for (let i = 1; i < L.length; i++) {
    const a = L[i - 1], b = L[i];
    const pa = lecturaEn(po, a.t), pb = lecturaEn(po, b.t), ca = lecturaEn(pc, a.t), cb = lecturaEn(pc, b.t);
    if ([pa, pb, ca, cb].some(x => x == null) || !ok(a.stock) || !ok(b.stock)) continue;
    const dt = (b.t - a.t) / 36e5; if (!(dt > 0) || dt > 24) continue;
    const prod = pb - pa, cons = cb - ca, dS = b.stock - a.stock;
    bal.push({ a, b, dt, prod, cons, dS, noCont: prod - cons - dS, dia: isoDia(b.d) });
  }
  return { po, pc, To, Tc, bal, caudalTotal, disp };
}

// Ritmos de las últimas horas (desde la última lectura)
export function ritmos(A, horas) {
  const fin = Math.max(A.To.at(-1)?.tb || 0, A.Tc.at(-1)?.tb || 0); if (!fin) return null;
  const w = (T) => T.filter(x => x.tb > fin - horas * 36e5);
  const r = (T) => { const v = w(T), dt = suma(v, x => x.dt); return dt ? suma(v, x => x.vol) / dt : NaN; };
  const prod = r(A.To), cons = r(A.Tc);
  return { prod, cons, neto: prod - cons, teo: A.caudalTotal * A.disp };
}

export function autonomia(stock, R, P) {
  const cap = suma(P.pozos, capacidad), reserva = cap * (Number(P.reservaPct) || 0) / 100;
  if (!R || !ok(R.neto) || !ok(stock)) return { horas: NaN, reserva, cap };
  if (R.neto >= 0) return { horas: Infinity, reserva, cap, llenado: R.neto > 0 ? Math.max(0, cap - stock) / R.neto : Infinity };
  return { horas: Math.max(0, (stock - reserva) / -R.neto), reserva, cap };
}

// Resumen por día (lo producido y consumido según los totalizadores)
export function porDia(A, L, P) {
  const m = new Map(), get = (d) => m.get(d) || m.set(d, { dia: d, prod: 0, dtP: 0, cons: 0, dtC: 0, noCont: 0, muestras: [] }).get(d);
  A.To.forEach(x => { const d = get(x.dia); d.prod += x.vol; d.dtP += x.dt; });
  A.Tc.forEach(x => { const d = get(x.dia); d.cons += x.vol; d.dtC += x.dt; });
  A.bal.forEach(x => { get(x.dia).noCont += x.noCont; });
  L.forEach(x => { if (ok(x.ef)) get(isoDia(x.d)).muestras.push(x.ef); });
  return [...m.values()].map(d => ({ ...d, teo: A.caudalTotal * A.disp * d.dtP, ef: d.dtP ? d.prod / (A.caudalTotal * A.disp * d.dtP) : NaN,
    efMuestras: d.muestras.length ? suma(d.muestras) / d.muestras.length : NaN, completo: d.dtP >= 22 })).sort((a, b) => a.dia.localeCompare(b.dia));
}

const hm = (t) => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export function alarmas(L, A, aut, P) {
  const out = [], umbral = (Number(P.umbral) || 85) / 100;
  // muestras con caudal de ósmosis bajo (seguidas → un solo evento)
  let ev = null;
  const cerrar = () => { if (!ev) return; const ef = ev.q / ev.esp;
    out.push({ nivel: ef < umbral - 0.2 ? 'bad' : 'warn', t: ev.hasta, tipo: 'Producción de ósmosis baja',
      texto: `${ev.n > 1 ? `${ev.n} muestras entre ${hm(ev.desde)} y ${hm(ev.hasta)}` : `Muestra de ${hm(ev.hasta)}`}: caudal medido ${(Math.round(ev.q / ev.n * 10) / 10)} m³/h frente a ${Math.round(ev.esp / ev.n * 10) / 10} m³/h esperados (${Math.round(ef * 100)} %). Uno de los módulos no está produciendo bien: revisar en campo OI-01 y OI-02.` });
    ev = null; };
  L.forEach(x => { if (ok(x.ef) && x.ef < umbral) { if (!ev) ev = { desde: x.t, hasta: x.t, q: 0, esp: 0, n: 0 }; ev.hasta = x.t; ev.q += x.o.q; ev.esp += x.esp; ev.n++; } else if (ok(x.ef)) cerrar(); });
  cerrar();
  const u = L[L.length - 1];
  if (u) {
    P.modulos.forEach(m => { if (u.est[m.id] === 'Parado') out.push({ nivel: 'bad', t: u.t, tipo: 'Módulo parado', texto: `${m.nombre} registrado como parado en la última muestra.` }); });
    if (ok(u.o.dt) && u.o.dt < 0.25) out.push({ nivel: 'warn', t: u.t, tipo: 'Muestra muy corta', texto: `La última muestra de ósmosis duró ${Math.round(u.o.dt * 60)} min: con caudalímetro mecánico conviene al menos 30 min para un caudal confiable.` });
  }
  if (ok(aut.horas) && aut.horas < (Number(P.alertaHoras) || 24)) out.push({ nivel: aut.horas < (Number(P.criticoHoras) || 12) ? 'bad' : 'warn', t: u?.t, tipo: 'Programar cisternas',
    texto: `Con el consumo de las últimas 24 h, los pozos llegan a la reserva mínima en ${Math.round(aut.horas)} h.` });
  A.bal.slice(-12).forEach(x => { if (Math.abs(x.noCont) > Math.max(6, x.dt * 4)) out.push({ nivel: 'warn', t: x.b.t, tipo: 'Balance no cuadra',
    texto: x.noCont > 0 ? `${Math.round(x.noCont)} m³ entraron y no se reflejan en el nivel ni en el consumo: revisar reboses (pozos llenos), fugas o lecturas.`
      : `El nivel subió ${Math.round(-x.noCont)} m³ más de lo que entró: revisar las lecturas de altura o de los caudalímetros.` }); });
  const ord = { bad: 0, warn: 1 };
  return out.sort((a, b) => ord[a.nivel] - ord[b.nivel] || b.t - a.t);
}
