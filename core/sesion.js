// Lógica de sesión y permisos compartida por el portal y los aplicativos.
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';
import { ADMIN_EMAIL } from './config.js';
import { APPS, ROLES_ESCRITURA } from './catalogo.js';

export const esCorreoAdmin = (user) => !!user && (user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
export const esAdmin = (user) => esCorreoAdmin(user) && user.emailVerified === true;

export async function cargarPerfil(user) {
  if (!user) return null;
  const ref = doc(db, 'usuarios', user.uid);
  let snap = await getDoc(ref);
  if (!snap.exists() && esAdmin(user)) {
    // Alta automática del perfil del administrador en su primer ingreso
    await setDoc(ref, {
      email: user.email, nombre: 'Elvis Miranda', area: 'Mantenimiento',
      activo: true, apps: {}, creado: serverTimestamp()
    });
    snap = await getDoc(ref);
  }
  return snap.exists() ? { uid: user.uid, ...snap.data() } : null;
}

// Devuelve { rol, modulos } del usuario en un aplicativo, o null si no tiene acceso.
export function accesoApp(user, perfil, appId) {
  const app = APPS.find(a => a.id === appId);
  if (!app) return null;
  if (esAdmin(user)) return { rol: 'admin', modulos: app.modulos.map(m => m.id) };
  if (!perfil || perfil.activo !== true || app.soloAdmin) return null;
  const p = (perfil.apps || {})[appId];
  if (!p || !p.rol) return null;
  const todos = app.modulos.map(m => m.id);
  const modulos = Array.isArray(p.modulos) && p.modulos.length ? p.modulos.filter(m => todos.includes(m)) : todos;
  return { rol: p.rol, modulos };
}

export function appsVisibles(user, perfil) {
  if (esAdmin(user)) return APPS.slice();
  return APPS.filter(a => accesoApp(user, perfil, a.id));
}

export const puedeEscribir = (acceso) => !!acceso && ROLES_ESCRITURA.includes(acceso.rol);

export function iniciales(nombre, email) {
  const base = (nombre || email || '?').trim();
  const partes = base.split(/[\s@._-]+/).filter(Boolean);
  return ((partes[0] || '?')[0] + ((partes[1] || '')[0] || '')).toUpperCase();
}
