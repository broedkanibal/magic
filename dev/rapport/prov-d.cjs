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
fs.mkdirSync(path.join(UT, 'dev', 'material', 'arbete', 'markning'), { recursive: true });   // som dev/material i repot (fynd 4: utan den vägrar spärren)
let fel = 0;
const ok = (villkor, text) => { console.log(`${villkor ? 'OK ' : 'FEL'} ${text}`); if (!villkor) fel++; };
function kor(skript, args, env) {
  const r = spawnSync(process.execPath, [path.join(__dirname, skript), ...args], { cwd: ROT, encoding: 'utf8', env: Object.assign({}, process.env, env || {}) });
  return { kod: r.status, ut: (r.stdout || '') + (r.stderr || '') };
}
const tillFall = (args, env) => kor('till-fall.cjs', args, Object.assign({ MESA_FALL_UT: UT }, env || {}));

/* En hämtad tyst rättelse, som hamta.cjs lägger den (B:s kontrakt). */
const MAN = JSON.parse(fs.readFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', 'manifest.json'), 'utf8'));
function rattelse(kod, i, handelse, spelkod, game_id) {
  const p = MAN[i], mapp = path.join(IN, kod);
  fs.mkdirSync(mapp, { recursive: true });
  fs.copyFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', p.fil), path.join(mapp, 'beskarning.jpg'));
  fs.writeFileSync(path.join(mapp, 'rattelse.json'), JSON.stringify({ gissning: 'Swamp', varfor: 'modell land', ratt: p.namn, spelkod: spelkod === undefined ? 'PROV' + i : spelkod, t: 1790000000000 + i, spar: 7, handelse: handelse || 'namnbyte' }));
  fs.writeFileSync(path.join(mapp, 'rapport.json'), JSON.stringify({ kod, text: null, tagg: null, tidslinje: [], rad: game_id ? { kod, game_id } : null }));
  return { mapp, namn: p.namn };
}
/* En hämtad rapport med mattans ändringar: kameran och spelaren. */
function rapport(kod, game_id) {
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
  fs.writeFileSync(path.join(mapp, 'rapport.json'), JSON.stringify({ kod, text: 'Expel came twice', tagg: 'dok_upp', tidslinje: tid, rad: game_id ? { kod, game_id } : null }));
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
  const GID = '0b5e1d2c-0000-4000-8000-00000000abcd';
  const c = rapport('R-9993', GID);
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

  /* 5b. Spärren per parti (granskningens fynd 1): samma parti på andra sidan vägras, också med en annan kod. */
  ok(bank[0] && bank[0].parti && bank[0].parti.spelkod === 'PROV0' && M && M.parti && M.parti.spelkod === 'PROV1' && F && F.parti && F.parti.game_id === GID,
    `partiet står i manifest.json (${JSON.stringify(bank[0] && bank[0].parti)}), markning.json (${JSON.stringify(M && M.parti)}) och fall.json (${JSON.stringify(F && F.parti)})`);
  const p1 = rattelse('R-9995', 5, 'namnbyte', 'PROV0');   // samma parti som R-9991 (test)
  r = tillFall(['R-9995', '--traning', '--lokal', '--mapp', p1.mapp]);
  ok(r.kod === 3 && /samma parti/.test(r.ut) && /R-9991/.test(r.ut), `R-9995 (samma spelkod som bänkfallet R-9991) kan inte bli träning: slutkod ${r.kod} — ${r.ut.trim().split('\n')[0].slice(0, 160)}`);
  const p2 = rattelse('R-9996', 6, 'namnbyte', 'PROV1');   // samma parti som R-9992 (träning)
  r = tillFall(['R-9996', '--bank', '--lokal', '--mapp', p2.mapp]);
  ok(r.kod === 3 && /samma parti/.test(r.ut) && /R-9992/.test(r.ut), `R-9996 (samma spelkod som träningen R-9992) kan inte bli ett bänkfall: slutkod ${r.kod}`);
  const p3 = rattelse('R-9997', 7, 'namnbyte', 'ANNAT1', GID);   // samma game_id som Mat test-fallet R-9993
  r = tillFall(['R-9997', '--traning', '--lokal', '--mapp', p3.mapp]);
  ok(r.kod === 3 && /samma parti/.test(r.ut) && /R-9993/.test(r.ut), `R-9997 (samma game_id som Mat test-fallet R-9993) kan inte bli träning: slutkod ${r.kod}`);
  const p4 = rattelse('R-9998', 8, 'namnbyte', 'ANNAT2');   // ett annat parti: går
  r = tillFall(['R-9998', '--traning', '--lokal', '--mapp', p4.mapp]);
  ok(r.kod === 0 && /partiet: spel:ANNAT2/.test(r.ut), `R-9998 ur ett annat parti blir träning: slutkod ${r.kod}`);
  const p5 = rattelse('R-9999', 9, 'namnbyte', null);   // inget parti: per kod, med varning
  r = tillFall(['R-9999', '--bank', '--lokal', '--mapp', p5.mapp]);
  ok(r.kod === 0 && /VARNING: inget parti/.test(r.ut), `R-9999 utan parti: spärren per kod, med varning (slutkod ${r.kod})`);

  /* 5c. dok_upp/tvilling (fynd 3): bara tar_bort är en dubblett, och dok_upp bara närmast trycket. */
  const { byggFacit } = require('./till-fall.cjs');
  const H = [
    { s: 10, typ: 'spelar', kort: 'Opt', id: 'a', av: 'kamera' }, { s: 12, typ: 'spelar', kort: 'Opt', id: 'b', av: 'kamera' },
    { s: 14, typ: 'spelar', kort: 'Shock', id: 'c', av: 'kamera' }, { s: 16, typ: 'spelar', kort: 'Expel', id: 'd', av: 'kamera' },
    { s: 20, typ: 'flyttar', kort: 'Opt', id: 'b', till: 'graveyard', av: 'spelare' },   // tvilling men till graveyard: ingen dubblett
    { s: 30, typ: 'tar_bort', kort: 'Shock', id: 'c', av: 'spelare' },                    // långt från trycket: kameran missade
    { s: 50, typ: 'tar_bort', kort: 'Expel', id: 'd', av: 'spelare' }                     // närmast trycket 52: dubbletten
  ];
  const BF = byggFacit(H, { dokUpp: true, tryck: 52 });
  const strk = BF.rader.filter(x => x.stryk).map(x => x.kort).join(',');
  const kvar = BF.rader.filter(x => !x.stryk && x.typ === 'tar_bort').map(x => x.kort + (x.till ? '→' + x.till : '')).join(',');
  ok(strk === 'Expel' && kvar === 'Opt→graveyard,Shock', `dok_upp stryker bara borttagningen närmast trycket (strukna: ${strk}; borttagna kvar: ${kvar})`);

  /* 5d. Repokollen utan träningsmaterialet (fynd 4): slutkod 2, inget skrivet. */
  const UT2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-prov-d2-'));
  r = kor('till-fall.cjs', ['R-9991', '--bank', '--lokal', '--mapp', a.mapp], { MESA_FALL_UT: UT2 });
  const r2 = kor('till-fall.cjs', ['R-9998', '--traning', '--lokal', '--mapp', p4.mapp, '--skriv-over'], { MESA_FALL_UT: UT2 });
  ok(r.kod === 2 && r2.kod === 2 && /finns inte/.test(r.ut) && !fs.existsSync(path.join(UT2, 'dev', 'remsa')) && !fs.existsSync(path.join(UT2, 'dev', 'material')),
    `utan dev/material/arbete/markning: --bank slutkod ${r.kod}, --traning slutkod ${r2.kod}, inget skrivet`);
  fs.rmSync(UT2, { recursive: true, force: true });

  /* 5e. fix → traning vägras (fynd 5). */
  const { overgang } = require('./sparr.cjs');
  ok(!overgang('fix', 'traning').ok && overgang('fix', 'test').ok && overgang(null, 'traning').ok, `fix → traning vägras, fix → test och null → traning går`);

  /* 5f. Koden ur en bordsloggfil och --id valideras (fynd 6). */
  const lf = path.join(UT, 'logg.json');
  fs.writeFileSync(lf, JSON.stringify({ id: 'pass-2026-10-11-2006', start: new Date(1790000000000).toISOString(), rapport: '../../x', bordLogg: [{ s: 0, spar: [] }, { s: 5, spar: [] }] }));
  r = tillFall(['--mattest', '--logg', lf, '--lokal']);
  ok(r.kod === 2 && /inte R-NNNN/.test(r.ut), `en bordslogg med koden «../../x» vägras (slutkod ${r.kod})`);
  fs.writeFileSync(lf, JSON.stringify({ id: 'pass-2026-10-11-2006', start: new Date(1790000000000).toISOString(), bordLogg: [{ s: 0, spar: [] }, { s: 5, spar: [] }] }));
  r = tillFall(['--mattest', '--logg', lf, '--lokal', '--id', '../ut']);
  ok(r.kod === 2 && !fs.existsSync(path.join(UT, 'dev', 'mattest', 'underlag', 'ut')), `--id «../ut» vägras (slutkod ${r.kod})`);

  /* 5g. satt.cjs läser partiet ur den hämtade mappen (rättelserunda 2, fynd 1): en rad utan
     game_id i tabellen spärras ändå per parti — tabellen frågas på mappens game_id, och repot
     prövas på mappens spelkod. Tabellen är en attrapp (ingen nätåtkomst); PATCH skrivs ut. */
  const ATRAPP = String.raw`const { satt } = require(${JSON.stringify(path.join(__dirname, 'satt.cjs'))});
const T = JSON.parse(process.env.ATRAPP);
const S = { rest: async (m, v) => {
  if (m === 'GET' && /^rapporter\?kod=eq\./.test(v)) return [T.rad];
  if (m === 'GET' && /game_id=eq\./.test(v)) { const g = decodeURIComponent(/game_id=eq\.([^&]+)/.exec(v)[1]), a = /anvandning=eq\.(\w+)/.exec(v)[1]; console.log('FRÅGA game_id ' + g); return (T.ovr || []).filter(x => x.game_id === g && x.anvandning === a).map(x => ({ kod: x.kod })); }
  if (m === 'PATCH') { console.log('PATCH ' + v); return [{}]; }
  throw new Error('attrappen: ' + m + ' ' + v); } };
satt(process.argv.slice(1), S).then(t => console.log(t)).catch(e => { console.error('satt: ' + e.message); process.exit(e.sparr ? 3 : e.kod || 1); });`;
  const sattAtrapp = (args, T) => {
    const k = spawnSync(process.execPath, ['-e', ATRAPP, ...args], { cwd: ROT, encoding: 'utf8', env: Object.assign({}, process.env, { MESA_FALL_UT: UT, ATRAPP: JSON.stringify(T) }) });
    return { kod: k.status, ut: (k.stdout || '') + (k.stderr || '') };
  };
  const G2 = '22222222-2222-4222-8222-222222222222';
  const s1 = rattelse('R-9980', 10, 'namnbyte', null, G2);   // mappen bär game_id G2, tabellens rad inget
  r = sattAtrapp(['R-9980', 'traning', '--mapp', s1.mapp], { rad: { kod: 'R-9980', kalla: 'rattelse', anvandning: null, game_id: null }, ovr: [{ kod: 'R-9981', game_id: G2, anvandning: 'test' }] });
  ok(r.kod === 3 && /samma parti \(game_id 2222/.test(r.ut) && /R-9981/.test(r.ut) && !/PATCH/.test(r.ut),
    `satt R-9980 traning (raden utan game_id, mappen med game_id; R-9981 ur samma parti är test) vägras, inget satt: slutkod ${r.kod}${r.kod === 3 ? "" : " — " + r.ut.trim()}`);
  const s2 = rattelse('R-9982', 11, 'namnbyte', 'PROV0');   // samma spelkod som bänkfallet R-9991 (test i repot)
  r = sattAtrapp(['R-9982', 'traning', '--mapp', s2.mapp], { rad: { kod: 'R-9982', kalla: 'rattelse', anvandning: null, game_id: null } });
  ok(r.kod === 3 && /samma parti/.test(r.ut) && /R-9991/.test(r.ut) && !/PATCH/.test(r.ut),
    `satt R-9982 traning (raden utan game_id, kopian i repot bär bara spelkoden PROV0 som R-9991) vägras: slutkod ${r.kod}`);
  r = sattAtrapp(['R-9982', 'test', '--mapp', s2.mapp], { rad: { kod: 'R-9982', kalla: 'rattelse', anvandning: null, game_id: null } });
  ok(r.kod === 0 && /PATCH/.test(r.ut) && /partiet: spel:PROV0/.test(r.ut), `satt R-9982 test (samma sida som R-9991) går och visar partiet: slutkod ${r.kod}`);
  const s3 = rattelse('R-9983', 12, 'namnbyte', 'ANNAT4', G2);
  r = sattAtrapp(['R-9983', 'traning', '--mapp', s3.mapp], { rad: { kod: 'R-9983', kalla: 'rattelse', anvandning: null, game_id: null }, ovr: [] });
  ok(r.kod === 0 && /FRÅGA game_id 2222/.test(r.ut) && /PATCH/.test(r.ut) && /partiet: game:2222.*spel:ANNAT4/.test(r.ut),
    `satt R-9983 traning ur ett parti utan något på andra sidan går (tabellen frågad på mappens game_id): slutkod ${r.kod}`);
  r = sattAtrapp(['R-9984', 'traning'], { rad: { kod: 'R-9984', kalla: 'rapport', anvandning: null, game_id: null } });
  ok(r.kod === 0 && /VARNING/.test(r.ut), `satt R-9984 utan mapp och utan game_id: per kod, med VARNING (slutkod ${r.kod})`);

  /* 5h. Ett pass ur --logg får spelkoden (fynd 4): --spelkod, och bordsloggens egen om den finns. */
  fs.writeFileSync(lf, JSON.stringify({ id: 'pass-2026-10-11-2006', start: new Date(1790000000000).toISOString(), spel: G2, bordLogg: [{ s: 0, spar: [] }, { s: 5, spar: [] }] }));
  r = tillFall(['--mattest', '--logg', lf, '--lokal', '--torr', '--spelkod', 'cna43k']);
  ok(r.kod === 0 && /partiet: game:2222[^\n]*spel:CNA43K/.test(r.ut), `--logg --spelkod: partiet får game_id och spelkod (${(r.ut.match(/partiet: [^\n(]*/) || [r.ut.trim()])[0].trim()})`);
  fs.writeFileSync(lf, JSON.stringify({ id: 'pass-2026-10-11-2006', start: new Date(1790000000000).toISOString(), spel: G2, spelkod: 'ABC123', bordLogg: [{ s: 0, spar: [] }, { s: 5, spar: [] }] }));
  r = tillFall(['--mattest', '--logg', lf, '--lokal', '--torr']);
  ok(r.kod === 0 && /spel:ABC123/.test(r.ut), `--logg utan --spelkod: bordsloggens egen spelkod läses (slutkod ${r.kod})`);
  r = tillFall(['--mattest', '--logg', lf, '--lokal', '--torr', '--spelkod', '../x']);
  ok(r.kod === 2, `--spelkod «../x» vägras (slutkod ${r.kod})`);

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
    const [spel] = await S.rest('GET', 'games?select=id,vard&order=skapad.desc&limit=1');
    try {
      const fore = await S.rest('GET', `rapporter?kod=in.(${KOD.join(',')})&select=kod`);
      if (fore.length) throw new Error('provraderna finns redan: ' + fore.map(x => x.kod).join(', '));
      /* koden satt för hand: rapport_kod() (och sekvensen rapporter_nr) anropas inte */
      await S.rest('POST', 'rapporter', KOD.map(kod => ({ kod, user_id: spel.vard, game_id: spel.id, kalla: 'rattelse', text: 'prov-d.cjs (MES-368) — tas bort direkt' })));
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
      /* per parti (fynd 1): R-9989 är en annan rad ur SAMMA parti (game_id) som R-9990 (test) */
      const g = rattelse('R-9989', 4);
      q = tillFall(['R-9989', '--traning', '--mapp', g.mapp]);
      ok(q.kod === 3 && /samma parti/.test(q.ut) && !fs.existsSync(path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9989')), `till-fall R-9989 --traning vägras av tabellen (samma game_id som R-9990, test): ${q.ut.trim().split('\n')[0].slice(0, 170)}`);
      q = s('R-9989', 'traning'); ok(q.kod === 3 && /samma parti/.test(q.ut), `satt R-9989 traning vägras (slutkod ${q.kod}) — samma parti som R-9990`);
      q = s('R-9989', 'fix'); ok(q.kod === 0, `satt R-9989 fix: ${q.ut.trim()}`);
      q = s('R-9989', 'traning'); ok(q.kod === 3, `satt R-9989 fix → traning vägras (slutkod ${q.kod})`);
      q = tillFall(['R-9989', '--bank', '--mapp', g.mapp, '--skriv-over']);
      const post = JSON.parse(fs.readFileSync(bankMan, 'utf8')).find(p => p.kod === 'R-9989');
      ok(q.kod === 0 && post && post.parti && post.parti.game_id === spel.id, `till-fall R-9989 --bank går (samma sida) och tabellens game_id står i manifest.json: ${JSON.stringify(post && post.parti)}`);
      const rad = await S.rest('GET', `rapporter?kod=in.(${KOD.join(',')})&select=kod,anvandning&order=kod`);
      ok(rad.map(x => x.kod + '=' + x.anvandning).join(' ') === 'R-9989=test R-9990=test', `tabellen: ${rad.map(x => x.kod + '=' + x.anvandning).join(' ')}`);
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
