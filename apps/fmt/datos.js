// Acceso a datos del aplicativo Registro de formatos (Firestore: datos/fmt/...).
//   datos/fmt/config/general                         configuración (versión del manual, prefijo, encabezado, turnos, equipos)
//   datos/fmt/plantillas/{id}                        plantilla: codigo, sistema, estado, def (vigente), trabajo (en edición), historial
//   datos/fmt/plantillas/{id}/revisiones/{revId}     copia congelada de cada revisión emitida
//   datos/fmt/registros/{id}                         registro lleno (valores, firmas, estado, historial)
//   datos/fmt/registros/{id}/fotos/{campoId}         foto comprimida de un campo
//   datos/fmt/pendientes/{id}                        formato por llenar generado por otro (p. ej. R-002 desde R-001)
//   datos/fmt/contadores/{codigo}-{año}              correlativo de números de registro

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, query, where, runTransaction, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from '../../core/core.js';
import { CONFIG_BASE, clonar, mesClave } from './modelo.js';

const APP = 'fmt';
const refConfig = () => doc(db, 'datos', APP, 'config', 'general');
const colPlantillas = () => collection(db, 'datos', APP, 'plantillas');
const refPlantilla = (id) => doc(db, 'datos', APP, 'plantillas', id);
const colRevisiones = (id) => collection(db, 'datos', APP, 'plantillas', id, 'revisiones');
const idRevision = (version, revision) => `v${version}-r${revision}`;
const limpio = (o) => JSON.parse(JSON.stringify(o));

export async function cargarConfig() {
  const s = await getDoc(refConfig());
  return { ...clonar(CONFIG_BASE), ...(s.exists() ? s.data() : {}), existe: s.exists() };
}

export async function guardarConfig(cfg) {
  const { existe, actualizado, ...datos } = cfg;
  await setDoc(refConfig(), { ...limpio(datos), actualizado: serverTimestamp() });
}

export async function listarPlantillas() {
  const s = await getDocs(colPlantillas());
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function crearPlantilla({ codigo, sistema, trabajo }, usuario) {
  const ref = doc(colPlantillas());
  const p = {
    codigo, sistema, estado: 'borrador', def: null, trabajo: limpio(trabajo),
    versionManual: null, prefijo: null, revision: 0, fecha: null, historial: [],
    creado: serverTimestamp(), actualizado: serverTimestamp(), actualizadoPor: usuario
  };
  await setDoc(ref, p);
  return ref.id;
}

export async function guardarTrabajo(id, cambios, usuario) {
  await updateDoc(refPlantilla(id), { ...limpio(cambios), actualizado: serverTimestamp(), actualizadoPor: usuario });
}

export async function eliminarPlantilla(id) {
  await deleteDoc(refPlantilla(id));
}

// Emite la definición en edición como nueva revisión (o como emisión inicial).
// Devuelve los campos actualizados de la plantilla.
export async function emitir(p, cfg, { motivo, usuario }) {
  const def = limpio(p.trabajo || p.def);
  const tipo = p.estado === 'borrador' ? 'emision' : p.estado === 'obsoleto' ? 'reactivacion' : 'revision';
  const version = cfg.versionManual;
  // si cambió la versión del manual desde la última emisión, la revisión vuelve a 1
  const revision = p.estado === 'borrador' || p.versionManual !== version ? 1 : (p.revision || 0) + 1;
  const fecha = mesClave();
  const ahora = new Date().toISOString();
  const entrada = { tipo, version, revision, fecha, fechaHora: ahora, motivo, usuario };
  const cambios = {
    estado: 'vigente', def, trabajo: null, versionManual: version, prefijo: cfg.prefijo,
    revision, fecha, historial: [...(p.historial || []), entrada]
  };
  const b = writeBatch(db);
  b.update(refPlantilla(p.id), { ...cambios, actualizado: serverTimestamp(), actualizadoPor: usuario });
  b.set(doc(colRevisiones(p.id), idRevision(version, revision)), {
    codigo: p.codigo, prefijo: cfg.prefijo, version, revision, fecha, def, tipo, motivo, usuario, fechaHora: ahora
  });
  await b.commit();
  return cambios;
}

export async function marcarObsoleto(p, { motivo, usuario }) {
  const entrada = { tipo: 'obsoleto', version: p.versionManual, revision: p.revision, fecha: mesClave(), fechaHora: new Date().toISOString(), motivo, usuario };
  const cambios = { estado: 'obsoleto', historial: [...(p.historial || []), entrada] };
  await updateDoc(refPlantilla(p.id), { ...cambios, actualizado: serverTimestamp(), actualizadoPor: usuario });
  return cambios;
}

// Aplica una nueva versión del manual a todos los formatos vigentes: revisión 1.0 y fecha del mes.
export async function aplicarVersion(plantillas, cfg, { version, motivo, usuario }) {
  const vigentes = plantillas.filter(p => p.estado === 'vigente');
  const fecha = mesClave();
  const ahora = new Date().toISOString();
  const res = {};
  for (let i = 0; i < vigentes.length; i += 200) {
    const b = writeBatch(db);
    for (const p of vigentes.slice(i, i + 200)) {
      const entrada = { tipo: 'version', version, revision: 1, fecha, fechaHora: ahora, motivo, usuario };
      const cambios = { versionManual: version, prefijo: cfg.prefijo, revision: 1, fecha, historial: [...(p.historial || []), entrada] };
      b.update(refPlantilla(p.id), { ...cambios, actualizado: serverTimestamp(), actualizadoPor: usuario });
      b.set(doc(colRevisiones(p.id), idRevision(version, 1)), {
        codigo: p.codigo, prefijo: cfg.prefijo, version, revision: 1, fecha, def: limpio(p.def), tipo: 'version', motivo, usuario, fechaHora: ahora
      });
      res[p.id] = cambios;
    }
    await b.commit();
  }
  await setDoc(refConfig(), { versionManual: version, actualizado: serverTimestamp() }, { merge: true });
  return res;
}

export async function leerRevision(id, version, revision) {
  const s = await getDoc(doc(colRevisiones(id), idRevision(version, revision)));
  return s.exists() ? s.data() : null;
}

// =====================================================================
// REGISTROS
// =====================================================================
const colRegistros = () => collection(db, 'datos', APP, 'registros');
const refRegistro = (id) => doc(db, 'datos', APP, 'registros', id);
const colFotos = (id) => collection(db, 'datos', APP, 'registros', id, 'fotos');
const colPendientes = () => collection(db, 'datos', APP, 'pendientes');
export const nuevoIdRegistro = () => doc(colRegistros()).id;

const lista = (s) => s.docs.map(d => ({ id: d.id, ...d.data() }));

export async function registrosDesde(fechaOp) {
  return lista(await getDocs(query(colRegistros(), where('fechaOp', '>=', fechaOp))));
}
export async function registrosEntre(desde, hasta) {
  return lista(await getDocs(query(colRegistros(), where('fechaOp', '>=', desde), where('fechaOp', '<=', hasta))));
}
export async function registrosPorEstado(estado) {
  return lista(await getDocs(query(colRegistros(), where('estado', '==', estado))));
}
export async function misObservados(uidUsuario) {
  return lista(await getDocs(query(colRegistros(), where('creadoPor', '==', uidUsuario), where('estado', '==', 'observado'))));
}
export async function registrosOrigen(id) {
  return lista(await getDocs(query(colRegistros(), where('origen.id', '==', id))));
}
export async function leerRegistro(id) {
  const s = await getDoc(refRegistro(id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export async function leerFotos(id) {
  const s = await getDocs(colFotos(id));
  const out = {};
  s.docs.forEach(d => { out[d.id] = d.data().data; });
  return out;
}
export async function pendientesAbiertos() {
  return lista(await getDocs(query(colPendientes(), where('estado', '==', 'abierto'))));
}

// Envío de un registro nuevo. Es idempotente: si el registro ya existe (reintento), solo completa lo que falte.
// paquete: { reg, fotos: { campoId: dataURL }, pendienteId, genera: [ { codigo, plantillaId, campoId, equipo } ] }
export async function enviarRegistro(paquete) {
  const { reg, fotos = {}, pendienteId, genera = [] } = paquete;
  const ref = refRegistro(reg.id);
  let numero;
  const ya = await getDoc(ref);
  if (ya.exists()) numero = ya.data().numero;
  else {
    const anio = reg.fechaOp.slice(0, 4);
    const refCont = doc(db, 'datos', APP, 'contadores', `${reg.codigo}-${anio}`);
    numero = await runTransaction(db, async (tx) => {
      const c = await tx.get(refCont);
      const n = (c.exists() ? c.data().n || 0 : 0) + 1;
      const num = `${reg.codigo}-${anio}-${String(n).padStart(5, '0')}`;
      tx.set(refCont, { n, actualizado: serverTimestamp() }, { merge: true });
      tx.set(ref, { ...limpio(reg), numero: num, recibido: serverTimestamp() });
      return num;
    });
  }
  for (const [campo, data] of Object.entries(fotos)) await setDoc(doc(colFotos(reg.id), campo), { data });
  if (pendienteId) await updateDoc(doc(colPendientes(), pendienteId), { estado: 'cerrado', registroId: reg.id, numero, cerrado: serverTimestamp() }).catch(() => {});
  for (const g of genera) {
    await setDoc(doc(colPendientes(), `${reg.id}-${g.campoId}`), {
      codigo: g.codigo, plantillaId: g.plantillaId || null, estado: 'abierto', equipo: g.equipo || null,
      origen: { id: reg.id, numero, codigo: reg.codigo, nombre: reg.nombre },
      creado: serverTimestamp(), creadoPor: reg.creadoPor, creadoPorNombre: reg.creadoPorNombre
    });
  }
  return numero;
}

// Reenvío de un registro observado, ya corregido por su autor
export async function reenviarRegistro(paquete) {
  const { reg, fotos = {} } = paquete;
  const { id, numero, creadoPor, historial, recibido, ...resto } = reg;
  await updateDoc(refRegistro(id), {
    ...limpio(resto), estado: 'enviado',
    historial: arrayUnion({ estado: 'enviado', usuario: reg.creadoPorNombre, fechaHora: new Date().toISOString(), comentario: 'Corregido y reenviado' })
  });
  for (const [campo, data] of Object.entries(fotos)) await setDoc(doc(colFotos(id), campo), { data });
}

export async function aprobarRegistro(reg, { nombre, usuario, uid: uidUsr, indiceFirma }) {
  const ahora = new Date().toISOString();
  const firmas = [...(reg.firmas || [])];
  if (indiceFirma >= 0) firmas[indiceFirma] = { nombre, usuario, uid: uidUsr, fechaHora: ahora };
  const cambios = { estado: 'aprobado', firmas, aprobadoPor: uidUsr, aprobadoPorNombre: nombre, aprobado: ahora };
  await updateDoc(refRegistro(reg.id), { ...cambios, historial: arrayUnion({ estado: 'aprobado', usuario: nombre, fechaHora: ahora }) });
  return { ...cambios, historial: [...(reg.historial || []), { estado: 'aprobado', usuario: nombre, fechaHora: ahora }] };
}

export async function observarRegistro(reg, { nombre, comentario }) {
  const ahora = new Date().toISOString();
  const cambios = { estado: 'observado', observacion: { comentario, usuario: nombre, fechaHora: ahora } };
  await updateDoc(refRegistro(reg.id), { ...cambios, historial: arrayUnion({ estado: 'observado', usuario: nombre, fechaHora: ahora, comentario }) });
  return { ...cambios, historial: [...(reg.historial || []), { estado: 'observado', usuario: nombre, fechaHora: ahora, comentario }] };
}

// Revisión de una plantilla con la que se llenó un registro (con memoria)
const cacheRev = new Map();
export async function defDeRevision(plantillaId, version, revision) {
  const k = `${plantillaId}|${version}|${revision}`;
  if (!cacheRev.has(k)) cacheRev.set(k, leerRevision(plantillaId, version, revision).catch(() => null));
  return cacheRev.get(k);
}
