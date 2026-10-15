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
function rattelse(kod, i, handelse, spelkod, game_id, utanRuta) {
  const p = MAN[i], mapp = path.join(IN, kod);
  fs.mkdirSync(mapp, { recursive: true });
  fs.copyFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', p.fil), path.join(mapp, 'beskarning.jpg'));
  /* var kortet låg (uppföljning av MES-366/368); utanRuta = en äldre rättelse som R-0008 */
  const plats = utanRuta ? {} : { ruta: { x: 0.4, y: 0.3, w: 0.14, h: 0.33, bild: { w: 360, h: 203 }, kalla: 'beskarning', t: 1790000000000 + i }, maskade: [] };
  fs.writeFileSync(path.join(mapp, 'rattelse.json'), JSON.stringify(Object.assign({ gissning: 'Swamp', varfor: 'modell land', ratt: p.namn, spelkod: spelkod === undefined ? 'PROV' + i : spelkod, t: 1790000000000 + i, spar: 7, handelse: handelse || 'namnbyte', bild: 'telefon' }, plats)));
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
  let r = tillFall(['R-9991', '--bank', '--sort', 'blank', '--lokal', '--mapp', a.mapp]);
  const bankMan = path.join(UT, 'dev', 'material', 'rapportbank', 'manifest.json');
  const bank = fs.existsSync(bankMan) ? JSON.parse(fs.readFileSync(bankMan, 'utf8')) : [];
  ok(r.kod === 0 && bank.length === 1 && bank[0].kod === 'R-9991' && bank[0].namn === a.namn && bank[0].gissning === 'Swamp' && fs.existsSync(path.join(UT, 'dev', 'material', 'rapportbank', bank[0].fil)),
    `rättelsen R-9991 blev ett bänkfall: ${bank[0] ? `${bank[0].fil}, facit ${bank[0].namn}, gissningen ${bank[0].gissning}, koden i manifest.json` : r.ut.trim()}`);
  /* 1b. Sorten och utgåvorna (bankutgava.cjs). */
  ok(bank[0] && bank[0].sort === 'blank' && bank[0].utgava === null, `bänkfallet bär sorten och är inkommande (sort ${bank[0] && bank[0].sort}, utgava ${bank[0] && bank[0].utgava})`);
  const a2 = rattelse('R-9961', 0);
  r = tillFall(['R-9961', '--bank', '--lokal', '--mapp', a2.mapp]);
  ok(r.kod === 2 && /--sort/.test(r.ut), `--bank utan --sort vägras (slutkod ${r.kod})`);
  r = tillFall(['R-9961', '--bank', '--sort', 'regn', '--lokal', '--mapp', a2.mapp]);
  ok(r.kod === 2, `--sort med en okänd sort vägras (slutkod ${r.kod})`);
  r = kor('bankutgava.cjs', ['--klipp'], { MESA_FALL_UT: UT });
  const utg = () => JSON.parse(fs.readFileSync(path.join(UT, 'dev', 'material', 'rapportbank', 'utgavor.json'), 'utf8'));
  const man1 = JSON.parse(fs.readFileSync(bankMan, 'utf8'));
  ok(r.kod === 0 && utg().length === 1 && utg()[0].utgava === 1 && utg()[0].antal === 1 && man1[0].utgava === 1, `--klipp fryser bänken som v1: ${r.ut.trim()}`);
  r = tillFall(['R-9991', '--bank', '--sort', 'vinkel', '--lokal', '--mapp', a.mapp, '--skriv-over']);
  ok(r.kod !== 0 && /fryst/.test(r.ut) && JSON.parse(fs.readFileSync(bankMan, 'utf8'))[0].sort === 'blank', `ett fall i en fryst utgåva skrivs aldrig över (slutkod ${r.kod})`);
  r = kor('bankutgava.cjs', ['--klipp'], { MESA_FALL_UT: UT });
  ok(r.kod === 1 && utg().length === 1, `--klipp utan inkommande gör ingen ny utgåva (slutkod ${r.kod})`);
  r = kor('bankutgava.cjs', [], { MESA_FALL_UT: UT });
  ok(r.kod === 0 && /1\/20\s+Blänk/.test(r.ut) && /0 inkommande/.test(r.ut), `läget räknar per sort mot målet: ${r.ut.split('\n').find(l => /Blänk/.test(l)).trim()}`);
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
  r = tillFall(['R-9992', '--bank', '--sort', 'blank', '--lokal', '--mapp', b.mapp]);
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
  r = tillFall(['R-9994', '--bank', '--sort', 'blank', '--lokal', '--mapp', d.mapp]);
  ok(r.kod === 1 && /inget rätt namn/.test(r.ut), `en borttagen-rättelse blir inget bänkfall (${r.ut.trim().split('\n')[0]})`);

  /* 5b. Spärren per parti (granskningens fynd 1): samma parti på andra sidan vägras, också med en annan kod. */
  ok(bank[0] && bank[0].parti && bank[0].parti.spelkod === 'PROV0' && M && M.parti && M.parti.spelkod === 'PROV1' && F && F.parti && F.parti.game_id === GID,
    `partiet står i manifest.json (${JSON.stringify(bank[0] && bank[0].parti)}), markning.json (${JSON.stringify(M && M.parti)}) och fall.json (${JSON.stringify(F && F.parti)})`);
  const p1 = rattelse('R-9995', 5, 'namnbyte', 'PROV0');   // samma parti som R-9991 (test)
  r = tillFall(['R-9995', '--traning', '--lokal', '--mapp', p1.mapp]);
  ok(r.kod === 3 && /samma parti/.test(r.ut) && /R-9991/.test(r.ut), `(b) R-9995 (samma spelkod som bänkfallet R-9991) kan inte bli träning: slutkod ${r.kod} — ${r.ut.trim().split('\n')[0].slice(0, 160)}`);
  const p2 = rattelse('R-9996', 6, 'namnbyte', 'PROV1');   // samma parti som R-9992 (träning)
  r = tillFall(['R-9996', '--bank', '--sort', 'blank', '--lokal', '--mapp', p2.mapp]);
  ok(r.kod === 3 && /samma parti/.test(r.ut) && /R-9992/.test(r.ut), `R-9996 (samma spelkod som träningen R-9992) kan inte bli ett bänkfall: slutkod ${r.kod}`);
  /* (a) Jespers beslut 2026-10-14: Mat test spärrar bara sin egen rapport — en annan rättelse ur partiet blir träning. */
  const p3 = rattelse('R-9997', 7, 'namnbyte', 'ANNAT1', GID);   // samma game_id som Mat test-fallet R-9993
  r = tillFall(['R-9997', '--traning', '--lokal', '--mapp', p3.mapp]);
  ok(r.kod === 0 && /Mat test-fall ur samma parti: R-9993/.test(r.ut) && fs.existsSync(path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9997')),
    `(a) R-9997 (samma game_id som Mat test-fallet R-9993) blir träning — Mat test spärrar bara sin egen kod: slutkod ${r.kod}${r.kod === 0 ? '' : ' — ' + r.ut.trim().split('\n')[0].slice(0, 200)}`);
  /* och omvänt: en rapport som är träning blir aldrig Mat test-fall, men partiets andra kan */
  r = tillFall(['R-9992', '--mattest', '--lokal', '--mapp', b.mapp]);
  ok(r.kod === 3 && /SPÄRREN/.test(r.ut) && /träning/.test(r.ut), `R-9992 (träning) kan inte bli ett Mat test-fall: slutkod ${r.kod}`);
  const c2 = rapport('R-9965', GID);   // samma parti som träningen R-9997
  r = tillFall(['R-9965', '--mattest', '--lokal', '--mapp', c2]);
  ok(r.kod === 0 && fs.existsSync(path.join(UT, 'dev', 'mattest', 'underlag', 'rapporter', 'R-9965', 'fall.json')),
    `rapporten R-9965 ur samma parti som träningen R-9997 blir ett Mat test-fall: slutkod ${r.kod}${r.kod === 0 ? '' : ' — ' + r.ut.trim().split('\n')[0].slice(0, 200)}`);
  r = tillFall(['R-9993', '--traning', '--lokal', '--mapp', c]);
  ok(r.kod === 3 && /Mat test-fall/.test(r.ut), `(c) Mat test-rapporten R-9993 själv vägras fortfarande träning: slutkod ${r.kod}`);
  /* bänken mot träningen är fortfarande per parti: en rättelse ur träningens parti blir inget bänkfall */
  const p3b = rattelse('R-9966', 13, 'namnbyte', 'ANNAT1b', GID);
  r = tillFall(['R-9966', '--bank', '--sort', 'blank', '--lokal', '--mapp', p3b.mapp]);
  ok(r.kod === 3 && /samma parti/.test(r.ut) && /R-9997/.test(r.ut), `R-9966 (samma game_id som träningen R-9997) kan inte bli ett bänkfall: slutkod ${r.kod}`);
  const p4 = rattelse('R-9998', 8, 'namnbyte', 'ANNAT2');   // ett annat parti: går
  r = tillFall(['R-9998', '--traning', '--lokal', '--mapp', p4.mapp]);
  ok(r.kod === 0 && /partiet: spel:ANNAT2/.test(r.ut), `R-9998 ur ett annat parti blir träning: slutkod ${r.kod}`);
  const p5 = rattelse('R-9999', 9, 'namnbyte', null);   // inget parti: per kod, med varning
  r = tillFall(['R-9999', '--bank', '--sort', 'blank', '--lokal', '--mapp', p5.mapp]);
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
  r = kor('till-fall.cjs', ['R-9991', '--bank', '--sort', 'blank', '--lokal', '--mapp', a.mapp], { MESA_FALL_UT: UT2 });
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
  ok(r.kod === 3 && /samma parti \(game_id 2222/.test(r.ut) && /R-9981/.test(r.ut) && /utan kopia i repot/.test(r.ut) && !/PATCH/.test(r.ut),
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

  /* 5i. Tabellen skiljer inte på Mat test och bänk (anvandning test för båda): slaget ur repot (2026-10-14). */
  const s4 = rattelse('R-9964', 14, 'namnbyte', 'ANNAT5', GID);
  r = sattAtrapp(['R-9964', 'traning', '--mapp', s4.mapp], { rad: { kod: 'R-9964', kalla: 'rattelse', anvandning: null, game_id: GID }, ovr: [{ kod: 'R-9993', game_id: GID, anvandning: 'test' }] });
  ok(r.kod === 0 && /FRÅGA game_id 0b5e/.test(r.ut) && /PATCH/.test(r.ut),
    `(a) satt R-9964 traning: partiets testrad R-9993 är ett Mat test-fall i repot — spärrar inte: slutkod ${r.kod}${r.kod === 0 ? '' : ' — ' + r.ut.trim()}`);
  const G3 = '33333333-3333-4333-8333-333333333333';
  const s5 = rattelse('R-9963', 15, 'namnbyte', 'ANNAT6', G3);
  r = sattAtrapp(['R-9963', 'traning', '--mapp', s5.mapp], { rad: { kod: 'R-9963', kalla: 'rattelse', anvandning: null, game_id: G3 }, ovr: [{ kod: 'R-9991', game_id: G3, anvandning: 'test' }] });
  ok(r.kod === 3 && /R-9991 som bänkfall/.test(r.ut) && !/PATCH/.test(r.ut),
    `(b) satt R-9963 traning: partiets testrad R-9991 är ett bänkfall i repot — vägras: slutkod ${r.kod}${r.kod === 3 ? '' : ' — ' + r.ut.trim()}`);
  r = sattAtrapp(['R-9963', 'traning', '--mapp', s5.mapp], { rad: { kod: 'R-9963', kalla: 'rattelse', anvandning: null, game_id: G3 }, ovr: [{ kod: 'R-9962', game_id: G3, anvandning: 'test' }] });
  ok(r.kod === 3 && /R-9962 som test i tabellen men utan kopia i repot/.test(r.ut) && /okänt/.test(r.ut) && !/PATCH/.test(r.ut),
    `(d) satt R-9963 traning: partiets testrad R-9962 utan kopia i repot (okänt slag) — vägras med skälet: slutkod ${r.kod}`);
  r = sattAtrapp(['R-9993', 'traning', '--mapp', c], { rad: { kod: 'R-9993', kalla: 'rapport', anvandning: null, game_id: GID } });
  ok(r.kod === 3 && /Mat test-fall/.test(r.ut) && !/PATCH/.test(r.ut), `(c) satt R-9993 traning: Mat test-rapporten själv vägras (repot): slutkod ${r.kod}`);
  r = sattAtrapp(['R-9993', 'test', '--mapp', c], { rad: { kod: 'R-9993', kalla: 'rapport', anvandning: null, game_id: GID }, ovr: [{ kod: 'R-9997', game_id: GID, anvandning: 'traning' }] });
  ok(r.kod === 0 && !/FRÅGA/.test(r.ut) && /PATCH/.test(r.ut), `satt R-9993 test: ett Mat test-fall i repot prövas inte mot partiets träning R-9997: slutkod ${r.kod}${r.kod === 0 ? '' : ' — ' + r.ut.trim()}`);
  r = sattAtrapp(['R-9964', 'test', '--mapp', s4.mapp], { rad: { kod: 'R-9964', kalla: 'rattelse', anvandning: null, game_id: GID }, ovr: [{ kod: 'R-9997', game_id: GID, anvandning: 'traning' }] });
  ok(r.kod === 3 && /R-9997/.test(r.ut) && !/PATCH/.test(r.ut), `satt R-9964 test (inget Mat test-fall i repot = bänkens regel): partiets träning R-9997 vägrar: slutkod ${r.kod}`);

  /* 5h. Ett pass ur --logg får spelkoden (fynd 4): --spelkod, och bordsloggens egen om den finns. */
  fs.writeFileSync(lf, JSON.stringify({ id: 'pass-2026-10-11-2006', start: new Date(1790000000000).toISOString(), spel: G2, bordLogg: [{ s: 0, spar: [] }, { s: 5, spar: [] }] }));
  r = tillFall(['--mattest', '--logg', lf, '--lokal', '--torr', '--spelkod', 'cna43k']);
  ok(r.kod === 0 && /partiet: game:2222[^\n]*spel:CNA43K/.test(r.ut), `--logg --spelkod: partiet får game_id och spelkod (${(r.ut.match(/partiet: [^\n(]*/) || [r.ut.trim()])[0].trim()})`);
  fs.writeFileSync(lf, JSON.stringify({ id: 'pass-2026-10-11-2006', start: new Date(1790000000000).toISOString(), spel: G2, spelkod: 'ABC123', bordLogg: [{ s: 0, spar: [] }, { s: 5, spar: [] }] }));
  r = tillFall(['--mattest', '--logg', lf, '--lokal', '--torr']);
  ok(r.kod === 0 && /spel:ABC123/.test(r.ut), `--logg utan --spelkod: bordsloggens egen spelkod läses (slutkod ${r.kod})`);
  r = tillFall(['--mattest', '--logg', lf, '--lokal', '--torr', '--spelkod', '../x']);
  ok(r.kod === 2, `--spelkod «../x» vägras (slutkod ${r.kod})`);

  /* 8. Var kortet låg (uppföljning av MES-366/368): ruta, maskade, kontext och --spar. */
  {
    const py8 = process.env.MESA_PY || path.join(os.homedir(), '.mesa', 'detektor-venv', 'bin', 'python');
    const pyKor = (kod, ...x) => spawnSync(py8, ['-c', kod, ...x], { encoding: 'utf8' });
    const manifest = () => fs.existsSync(bankMan) ? JSON.parse(fs.readFileSync(bankMan, 'utf8')) : [];
    const BANKDIR = path.join(UT, 'dev', 'material', 'rapportbank');
    /* 8a. En äldre rättelse utan ruta (som R-0008): bänkfall med varning, träning bara med --utan-ruta. */
    const g0 = rattelse('R-9970', 10, 'name_this_card', 'GAMMAL1', undefined, true);
    r = tillFall(['R-9970', '--bank', '--sort', 'blank', '--lokal', '--mapp', g0.mapp]);
    ok(r.kod === 0 && /VARNING: rättelsen saknar ruta/.test(r.ut) && manifest().some(p => p.kod === 'R-9970' && p.ruta === null), `R-0008-lik rättelse utan ruta blir bänkfall med varning (slutkod ${r.kod})`);
    const g1 = rattelse('R-9971', 11, 'name_this_card', 'GAMMAL2', undefined, true);
    r = tillFall(['R-9971', '--traning', '--lokal', '--mapp', g1.mapp]);
    ok(r.kod === 2 && /kräver ruta och maskade/.test(r.ut) && !fs.existsSync(path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9971')), `--traning av en rättelse utan ruta vägras (slutkod ${r.kod}): ${r.ut.trim().split('\n').pop().slice(0, 120)}`);
    r = tillFall(['R-9971', '--traning', '--lokal', '--mapp', g1.mapp, '--utan-ruta']);
    ok(r.kod === 0, `… och går med --utan-ruta uttryckligen (slutkod ${r.kod})`);
    /* 8b. En rättelse MED ruta, maskade och kontext.jpg: allt följer med in i bänken. */
    const g2 = rattelse('R-9972', 12, 'namnbyte', 'NYARE1');
    const rj = JSON.parse(fs.readFileSync(path.join(g2.mapp, 'rattelse.json'), 'utf8'));
    rj.maskade = [{ spar: 63, x: 0.45, y: 0.4, w: 0.14, h: 0.33 }]; rj.kontext = { fil: 'kontext.jpg', t: rj.t, w: 720, h: 406 };
    fs.writeFileSync(path.join(g2.mapp, 'rattelse.json'), JSON.stringify(rj));
    fs.copyFileSync(path.join(g2.mapp, 'beskarning.jpg'), path.join(g2.mapp, 'kontext.jpg'));
    r = tillFall(['R-9972', '--bank', '--sort', 'blank', '--lokal', '--mapp', g2.mapp]);
    const p72 = manifest().find(p => p.kod === 'R-9972');
    ok(r.kod === 0 && p72 && p72.ruta && p72.ruta.kalla === 'beskarning' && p72.maskade[0].spar === 63 && p72.kontext === 'R-9972-kontext.jpg' && fs.existsSync(path.join(BANKDIR, 'R-9972-kontext.jpg')),
      `rättelsens ruta, maskade och kontext står i manifest.json (${p72 ? JSON.stringify({ ruta: p72.ruta && p72.ruta.kalla, maskade: p72.maskade, kontext: p72.kontext }) : r.ut.trim()})`);

    /* 8c. En rapport med bilder: två kort omlott (spår 63 över spår 77), en beskärning av 77 och stillbilder. */
    const rp = path.join(IN, 'R-9973'), bd = path.join(rp, 'bilder');
    fs.mkdirSync(bd, { recursive: true });
    const W = 720, H = 406, b77 = { x: 0.40, y: 0.30, w: 0.14, h: 0.33 }, b63 = { x: 0.47, y: 0.42, w: 0.14, h: 0.33 };
    /* stillbilden: bord brunt, 77 blått, 63 rött ovanpå; beskärningen av 77 (600 px bred, som läsningens) */
    const gen = pyKor(`
import sys
from PIL import Image, ImageDraw
W,H=${W},${H}
im=Image.new('RGB',(W,H),(90,58,34)); d=ImageDraw.Draw(im)
for (x,y,w,h),f in (((${b77.x},${b77.y},${b77.w},${b77.h}),(48,80,192)),((${b63.x},${b63.y},${b63.w},${b63.h}),(192,48,48))):
    d.rectangle([x*W,y*H,(x+w)*W,(y+h)*H],fill=f)
im.save(sys.argv[1],quality=95)
Image.new('RGB',(600,800),(48,80,192)).save(sys.argv[2],quality=95)
Image.new('RGB',(360,203),(90,58,34)).save(sys.argv[3],quality=95)
`, path.join(bd, 's-1790000010000-0.jpg'), path.join(bd, 'beskarning-spar77-1790000009000.jpg'), path.join(bd, 's-1790000020000-1.jpg'));
    if (gen.status !== 0) { ok(false, '8c: kunde inte göra provbilderna: ' + (gen.stderr || '').trim().split('\n').pop()); }
    const sp = (id, q, kort) => Object.assign({ id, kort, saker: true, tappad: false, tillstand: 'klar', varfor: 'remsa' }, q);
    const still = [
      { fil: 's-1790000010000-0.jpg', t: 1790000010000, orsak: 'handelse', w: W, h: H, spar: [sp(77, b77, 'Opt'), sp(63, b63, 'Shock')], s: 10, rel: -20 },
      { fil: 's-1790000020000-1.jpg', t: 1790000020000, orsak: 'tid', w: 360, h: 203, spar: [sp(63, b63, 'Shock')], s: 20, rel: -10 }
    ];
    const besk = [{ fil: 'beskarning-spar77-1790000009000.jpg', t: 1790000009000, spar: 77, kort: 'Opt', saker: true, varfor: 'modell+orb', w: 600, h: 800, s: 9, rel: -21,
                    ruta: Object.assign({ bild: { w: 960, h: 541 } }, b77), maskade: [Object.assign({ spar: 63 }, b63)] }];
    fs.writeFileSync(path.join(rp, 'stillbilder.json'), JSON.stringify({ kod: 'R-9973', start: 1790000000000, frys: 1790000030000, bilder: still, beskarningar: besk }));
    fs.writeFileSync(path.join(rp, 'rapport.json'), JSON.stringify({ kod: 'R-9973', text: 'Opt is wrong, it is Brainstorm', tagg: null, tidslinje: [], miljo: { spel: 'SPAR73' }, rad: null }));
    const bordRad = s => ({ s, fas: 'kort', spar: [Object.assign({ id: 77, namn: 'Opt', maskad: true, under: [63] }, b77), Object.assign({ id: 63, namn: 'Shock', maskad: false, under: null }, b63)] });
    fs.writeFileSync(path.join(rp, 'bordlogg.json'), JSON.stringify({ id: 'rapport-R-9973', start: new Date(1790000000000).toISOString(), rapport: 'R-9973', bordLogg: [bordRad(9.5), bordRad(10.4)] }));
    /* --bild utan --spar vägras */
    r = tillFall(['R-9973', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp, '--bild', 's-1790000010000-0.jpg', '--ratt', 'Brainstorm']);
    ok(r.kod === 2 && /--bild utan --spar vägras/.test(r.ut) && !manifest().some(p => p.kod === 'R-9973'), `--bild utan --spar vägras (slutkod ${r.kod}), inget skrivet`);
    r = tillFall(['R-9973', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp, '--ratt', 'Brainstorm']);
    ok(r.kod === 2 && /--spar och --ratt hör ihop/.test(r.ut), `--ratt utan --spar vägras (slutkod ${r.kod})`);
    /* --spar väljer läsningens beskärning */
    r = tillFall(['R-9973', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp, '--spar', '77', '--ratt', 'Brainstorm']);
    let p73 = manifest().find(p => p.kod === 'R-9973' && p.spar === 77);
    const sammaBild = p73 && fs.readFileSync(path.join(BANKDIR, p73.fil)).equals(fs.readFileSync(path.join(bd, 'beskarning-spar77-1790000009000.jpg')));
    ok(r.kod === 0 && p73 && p73.fil === 'R-9973-spar77.jpg' && sammaBild && p73.bild_ur === 'beskarning' && p73.ruta.kalla === 'beskarning' && p73.maskade[0].spar === 63 && p73.namn === 'Brainstorm' && p73.gissning === 'Opt'
       && p73.kontext === 'R-9973-spar77-kontext.jpg' && fs.existsSync(path.join(BANKDIR, p73.kontext)),
      `--spar 77 väljer läsningens beskärning (samma bytes), med ruta, maskade [63] och kontext: ${p73 ? JSON.stringify({ fil: p73.fil, bild_ur: p73.bild_ur, regel: p73.mask_regel }) : r.ut.trim()}`);
    /* Kontexten är ett utsnitt runt kortet (Jespers beslut 2026-10-14), inte hela stillbilden: rutan + en rutas
       bredd/höjd åt varje håll inom bilden, högst 480 px, och kontext_bild.utsnitt säger var. Rutans kant ligger där
       utsnittet säger (röd), bordet till vänster om den brunt. */
    {
      const U = p73 && p73.kontext_bild && p73.kontext_bild.utsnitt;
      const fv = { x: b77.x - b77.w, y: Math.max(0, b77.y - b77.h), w: 3 * b77.w, h: Math.min(1, b77.y + 2 * b77.h) - Math.max(0, b77.y - b77.h) };
      let kp = null;
      if (U) {
        const q = pyKor(`
import sys, json
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB'); W,H=im.size; u=json.loads(sys.argv[2]); r=json.loads(sys.argv[3])
X=lambda x:(x-u['x'])/u['w']*W; Y=lambda y:(y-u['y'])/u['h']*H
my=Y(r['y']+r['h']/2)
print(json.dumps({'w':W,'h':H,'p':[im.getpixel((int(X(r['x']))+1,int(my))),im.getpixel((int(X(r['x']-r['w']/2)),int(my)))]}))
`, path.join(BANKDIR, p73.kontext), JSON.stringify(U), JSON.stringify(b77));
        try { kp = JSON.parse(q.stdout); } catch (e) { kp = null; }
      }
      const rod = c => c && c[0] > 180 && c[1] < 110, brun = c => c && Math.abs(c[0] - 90) < 30 && Math.abs(c[1] - 58) < 30 && Math.abs(c[2] - 34) < 30;
      ok(U && ['x', 'y', 'w', 'h'].every(k => Math.abs(U[k] - fv[k]) < 0.01) && U.w * U.h < 0.5 && kp && Math.max(kp.w, kp.h) <= 480 && kp.w === p73.kontext_bild.w && rod(kp.p[0]) && brun(kp.p[1]),
        `8c: fallets kontext är ett utsnitt runt kortet (utsnitt ${U ? JSON.stringify(U) : '?'}, ${kp ? `${kp.w}×${kp.h} px, ${JSON.stringify(kp.p)}` : 'ingen bild'})`);
    }
    /* --spar + --bild: utsnittet ur stillbilden, 63 målat grått enligt bordsloggens under */
    r = tillFall(['R-9973', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp, '--spar', '77', '--ratt', 'Brainstorm', '--bild', 's-1790000010000-0.jpg', '--skriv-over']);
    p73 = manifest().find(p => p.kod === 'R-9973' && p.spar === 77);
    let pix = null;
    if (p73) {
      /* utsnittet = rutan + 8 %; 63:s hörn i utsnittet (0–1): punkter innanför 63 (grått) och i 77 utanför 63 (blått) */
      const cx = b77.x - b77.w * 0.08, cy = b77.y - b77.h * 0.08, cw = b77.w * 1.16, ch = b77.h * 1.16;
      const u = (b63.x - cx) / cw, v = (b63.y - cy) / ch;
      const q = pyKor(`
import sys, json
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB'); W,H=im.size; u,v=float(sys.argv[2]),float(sys.argv[3])
pts=[(u+(1-u)*0.5,v+(1-v)*0.5),(u+0.05,v+0.05),(u*0.5,v*0.5),(u*0.5,0.9)]
print(json.dumps({'w':W,'h':H,'p':[im.getpixel((int(a*W),int(b*H))) for a,b in pts]}))
`, path.join(BANKDIR, p73.fil), String(u), String(v));
      try { pix = JSON.parse(q.stdout); } catch (e) { pix = null; }
    }
    const gra = c => c && Math.abs(c[0] - 128) < 16 && Math.abs(c[1] - 128) < 16 && Math.abs(c[2] - 128) < 16, bla = c => c && c[2] > 150 && c[0] < 90;
    ok(r.kod === 0 && p73 && p73.bild_ur === 'stillbild' && p73.ruta.kalla === 'stillbild' && p73.maskade.length === 1 && p73.maskade[0].spar === 63 && /bordsloggens under/.test(p73.mask_regel) && /lågupplöst/.test(r.ut)
       && pix && gra(pix.p[0]) && gra(pix.p[1]) && bla(pix.p[2]) && bla(pix.p[3]),
      `--spar 77 --bild <stillbild>: utsnittet med 63 grått där bordsloggens under säger (${pix ? `${pix.w}×${pix.h} px, ${JSON.stringify(pix.p)}` : r.ut.trim()}), varning lågupplöst`);
    /* utan bordslogg vid bilden: alla rutor som överlappar maskas */
    fs.writeFileSync(path.join(rp, 'bordlogg.json'), JSON.stringify({ id: 'rapport-R-9973', start: new Date(1790000000000).toISOString(), rapport: 'R-9973', bordLogg: [bordRad(100)] }));
    r = tillFall(['R-9973', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp, '--spar', '63', '--ratt', 'Shock', '--bild', 's-1790000010000-0.jpg']);
    const p63 = manifest().find(p => p.kod === 'R-9973' && p.spar === 63);
    ok(r.kod === 0 && p63 && p63.maskade.length === 1 && p63.maskade[0].spar === 77 && /alla rutor som överlappar/.test(p63.mask_regel),
      `utan bordslogg vid bilden maskas alla överlappande rutor (spår 63: ${p63 ? JSON.stringify(p63.maskade.map(q => q.spar)) + ' — ' + p63.mask_regel : r.ut.trim()})`);
    /* träning: ett utsnitt ur en stillbild under 160 px vägras; läsningens beskärning med ruta går (ett annat parti) */
    const rp2 = path.join(IN, 'R-9974'); fs.cpSync(rp, rp2, { recursive: true });
    fs.writeFileSync(path.join(rp2, 'rapport.json'), JSON.stringify({ kod: 'R-9974', text: null, tagg: null, tidslinje: [], miljo: { spel: 'SPAR74' }, rad: null }));
    r = tillFall(['R-9974', '--traning', '--lokal', '--mapp', rp2, '--spar', '77', '--ratt', 'Brainstorm', '--bild', 's-1790000010000-0.jpg']);
    ok(r.kod === 2 && /under 160 px/.test(r.ut) && !fs.existsSync(path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9974-spar77')), `--traning vägrar ett utsnitt under 160 px (slutkod ${r.kod})`);
    r = tillFall(['R-9974', '--traning', '--lokal', '--mapp', rp2, '--spar', '77', '--ratt', 'Brainstorm']);
    const kl74 = path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9974-spar77');
    const M74 = fs.existsSync(path.join(kl74, 'markning.json')) ? JSON.parse(fs.readFileSync(path.join(kl74, 'markning.json'), 'utf8')) : null;
    ok(r.kod === 0 && M74 && M74.spar[0].ruta && M74.spar[0].maskade[0].spar === 63 && M74.spar[0].appens_spar === 77 && M74.spar[0].kontext === 'kontext.jpg' && fs.existsSync(path.join(kl74, 'kontext.jpg')),
      `--traning --spar 77 ur läsningens beskärning: markning.json bär ruta, maskade och kontext.jpg (slutkod ${r.kod})`);
    /* spärren per parti gäller --spar också: R-9975 ur samma parti (SPAR73) som bänkfallet R-9973 kan inte bli träning */
    const rp3 = path.join(IN, 'R-9975'); fs.cpSync(rp, rp3, { recursive: true });
    fs.writeFileSync(path.join(rp3, 'rapport.json'), JSON.stringify({ kod: 'R-9975', text: null, tagg: null, tidslinje: [], miljo: { spel: 'SPAR73' }, rad: null }));
    r = tillFall(['R-9975', '--traning', '--lokal', '--mapp', rp3, '--spar', '77', '--ratt', 'Brainstorm']);
    ok(r.kod === 3 && /samma parti/.test(r.ut), `spärren per parti gäller --spar (R-9975 ur samma parti som bänkfallet R-9973 → träning vägras, slutkod ${r.kod})`);

    /* 8d (granskningen av 6c3fea8, fynd 1): bordsloggen säger maskad men under är null → maskade okänt (null), aldrig
       [] — --traning vägras. Beskärningen bär ruta men inga maskade (som en äldre), så bordsloggen är källan. */
    const rp6 = path.join(IN, 'R-9976'); fs.cpSync(rp, rp6, { recursive: true });
    fs.writeFileSync(path.join(rp6, 'rapport.json'), JSON.stringify({ kod: 'R-9976', text: null, tagg: null, tidslinje: [], miljo: { spel: 'SPAR76' }, rad: null }));
    const besk6 = besk.map(b => { const c = Object.assign({}, b); delete c.maskade; return c; });
    fs.writeFileSync(path.join(rp6, 'stillbilder.json'), JSON.stringify({ kod: 'R-9976', start: 1790000000000, frys: 1790000030000, bilder: still, beskarningar: besk6 }));
    const bordRadOkand = s => ({ s, fas: 'kort', spar: [Object.assign({ id: 77, namn: 'Opt', maskad: true, under: null }, b77), Object.assign({ id: 63, namn: 'Shock', maskad: false, under: null }, b63)] });
    fs.writeFileSync(path.join(rp6, 'bordlogg.json'), JSON.stringify({ id: 'rapport-R-9976', start: new Date(1790000000000).toISOString(), rapport: 'R-9976', bordLogg: [bordRadOkand(9.2), bordRadOkand(10.1)] }));
    r = tillFall(['R-9976', '--traning', '--lokal', '--mapp', rp6, '--spar', '77', '--ratt', 'Brainstorm']);
    ok(r.kod === 2 && /maskade är okänt/.test(r.ut) && !fs.existsSync(path.join(UT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa', 'R-9976-spar77')),
      `8d: maskad utan under → --traning vägras, maskade okänt (slutkod ${r.kod}: ${r.ut.trim().split('\n').pop().slice(0, 120)})`);
    r = tillFall(['R-9976', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp6, '--spar', '77', '--ratt', 'Brainstorm', '--bild', 's-1790000010000-0.jpg']);
    let p76 = manifest().find(p => p.kod === 'R-9976' && p.spar === 77);
    ok(r.kod === 0 && p76 && p76.maskade === null && /okänt/.test(p76.mask_regel) && p76.kontext_bild && p76.kontext_bild.maskade.some(q => q.spar === 63),
      `8d: stillbild med maskad utan under → maskade null i fallet, utsnitt och kontext målar ändå de överlappande (${p76 ? p76.mask_regel : r.ut.trim()})`);

    /* 8e (fynd 2): stillbilden närmast beskärningen ligger 5 s bort → ingen kontext, skälet i fallet; dt sparas när den finns */
    const rp7 = path.join(IN, 'R-9977'); fs.cpSync(rp, rp7, { recursive: true });
    fs.renameSync(path.join(rp7, 'bilder', 'beskarning-spar77-1790000009000.jpg'), path.join(rp7, 'bilder', 'beskarning-spar77-1790000005000.jpg'));
    const besk7 = besk.map(b => Object.assign({}, b, { fil: 'beskarning-spar77-1790000005000.jpg', t: 1790000005000, s: 5 }));
    fs.writeFileSync(path.join(rp7, 'stillbilder.json'), JSON.stringify({ kod: 'R-9977', start: 1790000000000, frys: 1790000030000, bilder: still, beskarningar: besk7 }));
    fs.writeFileSync(path.join(rp7, 'rapport.json'), JSON.stringify({ kod: 'R-9977', text: null, tagg: null, tidslinje: [], miljo: { spel: 'SPAR73' }, rad: null }));
    r = tillFall(['R-9977', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp7, '--spar', '77', '--ratt', 'Brainstorm']);
    const p77 = manifest().find(p => p.kod === 'R-9977' && p.spar === 77);
    ok(r.kod === 0 && p77 && p77.kontext === null && p77.kontext_bild === null && /5\.0 s/.test(p77.kontext_skal || '') && !fs.existsSync(path.join(BANKDIR, 'R-9977-spar77-kontext.jpg')) && /ingen kontextbild/.test(r.ut),
      `8e: stillbilden 5 s från beskärningen → ingen kontext (${p77 ? p77.kontext_skal : r.ut.trim()})`);
    r = tillFall(['R-9973', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp, '--spar', '77', '--ratt', 'Brainstorm', '--skriv-over']);
    p73 = manifest().find(p => p.kod === 'R-9973' && p.spar === 77);
    ok(r.kod === 0 && p73 && p73.kontext_bild && p73.kontext_bild.dt === 1000 && p73.kontext === 'R-9973-spar77-kontext.jpg',
      `8e: stillbilden 1 s från beskärningen → kontext med dt ${p73 && p73.kontext_bild ? p73.kontext_bild.dt : '?'} ms`);

    /* 8e (fynd 3): hamta.cjs räknar kontextens ålder mot beskärningen på telefonens klocka (k.dt, annars k.t − ruta.t),
       aldrig mot rättelsens t (datorns klocka, här 60 s ifrån). */
    {
      const H = require('./hamta.cjs'), hu = path.join(UT, 'hamta-8e');
      const las = j => { fs.mkdirSync(hu, { recursive: true }); fs.writeFileSync(path.join(hu, 'rattelse.json'), JSON.stringify(j));
        const logg = console.log; console.log = () => {}; try { H.rattelse({ kod: 'R-9978', created_at: '2026-10-14T00:00:00Z' }, hu, ['beskarning.jpg', 'kontext.jpg']); } finally { console.log = logg; }
        return (fs.readFileSync(path.join(hu, 'LÄS-MIG.md'), 'utf8').split('\n').find(x => /^\| Kontext/.test(x)) || ''); };
      const bas = { handelse: 'namnbyte', gissning: 'Opt', ratt: 'Brainstorm', spar: 77, t: 1790000069000, bild: 'telefon', maskade: [], ruta: Object.assign({ kalla: 'beskarning', t: 1790000009000 }, b77) };
      const k1 = las(Object.assign({}, bas, { kontext: { fil: 'kontext.jpg', t: 1790000010500 } }));
      const k2 = las(Object.assign({}, bas, { kontext: { fil: 'kontext.jpg', t: 1790000010500, dt: -800 } }));
      ok(/1\.5 s från beskärningen/.test(k1) && /-0\.8 s från beskärningen/.test(k2), `8e: LÄS-MIG räknar kontextens ålder mot beskärningen (${k1.slice(0, 120)} | ${k2.slice(-60)})`);
    }

    /* 8f (fynd 6): utan Pillow går ett fall ur läsningens beskärning (varning, ingen kontext); ett utsnitt ur en stillbild vägras */
    const utanPy = { MESA_PY: path.join(UT, 'finns-inte', 'python') };
    r = tillFall(['R-9973', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp, '--spar', '77', '--ratt', 'Brainstorm', '--skriv-over'], utanPy);
    p73 = manifest().find(p => p.kod === 'R-9973' && p.spar === 77);
    ok(r.kod === 0 && p73 && p73.bild_ur === 'beskarning' && p73.kontext === null && /Pillow saknas/.test(p73.kontext_skal || '') && /Pillow saknas/.test(r.ut),
      `8f: utan Pillow → bänkfall ur beskärningen, ingen kontext (slutkod ${r.kod}${p73 ? ', ' + p73.kontext_skal : ''})`);
    r = tillFall(['R-9973', '--bank', '--sort', 'blank', '--lokal', '--mapp', rp, '--spar', '77', '--ratt', 'Brainstorm', '--bild', 's-1790000010000-0.jpg', '--skriv-over'], utanPy);
    ok(r.kod === 2 && /Pillow/.test(r.ut), `8f: utan Pillow vägras ett utsnitt ur en stillbild (slutkod ${r.kod})`);
  }

  /* 6. Bänken kör bänkfallet. */
  if (har('--bank-kor')) {
    const modell = path.join(ROT, 'dev', 'embed', 'modeller', 'mobileclip-s0-vision.onnx');
    const k = spawnSync(py, [path.join(ROT, 'dev', 'remsa', 'helkort_jamfor.py'), '--bank', path.join(UT, 'dev', 'material', 'rapportbank'), modell], { encoding: 'utf8', cwd: ROT });
    const rad = (k.stdout || '').split('\n').find(x => /R-9991/.test(x));
    ok(k.status === 0 && !!rad, `bänken (helkort_jamfor.py --bank) körde bänkfallet: ${rad ? rad.trim() : (k.stderr || '').trim().split('\n').pop()}`);
    const u = spawnSync(py, [path.join(ROT, 'dev', 'remsa', 'helkort_jamfor.py'), '--bank', path.join(UT, 'dev', 'material', 'rapportbank'), '--utgava', '1', modell], { encoding: 'utf8', cwd: ROT });
    ok(u.status === 0 && /utgåva v1: 1 fall/.test(u.stdout) && /R-9991/.test(u.stdout) && /sort blank\s+\d\/1/.test(u.stdout), `--utgava 1 mäter bara den frysta utgåvan, per sort: ${(u.stdout || '').split('\n').filter(l => /utgåva|sort /.test(l)).map(l => l.trim()).join(' · ') || (u.stderr || '').trim().split('\n').pop()}`);
    const u9 = spawnSync(py, [path.join(ROT, 'dev', 'remsa', 'helkort_jamfor.py'), '--bank', path.join(UT, 'dev', 'material', 'rapportbank'), '--utgava', '9', modell], { encoding: 'utf8', cwd: ROT });
    ok(u9.status !== 0 && /finns inte/.test(u9.stderr), `--utgava 9 (finns inte) vägras: ${(u9.stderr || '').trim().split('\n').pop()}`);
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
      q = tillFall(['R-9989', '--bank', '--sort', 'blank', '--mapp', g.mapp, '--skriv-over']);
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
