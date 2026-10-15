/* Provet för raderingen och gallringen (granskningen i skala, steg 5).

   Kör:  node dev/rapport/prov-radera.cjs              lokalt, utan nät: en tillfällig mapp (MESA_FALL_UT) och
                                                       en liten PostgREST- och hink-attrapp på 127.0.0.1 i
                                                       stället för Supabase (SUPABASE_URL pekar dit)
         node dev/rapport/prov-radera.cjs --bank-kor   också helkort_jamfor.py --utgava på den frysta utgåvan
                                                       som tappat ett fall

   1. Syntetiska rättelser och en rapport genom alla vägar: bänken (i en fryst utgåva), träningen och Mat
      test. Varje kopia får en rad i kopieindexet.
   2. radera.cjs --lokal --torr rör ingenting; radera.cjs --lokal tar bort allt, och grep hittar 0 träffar
      på koderna i hela den tillfälliga roten (innehåll och filnamn). Ett annat fall i samma utgåva ligger kvar.
   3. Tabellvägen mot attrappen: utan kolumnen hanterad_at (migrationen inte körd) går bara --torr; med den
      märks raderingen hanterad, men inte när grep hittar koden kvar utanför text.
   4. gallra.cjs --torr rör ingenting; gallra.cjs tar det tabellen i avsnitt 8 säger, och inget annat.
   Slutkod 0 = allt OK, 1 = något FEL. Inget här frågar Claude eller rör produktionen. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const { execFile, spawnSync } = require('child_process');
const ROT = path.join(__dirname, '..', '..');
const UT = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-prov-radera-'));
const IN = path.join(UT, 'dev', 'diagnos', 'rapporter');   // de hämtade mapparna, där hamta.cjs lägger dem
const MARK = path.join(UT, 'dev', 'material', 'arbete', 'markning');
fs.mkdirSync(MARK, { recursive: true });
let fel = 0;
const ok = (villkor, text) => { console.log(`${villkor ? 'OK ' : 'FEL'} ${text}`); if (!villkor) fel++; };
const DAG = 86400000, iso = dagar => new Date(Date.now() - dagar * DAG).toISOString();

/* ── attrappen: det PostgREST och hinken som supa.cjs använder ─────────────── */
const DB = { rapporter: [], raderingar: [] }, HINK = new Map();   // HINK: sökväg → storlek
let utanHanterad = false;   // migrationen 20261015120000 inte körd
function filter(rader, q) {
  const villkor = (rad, k, v) => {
    const [op, ...r] = v.split('.'), x = r.join('.'), val = rad[k] == null ? null : rad[k];
    if (op === 'eq') return String(val) === x;
    if (op === 'neq') return String(val) !== x;
    if (op === 'is') return x === 'null' ? val === null : String(val) === x;
    if (op === 'lt') return val != null && val < x;
    if (op === 'gte') return val != null && val >= x;
    if (op === 'gt') return val != null && val > x;
    if (op === 'in') return x.replace(/^\(|\)$/g, '').split(',').includes(String(val));
    throw new Error('op ' + op);
  };
  return rader.filter(rad => [...q.entries()].every(([k, v]) => {
    if (['select', 'order', 'limit'].includes(k)) return true;
    if (k === 'or') return v.replace(/^\(|\)$/g, '').split(',').some(d => { const [kk, ...r] = d.split('.'); return villkor(rad, kk, r.join('.')); });
    return villkor(rad, k, v);
  }));
}
const server = http.createServer((req, res) => {
  let kropp = '';
  req.on('data', d => { kropp += d; });
  req.on('end', () => {
    const u = new URL(req.url, 'http://x'), svar = (kod, j) => { res.writeHead(kod, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); };
    const b = kropp ? JSON.parse(kropp) : null;
    if (u.pathname === '/storage/v1/object/list/scans') {
      const pre = b.prefix, ut = new Map();
      for (const [p, n] of HINK) if (p.startsWith(pre)) { const rest = p.slice(pre.length), del = rest.split('/'); if (del.length > 1) ut.set(del[0], { name: del[0], id: null }); else ut.set(rest, { name: rest, id: 'x', metadata: { size: n } }); }
      return svar(200, [...ut.values()]);
    }
    if (u.pathname === '/storage/v1/object/scans' && req.method === 'DELETE') { for (const p of b.prefixes) HINK.delete(p); return svar(200, []); }
    const tab = u.pathname.replace('/rest/v1/', '');
    if (!DB[tab]) return svar(404, { message: 'tabellen ' + tab });
    if (tab === 'raderingar' && utanHanterad && (/hanterad_at/.test(u.search) || (b && 'hanterad_at' in b))) return svar(400, { code: '42703', message: 'column raderingar.hanterad_at does not exist' });
    const valda = filter(DB[tab], u.searchParams);
    if (req.method === 'GET') return svar(200, valda);
    if (req.method === 'PATCH') { for (const r of valda) Object.assign(r, b); return svar(200, valda); }
    if (req.method === 'DELETE') { DB[tab] = DB[tab].filter(r => !valda.includes(r)); return svar(200, valda); }
    svar(405, { message: req.method });
  });
});

/* ── verktygen som barnprocesser (asynkront: attrappen svarar under tiden) ── */
let ENV;
const kor = (skript, args) => new Promise(klar => execFile(process.execPath, [path.join(__dirname, skript), ...args], { cwd: ROT, env: ENV, encoding: 'utf8' },
  (e, so, se) => klar({ kod: e ? (typeof e.code === 'number' ? e.code : 1) : 0, ut: (so || '') + (se || '') })));
/* grep på koden i HELA den tillfälliga roten: innehåll (också gz-filernas namn räknas via find) och filnamn */
function traffar(kod) {
  const g = spawnSync('grep', ['-rlw', '-e', kod, UT], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
  const f = spawnSync('find', [UT, '-name', `*${kod}*`], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
  return [...new Set(g.concat(f))].map(x => path.relative(UT, x));
}

/* En hämtad tyst rättelse (B:s kontrakt) och en rapport med mattans ändringar, som i prov-d.cjs. */
const MAN = JSON.parse(fs.readFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', 'manifest.json'), 'utf8'));
function rattelse(kod, i, spelkod) {
  const p = MAN[i], mapp = path.join(IN, kod);
  fs.mkdirSync(mapp, { recursive: true });
  fs.copyFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', p.fil), path.join(mapp, 'beskarning.jpg'));
  fs.writeFileSync(path.join(mapp, 'rattelse.json'), JSON.stringify({ gissning: 'Swamp', varfor: 'modell land', ratt: p.namn, spelkod, t: 1790000000000 + i, spar: 7, handelse: 'namnbyte', bild: 'telefon',
    ruta: { x: 0.4, y: 0.3, w: 0.14, h: 0.33, bild: { w: 360, h: 203 }, kalla: 'beskarning', t: 1790000000000 + i }, maskade: [] }));
  fs.writeFileSync(path.join(mapp, 'rapport.json'), JSON.stringify({ kod, text: null, tagg: null, tidslinje: [], rad: null }));
  return mapp;
}
function rapport(kod, game_id) {
  const mapp = path.join(IN, kod), t0 = 1790000000000, m = (s, x) => Object.assign({ slag: 'matta', sida: 'dator', t: t0 + s * 1000 }, x);
  fs.mkdirSync(mapp, { recursive: true });
  fs.writeFileSync(path.join(mapp, 'rapport.json'), JSON.stringify({ kod, text: 'Expel came twice', tagg: 'dok_upp', rad: { kod, game_id }, tidslinje: [
    m(10, { typ: 'spelar', kort: 'Expel', id: 'c1', till: 'mattan', av: 'kamera' }), m(20, { typ: 'spelar', kort: 'Expel', id: 'c2', till: 'mattan', av: 'kamera' }),
    m(25, { typ: 'tar_bort', kort: 'Expel', id: 'c2', av: 'spelare' })] }));
  fs.writeFileSync(path.join(mapp, 'bordlogg.json'), JSON.stringify({ id: 'rapport-' + kod, start: new Date(t0).toISOString(), rapport: kod, bordLogg: [0, 10, 20, 30].map(s => ({ s, spar: [] })) }));
  return mapp;
}
const lasJ = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const index = () => ['dev/rapport/kopior.jsonl', 'dev/material/rapportbank/kopior.jsonl', 'dev/material/arbete/markning/rapporter-traning-mesa/kopior.jsonl']
  .flatMap(f => (fs.existsSync(path.join(UT, f)) ? fs.readFileSync(path.join(UT, f), 'utf8') : '').split('\n').filter(Boolean).map(r => JSON.parse(r)));
const BANK = path.join(UT, 'dev', 'material', 'rapportbank');

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  ENV = Object.assign({}, process.env, { MESA_FALL_UT: UT, SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_SERVICE_ROLE_KEY: 'prov-radera' });
  console.log(`prov-radera: skriver i ${UT}`);

  /* 1. Alla vägar: bänken (två fall, ett ska raderas), träningen, Mat test. */
  const GID = '0b5e1d2c-0000-4000-8000-0000000099aa';
  let r;
  r = await kor('till-fall.cjs', ['R-9941', '--bank', '--sort', 'blank', '--lokal', '--mapp', rattelse('R-9941', 0, 'RADA')]); ok(r.kod === 0, `R-9941 blev ett bänkfall (slutkod ${r.kod}${r.kod ? ' — ' + r.ut.trim() : ''})`);
  r = await kor('till-fall.cjs', ['R-9942', '--bank', '--sort', 'blank', '--lokal', '--mapp', rattelse('R-9942', 2, 'RADA')]); ok(r.kod === 0, `R-9942 blev ett bänkfall (ligger kvar)`);
  r = await kor('till-fall.cjs', ['R-9943', '--traning', '--lokal', '--mapp', rattelse('R-9943', 1, 'RADB')]); ok(r.kod === 0, `R-9943 blev träning (slutkod ${r.kod}${r.kod ? ' — ' + r.ut.trim() : ''})`);
  r = await kor('till-fall.cjs', ['R-9944', '--mattest', '--lokal', '--mapp', rapport('R-9944', GID)]); ok(r.kod === 0, `R-9944 blev ett Mat test-fall (slutkod ${r.kod}${r.kod ? ' — ' + r.ut.trim() : ''})`);
  const I = index(), rad = k => I.filter(x => x.kod === k).map(x => x.plats).join(',');
  ok(rad('R-9941') === 'bank' && rad('R-9942') === 'bank' && rad('R-9943') === 'traning' && rad('R-9944') === 'mattest' && I.find(x => x.kod === 'R-9943').filer[0].startsWith('dev/material/'),
    `kopieindexet har en rad per kopia: ${I.map(x => x.kod + ' ' + x.plats).join(', ')}`);
  const gitRader = fs.readFileSync(path.join(UT, 'dev', 'rapport', 'kopior.jsonl'), 'utf8');
  ok(fs.existsSync(path.join(MARK, 'rapporter-traning-mesa', 'kopior.jsonl')) && fs.existsSync(path.join(BANK, 'kopior.jsonl')) && !/R-994[123]/.test(gitRader) && gitRader.includes('R-9944'),
    'träningens och bänkens rader ligger bredvid kopiorna (utanför git), bara Mat tests i dev/rapport/kopior.jsonl');
  ok(I.filter(x => x.plats === 'bank').every(x => x.filer.every(f => f.startsWith('dev/material/rapportbank/'))),
    'bänkens bilder ligger i dev/material/rapportbank/ (utanför git: repot är publikt)');
  r = await kor('till-fall.cjs', ['R-9941', '--bank', '--sort', 'blank', '--lokal', '--mapp', path.join(IN, 'R-9941'), '--torr']);
  ok(index().length === I.length, '--torr i till-fall.cjs skriver ingen rad');
  r = await kor('bankutgava.cjs', ['--klipp']); ok(r.kod === 0 && /utgåva v1: 2 fall/.test(r.ut), `bänken fryst som v1: ${r.ut.trim()}`);
  /* bakåtfyllningen: en kopia utan rad får en, en med rad rörs inte */
  const gitIndex = path.join(UT, 'dev', 'rapport', 'kopior.jsonl'), sparat = fs.readFileSync(gitIndex, 'utf8');
  fs.writeFileSync(gitIndex, sparat.split('\n').filter(l => !l.includes('R-9944')).join('\n'));
  r = await kor('kopior.cjs', ['--fyll', '--torr']); ok(/skulle lägga till R-9944 mattest/.test(r.ut) && !/R-9941/.test(r.ut) && !fs.readFileSync(gitIndex, 'utf8').includes('R-9944'), `kopior.cjs --fyll --torr: ${r.ut.trim()}`);
  r = await kor('kopior.cjs', ['--fyll']); ok(index().filter(x => x.kod === 'R-9944').length === 1, `kopior.cjs --fyll lade tillbaka raden: ${r.ut.trim()}`);
  const KODER = ['R-9941', 'R-9943', 'R-9944'];
  ok(KODER.every(k => traffar(k).length > 0), `före: grep hittar koderna (${KODER.map(k => k + ' ' + traffar(k).length).join(', ')})`);

  /* 2. radera --lokal: torrt först, sedan på riktigt. */
  const lista = () => spawnSync('find', [UT, '-type', 'f'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean).sort().join('\n');
  const fore = lista();
  r = await kor('radera.cjs', ['--lokal', '--torr', ...KODER]);
  ok(r.kod === 0 && lista() === fore && /skulle ta bort/.test(r.ut) && /frysta utgåvan v1/.test(r.ut) && /grep: 0 träffar efter stegen/.test(r.ut), `radera --lokal --torr rör ingenting och säger vad som skulle hända (slutkod ${r.kod})`);
  r = await kor('radera.cjs', ['--lokal', ...KODER]);
  ok(r.kod === 0, `radera --lokal ${KODER.join(' ')}: slutkod ${r.kod}${r.kod ? '\n' + r.ut : ''}`);
  for (const k of KODER) { const t = traffar(k); ok(t.length === 0, `efter: 0 träffar på ${k}${t.length ? ' — ' + t.join(', ') : ''}`); }
  const man = lasJ(path.join(BANK, 'manifest.json')) || [], utg = lasJ(path.join(BANK, 'utgavor.json')) || [];
  ok(man.length === 1 && man[0].kod === 'R-9942' && fs.existsSync(path.join(BANK, man[0].fil)) && traffar('R-9942').length > 0, `R-9942 ligger kvar i bänken (${man.map(p => p.fil).join(', ')})`);
  ok(utg.length === 1 && utg[0].antal === 2 && utg[0].raderade === 1 && utg[0].filer.length === 1, `utgåvan v1: ${utg[0] && utg[0].filer.length} fil kvar, raderade ${utg[0] && utg[0].raderade} (av ${utg[0] && utg[0].antal})`);
  ok(!fs.existsSync(path.join(IN, 'R-9941')) && !fs.existsSync(path.join(MARK, 'rapporter-traning-mesa', 'R-9943')), 'den hämtade mappen och träningsmappen är borta');
  r = await kor('radera.cjs', ['--lokal', 'R-9941']); ok(r.kod === 0 && /inga kopior/.test(r.ut), `radera samma kod igen: inga kopior (${r.ut.split('\n')[0]})`);
  r = await kor('radera.cjs', ['--lokal', 'X-1']); ok(r.kod === 2, `en kod som inte är R-NNNN vägras (slutkod ${r.kod})`);
  r = await kor('bankutgava.cjs', []); ok(r.kod === 0 && /1 fall/.test(r.ut), `bankutgava.cjs läser bänken efter raderingen: ${r.ut.split('\n')[0]}`);
  const py = path.join(os.homedir(), '.mesa', 'detektor-venv', 'bin', 'python');
  if (process.argv.includes('--bank-kor') && fs.existsSync(py)) {
    const u = spawnSync(py, [path.join(ROT, 'dev', 'remsa', 'helkort_jamfor.py'), '--bank', BANK, '--utgava', '1', path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-vision.onnx')], { encoding: 'utf8', cwd: ROT });
    /* raden om utgåvan skrivs före modellen: den är provet (saknas referensbilderna, t.ex. i en worktree, faller resten) */
    ok(/utgåva v1: 1 fall — 1 av utgåvans 2 saknas \(1 raderade av spelaren\)/.test(u.stdout), `helkort_jamfor.py --utgava 1 säger att utgåvan saknar ett fall: ${(u.stdout || u.stderr).split('\n').find(l => /utgåva/.test(l)) || ''}${u.status ? ` — obs: slutkod ${u.status} efter raden: ${(u.stderr || '').trim().split('\n').slice(-3).join(' | ')}` : ''}`);
  }

  /* 3. Tabellvägen. */
  DB.raderingar = [{ kod: 'R-9942', raderad_at: iso(1) }, { kod: 'R-9947', raderad_at: iso(1) }];
  fs.mkdirSync(path.join(UT, 'dev', 'mattest'), { recursive: true });
  fs.writeFileSync(path.join(UT, 'dev', 'mattest', 'annat.json'), JSON.stringify({ not: 'R-9947 står här utanför kopiorna' }));
  fs.mkdirSync(path.join(UT, 'dev', 'plan'), { recursive: true });
  fs.writeFileSync(path.join(UT, 'dev', 'plan', 'anteckning.md'), 'R-9942 nämns i en plan\n');
  utanHanterad = true;
  r = await kor('radera.cjs', ['--torr']);
  ok(r.kod === 1 && /migrationen .*20261015120000.* inte körd/.test(r.ut) && /R-9942/.test(r.ut) && /R-9947/.test(r.ut) && fs.existsSync(path.join(BANK, man[0].fil)),
    `utan hanterad_at: --torr visar alla raderingar och rör ingenting (slutkod ${r.kod}: R-9947 skulle inte bli hanterad)`);
  r = await kor('radera.cjs', []);
  ok(r.kod === 2 && /Kör migrationen först/.test(r.ut) && fs.existsSync(path.join(BANK, man[0].fil)), `utan hanterad_at: skarpt vägras (slutkod ${r.kod}), inget borttaget`);
  utanHanterad = false;
  DB.raderingar.forEach(x => { x.hanterad_at = null; });
  DB.raderingar.push({ kod: 'R-9948', raderad_at: iso(9), hanterad_at: iso(8) });   // redan hanterad
  r = await kor('radera.cjs', ['--torr']);
  ok(r.kod === 1 && !/R-9948/.test(r.ut) && /R-9942/.test(r.ut) && DB.raderingar.every(x => x.kod === 'R-9948' || !x.hanterad_at), `med hanterad_at: --torr visar bara de ohanterade, märker inget (slutkod ${r.kod}: R-9947 skulle inte bli hanterad)`);
  r = await kor('radera.cjs', []);
  const h = k => DB.raderingar.find(x => x.kod === k).hanterad_at;
  ok(r.kod === 1 && h('R-9942') && !h('R-9947') && traffar('R-9942').filter(f => !f.endsWith('.md')).length === 0 && /omnämnanden i text.*anteckning\.md/.test(r.ut),
    `R-9942 borttagen och hanterad (planens omnämnande bara en varning); R-9947 inte hanterad — grep hittar den i dev/mattest/annat.json (slutkod ${r.kod})`);
  ok(/FEL: grep hittar koden kvar i dev\/mattest\/annat\.json/.test(r.ut), 'radera säger var koden finns kvar');

  /* 4. Gallringen mot attrappen. */
  const rapportRad = (kod, dagar, anvandning) => { DB.rapporter.push({ kod, created_at: iso(dagar), kalla: 'rattelse', anvandning, sokvag: `uid/rapporter/${kod}` }); HINK.set(`uid/rapporter/${kod}/beskarning.jpg`, 100); HINK.set(`uid/rapporter/${kod}/bilder/s-1.jpg`, 100); };
  rapportRad('R-9950', 100, null);      // raden och filerna
  rapportRad('R-9951', 10, 'slangd');   // filerna, raden kvar
  rapportRad('R-9952', 3, 'slangd');    // inget
  rapportRad('R-9953', 30, 'traning');  // kopian 20 dagar: filerna
  rapportRad('R-9954', 30, 'test');     // kopian 5 dagar: inget
  rapportRad('R-9955', 60, 'fix');      // filerna kvar; den lokala mappen 40 dagar: bort
  rapportRad('R-9956', 60, null);       // osorterad: den lokala mappen kvar
  rapportRad('R-9958', 60, 'test');     // Mat test-fall: filerna kvar
  fs.appendFileSync(path.join(MARK, 'rapporter-traning-mesa', 'kopior.jsonl'), JSON.stringify({ kod: 'R-9953', plats: 'traning', id: 'R-9953', filer: ['x/'], parti: null, nar: iso(20) }) + '\n');
  fs.appendFileSync(gitIndex, [JSON.stringify({ kod: 'R-9954', plats: 'bank', id: 'R-9954.jpg', filer: [], parti: null, nar: iso(5) }), JSON.stringify({ kod: 'R-9958', plats: 'mattest', id: 'R-9958', filer: [], parti: null, nar: iso(40) })].join('\n') + '\n');
  for (const [kod, dagar] of [['R-9955', 40], ['R-9956', 40], ['R-9957', 1], ['R-9958', 1]]) {   // R-9957: ingen rad
    const d = path.join(IN, kod); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'rapport.json'), '{}');
    const t = new Date(Date.now() - dagar * DAG); fs.utimesSync(d, t, t);
  }
  const lage = () => JSON.stringify({ r: DB.rapporter.map(x => x.kod), h: [...HINK.keys()].sort(), l: fs.readdirSync(IN).sort() });
  const fore4 = lage();
  r = await kor('gallra.cjs', ['--torr']);
  ok(r.kod === 0 && lage() === fore4 && ['R-9950', 'R-9951', 'R-9953', 'R-9955', 'R-9957'].every(k => r.ut.includes(k)) && !['R-9952', 'R-9954', 'R-9956'].some(k => r.ut.includes(k)), `gallra --torr visar allt och rör ingenting:\n${r.ut.trim().split('\n').map(l => '      ' + l).join('\n')}`);
  r = await kor('gallra.cjs', []);
  const harFiler = k => [...HINK.keys()].some(p => p.includes(k)), harRad = k => DB.rapporter.some(x => x.kod === k), harLokal = k => fs.existsSync(path.join(IN, k));
  ok(r.kod === 0 && !harRad('R-9950') && !harFiler('R-9950'), 'osorterad > 90 dagar: raden och filerna borta');
  ok(harRad('R-9951') && !harFiler('R-9951') && harFiler('R-9952'), 'slängd: filerna borta efter 7 dagar (raden kvar), inte efter 3');
  ok(harRad('R-9953') && !harFiler('R-9953') && harFiler('R-9954'), 'exporterad: filerna borta 14 dagar efter kopian (raden kvar för spärren), inte efter 5');
  ok(harFiler('R-9955') && harFiler('R-9958'), 'fix och Mat test: hinkens filer ligger kvar');
  ok(!harLokal('R-9955') && harLokal('R-9956') && !harLokal('R-9957') && !harLokal('R-9958'),
    'lokala kopior bort 30 dagar efter beslutet: fix (mappens ändring), Mat test-fallet (kopians dag i indexet, fast mappen är ny) och den utan rad; den osorterade ligger kvar');
})().catch(e => { console.error('prov-radera: ' + (e.stack || e)); fel++; }).finally(() => {
  server.close();
  fs.rmSync(UT, { recursive: true, force: true });
  console.log(fel ? `prov-radera: ${fel} FEL` : 'prov-radera: allt OK');
  process.exit(fel ? 1 : 0);
});
