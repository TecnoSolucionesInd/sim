// Fondo animado en 3D de la pantalla de inicio de sesión: tren de engranajes girando acoplados.
// Solo lo usa la portada (index.html). Three.js se carga aquí, bajo demanda; si no hay WebGL, la portada
// se queda con su fondo normal.
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
let cargando = null;
const cargarThree = () => cargando || (cargando = new Promise((ok, mal) => {
  if (window.THREE) return ok(window.THREE);
  const s = document.createElement('script'); s.src = THREE_URL; s.onload = () => ok(window.THREE); s.onerror = mal; document.head.appendChild(s);
}));

// Perfil de un engranaje recto: z dientes, módulo m (radio primitivo = m·z/2)
function engranaje(T, z, m, grosor) {
  const rp = m * z / 2, ro = rp + m, rr = rp - 1.25 * m, paso = Math.PI * 2 / z, s = new T.Shape();
  for (let i = 0; i < z; i++) {
    const a = i * paso;
    [[rr, -0.27], [ro, -0.12], [ro, 0.12], [rr, 0.27]].forEach(([r, f], k) => {
      const x = Math.cos(a + f * paso) * r, y = Math.sin(a + f * paso) * r;
      if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
  }
  s.closePath();
  const hueco = (cx, cy, r) => { const h = new T.Path(); h.absarc(cx, cy, r, 0, Math.PI * 2, true); s.holes.push(h); };
  hueco(0, 0, Math.max(0.45, rr * 0.16));
  if (z >= 18) { const n = z >= 30 ? 6 : 5; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.3; hueco(Math.cos(a) * rr * 0.6, Math.sin(a) * rr * 0.6, rr * 0.2); } }
  const g = new T.ExtrudeGeometry(s, { depth: grosor, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 2, curveSegments: 20 });
  g.translate(0, 0, -grosor / 2);
  return { g, rp, eje: Math.max(0.45, rr * 0.16) };
}

export async function iniciarEscena(canvas) {
  let T;
  try { T = await cargarThree(); } catch (e) { return null; }
  let ren;
  try { ren = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); } catch (e) { return null; }
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  ren.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  const sc = new T.Scene(); sc.fog = new T.Fog(0x05080a, 34, 78);
  const cam = new T.PerspectiveCamera(32, 1, 0.1, 200); cam.position.set(0, 0, 46);

  sc.add(new T.HemisphereLight(0xa8dcff, 0x0a1418, 0.55));
  const l1 = new T.PointLight(0x6fe3cf, 3.4, 130); l1.position.set(-14, 14, 24); sc.add(l1);
  const l2 = new T.PointLight(0x4fa8e0, 3.0, 130); l2.position.set(22, -6, 18); sc.add(l2);
  const l3 = new T.DirectionalLight(0xffffff, 0.85); l3.position.set(4, 10, 14); sc.add(l3);

  const acero = new T.MeshStandardMaterial({ color: 0x25353e, metalness: 0.55, roughness: 0.46 });
  const filo = new T.LineBasicMaterial({ color: 0x6fe3cf, transparent: true, opacity: 0.55 });
  const grupo = new T.Group(); sc.add(grupo);
  const M = 0.5, piezas = [];
  // tren: cada engranaje se acopla al anterior (padre) en el ángulo indicado
  const def = [
    { z: 40, grosor: 1.5 },
    { z: 22, padre: 0, ang: 0.62, grosor: 1.2 },
    { z: 14, padre: 1, ang: 1.75, grosor: 1.0 },
    { z: 28, padre: 0, ang: 3.55, grosor: 1.2 },
    { z: 16, padre: 3, ang: 2.5, grosor: 1.0 },
    { z: 18, padre: 1, ang: -0.35, grosor: 1.0 }
  ];
  def.forEach((d, i) => {
    const { g, rp, eje } = engranaje(T, d.z, M, d.grosor);
    const malla = new T.Mesh(g, acero);
    malla.add(new T.LineSegments(new T.EdgesGeometry(g, 28), filo));
    const p = { ...d, rp, eje, malla, x: 0, y: 0 };
    if (d.padre != null) { const q = piezas[d.padre], dist = q.rp + rp; p.x = q.x + Math.cos(d.ang) * dist; p.y = q.y + Math.sin(d.ang) * dist; }
    malla.position.set(p.x, p.y, 0); grupo.add(malla); piezas.push(p);
  });
  // eje de cada engranaje
  const ejeMat = new T.MeshStandardMaterial({ color: 0x16242b, emissive: 0x6fe3cf, emissiveIntensity: 0.22, metalness: 0.7, roughness: 0.3 });
  piezas.forEach(p => {
    const e = new T.Mesh(new T.CylinderGeometry(p.eje * 0.97, p.eje * 0.97, p.grosor + 0.5, 28), ejeMat); e.rotation.x = Math.PI / 2; e.position.set(p.x, p.y, 0);
    e.add(new T.LineSegments(new T.EdgesGeometry(e.geometry, 28), filo)); grupo.add(e);
  });

  // partículas en suspensión
  const N = 220, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 80; pos[i * 3 + 1] = (Math.random() - 0.5) * 50; pos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 4; }
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3));
  const polvo = new T.Points(pg, new T.PointsMaterial({ color: 0x9fe9dd, size: 0.11, transparent: true, opacity: 0.5, depthWrite: false }));
  sc.add(polvo);

  const ajustar = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight, asp = w / h;
    ren.setSize(w, h, false); cam.aspect = asp; cam.updateProjectionMatrix();
    if (asp >= 1.1) { grupo.position.set(0.6, -9.4, -6); grupo.scale.setScalar(0.9); }   // entre el texto y el formulario
    else { grupo.position.set(1.5, -7.5, -14); grupo.scale.setScalar(0.7); }             // pantalla vertical: más lejos, asoma arriba y abajo del formulario
  };
  ajustar(); addEventListener('resize', ajustar);

  let mx = 0, my = 0, tx = 0, ty = 0;
  const mover = (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; };
  addEventListener('pointermove', mover);

  const cuadro = (t) => {
    const a0 = t * 0.11;   // giro del engranaje principal (rad)
    piezas.forEach((p, i) => {
      if (p.padre == null) p.rot = a0;
      else { const q = piezas[p.padre]; p.rot = -(q.rot - p.ang) * q.z / p.z + p.ang + Math.PI + Math.PI / p.z; }   // acople diente con hueco
      p.malla.rotation.z = p.rot;
    });
    tx += (mx - tx) * 0.04; ty += (my - ty) * 0.04;
    grupo.rotation.set(-0.5 + ty * 0.1, 0.42 + tx * 0.16, 0.1);
    polvo.rotation.y = t * 0.012; polvo.position.y = Math.sin(t * 0.1) * 0.8;
    ren.render(sc, cam);
  };
  let vivo = true, raf = 0; const t0 = performance.now();
  const bucle = (ahora) => { if (!vivo) return; if (!document.hidden) cuadro((ahora - t0) / 1000 + 20); raf = requestAnimationFrame(bucle); };
  if (quieto) cuadro(20); else raf = requestAnimationFrame(bucle);
  canvas.classList.add('on');

  return {
    detener() {
      vivo = false; cancelAnimationFrame(raf); removeEventListener('resize', ajustar); removeEventListener('pointermove', mover);
      canvas.classList.remove('on');
      sc.traverse(o => { if (o.geometry) o.geometry.dispose(); }); [acero, filo, ejeMat, polvo.material].forEach(m => m.dispose()); ren.dispose();
    }
  };
}
