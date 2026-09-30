/* ═══ 3D-EFFEKTEN (PoC) ══════════════════════════════════════════════
   När testkortet lagts på bordet väcks figuren i illustrationen till liv:
   den målade figuren lyfter ur bilden, reser sig och står kvar på kortet
   som en levande 3D-modell. Ett kort, en modell — ingen pipeline. Laddas
   bara med ?fx3d (se kroken i index.html).

   Filen rör inte spelet. Den läser mattans DOM (#grid) med en
   MutationObserver och ritar på en egen canvas ovanpå, som inte tar emot
   klick. Går något fel här händer ingenting med bordet.

   Hur bilden blir till:
   • Mattan ses rakt uppifrån, och en stående figur rakt uppifrån är en
     hjässa. 3D-lagret har därför en egen, lutad vy (VINKEL från lodlinjen).
     Bordet är ett lutat plan i scenen, och en skärmpunkt (x, y) ligger på
     det i (x, 0, y / cos VINKEL).
   • Förvandlingen: modellen börjar liggande på rygg i illustrationen, platt
     som ett lager färg och olyst, så att den täcker den målade figuren och
     ser ut som den. Sedan får den tjocklek, reser sig kring sin fot och
     blir belyst av scenens ljus. Det som är under bordsytan klipps bort,
     så figuren ser ut att komma upp ur kortet.
   • Allt görs i kod. Har GLB:n animationsclips går idle-clippet när
     figuren står; annars rör den sig i kod (se VAJ). */

const KORT = 'Ukud Cobra';                 // aria-label på .card börjar med kortnamnet
const MODELL = 'assets/models/ukud-cobra.glb';
const IDLE = /idle|survey/i;               // clip som går när modellen står still
/* Rörelsen när modellen står. 'auto': clip ur GLB:n om den har några, annars
   rör sig modellen i kod (en stilla modell ur en bild-till-3D-tjänst har inga
   clips). 'kod' tvingar fram det. */
const RORELSE = 'auto';
const VAJ = 0.13;                          // kroppens utslag i toppen, som andel av modellens höjd
const HOJD = 0.95;                         // modellens höjd när den står, i kortbredder
/* En modell ur en bild-till-3D-tjänst står ofta på en platta av mark. SJUNK
   klipper bort den: allt under den här andelen av modellens höjd tas bort. */
const SJUNK = 0.08;
const EGET_LJUS = 1.3;                     // hur mycket av texturen som lyser själv när figuren står; illustrationen är mörk
const VRID = 0;                            // åt vilket håll den stående modellen tittar, radianer
const VINKEL = 50 * Math.PI / 180;         // vyns lutning från lodlinjen
/* Illustrationsrutan på ett vanligt Magic-kort, som andelar av kortet. */
const ART = { x: 0.075, y: 0.115, w: 0.85, h: 0.445 };
/* Var den målade figuren står i illustrationen, som andelar av rutan: fotens
   mitt (x, y) och figurens höjd. Där ligger modellen när förvandlingen börjar. */
const MALAD = { x: 0.56, y: 0.97, h: 0.95 };
const GLOD = 0x8dff7a;                     // ringens, gnistornas och motljusets färg
/* Tiderna, i sekunder: kortet får först ligga (VANTA), sedan tänds
   illustrationen och den målade figuren framträder (TAND), och så reser
   den sig (RESA). */
const T_VANTA = 0.7, T_TAND = 0.6, T_RESA = 1.2;

const CDN = 'https://esm.sh/three@0.170.0';
const S = Math.sin(VINKEL), C = Math.cos(VINKEL);

const klamp = (v, a, b) => Math.min(b, Math.max(a, v));
const bland = (a, b, p) => a + (b - a) * p;
const inUtKubik = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const utBak = p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);

let THREE, klonSkelett, gltf = null;
let grid, vp, canvas, renderer, scen, kamera, bord, ljus, skuggplan, klipp, glodTex;
const inst = new Map();                    // cid → instans
const sedda = new Set();                   // cid som redan fått sin chans
let raf = 0, manuell = false, forra = 0, fpsN = 0, fpsT = 0, fpsSagt = false;

async function start() {
  grid = document.getElementById('grid');
  vp = document.getElementById('gridWrap');
  if (!grid || !vp) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { console.info('[fx3d] av: prefers-reduced-motion'); return; }
  /* Kort som redan ligger på bordet när sidan laddas spelas inte ut nu. */
  for (const el of kortPaMattan()) sedda.add(el.dataset.cid);
  new MutationObserver(nyaKort).observe(grid, { childList: true });

  const t0 = performance.now();
  try {
    const [three, lad, sk] = await Promise.all([
      import(CDN),
      import(CDN + '/examples/jsm/loaders/GLTFLoader.js'),
      import(CDN + '/examples/jsm/utils/SkeletonUtils.js')
    ]);
    THREE = three; klonSkelett = sk.clone;
    const t1 = performance.now();
    const g = await new lad.GLTFLoader().loadAsync(MODELL);
    byggScen();
    gltf = g;
    console.info('[fx3d] ' + MODELL + ' laddad på ' + Math.round(performance.now() - t1) + ' ms (three.js '
      + Math.round(t1 - t0) + ' ms), clips: ' + (g.animations.map(a => a.name).join(', ') || 'inga'));
  } catch (e) {
    console.warn('[fx3d] kunde inte laddas — korten visas som vanligt', e);
  }
}

function kortPaMattan() {
  return [...grid.querySelectorAll('.card[data-cid]')]
    .filter(el => (el.getAttribute('aria-label') || '').startsWith(KORT));
}

/* Mattan ritas om med innerHTML vid varje ändring, så elementen byts ofta.
   Det som räknas är vilka cid som är nya. Är modellen inte laddad än får
   kortet ligga som vanligt — det räknas som sett och får ingen effekt i
   efterhand. */
function nyaKort() {
  for (const el of kortPaMattan()) {
    const cid = el.dataset.cid;
    if (sedda.has(cid)) continue;
    sedda.add(cid);
    if (gltf) spela(cid, el);
  }
}

function byggScen() {
  canvas = document.createElement('canvas');
  canvas.id = 'fx3d';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:40;pointer-events:none';
  vp.appendChild(canvas);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scen = new THREE.Scene();
  /* En världsenhet är en CSS-pixel; y pekar uppåt, så skärmens y är -y. */
  kamera = new THREE.OrthographicCamera(0, 1, 0, -1, 1, 20000);
  kamera.position.z = 10000;
  /* Bordet: lokalt y är lodlinjen, lokalt z är "mot betraktaren" på bordet. */
  bord = new THREE.Group();
  bord.rotation.x = Math.PI / 2 - VINKEL;
  scen.add(bord);

  /* Ljuset underifrån har glödens färg, så att figuren ser belyst ut av ringen. */
  scen.add(new THREE.HemisphereLight(0xdfe8ff, new THREE.Color(GLOD).multiplyScalar(.55), 1.6));
  ljus = new THREE.DirectionalLight(0xfff2dd, 2.6);
  ljus.castShadow = true;
  ljus.shadow.mapSize.set(1024, 1024);
  ljus.shadow.bias = -0.0008;
  bord.add(ljus); bord.add(ljus.target);

  skuggplan = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: .6, depthWrite: false }));
  skuggplan.receiveShadow = true;
  skuggplan.renderOrder = -4;
  bord.add(skuggplan);

  /* Klipplanet i bordsytan: inget ritas under bordet. */
  klipp = new THREE.Plane(new THREE.Vector3(0, S, C), 0);

  /* En mjuk ljusfläck, till skivan under figuren och till gnistorna. */
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c2 = cv.getContext('2d'), gr = c2.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c2.fillStyle = gr; c2.fillRect(0, 0, 128, 128);
  glodTex = new THREE.CanvasTexture(cv);
}

function spela(cid, el) {
  const rot = klonSkelett(gltf.scene);
  const kod = (window.Fx3d.rorelse || RORELSE) === 'kod' || !gltf.animations.length;
  const tid = { value: 0 }, amp = { value: 0 };
  /* Klipper bort allt under modellens fot (plattan, se SJUNK). Följer modellen
     när den ligger och när den reser sig. */
  const fot = new THREE.Plane(new THREE.Vector3(0, S, C), 0);
  /* Normera: höjden ovanför foten blir HOJD kortbredder, foten i origo. */
  const box = new THREE.Box3().setFromObject(rot);
  const mat = box.getSize(new THREE.Vector3());
  const k = HOJD / (mat.y * (1 - SJUNK));
  const mitt = box.getCenter(new THREE.Vector3());
  rot.position.set(-mitt.x * k, -(box.min.y + mat.y * SJUNK) * k, -mitt.z * k);
  rot.scale.setScalar(k);
  const mats = [];
  rot.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.frustumCulled = false;
    const m = o.material = o.material.clone();
    m.clippingPlanes = [klipp, fot];
    m.clipShadows = true;                   // plattan ska inte kasta skugga heller
    m.transparent = true; m.opacity = 0;
    if (m.isMeshStandardMaterial) {
      /* Utan omgivningsbild blir en metallisk yta svart. */
      m.metalness = 0; m.roughness = .85;
      if (m.map) { m.emissive.set(0xffffff); m.emissiveMap = m.map; }
    }
    if (kod) vaja(o, tid, amp);
    mats.push(m);
  });
  /* figur (plats, storlek) → resa (ligger → står) → platt (tjocklek) → vridd
     (vridning kring lodlinjen) → modellen. */
  const figur = new THREE.Group(), resa = new THREE.Group(), platt = new THREE.Group(), vridd = new THREE.Group();
  vridd.add(rot); platt.add(vridd); resa.add(platt); figur.add(resa);

  const grupp = new THREE.Group();          // origo i illustrationens mitt, enhet = kortbredd
  /* Glöden: en ring på kortet runt figuren, en ljusfläck under den och
     gnistor som stiger. Illustrationen bakom dämpas, så att den målade
     figuren ser ut att ha lämnat bilden. */
  const fx = new THREE.Group();
  const plan = (geo, extra) => {
    const m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial(Object.assign({ color: GLOD, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }, extra)));
    m.renderOrder = -2;
    fx.add(m); return m;
  };
  const damp = plan(new THREE.PlaneGeometry(1, 1), { color: 0x04070a, blending: THREE.NormalBlending });
  damp.renderOrder = -3;
  const ring = plan(new THREE.RingGeometry(.44, .465, 72));
  const bage = plan(new THREE.RingGeometry(.37, .38, 72, 1, 0, Math.PI * 1.4));
  const skiva = plan(new THREE.PlaneGeometry(1.5, 1.5), { map: glodTex });
  const N = 44, fro = [];
  for (let n = 0; n < N; n++) fro.push({ a: Math.random() * 6.283, r: .2 + Math.random() * .26, v: .22 + Math.random() * .4, f: Math.random() });
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const gnistor = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: GLOD, map: glodTex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false }));
  gnistor.frustumCulled = false; gnistor.renderOrder = 2;
  fx.add(gnistor);
  grupp.add(fx, figur);
  bord.add(grupp);

  const mixer = new THREE.AnimationMixer(rot);
  const idle = gltf.animations.find(a => IDLE.test(a.name)) || gltf.animations[0];
  const aIdle = idle && !kod ? mixer.clipAction(idle) : null;

  inst.set(cid, { cid, el, grupp, figur, resa, platt, vridd, rot, mats, mixer, aIdle,
    fx, damp, ring, bage, skiva, gnistor, fro, tid, amp, kod, fot, t: 0, star: false });
  if (!raf) { forra = performance.now(); raf = requestAnimationFrame(bildruta); }
}

/* Kroppens rörelse utan clips: en våg som vandrar uppåt genom kroppen flyttar
   hörnen i sidled, mer ju högre upp de sitter — foten står still, halsen och
   huvudet väger fram och tillbaka, som en kobra som rest sig. Görs i
   modellens egna koordinater, där y antas vara uppåt (glTF:s standard). */
function vaja(mesh, tid, amp) {
  const g = mesh.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  const y0 = g.boundingBox.min.y, h = Math.max(1e-6, g.boundingBox.max.y - y0);
  const m = mesh.material;
  m.customProgramCacheKey = () => 'fx3d-vaj';
  m.onBeforeCompile = sh => {
    sh.uniforms.uTid = tid;
    sh.uniforms.uAmp = amp;
    sh.uniforms.uFot = { value: y0 };
    sh.uniforms.uHojd = { value: h };
    sh.vertexShader = 'uniform float uTid, uAmp, uFot, uHojd;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       float fxH = clamp((transformed.y - uFot) / uHojd, 0., 1.);
       float fxW = fxH * fxH * uHojd * uAmp;
       transformed.x += (sin(uTid * 1.25 - fxH * 3.2) + .35 * sin(uTid * 2.9 - fxH * 5.)) * fxW;
       transformed.z += sin(uTid * .8 - fxH * 2.2 + 1.3) * fxW * .7;`);
  };
}

function bort(i) {
  bord.remove(i.grupp);
  i.mixer.stopAllAction();
  for (const m of i.mats) m.dispose();
  i.fx.traverse(o => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } });
  inst.delete(i.cid);
}

/* Kortets ruta på canvasen, och var illustrationen sitter i den. */
function lagen(i, cr) {
  if (!i.el.isConnected) i.el = grid.querySelector('.card[data-cid="' + CSS.escape(i.cid) + '"]');
  if (!i.el) return null;
  const r = i.el.getBoundingClientRect();
  if (!r.width) return null;
  /* Ett tappat kort är vridet 90° medurs, och då ligger illustrationen till höger. */
  const a = i.el.classList.contains('tappad')
    ? { x: 1 - ART.y - ART.h, y: ART.x, w: ART.h, h: ART.w }
    : ART;
  return {
    b: Math.min(r.width, r.height),
    ax: r.left - cr.left + (a.x + a.w / 2) * r.width,
    ay: r.top - cr.top + (a.y + a.h / 2) * r.height,
    aw: a.w * r.width, ah: a.h * r.height
  };
}

const _n = () => new THREE.Vector3(), _p = () => new THREE.Vector3();

function uppdatera(i, dt, cr) {
  const L = lagen(i, cr);
  if (!L) { bort(i); return; }
  i.t += dt;
  const b = L.b, aw = L.aw / b, ah = L.ah / b;   // illustrationen i kortbredder
  i.grupp.position.set(L.ax, 0, L.ay / C);
  i.grupp.scale.setScalar(b);

  /* Förloppet: tand 0→1 medan den målade figuren framträder, res 0→1 medan
     den reser sig. Före T_VANTA ligger kortet bara på bordet. */
  const tand = klamp((i.t - T_VANTA) / T_TAND, 0, 1);
  const res = klamp((i.t - T_VANTA - T_TAND) / T_RESA, 0, 1);
  const upp = inUtKubik(res);
  const liv = klamp((i.t - T_VANTA - T_TAND - T_RESA * .7) / 1.4, 0, 1);   // den egna rörelsen tonar in

  /* Liggande täcker modellen den målade figuren: foten där den målade foten
     står, och så lång att den på skärmen blir lika hög som den målade. */
  const lx = (MALAD.x - .5) * aw, lz = (MALAD.y - .5) * ah / C;
  const lskala = MALAD.h * ah / C / HOJD;
  i.figur.position.set(bland(lx, 0, upp), Math.sin(res * Math.PI) * .12, bland(lz, .12 * ah / C, upp));
  const skala = bland(lskala, 1, upp) * (1 + .1 * Math.sin(klamp(res * 1.25, 0, 1) * Math.PI));
  i.figur.scale.setScalar(skala);
  /* Reser sig kring foten, med en liten överskjutning. */
  i.resa.rotation.x = -Math.PI / 2 * (1 - utBak(res));
  /* Från ett lager färg till full kropp. */
  i.platt.scale.z = bland(.04, 1, inUtKubik(klamp(res / .6, 0, 1)));

  /* Från målad (olyst, exakt texturens färg) till belyst av scenen. */
  for (const m of i.mats) {
    m.opacity = tand;
    m.color.setScalar(upp);
    if (m.emissiveMap) m.emissiveIntensity = bland(1, EGET_LJUS, upp);
  }

  if (res >= 1 && !i.star) { i.star = true; if (i.aIdle) i.aIdle.reset().fadeIn(.4).play(); }
  i.mixer.update(dt);
  if (i.kod) {
    /* Kobrans rörelse på stället: den vrider sig långsamt fram och tillbaka
       med två takter i otakt, lutar sig dit den vrider, och kroppen vajar. */
    const tl = i.t;
    i.tid.value = tl;
    i.amp.value = VAJ * liv;
    i.vridd.rotation.y = (VRID + .7 * Math.sin(tl * .42) + .22 * Math.sin(tl * 1.07 + 1.1)) * bland(0, 1, liv);
    i.vridd.rotation.z = .07 * Math.sin(tl * .42 + .6) * liv;
    i.vridd.rotation.x = .05 * Math.sin(tl * .9) * liv;
  } else {
    i.vridd.rotation.y = VRID * upp;
  }

  /* Fotens klipplan följer modellen. */
  i.platt.updateWorldMatrix(true, false);
  const n = _n().set(0, 1, 0).transformDirection(i.platt.matrixWorld);
  i.fot.setFromNormalAndCoplanarPoint(n, _p().setFromMatrixPosition(i.platt.matrixWorld));

  /* Glöden tänds med illustrationen, blossar när figuren står och pulserar sedan. */
  const bloss = Math.exp(-Math.pow((i.t - T_VANTA - T_TAND - T_RESA * .85) / .25, 2));
  const puls = .78 + .22 * Math.sin(i.t * 2.4);
  i.damp.scale.set(aw, 1, ah / C);
  i.damp.material.opacity = .55 * tand;
  i.ring.material.opacity = tand * (.85 * puls + bloss);
  i.ring.scale.setScalar(1 + bloss * .18);
  i.bage.material.opacity = tand * .55;
  i.bage.rotation.y = i.t * .7;
  i.skiva.material.opacity = tand * (.3 * puls + bloss * .5);
  i.gnistor.material.opacity = tand * .9;
  i.gnistor.material.size = Math.max(3, b * .045);
  const pa = i.gnistor.geometry.attributes.position;
  i.fro.forEach((f, n2) => {
    const h = (f.f + i.t * f.v) % 1, r = f.r * (1 - .45 * h), a = f.a + i.t * .5;
    pa.setXYZ(n2, Math.cos(a) * r, h * h * 1.25, Math.sin(a) * r);
  });
  pa.needsUpdate = true;
}

function passa(cr) {
  const w = Math.round(cr.width), h = Math.round(cr.height);
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    kamera.right = w; kamera.bottom = -h; kamera.updateProjectionMatrix();
    /* Skuggplanet och ljusets skuggkamera täcker hela mattan. */
    skuggplan.position.set(w / 2, 0, h / 2 / C);
    skuggplan.scale.set(w * 1.5, 1, h / C * 1.5);
    ljus.target.position.set(w / 2, 0, h / 2 / C);
    ljus.position.set(w / 2 - 500, 2600, h / 2 / C + 700);
    const k = Math.max(w, h / C) * .8, sc = ljus.shadow.camera;
    sc.left = -k; sc.right = k; sc.top = k; sc.bottom = -k; sc.near = 100; sc.far = 8000;
    sc.updateProjectionMatrix();
    ljus.shadow.radius = 3;
  }
}

function bildruta(nu, steg) {
  raf = 0;
  if (manuell && !steg) return;
  const gick = (nu - forra) / 1000; forra = nu;
  const dt = steg ? gick : Math.min(.1, gick);
  const cr = canvas.getBoundingClientRect();
  if (cr.width && cr.height) {
    passa(cr);
    for (const i of [...inst.values()]) uppdatera(i, dt, cr);
    renderer.render(scen, kamera);
    /* En flik i bakgrunden får glesa bildrutor; de räknas inte. */
    if (gick > 0 && gick < .25) { fpsN++; fpsT += gick; }
    if (!fpsSagt && fpsT > 3) { fpsSagt = true; console.info('[fx3d] ' + Math.round(fpsN / fpsT) + ' bilder/s i snitt de första ' + fpsT.toFixed(1) + ' s'); }
  }
  if (inst.size) { if (!manuell) raf = requestAnimationFrame(bildruta); }
  else { renderer.clear(); fpsN = fpsT = 0; fpsSagt = false; }
}

/* För prov från konsolen: Fx3d.spela() spelar effekten på första testkortet
   på mattan, Fx3d.steg(sek) ritar en bildruta utan requestAnimationFrame
   (en dold flik får inga). */
window.Fx3d = {
  spela() { const el = kortPaMattan()[0]; if (!el || !gltf) return false; const g = inst.get(el.dataset.cid); if (g) bort(g); spela(el.dataset.cid, el); return true; },
  steg(sek) { manuell = true; cancelAnimationFrame(raf); raf = 0; bildruta(forra + (sek || 0) * 1000, true); return inst.size; },
  inst,
  get laddad() { return !!gltf; }
};

start();
