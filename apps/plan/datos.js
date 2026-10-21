// Plan de mantenimiento — acceso a datos (Firestore)
// Estructura:
//   datos/plan/paradas/{pid}                     parada (nombre, planta, desde, hasta, estado, lineaBase)
//   datos/plan/paradas/{pid}/actividades/{aid}   actividad (n, nom, fase, resp, ini, fin, ini_b, fin_b, av, obs)
//   datos/plan/paradas/{pid}/evidencias/{eid}    foto: metadatos + miniatura (aid, etapa, fecha, desc, w, h, thumb)
//   datos/plan/paradas/{pid}/fotos/{eid}         foto en tamaño completo (data)
import { db } from '../../core/core.js';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const cParadas = () => collection(db, 'datos', 'plan', 'paradas');
const dParada = (pid) => doc(db, 'datos', 'plan', 'paradas', pid);
const cSub = (pid, sub) => collection(db, 'datos', 'plan', 'paradas', pid, sub);
const dSub = (pid, sub, id) => doc(db, 'datos', 'plan', 'paradas', pid, sub, id);
const lista = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const cacheFotos = new Map();

export function crearApi(usuario) {
  const firma = () => ({ act: serverTimestamp(), por: usuario });
  return {
    listarParadas: async () => lista(await getDocs(cParadas())),
    parada: async (pid) => { const s = await getDoc(dParada(pid)); return s.exists() ? { id: s.id, ...s.data() } : null; },
    actividades: async (pid) => lista(await getDocs(cSub(pid, 'actividades'))),
    crearParada: async (p) => (await addDoc(cParadas(), { ...p, creado: serverTimestamp(), ...firma() })).id,
    actualizarParada: (pid, patch) => updateDoc(dParada(pid), { ...patch, ...firma() }),

    escucharParada: (pid, cb) => onSnapshot(dParada(pid), s => cb(s.exists() ? { id: s.id, ...s.data() } : null)),
    escucharActividades: (pid, cb) => onSnapshot(cSub(pid, 'actividades'), s => cb(lista(s))),
    escucharEvidencias: (pid, cb) => onSnapshot(cSub(pid, 'evidencias'), s => cb(lista(s))),

    guardarActividad: async (pid, a) => {
      const { id, ...datos } = a;
      if (id) { await setDoc(dSub(pid, 'actividades', id), { ...datos, ...firma() }, { merge: true }); return id; }
      return (await addDoc(cSub(pid, 'actividades'), { ...datos, ...firma() })).id;
    },
    eliminarActividad: (pid, aid) => deleteDoc(dSub(pid, 'actividades', aid)),
    cargarActividades: async (pid, arr) => {
      for (let i = 0; i < arr.length; i += 400) {
        const b = writeBatch(db);
        arr.slice(i, i + 400).forEach(a => b.set(doc(cSub(pid, 'actividades')), { ...a, ...firma() }));
        await b.commit();
      }
    },
    fijarLineaBase: async (pid, arr, fecha) => {
      for (let i = 0; i < arr.length; i += 400) {
        const b = writeBatch(db);
        arr.slice(i, i + 400).forEach(a => b.update(dSub(pid, 'actividades', a.id), { ini_b: a.ini || '', fin_b: a.fin || '' }));
        await b.commit();
      }
      await updateDoc(dParada(pid), { lineaBase: { fecha, por: usuario }, ...firma() });
    },

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
    }
  };
}
