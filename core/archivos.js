// Archivos del SIM guardados dentro de Firestore, divididos en partes (sin plan Blaze).
//   datos/{app}/archivos/{fid}                 → { nombre, tipo, bytes, partes, fecha, ...extra }  (se escribe al final: marca de archivo completo)
//   datos/{app}/archivos/{fid}/partes/p{n}     → { i, d: Bytes (≤ 900 KB) }
// Si más adelante se usa Cloud Storage, solo se reemplaza este módulo (el objeto devuelto lleva almacen: 'fs').
import { collection, doc, setDoc, getDocs, writeBatch, serverTimestamp, Bytes } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';

const PARTE = 900 * 1024;      // bytes por documento (límite de Firestore: 1 MiB)
const POR_LOTE = 5;            // partes por escritura (límite de 10 MB por solicitud)

export const tipoDe = (file) => file.type
  || (/\.html?$/i.test(file.name) ? 'text/html' : /\.pdf$/i.test(file.name) ? 'application/pdf' : 'application/octet-stream');

export async function guardarArchivo(app, file, extra = {}, onProg) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const ref = doc(collection(db, 'datos', app, 'archivos'));
  const n = Math.max(1, Math.ceil(buf.length / PARTE));
  for (let i = 0; i < n; i += POR_LOTE) {
    const b = writeBatch(db);
    for (let j = i; j < Math.min(n, i + POR_LOTE); j++)
      b.set(doc(db, 'datos', app, 'archivos', ref.id, 'partes', 'p' + j), { i: j, d: Bytes.fromUint8Array(buf.subarray(j * PARTE, (j + 1) * PARTE)) });
    await b.commit();
    if (onProg) onProg(Math.min(n, i + POR_LOTE) / n);
  }
  const meta = { nombre: file.name, tipo: tipoDe(file), bytes: file.size, partes: n };
  await setDoc(ref, { ...meta, ...extra, fecha: serverTimestamp() });
  return { almacen: 'fs', fid: ref.id, ...meta };
}

export async function leerArchivo(app, a) {
  const s = await getDocs(collection(db, 'datos', app, 'archivos', a.fid, 'partes'));
  const partes = s.docs.map(d => d.data()).sort((x, y) => x.i - y.i);
  if (!partes.length || (a.partes && partes.length < a.partes)) throw new Error('El archivo está incompleto o fue retirado.');
  return new Blob(partes.map(p => p.d.toUint8Array()), { type: a.tipo || 'application/octet-stream' });
}

export async function borrarArchivo(app, a) {
  const s = await getDocs(collection(db, 'datos', app, 'archivos', a.fid, 'partes'));
  const refs = s.docs.map(d => d.ref).concat([doc(db, 'datos', app, 'archivos', a.fid)]);
  for (let i = 0; i < refs.length; i += 400) {
    const b = writeBatch(db);
    refs.slice(i, i + 400).forEach(r => b.delete(r));
    await b.commit();
  }
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
