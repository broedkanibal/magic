#!/usr/bin/env node
/* Server för rita.html, ritverktyget för facit (MES-286). Mätverktyg, inte appkod.

   Kör från repots rot:  node dev/golden/rita-server.cjs [port]   (förval 8287)
   och öppna http://localhost:8287/  (eller posten "mesa-rita" i browserpanelen).

   Tre saker utöver en vanlig filserver:
     /api/kallor           fallen och videorna som går att rita, ur rita-kallor.json
     /api/ruta?kalla&t     en bildruta ur en video vid t sekunder, som JPEG. Tas
                           med dev/golden/video/ruta.swift (klarar HEVC och 4K)
                           och sparas i dev/material/rita/<källa>/ — webbläsaren
                           läser aldrig videon själv
     POST /api/spara       skriver ETT av två slags filer: facit.json i ett
                           befintligt dev/golden/fall/<id>/, eller lagen.json i en
                           källas mapp under dev/golden/inspelningar/. Inget annat.

     /api/utkast           utkastet och vyns vridning per källa, som filer i
                           dev/golden/rita-utkast/ — så att det som ritats men
                           inte sparats syns i alla webbläsare på datorn
     POST /api/dela        committar källans filer (facit.json eller lagen.json,
                           utkastet, vridningen) och pushar till main — så att de
                           syns på en annan dator efter git pull

   Lyssnar bara på 127.0.0.1 och serverar bara dev/golden/ och dev/material/
   (aldrig en punktfil), så att .env.local och resten av repot inte syns. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');
const ROT = path.join(__dirname, '..', '..');
const PORT = Number(process.env.PORT || process.argv[2] || 8287);
const TYPER = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json; charset=utf-8', '.tsv': 'text/tab-separated-values; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const TILLATET = ['dev/golden/', 'dev/material/'];
const kallor = () => JSON.parse(fs.readFileSync(path.join(ROT, 'dev', 'golden', 'rita-kallor.json'), 'utf8'));
const finns = f => { try { return fs.statSync(path.join(ROT, f)).isFile(); } catch (e) { return false; } };

/* ── Rutor ur video ──────────────────────────────────────────────────────
   ruta.swift kompileras en gång (0,3–0,8 s per ruta i stället för ~3 s med
   `swift ruta.swift`) och körs en ruta i taget: en 4K-HEVC-avkodare per
   process räcker, och tangenterna ←/→ ska inte starta tio samtidigt. */
const CACHE = path.join(ROT, 'dev', 'material', 'rita');
let rutaBin = null;
function rutaKommando() {
  if (rutaBin !== null) return rutaBin;
  const bin = path.join(CACHE, '.ruta-bin');
  const kalla = path.join(ROT, 'dev', 'golden', 'video', 'ruta.swift');
  try {
    fs.mkdirSync(CACHE, { recursive: true });
    if (!fs.existsSync(bin) || fs.statSync(bin).mtimeMs < fs.statSync(kalla).mtimeMs) {
      const r = spawnSync('swiftc', ['-O', kalla, '-o', bin], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(r.stderr);
    }
    rutaBin = [bin];
  } catch (e) {
    console.log('swiftc gick inte — rutorna tas med `swift ruta.swift` (långsammare): ' + String(e.message).split('\n')[0]);
    rutaBin = ['swift', kalla];
  }
  return rutaBin;
}
let ko = Promise.resolve();
function taRuta(video, t, ut) {
  const jobb = ko.then(() => new Promise((ok, fel) => {
    if (fs.existsSync(ut)) return ok(ut);
    fs.mkdirSync(path.dirname(ut), { recursive: true });
    const [kmd, ...args] = rutaKommando();
    const tmp = ut + '.tmp.jpg';
    const p = spawn(kmd, args.concat([video, String(t), tmp]), { stdio: ['ignore', 'pipe', 'pipe'] });
    let logg = '';
    p.stdout.on('data', d => logg += d); p.stderr.on('data', d => logg += d);
    p.on('close', kod => {
      if (kod === 0 && fs.existsSync(tmp)) { fs.renameSync(tmp, ut); ok(ut); }
      else fel(new Error(`ruta.swift ${t} s: ${logg.trim() || 'kod ' + kod}`));
    });
  }));
  ko = jobb.catch(() => {});
  return jobb;
}
function videoFor(kid) {
  const k = kallor();
  const v = (k.videor || {})[kid];
  if (v) return v.video;
  for (const f of Object.values(k.foton || {})) if (f.kalla === kid && f.video) return f.video;
  return null;
}

/* ── /api/kallor ──────────────────────────────────────────────────────── */
function listaKallor() {
  const k = kallor(), fallMapp = path.join(ROT, 'dev', 'golden', 'fall');
  const ordning = k.ordning || [];
  const foton = fs.readdirSync(fallMapp).filter(id => finns(`dev/golden/fall/${id}/bild.jpg`) && finns(`dev/golden/fall/${id}/facit.json`)).map(id => {
    const c = (k.foton || {})[id] || {}, fallbild = `dev/golden/fall/${id}/bild.jpg`;
    let bild = fallbild, original = null, not = null;
    if (c.bild) { if (finns(c.bild)) { bild = c.bild; original = c.bild; } else not = `originalet ${c.bild} finns inte på den här datorn — ritar på bild.jpg`; }
    if (c.video) {
      if (finns(c.video)) { bild = `api/ruta?kalla=${encodeURIComponent(c.kalla)}&t=${c.t}`; original = `${c.video}@${c.t}`; }
      else not = `videon ${c.video} finns inte på den här datorn — ritar på bild.jpg`;
    }
    let ritad = false;
    try { ritad = !!JSON.parse(fs.readFileSync(path.join(fallMapp, id, 'facit.json'), 'utf8')).rita; } catch (e) {}
    const pri = ordning.findIndex(p => id.startsWith(p));
    return { id, bild, original, fallbild, not, ritad, pri: pri < 0 ? 999 : pri, t: c.video ? c.t : null, video: c.video || null };
  }).sort((a, b) => a.pri - b.pri || (a.id < b.id ? -1 : 1));
  const videor = Object.entries(k.videor || {}).map(([id, v]) => ({ id, namn: v.namn || id, video: v.video, finns: finns(v.video),
    lagen: finns(`${v.mapp}/lagen.json`), mapp: v.mapp, grund: v.grund || 'v', handelser: v.handelser || null, steg: v.steg || null, manus: v.manus || null }));
  return { foton, videor };
}

/* ── /api/spara ───────────────────────────────────────────────────────── */
function spara(kropp) {
  const { sort, id, text } = kropp;
  if (typeof text !== 'string' || !text.trim()) throw new Error('tom fil');
  JSON.parse(text);   // går den inte att läsa sparas den inte
  if (typeof id !== 'string' || !/^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(id) || id.includes('..')) throw new Error('ogiltigt id');
  let fil;
  if (sort === 'facit') {
    const mapp = path.join(ROT, 'dev', 'golden', 'fall', id);
    if (!fs.existsSync(path.join(mapp, 'facit.json'))) throw new Error(`dev/golden/fall/${id}/facit.json finns inte`);
    fil = path.join(mapp, 'facit.json');
  } else if (sort === 'lagen') {
    const v = (kallor().videor || {})[id];
    if (!v || !/^dev\/golden\/inspelningar\/[^/.][^/]*$/.test(v.mapp)) throw new Error('okänd videokälla ' + id);
    const mapp = path.join(ROT, v.mapp);
    if (!fs.existsSync(mapp)) throw new Error(v.mapp + ' finns inte');
    fil = path.join(mapp, 'lagen.json');
  } else throw new Error('okänd sort ' + sort);
  const tmp = fil + '.tmp';
  fs.writeFileSync(tmp, text.endsWith('\n') ? text : text + '\n');
  fs.renameSync(tmp, fil);
  return path.relative(ROT, fil);
}

/* ── /api/utkast och /api/dela ────────────────────────────────────────── */
const UTKAST = path.join(ROT, 'dev', 'golden', 'rita-utkast');
const VYFIL = path.join(UTKAST, 'vy.json');
function kallaOk(sort, id) {
  if (typeof id !== 'string' || !/^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(id) || id.includes('..')) throw new Error('ogiltigt id');
  if (sort === 'foto') { if (!finns(`dev/golden/fall/${id}/facit.json`)) throw new Error('okänt fall ' + id); }
  else if (sort === 'video') { if (!(kallor().videor || {})[id]) throw new Error('okänd videokälla ' + id); }
  else throw new Error('okänd sort ' + sort);
}
const utkastFil = (sort, id) => path.join(UTKAST, `${sort}--${id}.json`);
const lasJson = (f, annars) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return annars; } };
function skrivAtomiskt(fil, text) { fs.mkdirSync(path.dirname(fil), { recursive: true }); fs.writeFileSync(fil + '.tmp', text); fs.renameSync(fil + '.tmp', fil); }
function hamtaUtkast(sort, id) {
  kallaOk(sort, id);
  return { utkast: lasJson(utkastFil(sort, id), null), vy: (lasJson(VYFIL, {})[`${sort}:${id}`] || 0) };
}
function sparaUtkast({ sort, id, utkast, vy }) {
  kallaOk(sort, id);
  if (utkast === null) { try { fs.unlinkSync(utkastFil(sort, id)); } catch (e) {} }
  else if (utkast !== undefined) {
    if (!utkast || typeof utkast.tid !== 'string' || !utkast.dok) throw new Error('utkastet saknar tid eller dok');
    skrivAtomiskt(utkastFil(sort, id), JSON.stringify(utkast) + '\n');
  }
  if (vy !== undefined) {
    const alla = lasJson(VYFIL, {}), n = ((Number(vy) % 4) + 4) % 4;
    if (n) alla[`${sort}:${id}`] = n; else delete alla[`${sort}:${id}`];
    skrivAtomiskt(VYFIL, JSON.stringify(alla, null, 2) + '\n');
  }
  return true;
}
/* git i repots rot. Ett annat git-kommando samtidigt (index.lock) väntas ut
   ett par gånger i stället för att fälla. */
function git(args) {
  for (let i = 0; ; i++) {
    const r = spawnSync('git', args, { cwd: ROT, encoding: 'utf8' });
    const fel = (r.stderr || '') + (r.stdout || '');
    if (r.status === 0) return r.stdout.trim();
    if (i < 3 && /index\.lock/.test(fel)) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500); continue; }
    throw new Error(`git ${args[0]}: ${fel.trim().split('\n').slice(-2).join(' ')}`);
  }
}
function dela({ sort, id }) {
  kallaOk(sort, id);
  if (git(['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') throw new Error('arbetsträdet står inte på main');
  const filer = [];
  if (sort === 'foto') filer.push(`dev/golden/fall/${id}/facit.json`);
  else { const v = kallor().videor[id]; if (finns(`${v.mapp}/lagen.json`)) filer.push(`${v.mapp}/lagen.json`); }
  if (fs.existsSync(utkastFil(sort, id))) filer.push(path.relative(ROT, utkastFil(sort, id)));
  if (`${sort}:${id}` in lasJson(VYFIL, {})) filer.push(path.relative(ROT, VYFIL));   // vridningen bara när källan har en
  const andrade = filer.filter(f => git(['status', '--porcelain', '--', f]) !== '');
  const utkastBort = git(['ls-files', '--deleted', '--', path.relative(ROT, utkastFil(sort, id))]);
  if (utkastBort) andrade.push(utkastBort);
  let commit = null;
  if (andrade.length) {
    git(['add', '-A', '--', ...andrade]);
    git(['commit', '-q', '-m', `Ritverktyget: ${id} (Jespers ritning)\n\nSkickat från rita.html: ${andrade.join(', ')}.`, '--', ...andrade]);
    commit = git(['log', '-1', '--format=%h']);
  }
  const fore = git(['log', '--format=%h %s', 'origin/main..HEAD']);
  if (!fore) return { commit, pushat: [], filer: andrade };
  try { git(['push', '-q', 'origin', 'HEAD:main']); }
  catch (e) { throw new Error(`committat lokalt (${commit || 'inget nytt'}) men inte skickat: ${e.message}. Be Claude skicka upp det.`); }
  return { commit, pushat: fore.split('\n'), filer: andrade };
}
const lasKropp = (req, fn) => { let k = ''; req.on('data', d => { k += d; if (k.length > 20e6) req.destroy(); }); req.on('end', () => fn(k)); };

/* ── Statiska filer ───────────────────────────────────────────────────── */
function skickaFil(req, res, rel) {
  const fil = path.join(ROT, rel);
  if (!fil.startsWith(ROT + path.sep) || rel.split('/').some(d => d.startsWith('.')) || !TILLATET.some(p => rel.startsWith(p))) { res.writeHead(403).end('inte här'); return; }
  fs.stat(fil, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('hittar inte ' + rel); return; }
    const typ = TYPER[path.extname(fil).toLowerCase()] || 'application/octet-stream';
    const huvud = { 'Content-Type': typ, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {
      let start = range[1] === '' ? st.size - Number(range[2]) : Number(range[1]);
      let slut = range[2] === '' || range[1] === '' ? st.size - 1 : Number(range[2]);
      start = Math.max(0, start); slut = Math.min(st.size - 1, slut);
      if (start > slut) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
      res.writeHead(206, { ...huvud, 'Content-Range': `bytes ${start}-${slut}/${st.size}`, 'Content-Length': slut - start + 1 });
      if (req.method !== 'HEAD') fs.createReadStream(fil, { start, end: slut }).pipe(res); else res.end();
      return;
    }
    res.writeHead(200, { ...huvud, 'Content-Length': st.size });
    if (req.method !== 'HEAD') fs.createReadStream(fil).pipe(res); else res.end();
  });
}
const json = (res, kod, o) => res.writeHead(kod, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' }).end(JSON.stringify(o));

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(u.pathname);
  try {
    if (p === '/' || p === '/dev/golden/' ) { res.writeHead(302, { Location: '/dev/golden/rita.html' }).end(); return; }
    if (p === '/api/kallor') return json(res, 200, listaKallor());
    if (p === '/api/ruta') {
      const kid = u.searchParams.get('kalla'), t = Math.max(0, Math.round(+u.searchParams.get('t') * 100) / 100);
      const video = videoFor(kid);
      if (!video || !Number.isFinite(t) || !/^[0-9A-Za-z._-]+$/.test(kid)) return json(res, 400, { fel: 'okänd källa eller tid' });
      if (!finns(video)) return json(res, 404, { fel: `videon ${video} finns inte på den här datorn (dev/material är gitignorerad — symlänka den)` });
      const ut = path.join(CACHE, kid, t.toFixed(2) + '.jpg');
      taRuta(path.join(ROT, video), t, ut).then(f => {
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=86400' });
        fs.createReadStream(f).pipe(res);
        for (const d of [0.5, -0.5]) { const t2 = Math.round((t + d) * 100) / 100; if (t2 >= 0) taRuta(path.join(ROT, video), t2, path.join(CACHE, kid, t2.toFixed(2) + '.jpg')).catch(() => {}); }
      }).catch(e => json(res, 500, { fel: e.message }));
      return;
    }
    if (p === '/api/utkast' && req.method === 'GET') return json(res, 200, hamtaUtkast(u.searchParams.get('sort'), u.searchParams.get('id')));
    if (p === '/api/utkast' && req.method === 'POST') { lasKropp(req, k => { try { json(res, 200, { ok: sparaUtkast(JSON.parse(k)) }); } catch (e) { json(res, 400, { fel: e.message }); } }); return; }
    if (p === '/api/dela' && req.method === 'POST') { lasKropp(req, k => { try { json(res, 200, Object.assign({ ok: true }, dela(JSON.parse(k)))); } catch (e) { json(res, 400, { fel: e.message }); } }); return; }
    if (p === '/api/spara' && req.method === 'POST') {
      let kropp = '';
      req.on('data', d => { kropp += d; if (kropp.length > 20e6) req.destroy(); });
      req.on('end', () => { try { json(res, 200, { ok: true, fil: spara(JSON.parse(kropp)) }); } catch (e) { json(res, 400, { fel: e.message }); } });
      return;
    }
    skickaFil(req, res, p.replace(/^\/+/, ''));
  } catch (e) { json(res, 500, { fel: e.message }); }
}).listen(PORT, '127.0.0.1', () => console.log(`rita-server: http://localhost:${PORT}/dev/golden/rita.html`));
