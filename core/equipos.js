// Acceso de solo lectura a la base maestra de equipos (datos/eq/equipos), para cualquier aplicativo del SIM.
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';
import { norm } from './maestros.js';

export const colEquipos = () => collection(db, 'datos', 'eq', 'equipos');

export async function listarEquipos() {
  const s = await getDocs(colEquipos());
  return s.docs.map(d => ({ id: d.id, ...d.data() })).sort(ordenEquipos);
}

export const ordenEquipos = (a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), 'es', { numeric: true });

export const etiquetaEquipo = (e) => e ? [e.codigo, e.descripcion].filter(Boolean).join(' · ') : '';

// filtro: { sistema: id | '' , tipo: texto | '', ubicacion: texto | '' }
// Los equipos de baja no se incluyen.
export function filtrarEquipos(equipos, filtro = {}) {
  const tipo = norm(filtro.tipo), ubi = norm(filtro.ubicacion);
  const sis = filtro.sistema === '' || filtro.sistema == null ? null : Number(filtro.sistema);
  return equipos.filter(e => e.estado !== 'baja'
    && (sis === null || Number(e.sistema) === sis)
    && (!tipo || norm(e.tipo) === tipo)
    && (!ubi || norm(e.ubicacion) === ubi));
}

// Valores distintos (respetando la primera forma escrita) de un campo de la base
export function valoresDe(equipos, campo) {
  const m = new Map();
  equipos.forEach(e => { const v = String(e[campo] || '').trim(); if (v && !m.has(norm(v))) m.set(norm(v), v); });
  return [...m.values()].sort((a, b) => a.localeCompare(b, 'es'));
}
