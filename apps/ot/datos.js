// Órdenes de trabajo — acceso a datos (Firestore)
// Estructura (solo escribe en datos/ot/…):
//   datos/ot/ordenes/{id}             orden de trabajo (ver modelo.js: campos de registro, planificación, ejecución y cierre)
//   datos/ot/ordenes/{id}/fotos/{fid} foto reducida { data }
//   datos/ot/personal/{id}            técnico u operador { nombre, especialidad, tipo, grupo, horasTurno, turnosSemana, dedicacion, email, activo }
//   datos/ot/config/general           { horasTurno, turnosSemana, plazos, areasSolicitantes, areasExtra }
//   datos/ot/solicitudes/{id}         pedido de un área usuaria { numero SOL-AA-00001, fecha, mes, areaSolicitante, solicitante,
//                                     creadoUid, zona, areaTrabajo, equipo…, descripcion, urgencia, estado, motivo, otId, otNumero }
//   datos/ot/contadores/{OT-AA|SOL-AA} correlativo anual { n }
// Lee (sin escribir): datos/eq/equipos, datos/eq/config/ubicaciones y datos/plan/pmp_tareas.
// Escribe fuera de datos/ot una sola cosa: ejec.<semana> de una tarea del PMP cuando su OT se cierra.
import { db } from '../../core/core.js';
import { listarEquipos } from '../../core/equipos.js';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, query, where,
  runTransaction, serverTimestamp, arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { CONFIG_BASE, camposBusqueda, ahoraLocal } from './modelo.js';

const APP = 'ot';
const colOrd = () => collection(db, 'datos', APP, 'ordenes');
const docOrd = (id) => doc(db, 'datos', APP, 'ordenes', id);
const colFotos = (id) => collection(db, 'datos', APP, 'ordenes', id, 'fotos');
const colPer = () => collection(db, 'datos', APP, 'personal');
const refCfg = () => doc(db, 'datos', APP, 'config', 'general');
const colSol = () => collection(db, 'datos', APP, 'solicitudes');
const colPMP = () => collection(db, 'datos', 'plan', 'pmp_tareas');
const lista = (s) => s.docs.map(d => ({ id: d.id, ...d.data() }));

// Correlativo anual dentro de una transacción (OT-26-00001, SOL-26-00001)
async function conNumero(prefijo, fecha, ref, datos) {
  const anio = String(fecha || ahoraLocal()).slice(2, 4);
  const refCont = doc(db, 'datos', APP, 'contadores', `${prefijo}-${anio}`);
  return runTransaction(db, async (tx) => {
    const c = await tx.get(refCont);
    const n = (c.exists() ? c.data().n || 0 : 0) + 1;
    const num = `${prefijo}-${anio}-${String(n).padStart(5, '0')}`;
    tx.set(refCont, { n, actualizado: serverTimestamp() }, { merge: true });
    tx.set(ref, datos(num));
    return num;
  });
}

// Firestore no acepta undefined: se limpia antes de guardar
const limpio = (o) => JSON.parse(JSON.stringify(o, (k, v) => v === undefined ? null : v));

export function crearApi(usuario) {
  const evento = (accion, detalle = '') => ({ t: ahoraLocal(), por: usuario, accion, detalle });
  return {
    // ---- órdenes
    escucharAbiertas: (cb, err) => onSnapshot(query(colOrd(), where('abierta', '==', true)), s => cb(lista(s)), err),
    escucharMeses: (meses, cb, err) => onSnapshot(query(colOrd(), where('mes', 'in', meses)), s => cb(lista(s)), err),
    async crear(ot, accion = 'Registró la OT') {
      const ref = doc(colOrd());
      const numero = await conNumero('OT', ot.fecha, ref, (num) => limpio({ ...ot, ...camposBusqueda(ot), numero: num, creadoPor: usuario, creado: ahoraLocal(), historial: [evento(accion)] }));
      return { id: ref.id, numero };
    },
    async actualizar(ot, patch, accion, detalle = '') {
      const nuevo = { ...ot, ...patch };
      await updateDoc(docOrd(ot.id), limpio({ ...patch, ...camposBusqueda(nuevo), actualizado: ahoraLocal(), actualizadoPor: usuario }));
      if (accion) await updateDoc(docOrd(ot.id), { historial: arrayUnion(limpio(evento(accion, detalle))) });
    },
    async agregarFoto(id, data) {
      const r = doc(colFotos(id));
      await setDoc(r, { data, por: usuario, t: ahoraLocal() });
      return r.id;
    },
    async fotos(id) { return lista(await getDocs(colFotos(id))); },

    // ---- solicitudes
    escucharSolicitudes(meses, cb, err) {
      const nuevas = new Map(), recientes = new Map();
      const unir = () => cb([...new Map([...recientes, ...nuevas]).values()]);
      const a = onSnapshot(query(colSol(), where('estado', '==', 'nueva')), s => { nuevas.clear(); lista(s).forEach(x => nuevas.set(x.id, x)); unir(); }, err);
      const b = onSnapshot(query(colSol(), where('mes', 'in', meses)), s => { recientes.clear(); lista(s).forEach(x => recientes.set(x.id, x)); unir(); }, err);
      return () => { a(); b(); };
    },
    async crearSolicitud(sol, uid) {
      const ref = doc(colSol());
      const numero = await conNumero('SOL', sol.fecha, ref, (num) => limpio({ ...sol, numero: num, mes: String(sol.fecha).slice(0, 7), estado: 'nueva', creadoUid: uid, creadoPor: usuario, creado: ahoraLocal() }));
      return { id: ref.id, numero };
    },
    actualizarSolicitud: (id, patch) => updateDoc(doc(colSol(), id), limpio({ ...patch, actualizado: ahoraLocal(), actualizadoPor: usuario })),

    // ---- plan preventivo (lectura) y marca de ejecución al cerrar la OT
    async pmpTareas() { return lista(await getDocs(colPMP())); },
    marcarPMP: (tareaId, semana, valor) => updateDoc(doc(colPMP(), tareaId), { [`ejec.${semana}`]: limpio(valor), actualizado: serverTimestamp() }),

    // ---- personal
    escucharPersonal: (cb, err) => onSnapshot(colPer(), s => cb(lista(s)), err),
    async guardarPersona(p) {
      const { id, ...d } = p;
      const ref = id ? doc(colPer(), id) : doc(colPer());
      await setDoc(ref, limpio({ ...d, actualizado: ahoraLocal(), por: usuario }), { merge: true });
      return ref.id;
    },

    // ---- configuración
    async config() {
      try { const s = await getDoc(refCfg()); return { ...CONFIG_BASE, ...(s.exists() ? s.data() : {}) }; }
      catch { return { ...CONFIG_BASE }; }
    },
    guardarConfig: (c) => setDoc(refCfg(), limpio({ ...c, actualizado: ahoraLocal(), por: usuario }), { merge: true }),

    // ---- maestros de otros aplicativos (solo lectura)
    async equipos() { try { return await listarEquipos(); } catch { return []; } },
    async ubicaciones() {
      try { const s = await getDoc(doc(db, 'datos', 'eq', 'config', 'ubicaciones')); return s.exists() ? (s.data().lista || []) : []; }
      catch { return []; }
    }
  };
}

// Foto del celular reducida a JPEG (lado mayor 1280 px) para guardarla dentro de Firestore
export function reducirFoto(file, lado = 1280, calidad = 0.72) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}
