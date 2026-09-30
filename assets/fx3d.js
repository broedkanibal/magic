/* ═══ 3D-EFFEKTEN (PoC) ══════════════════════════════════════════════
   När testkortet spelas ut kliver en animerad 3D-modell upp ur kortets
   illustration och ställer sig på kortet. Ett kort, en modell — ingen
   pipeline. Laddas bara med ?fx3d (se kroken i index.html).

   Filen rör inte spelet. Den läser mattans DOM (#grid) med en
   MutationObserver och ritar på en egen canvas ovanpå, som inte tar emot
   klick. Går något fel här händer ingenting med bordet.

   Hur bilden blir till:
   • Mattan ses rakt uppifrån, och en stående figur rakt uppifrån är en
     hjässa. 3D-lagret har därför en egen, lutad vy (VINKEL från lodlinjen).
     Bordet är ett lutat plan i scenen, och en skärmpunkt (x, y) ligger på
     det i (x, 0, y / cos VINKEL).
   • Portalen: illustrationsrutan skrivs i stencilbufferten. Schaktet under
     kortet och den del av modellen som är under bordsytan ritas bara där;
     delen ovanför bordsytan ritas överallt. Två pass per bildruta med var
     sitt klipplan.
   • Hoppet görs i kod. Animationsclipen kommer ur GLB:n. */

const KORT = 'Ukud Cobra';                 // aria-label på .card börjar med kortnamnet
const MODELL = 'assets/models/Fox.glb';
const IDLE = /idle|survey/i;               // clip som går när modellen står still
const HOPP = /run|jump|walk/i;             // clip under hoppet; saknas det går idle
const HOJD = 1.1;                          // modellens största mått, i kortbredder
const VRID = -0.6;                         // modellens vridning kring lodlinjen, radianer
const VINKEL = 50 * Math.PI / 180;         // vyns lutning från lodlinjen
/* Illustrationsrutan på ett vanligt Magic-kort, som andelar av kortet. */
const ART = { x: 0.075, y: 0.115, w: 0.85, h: 0.445 };
const DJUP = 0.4;                          // schaktets djup, i kortbredder
const GLOD = 0x8dff7a;                     // ringens, gnistornas och motljusets färg
const BAGE = 0.6;                          // hoppets höjd över bordet, i kortbredder
const T_OPPNA = 0.25, T_HOPP = 1.0, T_LAND = 0.3, T_STANG = 0.35;

const CDN = 'https://esm.sh/three@0.170.0';
const S = Math.sin(VINKEL), C = Math.cos(VINKEL);

const klamp = (v, a, b) => Math.min(b, Math.max(a, v));
const utKubik = p => 1 - Math.pow(1 - p, 3);
const inUtKubik = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const utBak = p => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);

let THREE, klonSkelett, gltf = null;
let grid, vp, canvas, renderer, scen, kamera, bord, ljus, skuggplan, klipp;
let maskMat, vaggMat, glodTex;
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
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, stencil: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.autoClear = false;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

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
    new THREE.ShadowMaterial({ opacity: .6, depthWrite: false,
      /* Ingen skugga över schaktets öppning. */
      stencilWrite: true, stencilFunc: THREE.NotEqualStencilFunc, stencilRef: 1 }));
  skuggplan.receiveShadow = true;
  bord.add(skuggplan);

  /* Ett klipplan genom bordsytan. Normalen vänds mellan de två passen. */
  klipp = new THREE.Plane(new THREE.Vector3(0, S, C), 0);

  /* En mjuk ljusfläck, till skivan under figuren och till gnistorna. */
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c2 = cv.getContext('2d'), gr = c2.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c2.fillStyle = gr; c2.fillRect(0, 0, 128, 128);
  glodTex = new THREE.CanvasTexture(cv);

  maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false,
    stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp });
  const vagg = f => new THREE.MeshBasicMaterial({ color: f, side: THREE.BackSide,
    stencilWrite: true, stencilFunc: THREE.EqualStencilFunc, stencilRef: 1 });
  vaggMat = [vagg(0x0c0f15), vagg(0x0c0f15), vagg(0x000000), null, vagg(0x05070a), vagg(0x232a38)];
}

function spela(cid, el) {
  const rot = klonSkelett(gltf.scene);
  /* Normera: största måttet blir HOJD kortbredder, fötterna på y = 0. */
  const box = new THREE.Box3().setFromObject(rot);
  const mat = box.getSize(new THREE.Vector3());
  const k = HOJD / Math.max(mat.x, mat.y, mat.z);
  const mitt = box.getCenter(new THREE.Vector3());
  rot.position.set(-mitt.x * k, -box.min.y * k, -mitt.z * k);
  rot.scale.setScalar(k);
  rot.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.frustumCulled = false;
    o.material = o.material.clone();
    o.material.clippingPlanes = [klipp];
    o.material.stencilFunc = THREE.EqualStencilFunc;
    o.material.stencilRef = 1;
    o.userData.fx3dMat = o.material;
  });
  const figur = new THREE.Group();          // flyttas och skalas av hoppet
  const vridd = new THREE.Group();
  vridd.rotation.y = VRID;
  vridd.add(rot); figur.add(vridd);

  const grupp = new THREE.Group();          // origo i illustrationens mitt, enhet = kortbredd
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), maskMat);
  mask.renderOrder = -10;
  const golvMat = new THREE.MeshBasicMaterial({ color: 0x222831, side: THREE.BackSide,
    stencilWrite: true, stencilFunc: THREE.EqualStencilFunc, stencilRef: 1 });
  const mats = vaggMat.slice(); mats[3] = golvMat;
  const schakt = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats);
  schakt.renderOrder = -5;
  /* Glöden: en ring på kortet runt figuren, en ljusfläck under den och
     gnistor som stiger. Ritas bara i pass 2, ovanpå bordet. */
  const fx = new THREE.Group();
  const glod = (geo, extra) => {
    const m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial(Object.assign({ color: GLOD, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }, extra)));
    fx.add(m); return m;
  };
  const ring = glod(new THREE.RingGeometry(.44, .465, 72));
  const bage = glod(new THREE.RingGeometry(.37, .38, 72, 1, 0, Math.PI * 1.4));
  const skiva = glod(new THREE.PlaneGeometry(1.5, 1.5), { map: glodTex });
  const N = 44, fro = [];
  for (let k = 0; k < N; k++) fro.push({ a: Math.random() * 6.283, r: .2 + Math.random() * .26, v: .22 + Math.random() * .4, f: Math.random() });
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const gnistor = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: GLOD, map: glodTex, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false }));
  gnistor.frustumCulled = false;
  fx.add(gnistor);
  grupp.add(mask, schakt, figur, fx);
  bord.add(grupp);

  /* Golvet är kortets egen illustration, så att den ser ut att sjunka ner. */
  const img = el.querySelector('img');
  if (img && img.src) new THREE.TextureLoader().setCrossOrigin('anonymous').load(img.src, tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(-ART.w, ART.h);
    tex.offset.set(ART.x + ART.w, 1 - ART.y - ART.h);
    tex.wrapS = THREE.RepeatWrapping;
    golvMat.map = tex; golvMat.color.set(0xffffff); golvMat.needsUpdate = true;
  }, undefined, () => {});

  const mixer = new THREE.AnimationMixer(rot);
  const clip = re => gltf.animations.find(a => re.test(a.name));
  const idle = clip(IDLE) || gltf.animations[0];
  const hopp = clip(HOPP) || idle;
  const aIdle = idle ? mixer.clipAction(idle) : null;
  const aHopp = hopp ? mixer.clipAction(hopp) : null;
  if (aHopp) aHopp.play();

  inst.set(cid, { cid, el, grupp, mask, schakt, golvMat, figur, rot, mixer, aIdle, aHopp,
    fx, ring, bage, skiva, gnistor, fro, t: 0, landat: false, oppet: true });
  if (!raf) { forra = performance.now(); raf = requestAnimationFrame(bildruta); }
}

function bort(i) {
  bord.remove(i.grupp);
  i.mixer.stopAllAction();
  i.golvMat.map && i.golvMat.map.dispose();
  i.golvMat.dispose();
  i.rot.traverse(o => { if (o.userData.fx3dMat) o.userData.fx3dMat.dispose(); });
  i.fx.traverse(o => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } });
  inst.delete(i.cid);
}

/* Kortets ruta på canvasen, och var illustrationen sitter i den. Ett tappat
   kort är vridet 90° medurs, och då ligger illustrationen till höger. */
function lagen(i, cr) {
  if (!i.el.isConnected) i.el = grid.querySelector('.card[data-cid="' + CSS.escape(i.cid) + '"]');
  if (!i.el) return null;
  const r = i.el.getBoundingClientRect();
  if (!r.width) return null;
  const tappad = i.el.classList.contains('tappad');
  const a = tappad
    ? { x: 1 - ART.y - ART.h, y: ART.x, w: ART.h, h: ART.w }
    : ART;
  return {
    r, b: Math.min(r.width, r.height),
    ax: r.left - cr.left + (a.x + a.w / 2) * r.width,
    ay: r.top - cr.top + (a.y + a.h / 2) * r.height,
    aw: a.w * r.width, ah: a.h * r.height
  };
}

function uppdatera(i, dt, cr) {
  const L = lagen(i, cr);
  if (!L) { bort(i); return; }
  i.t += dt;
  const g = i.grupp, b = L.b;
  g.position.set(L.ax, 0, L.ay / C);
  g.scale.setScalar(b);

  /* Schaktet: öppnar sig, och stänger sig under figuren medan den är i
     luften, så att den landar på kortet. */
  const tStang = T_OPPNA * .6 + T_HOPP * .55;
  const d = DJUP * (i.t < tStang ? utKubik(klamp(i.t / T_OPPNA, 0, 1)) : 1 - inUtKubik(klamp((i.t - tStang) / T_STANG, 0, 1)));
  i.oppet = i.t < tStang + T_STANG;
  i.mask.visible = i.schakt.visible = i.oppet;
  if (i.oppet) {
    const w = L.aw / b, h = L.ah / b / C;
    i.mask.scale.set(w, 1, h);
    i.schakt.scale.set(w, Math.max(d, .001), h);
    i.schakt.position.y = -Math.max(d, .001) / 2;
    i.golvMat.color.setScalar(i.golvMat.map ? 1 - .45 * d / DJUP : .15);
  }

  /* Hoppet: rakt upp ur schaktet i en båge, och ner på kortet igen. */
  const p = klamp((i.t - T_OPPNA * .6) / T_HOPP, 0, 1);
  let y = -DJUP * (1 - p) + 4 * BAGE * p * (1 - p);
  let sy = 1, sxz = 1;
  const vaxt = .5 + .5 * utBak(klamp(p / .55, 0, 1));
  if (p >= 1) {
    if (!i.landat) {
      i.landat = true;
      if (i.aIdle && i.aIdle !== i.aHopp) { i.aIdle.reset().play(); i.aHopp.crossFadeTo(i.aIdle, .25, false); }
    }
    /* Landningen: trycks ihop och fjädrar tillbaka med en liten överskjutning. */
    const q = klamp((i.t - T_OPPNA * .6 - T_HOPP) / T_LAND, 0, 1);
    const tryck = Math.sin(q * Math.PI * 2) * (1 - q) * .16;
    sy = 1 - tryck; sxz = 1 + tryck * .6; y = 0;
  }
  i.figur.position.set(0, y, 0);
  i.figur.scale.set(vaxt * sxz, vaxt * sy, vaxt * sxz);
  i.figur.visible = i.t > T_OPPNA * .4;
  i.mixer.update(dt);

  /* Glöden tänds när schaktet öppnas, blossar vid landningen och pulserar sedan. */
  const tand = klamp(i.t / .3, 0, 1);
  const bloss = Math.exp(-Math.pow((i.t - T_OPPNA * .6 - T_HOPP) / .22, 2));
  const puls = .78 + .22 * Math.sin(i.t * 2.4);
  i.ring.material.opacity = tand * (.85 * puls + bloss);
  i.ring.scale.setScalar(1 + bloss * .18);
  i.bage.material.opacity = tand * .55;
  i.bage.rotation.y = i.t * .7;
  i.skiva.material.opacity = tand * (.38 * puls + bloss * .5);
  i.gnistor.material.opacity = tand * .9;
  i.gnistor.material.size = Math.max(3, b * .045);
  const pa = i.gnistor.geometry.attributes.position;
  i.fro.forEach((f, k) => {
    const h = (f.f + i.t * f.v) % 1, r = f.r * (1 - .45 * h), a = f.a + i.t * .5;
    pa.setXYZ(k, Math.cos(a) * r, h * h * 1.25, Math.sin(a) * r);
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
    rita();
    /* En flik i bakgrunden får glesa bildrutor; de räknas inte. */
    if (gick > 0 && gick < .25) { fpsN++; fpsT += gick; }
    if (!fpsSagt && fpsT > 3) { fpsSagt = true; console.info('[fx3d] ' + Math.round(fpsN / fpsT) + ' bilder/s i snitt de första ' + fpsT.toFixed(1) + ' s'); }
  }
  if (inst.size) { if (!manuell) raf = requestAnimationFrame(bildruta); }
  else { renderer.clear(); fpsN = fpsT = 0; fpsSagt = false; }
}

function rita() {
  const alla = [...inst.values()];
  const oppna = alla.some(i => i.oppet);
  const figurMat = på => { for (const i of alla) i.rot.traverse(o => { if (o.userData.fx3dMat) o.userData.fx3dMat.stencilWrite = på; }); };
  renderer.clear();
  renderer.shadowMap.needsUpdate = true;
  if (oppna) {
    /* Pass 1 — under bordsytan, bara genom illustrationsrutan. */
    klipp.normal.set(0, -S, -C);
    skuggplan.visible = false;
    for (const i of alla) i.fx.visible = false;
    figurMat(true);
    renderer.render(scen, kamera);
  }
  /* Pass 2 — ovanför bordsytan, överallt, med skuggan på bordet. */
  klipp.normal.set(0, S, C);
  skuggplan.visible = true;
  figurMat(false);
  for (const i of alla) { i.mask.visible = i.schakt.visible = false; i.fx.visible = true; }
  renderer.render(scen, kamera);
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
