// Informes técnicos — utilidades compartidas (vínculos desde otros aplicativos y medidor de almacenamiento).
import { collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';

// Cuota sin costo de Cloud Storage en el plan Blaze (buckets en us-central1 / us-east1 / us-west1)
export const LIMITE_STORAGE = 5 * 1024 ** 3;   // 5 GB
export const UMBRAL_AVISO = 0.80;              // aviso: empezar a retirar archivos antiguos
export const UMBRAL_CRITICO = 0.95;            // crítico: retirar antes de seguir cargando
export const MAX_ARCHIVO = 25 * 1024 ** 2;     // 25 MB por archivo (igual que storage.rules)

export const ESTADOS_INF = {
  borrador:   { label: 'Borrador',   bg: 'rgba(255,255,255,.09)', fg: '#DDE4EB' },
  presentado: { label: 'Presentado', bg: 'rgba(124,200,248,.16)', fg: '#9ED6FA' },
  observado:  { label: 'Observado',  bg: 'rgba(245,185,74,.16)',  fg: '#FFCF73' },
  aprobado:   { label: 'Aprobado',   bg: 'rgba(111,227,207,.16)', fg: '#8FF0DE' },
  rechazado:  { label: 'Rechazado',  bg: 'rgba(255,143,143,.14)', fg: '#FFB3B3' }
};

export const TIPOS_INF = [
  { id: 'solicitud',  label: 'Solicitud de aprobación' },
  { id: 'falla',      label: 'Informe de falla' },
  { id: 'evaluacion', label: 'Evaluación técnica' },
  { id: 'deslinde',   label: 'Informe de deslinde' },
  { id: 'otro',       label: 'Otro' }
];

export const fmtBytes = (b) => {
  b = +b || 0;
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(2) + ' GB';
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(1) + ' MB';
  if (b >= 1024) return Math.round(b / 1024) + ' KB';
  return b + ' B';
};

export async function usoAlmacenamiento() {
  const s = await getDoc(doc(db, 'datos', 'inf', 'config', 'uso'));
  const bytes = s.exists() ? (+s.data().bytes || 0) : 0;
  return { bytes, frac: bytes / LIMITE_STORAGE };
}

// Informes vinculados a un programa del Plan o a un equipo. Devuelve null si el usuario no tiene acceso a Informes.
export async function informesVinculados({ programa = null, equipo = null } = {}) {
  try {
    const col = collection(db, 'datos', 'inf', 'informes');
    const q = programa ? query(col, where('progId', '==', programa)) : query(col, where('eqIds', 'array-contains', equipo));
    const s = await getDocs(q);
    return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  } catch (e) { return null; }
}

export const enlaceInforme = (raiz, id) => `${raiz}apps/inf/?i=${encodeURIComponent(id)}#informes`;
