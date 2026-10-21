// Plan de mantenimiento — acceso a datos (Firestore)
// Estructura:
//   datos/plan/programas/{pid}                     programa de trabajo (nombre, tipo, planta, ref, desde, hasta, estado, lineaBase)
//   datos/plan/programas/{pid}/actividades/{aid}   actividad (n, nom, fase, resp, ini, fin, ini_b, fin_b, av, obs)
//   datos/plan/programas/{pid}/evidencias/{eid}    foto: metadatos + miniatura (aid, etapa, fecha, desc, w, h, thumb)
//   datos/plan/programas/{pid}/fotos/{eid}         foto en tamaño completo (data)
//   datos/plan/programas/{pid}/costos/{cid}        costo (aid, tipo, desc, prov, doc, fecha, monto, estado)
import { db } from '../../core/core.js';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const RAIZ = 'programas';
const cProg = () => collection(db, 'datos', 'plan', RAIZ);
const dProg = (pid) => doc(db, 'datos', 'plan', RAIZ, pid);
const cSub = (pid, sub) => collection(db, 'datos', 'plan', RAIZ, pid, sub);
const dSub = (pid, sub, id) => doc(db, 'datos', 'plan', RAIZ, pid, sub, id);
const lista = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const cacheFotos = new Map();

export function crearApi(usuario) {
  const firma = () => ({ act: serverTimestamp(), por: usuario });
  return {
    listarProgramas: async () => lista(await getDocs(cProg())),
    actividades: async (pid) => lista(await getDocs(cSub(pid, 'actividades'))),
    costos: async (pid) => lista(await getDocs(cSub(pid, 'costos'))),
    crearPrograma: async (p) => (await addDoc(cProg(), { ...p, creado: serverTimestamp(), ...firma() })).id,
    actualizarPrograma: (pid, patch) => updateDoc(dProg(pid), { ...patch, ...firma() }),

    escucharPrograma: (pid, cb) => onSnapshot(dProg(pid), s => cb(s.exists() ? { id: s.id, ...s.data() } : null)),
    escucharActividades: (pid, cb) => onSnapshot(cSub(pid, 'actividades'), s => cb(lista(s))),
    escucharEvidencias: (pid, cb) => onSnapshot(cSub(pid, 'evidencias'), s => cb(lista(s))),
    escucharCostos: (pid, cb) => onSnapshot(cSub(pid, 'costos'), s => cb(lista(s)), () => cb([])),

    guardarActividad: async (pid, a) => {
      const { id, ...datos } = a;
      if (id) { await setDoc(dSub(pid, 'actividades', id), { ...datos, ...firma() }, { merge: true }); return id; }
      return (await addDoc(cSub(pid, 'actividades'), { ...datos, ...firma() })).id;
    },
    eliminarActividad: (pid, aid) => deleteDoc(dSub(pid, 'actividades', aid)),
    cargarActividades: async (pid, arr) => {
      const ids = [];
      for (let i = 0; i < arr.length; i += 400) {
        const b = writeBatch(db);
        arr.slice(i, i + 400).forEach(a => { const r = doc(cSub(pid, 'actividades')); ids.push(r.id); b.set(r, { ...a, ...firma() }); });
        await b.commit();
      }
      return ids;
    },
    fijarLineaBase: async (pid, arr, fecha) => {
      for (let i = 0; i < arr.length; i += 400) {
        const b = writeBatch(db);
        arr.slice(i, i + 400).forEach(a => b.update(dSub(pid, 'actividades', a.id), { ini_b: a.ini || '', fin_b: a.fin || '' }));
        await b.commit();
      }
      await updateDoc(dProg(pid), { lineaBase: { fecha, por: usuario }, ...firma() });
    },

    guardarCosto: async (pid, c) => {
      const { id, ...datos } = c;
      if (id) { await setDoc(dSub(pid, 'costos', id), { ...datos, ...firma() }, { merge: true }); return id; }
      return (await addDoc(cSub(pid, 'costos'), { ...datos, ...firma() })).id;
    },
    eliminarCosto: (pid, cid) => deleteDoc(dSub(pid, 'costos', cid)),

    agregarEvidencia: async (pid, meta, data) => {
      const ref = doc(cSub(pid, 'evidencias'));
      await setDoc(dSub(pid, 'fotos', ref.id), { data });
      await setDoc(ref, { ...meta, creado: serverTimestamp(), por: usuario });
      cacheFotos.set(ref.id, data);
      return ref.id;
    },
    actualizarEvidencia: (pid, eid, patch) => updateDoc(dSub(pid, 'evidencias', eid), patch),
    eliminarEvidencia: async (pid, eid) => {
      await deleteDoc(dSub(pid, 'evidencias', eid));
      await deleteDoc(dSub(pid, 'fotos', eid)).catch(() => {});
      cacheFotos.delete(eid);
    },
    foto: async (pid, eid) => {
      if (cacheFotos.has(eid)) return cacheFotos.get(eid);
      const s = await getDoc(dSub(pid, 'fotos', eid));
      const d = s.exists() ? s.data().data : null;
      if (d) cacheFotos.set(eid, d);
      return d;
    },

    // Copia única de la versión anterior (datos/plan/paradas) a programas, con los mismos IDs
    migrarAnterior: async () => {
      let old;
      try { old = await getDocs(collection(db, 'datos', 'plan', 'paradas')); } catch { return []; }
      const hechos = [];
      for (const d of old.docs) {
        const v = d.data(); if (v.migrado) continue;
        const pid = d.id;
        await setDoc(dProg(pid), { ...v, tipo: v.tipo || 'parada' });
        for (const sub of ['actividades', 'evidencias', 'fotos']) {
          const s = await getDocs(collection(db, 'datos', 'plan', 'paradas', pid, sub));
          for (const x of s.docs) await setDoc(dSub(pid, sub, x.id), x.data());
        }
        await updateDoc(doc(db, 'datos', 'plan', 'paradas', pid), { migrado: true });
        hechos.push(pid);
      }
      return hechos;
    }
  };
}
