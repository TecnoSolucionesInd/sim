// Acceso a datos del aplicativo Registro de formatos (Firestore: datos/fmt/...).
//   datos/fmt/config/general                         configuración (versión del manual, prefijo, encabezado, turnos, equipos)
//   datos/fmt/plantillas/{id}                        plantilla: codigo, sistema, estado, def (vigente), trabajo (en edición), historial
//   datos/fmt/plantillas/{id}/revisiones/{revId}     copia congelada de cada revisión emitida

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
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
