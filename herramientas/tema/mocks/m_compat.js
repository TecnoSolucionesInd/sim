// Firebase "compat" simulado para probar aplicativos heredados (Congelamiento, Costos) sin tocar datos reales.
// Datos: window.__SEMILLA = { 'ruta/del/doc': {...} }  (se define antes de cargar este archivo)
window.firebase = (function () {
  const D = Object.assign({}, window.__SEMILLA || {}); window.__DBC = D;
  const subs = []; let seq = 0;
  const clon = (x) => JSON.parse(JSON.stringify(x));
  const avisar = () => subs.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  const snapDoc = (p) => ({ id: p.split('/').pop(), exists: p in D, data: () => (p in D ? clon(D[p]) : undefined), ref: docRef(p) });
  function docRef(p) {
    return { id: p.split('/').pop(), path: p,
      get: async () => snapDoc(p),
      set: async (v, o) => { D[p] = o && o.merge ? Object.assign({}, D[p], clon(v)) : clon(v); avisar(); },
      update: async (v) => { if (!(p in D)) { const e = new Error('No document to update'); e.code = 'not-found'; throw e; } D[p] = Object.assign({}, D[p], clon(v)); avisar(); },
      delete: async () => { delete D[p]; avisar(); },
      collection: (c) => colRef(p + '/' + c),
      onSnapshot: (cb) => { const f = () => cb(snapDoc(p)); subs.push(f); setTimeout(f, 5); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; } };
  }
  function colRef(p, filtros = [], orden = null, lim = 0) {
    const docs = () => { const pre = p + '/';
      let l = Object.keys(D).filter(k => k.startsWith(pre) && !k.slice(pre.length).includes('/')).map(snapDoc);
      filtros.forEach(([f, op, v]) => { l = l.filter(s => { const x = s.data()[f]; return op === '==' ? x === v : op === '>=' ? x >= v : op === '<=' ? x <= v : op === '>' ? x > v : op === '<' ? x < v : op === 'in' ? v.includes(x) : true; }); });
      if (orden) l.sort((a, b) => { const x = a.data()[orden[0]], y = b.data()[orden[0]]; return (x > y ? 1 : x < y ? -1 : 0) * (orden[1] === 'desc' ? -1 : 1); });
      return lim ? l.slice(0, lim) : l; };
    const snap = () => { const l = docs(); return { docs: l, empty: !l.length, size: l.length, forEach: (f) => l.forEach(f), docChanges: () => l.map(doc => ({ type: 'added', doc })) }; };
    return { path: p,
      doc: (id) => docRef(p + '/' + (id || ('id' + (++seq)))),
      add: async (v) => { const r = docRef(p + '/id' + (++seq) + Date.now() % 1000); D[r.path] = clon(v); avisar(); return r; },
      where: (f, op, v) => colRef(p, filtros.concat([[f, op, v]]), orden, lim),
      orderBy: (f, d) => colRef(p, filtros, [f, d || 'asc'], lim),
      limit: (n) => colRef(p, filtros, orden, n),
      get: async () => snap(),
      onSnapshot: (cb) => { const f = () => cb(snap()); subs.push(f); setTimeout(f, 5); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; } };
  }
  const fs = () => ({ collection: colRef, doc: docRef, enablePersistence: async () => {}, settings() {},
    batch: () => { const ops = []; return { set: (r, v, o) => ops.push(() => r.set(v, o)), update: (r, v) => ops.push(() => r.update(v)), delete: (r) => ops.push(() => r.delete()), commit: async () => { for (const o of ops) await o(); } }; } });
  fs.FieldValue = { serverTimestamp: () => new Date().toISOString(), delete: () => undefined, increment: (n) => n, arrayUnion: (...a) => a };
  fs.Timestamp = { now: () => ({ toDate: () => new Date() }), fromDate: (d) => ({ toDate: () => d }) };
  const U = { uid: 'u1', email: 'admin@ejemplo.com', emailVerified: true, displayName: 'Usuario de prueba' };
  const auth = () => ({ currentUser: U, onAuthStateChanged(cb) { setTimeout(() => cb(U), 5); return () => {}; }, signOut: async () => {}, signInWithEmailAndPassword: async () => ({ user: U }), setPersistence: async () => {} });
  auth.Auth = { Persistence: { LOCAL: 'local', SESSION: 'session' } };
  return { initializeApp() { return {}; }, apps: [{}], auth, firestore: fs };
})();
