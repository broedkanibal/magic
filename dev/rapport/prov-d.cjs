/* Problemrapporten D (MES-368): provet för till-fall.cjs, satt.cjs och spärren.

   Kör:  node dev/rapport/prov-d.cjs              lokalt: syntetiska hämtade rapporter i en tillfällig
                                                  mapp (MESA_FALL_UT), inget nät, inget i repot
         node dev/rapport/prov-d.cjs --bank-kor   också bänken (helkort_jamfor.py --bank) på bänkfallet
         node dev/rapport/prov-d.cjs --tabell     också mot produktionens tabell rapporter med service
                                                  role: två provrader (R-9989, R-9990, koden satt för
                                                  hand så att sekvensen rapporter_nr inte rörs), lista,
                                                  satt och spärren — raderna tas bort efteråt, också
                                                  när ett steg faller

   Rättelserna är syntetiska enligt kontraktet med del B (MES-366): en mapp som
   hamta.cjs skulle ha skrivit, med rattelse.json och beskarning.jpg (en av
   golden-beskärningarna i dev/embed/riktiga). Slutkod 0 = allt OK, 1 = något FEL. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const ROT = path.join(__dirname, '..', '..');
const har = n => process.argv.includes(n);
const UT = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-prov-d-'));
const IN = path.join(UT, 'hamtade');
let fel = 0;
const ok = (villkor, text) => { console.log(`${villkor ? 'OK ' : 'FEL'} ${text}`); if (!villkor) fel++; };
function kor(skript, args, env) {
  const r = spawnSync(process.execPath, [path.join(__dirname, skript), ...args], { cwd: ROT, encoding: 'utf8', env: Object.assign({}, process.env, env || {}) });
  return { kod: r.status, ut: (r.stdout || '') + (r.stderr || '') };
}
const tillFall = (args, env) => kor('till-fall.cjs', args, Object.assign({ MESA_FALL_UT: UT }, env || {}));

/* En hämtad tyst rättelse, som hamta.cjs lägger den (B:s kontrakt). */
const MAN = JSON.parse(fs.readFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', 'manifest.json'), 'utf8'));
function rattelse(kod, i, handelse) {
  const p = MAN[i], mapp = path.join(IN, kod);
  fs.mkdirSync(mapp, { recursive: true });
  fs.copyFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', p.fil), path.join(mapp, 'beskarning.jpg'));
  fs.writeFileSync(path.join(mapp, 'rattelse.json'), JSON.stringify({ gissning: 'Swamp', varfor: 'modell land', ratt: p.namn, spelkod: 'PROV00', t: 1790000000000 + i, spar: 7, handelse: handelse || 'namnbyte' }));
  fs.writeFileSync(path.join(mapp, 'rapport.json'), JSON.stringify({ kod, text: null, tagg: null, tidslinje: [] }));
  return { mapp, namn: p.namn };
}
/* En hämtad rapport med mattans ändringar: kameran och spelaren. */
function rapport(kod) {
  const mapp = path.join(IN, kod), t0 = 1790000000000;
  fs.mkdirSync(mapp, { recursive: true });
  const m = (s, x) => Object.assign({ slag: 'matta', sida: 'dator', t: t0 + s * 1000 }, x);
  const tid = [
    m(10, { typ: 'spelar', kort: 'Expel', id: 'c1', spar: 1, till: 'mattan', av: 'kamera' }),
    m(20, { typ: 'spelar', kort: 'Expel', id: 'c2', spar: 2, till: 'mattan', av: 'kamera' }),   // dubbletten
    m(25, { typ: 'tar_bort', kort: 'Expel', id: 'c2', av: 'spelare' }),                          // spelaren tar bort den
    m(30, { typ: 'spelar', kort: 'Opt', id: 'c3', spar: 3, till: 'mattan', av: 'kamera' }),
    m(32, { typ: 'namn', fran: 'Opt', kort: 'Shock', id: 'c3', av: 'spelare' }),                 // fel namn, rättat
    m(40, { typ: 'tappar', kort: 'Expel', id: 'c1', av: 'kamera' }),
    m(42, { typ: 'otappar', kort: 'Expel', id: 'c1', av: 'spelare' }),                           // fel tap, tillbaka
    m(50, { typ: 'spelar', kort: 'Island', id: 'c4', till: 'mattan', av: 'spelare' }),           // kameran missade det
    m(60, { typ: 'tar_bort', kort: 'Shock', id: 'c3', av: 'kamera' }),
    m(61, { typ: 'flyttar', kort: 'Shock', id: 'c3', till: 'mattan', av: 'spelare' })            // tillbaka ur graveyard
  ];
  fs.writeFileSync(path.join(mapp, 'rapport.json'), JSON.stringify({ kod, text: 'Expel came twice', tagg: 'dok_upp', tidslinje: tid }));
  const rader = [0, 10, 20, 30, 40, 50, 60, 70].map(s => ({ s, fas: 'kort', nollstall: false, grund: 90, spar: [] }));
  fs.writeFileSync(path.join(mapp, 'bordlogg.json'), JSON.stringify({ id: 'rapport-' + kod, start: new Date(t0).toISOString(), rapport: kod, bordLogg: rader }));
  return mapp;
}

(async () => {
  console.log(`prov-d: skriver i ${UT}`);
  /* 1. En tyst rättelse blir ett bänkfall. */
  const a = rattelse('R-9991', 0);
  let r = tillFall(['R-9991', '--bank', '--lokal', '--mapp', a.mapp]);
  const bankMan = path.join(UT, 'dev', 'remsa', 'rapportbank', 'manifest.json');
  const bank = fs.existsSync(bankMan) ? JSON.parse(fs.readFileSync(bankMan, 'utf8')) : [];
  ok(r.kod === 0 && bank.length === 1 && bank[0].kod === 'R-9991' && bank[0].namn === a.namn && bank[0].gissning === 'Swamp' && fs.existsSync(path.join(UT, 'dev', 'remsa', 'rapportbank', bank[0].fil)),
    `rättelsen R-9991 blev ett bänkfall: ${bank[0] ? `${bank[0].fil}, facit ${bank[0].namn}, gissningen ${bank[0].gissning}, koden i manifest.json` : r.ut.trim()}`);
  /* 2. Spärren: test → aldrig träning (repot). */
  r = tillFall(['R-9991', '--traning', '--lokal', '--mapp', a.mapp]);
  ok(r.kod === 3 && /SPÄRREN/.test(r.ut) && !fs.existsSync(path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9991')),
    `R-9991 (test) kan inte exporteras som träning: slutkod ${r.kod} — ${r.ut.trim().split('\n')[0]}`);
  /* 3. Träning: mark.py:s format, och tvärtom-spärren. */
  const b = rattelse('R-9992', 1, 'name_this_card');
  r = tillFall(['R-9992', '--traning', '--lokal', '--mapp', b.mapp]);
  const kl = path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9992');
  const M = fs.existsSync(path.join(kl, 'markning.json')) ? JSON.parse(fs.readFileSync(path.join(kl, 'markning.json'), 'utf8')) : null;
  ok(r.kod === 0 && M && M.rapport === 'R-9992' && M.remsor_ur === 'horn' && M.beskar && M.spar[0].dom === 'saker_manuell' && M.spar[0].namn === b.namn && M.filer[0].upplosning === 'tel' && fs.existsSync(path.join(kl, M.filer[0].fil)),
    `rättelsen R-9992 blev träning i mark.py:s format: ${M ? `${M.filer[0].fil}, ${M.spar[0].namn}, dom ${M.spar[0].dom}, utanfor_traning ${M.spar[0].utanfor_traning}, val ${M.spar[0].val}` : r.ut.trim()}`);
  const py = path.join(os.homedir(), '.mesa', 'detektor-venv', 'bin', 'python');
  if (fs.existsSync(py) && M) {
    const d = spawnSync(py, [path.join(ROT, 'dev', 'detektor', 'delning.py'), path.join(kl, 'markning.json')], { encoding: 'utf8' });
    ok(d.status === 0, `delning.py: källan för R-9992 är träning (${(d.stdout || d.stderr).trim().split('\n').pop()})`);
  }
  r = tillFall(['R-9992', '--bank', '--lokal', '--mapp', b.mapp]);
  ok(r.kod === 3 && /SPÄRREN/.test(r.ut), `R-9992 (träning) kan inte bli ett bänkfall: slutkod ${r.kod}`);
  r = tillFall(['R-9992', '--traning', '--lokal', '--mapp', b.mapp]);
  ok(r.kod === 1 && /finns redan/.test(r.ut), `samma export två gånger vägras utan --skriv-over (slutkod ${r.kod})`);
  /* 4. En rapport med mattans ändringar blir ett Mat test-fall: facit = kameran minus spelarens rättelser. */
  const c = rapport('R-9993');
  r = tillFall(['R-9993', '--mattest', '--lokal', '--mapp', c]);
  const ff = path.join(UT, 'dev', 'mattest', 'underlag', 'rapporter', 'R-9993', 'fall.json');
  const F = fs.existsSync(ff) ? JSON.parse(fs.readFileSync(ff, 'utf8')) : null;
  const vantat = '10 spelar Expel | 30 spelar Shock | 50 spelar Island';
  const fick = F ? F.facit.map(x => `${x.t} ${x.typ} ${x.kort}`).join(' | ') : r.ut.trim();
  ok(r.kod === 0 && F && F.rapport === 'R-9993' && fick === vantat && F.struket.length === 3,
    `rapporten R-9993 blev ett Mat test-fall med koden i fall.json; facit «${fick}» (väntat «${vantat}»), strukna ${F ? F.struket.map(s => s.typ + ' ' + s.kort + ' ' + s.t).join(', ') : '–'}`);
  r = tillFall(['R-9993', '--traning', '--lokal', '--mapp', c]);
  ok(r.kod === 3, `R-9993 (Mat test) kan inte bli träning: slutkod ${r.kod}`);
  /* 5. Ett borttaget kort har inget rätt namn. */
  const d = rattelse('R-9994', 2, 'borttaget');
  const rj = JSON.parse(fs.readFileSync(path.join(d.mapp, 'rattelse.json'), 'utf8')); rj.ratt = null; fs.writeFileSync(path.join(d.mapp, 'rattelse.json'), JSON.stringify(rj));
  r = tillFall(['R-9994', '--bank', '--lokal', '--mapp', d.mapp]);
  ok(r.kod === 1 && /inget rätt namn/.test(r.ut), `en borttagen-rättelse blir inget bänkfall (${r.ut.trim().split('\n')[0]})`);

  /* 6. Bänken kör bänkfallet. */
  if (har('--bank-kor')) {
    const modell = path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-vision.onnx');
    const k = spawnSync(py, [path.join(ROT, 'dev', 'remsa', 'helkort_jamfor.py'), '--bank', path.join(UT, 'dev', 'remsa', 'rapportbank'), modell], { encoding: 'utf8', cwd: ROT });
    const rad = (k.stdout || '').split('\n').find(x => /R-9991/.test(x));
    ok(k.status === 0 && !!rad, `bänken (helkort_jamfor.py --bank) körde bänkfallet: ${rad ? rad.trim() : (k.stderr || '').trim().split('\n').pop()}`);
  }

  /* 7. Produktionens tabell. */
  if (har('--tabell')) {
    const { supa } = require('./supa.cjs');
    const S = supa();
    const KOD = ['R-9989', 'R-9990'];
    const [spel] = await S.rest('GET', 'games?select=vard&order=skapad.desc&limit=1');
    try {
      const fore = await S.rest('GET', `rapporter?kod=in.(${KOD.join(',')})&select=kod`);
      if (fore.length) throw new Error('provraderna finns redan: ' + fore.map(x => x.kod).join(', '));
      /* koden satt för hand: rapport_kod() (och sekvensen rapporter_nr) anropas inte */
      await S.rest('POST', 'rapporter', KOD.map(kod => ({ kod, user_id: spel.vard, kalla: 'rattelse', text: 'prov-d.cjs (MES-368) — tas bort direkt' })));
      let l = kor('lista.cjs', ['--alla', '--nya']);
      ok(l.kod === 0 && KOD.every(k => l.ut.includes(k)), 'lista.cjs --alla --nya visar provraderna');
      l = kor('lista.cjs', ['--rattelser']);
      ok(l.kod === 0 && KOD.every(k => l.ut.includes(k)), 'lista.cjs --rattelser visar provraderna');
      const s = (...x) => kor('satt.cjs', x);
      let q = s('R-9990', 'fix'); ok(q.kod === 0 && /null → fix/.test(q.ut), `satt R-9990 fix: ${q.ut.trim()}`);
      q = s('R-9990', 'test'); ok(q.kod === 0 && /fix → test/.test(q.ut), `satt R-9990 test: ${q.ut.trim()}`);
      q = s('R-9990', 'traning'); ok(q.kod === 3, `satt R-9990 traning vägras (slutkod ${q.kod}): ${q.ut.trim()}`);
      q = s('R-9990', 'slangd'); ok(q.kod === 3, `satt R-9990 slangd vägras (slutkod ${q.kod}) — test kan inte tvättas via slangd`);
      q = s('R-9990', 'test'); ok(q.kod === 0 && /redan/.test(q.ut), `satt R-9990 test igen: ${q.ut.trim()}`);
      const e = rattelse('R-9990', 3);
      q = tillFall(['R-9990', '--traning', '--mapp', e.mapp]);
      ok(q.kod === 3 && !fs.existsSync(path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9990')), `till-fall R-9990 --traning vägras av tabellen (test), inget skrivet: ${q.ut.trim()}`);
      const g = rattelse('R-9989', 4);
      q = tillFall(['R-9989', '--traning', '--mapp', g.mapp]);
      ok(q.kod === 0 && /null → traning/.test(q.ut), `till-fall R-9989 --traning satte tabellen: ${q.ut.trim().split('\n')[0]}`);
      q = s('R-9989', 'test'); ok(q.kod === 3, `satt R-9989 test vägras (slutkod ${q.kod})`);
      q = tillFall(['R-9989', '--bank', '--mapp', g.mapp, '--skriv-over']);
      ok(q.kod === 3 && !JSON.parse(fs.readFileSync(bankMan, 'utf8')).some(p => p.kod === 'R-9989'), `till-fall R-9989 --bank vägras (träning), inget i bänken`);
      const rad = await S.rest('GET', `rapporter?kod=in.(${KOD.join(',')})&select=kod,anvandning&order=kod`);
      ok(rad.map(x => x.kod + '=' + x.anvandning).join(' ') === 'R-9989=traning R-9990=test', `tabellen: ${rad.map(x => x.kod + '=' + x.anvandning).join(' ')}`);
    } catch (e) { ok(false, 'tabellen: ' + e.message); }
    finally {
      await S.rest('DELETE', `rapporter?kod=in.(${KOD.join(',')})&text=like.prov-d*`);
      const kvar = await S.rest('GET', `rapporter?kod=in.(${KOD.join(',')})&select=kod`);
      ok(kvar.length === 0, `provraderna borttagna (${kvar.length} kvar)`);
    }
  }
  fs.rmSync(UT, { recursive: true, force: true });
  console.log(fel ? `prov-d: ${fel} FEL` : 'prov-d: allt OK');
  process.exit(fel ? 1 : 0);
})().catch(e => { console.error('prov-d: ' + (e.stack || e)); fs.rmSync(UT, { recursive: true, force: true }); process.exit(2); });
