/* Granskningen av rättelserna: de tysta rättelserna (MES-366) på en sida, där
   Jesper ser beskärningen bredvid gissningen och det rätta namnet, väljer
   träning, test eller släng, och bygger datasetet för nästa bildmodell.

   Kör:  node dev/rapport/granska.cjs              http://127.0.0.1:8279
         node dev/rapport/granska.cjs --port 8280

   Ingen egen väg till tabellen eller repot: varje val kör samma verktyg som
   i terminalen — hamta.cjs (hämtar rättelsen till dev/diagnos/rapporter/<kod>/),
   till-fall.cjs --traning | --bank och satt.cjs slangd — så att spärren
   mellan test och träning (sparr.cjs: bänk ↔ träning per parti, Mat test
   bara sin egen kod) gäller precis som där.
   Säger spärren nej visas dess text, och ingenting är skrivet.

   Rekommendationen: sidan föreslår Prov, Träning eller Släng för varje
   osorterad rättelse och säger varför (reglerna står i granska.html,
   rekommendera()). Prov kräver en sorts fel (sorter.cjs), och sidan visar
   bänken per sort mot målet, så att det syns vilka sorter som behöver fler
   prov. Bänkens utgåvor: bankutgava.cjs.

   Ändrat namn: spelarens rätta namn kan vara fel. Ett nytt namn prövas mot
   Scryfall (exakt namn) och går till till-fall.cjs som --ratt, med
   beskärningen som --bild; rättelsens rattelse.json lämnas orörd.

   Träningen: "Bygg dataset" kör dev/remsa/tran/dataset.py bygg till
   ~/Library/Caches/mesa/ds-riktiga-<datum>/ (alla märkta pass plus
   rättelserna i träning), lägger Kaggle-metadata bredvid och skriver
   prompt.md — prompten till en ny session som laddar upp, tränar på Kaggle
   och mäter mot grinden i CLAUDE.md. Sidan laddar aldrig upp och startar
   ingen Kaggle-körning själv: det görs i sessionen, med grinden.

   Handlingarna (MES-385): rättelserna av tap, flyttar till graveyard/exile/hand, Undo, ⌘Z och Follow camera har
   ingen bild. De visas i en egen flik med spelarens påståenden, räknade av till-fall.cjs (forhandMattest, samma
   kod som --mattest), och valen är Mat test (hamta.cjs + till-fall.cjs <kod> --mattest) eller Släng — aldrig
   träning: handlingarna är regler i avstämningen, ingen modell lär sig dem.

   MESA_RAPPORTER: en annan mapp än dev/diagnos/rapporter för de hämtade rättelserna (provet); den går till
   hamta.cjs som --ut och till till-fall.cjs och satt.cjs som --mapp.

   Lyssnar bara på 127.0.0.1. Service role ur .env.local (supa.cjs); nyckeln
   lämnar aldrig servern. Scryfalls bilder hämtas av servern, en i taget, och
   cachas i ~/Library/Caches/mesa/granska-scryfall/. Inget här frågar Claude. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const { supa, ROT } = require('./supa.cjs');
const { slagIRepot } = require('./sparr.cjs');   // bara för förhandsvisningen av spärren; valen går genom till-fall/satt
const { SORT_ID } = require('./sorter.cjs');
const { lage: bankLage } = require('./bankutgava.cjs');
const { goldenNamn, forhandMattest, raknaPastaenden } = require('./till-fall.cjs');

const argv = process.argv.slice(2), arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const PORT = +(arg('--port') || process.env.PORT || 8279);
const KOD_RE = /^R-\d{4,}$/;
const RAPPORTER = process.env.MESA_RAPPORTER ? path.resolve(process.env.MESA_RAPPORTER) : path.join(ROT, 'dev', 'diagnos', 'rapporter');
/* MESA_FALL_UT: samma andra rot som till-fall.cjs skriver i (provet). */
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;
const MATTEST = path.join(UTROT, 'dev', 'mattest', 'underlag', 'rapporter');   // till-fall.cjs MATTEST
const TRAN = path.join(UTROT, 'dev', 'material', 'arbete', 'markning', 'rapporter-traning-mesa');   // till-fall.cjs TRANPASS
const BANK_MAN = path.join(UTROT, 'dev', 'remsa', 'rapportbank', 'manifest.json');
const MODELLER = path.join(ROT, 'dev', 'embed', 'modeller');
const CACHE = path.join(os.homedir(), 'Library', 'Caches', 'mesa');
const SCRY = path.join(CACHE, 'granska-scryfall');
const VENV = path.join(os.homedir(), '.mesa', 'detektor-venv', 'bin', 'python');
const PY = fs.existsSync(VENV) ? VENV : 'python3';
const KAGGLE = path.join(os.homedir(), '.mesa', 'kaggle-venv', 'bin', 'kaggle');
const DATASET = 'jesperfunkrosling/mesa-riktiga-utsnitt';
const VAL_KLIPP = '2026-10-05-traning-landhogar/klipp3-enfargad-duk-island';   // som v2–v4

const S = supa();

/* Ett verktyg i repot, som i terminalen: { kod (slutkoden), ut (stdout + stderr) }. */
function kor(prog, args, opt) {
  return new Promise(res => {
    const p = spawn(prog, args, Object.assign({ cwd: ROT, env: process.env }, opt || {}));
    let ut = '';
    p.stdout.on('data', d => { ut += d; }); p.stderr.on('data', d => { ut += d; });
    p.on('error', e => res({ kod: 1, ut: ut + String(e.message) }));
    p.on('close', kod => res({ kod, ut: ut.trim() }));
  });
}
const korNode = (skript, args) => kor(process.execPath, [path.join(__dirname, skript), ...args]);

/* ── rättelserna ─────────────────────────────────────────────────────────── */
const mappFor = kod => path.join(RAPPORTER, kod);
const lasJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const hamtas = new Map();   // kod → promise: samma rättelse hämtas en gång åt gången
function hamtaLokalt(kod) {
  /* rattelse.json: en namnrättelse; rapport.json: en rättelse av handlingar (MES-385), som hämtas som en rapport */
  if (['rattelse.json', 'rapport.json'].some(f => fs.existsSync(path.join(mappFor(kod), f)))) return Promise.resolve(true);
  /* hamta.cjs skriver alltid LÄS-MIG.md för en rättelse: finns den utan rattelse.json har hämtningen redan körts och
     filen saknas i hinken (bilder 'saknas') — hämta inte om vid varje listning. */
  if (fs.existsSync(path.join(mappFor(kod), 'LÄS-MIG.md'))) return Promise.resolve(false);
  if (!hamtas.has(kod)) hamtas.set(kod, korNode('hamta.cjs', [kod, '--ut', mappFor(kod)]).then(r => { hamtas.delete(kod); if (r.kod) console.error(r.ut); return r.kod === 0; }));
  return hamtas.get(kod);
}
async function hamtaAlla(koder) {
  const ko = koder.slice();
  await Promise.all([0, 1, 2, 3].map(async () => { while (ko.length) await hamtaLokalt(ko.shift()); }));
}
function bankInfo() {   // kod → { namn (det bänken mäter, ändrat om det ändrades), sort, utgava }
  const m = lasJson(BANK_MAN);
  return new Map(Array.isArray(m) ? m.map(p => [p.kod, { namn: p.namn, sort: p.sort || null, utgava: p.utgava == null ? null : p.utgava }]) : []);
}

const rattelseRader = () => S.rest('GET', 'rapporter?select=kod,created_at,user_id,game_id,anvandning,bilder,vy&kalla=eq.rattelse&order=created_at.desc&limit=1000');
const arHandling = r => !!(r.vy && r.vy.handelse === 'handling');
async function lista() {
  /* En rättelse av handlingar (MES-385) har ingen bild och inget namn: den har en egen lista (listaHandlingar). */
  const rader = (await rattelseRader()).filter(r => !arHandling(r));
  await hamtaAlla(rader.map(r => r.kod));
  const bank = bankInfo(), golden = goldenNamn(), ut = [];
  for (const r of rader) {
    const j = lasJson(path.join(mappFor(r.kod), 'rattelse.json')) || {}, vy = r.vy || {};
    const k = await S.konto(r.user_id);
    const M = lasJson(path.join(TRAN, r.kod, 'markning.json'));
    const sp = M && M.spar && M.spar[0], bk = bank.get(r.kod) || null;
    const ratt = j.ratt || vy.ratt || null;
    ut.push({
      kod: r.kod, nar: r.created_at, vem: k ? (k.namn || k.epost) : r.user_id.slice(0, 8), game_id: r.game_id || null,
      anvandning: r.anvandning || null, bilder: r.bilder || null,
      /* tabellen säger test för både Mat test och bänk: slaget ur repot (sparr.cjs), null = okänt — spärrar som bänken */
      testSlag: r.anvandning === 'test' ? slagIRepot(r.kod) : null,
      handelse: j.handelse || vy.handelse || null, gissning: j.gissning || vy.gissning || null, ratt: j.ratt || vy.ratt || null,
      varfor: j.varfor || null, saker: j.saker != null ? !!j.saker : null, spelkod: j.spelkod || null, kalla: j.bild || null,
      harBild: fs.existsSync(path.join(mappFor(r.kod), 'beskarning.jpg')),
      utanfor: !!(sp && sp.utanfor_traning), val: !!(sp && sp.val),
      /* namnet träningen eller bänken faktiskt fick (kan vara ändrat här) */
      sattNamn: sp ? sp.namn : bk ? bk.namn : null,
      sort: bk ? bk.sort : null, utgava: bk ? bk.utgava : null,
      /* golden-lekens namn tränas aldrig (dataset.py) — sidan säger det före valet */
      golden: !!ratt && (golden.has(ratt) || ratt.split(' // ').some(d => golden.has(d)))
    });
  }
  return ut;
}

/* Rättelserna av handlingar (MES-385): paketets rättelser som spelaren gjorde dem, och påståendena som ett Mat
   test-fall skulle räkna — ur till-fall.cjs (forhandMattest), inte räknade här. */
const HANDLING_FALT = ['typ', 't', 'cid', 'kort', 'spar', 'tappad', 'kamTap', 'zon', 'av', 'hur', 'efter'];
/* Godkännandet (Jespers beslut 2026-10-15): bara påståenden Jesper godkänt räknas i Mat test. Sidan skriver
   godkant.json = { "<id>": "godkand" | "kastad" } i rättelsens mapp, och till-fall.cjs --mattest läser den (resten
   märks ejGodkand). Ett påstående som redan är tillbakataget, osäkert eller utan spår räknas aldrig och har inget val.
   Id:t (<cid>-<t>) och bilden (handling-<id>.jpg) kommer ur till-fall.cjs och hamta.cjs, inte härifrån. */
const GODKANT = 'godkant.json', GODK_VAL = new Set(['godkand', 'kastad']);
const PID_RE = /^[\w.-]{1,120}$/, HBILD_RE = /^handling-[\w-]{1,120}\.jpg$/;   // bildnamnen till-fall.cjs läser (lasGodkant), med ett längdtak
const valbart = p => !p.tillbaka && !p.osaker && !p.ejAvgorbart;
function lasGodkant(kod) { const g = lasJson(path.join(mappFor(kod), GODKANT)); return g && typeof g === 'object' && !Array.isArray(g) ? g : {}; }
async function godkann(b) {
  const kod = String(b.kod || '').toUpperCase(), id = String(b.id || ''), val = b.val == null ? null : String(b.val);
  if (!KOD_RE.test(kod) || !PID_RE.test(id)) return { ok: false, text: 'okänd kod eller påstående' };
  if (val != null && !GODK_VAL.has(val)) return { ok: false, text: 'välj godkänd eller kastad' };
  const mapp = mappFor(kod);
  if (!fs.existsSync(path.join(mapp, 'rapport.json'))) return { ok: false, text: `${kod} är inte hämtad` };
  /* Efter valet är fallet skrivet med det godkännande som gällde då: ändras det nu stämmer filen inte med fallet. */
  if (fs.existsSync(path.join(MATTEST, kod, 'fall.json'))) return { ok: false, text: `Mat test-fallet ${kod} är redan skrivet — godkännandet går inte att ändra` };
  const [rad] = await S.rest('GET', `rapporter?kod=eq.${encodeURIComponent(kod)}&select=anvandning`);
  if (!rad) return { ok: false, text: `${kod} finns inte i tabellen` };
  if (rad.anvandning) return { ok: false, text: `${kod} är redan ${rad.anvandning}` };
  const F = await forhandMattest(kod, mapp, { S }), p = (F.pastaenden || []).find(x => x.id === id);
  if (!p) return { ok: false, text: `påståendet ${id} finns inte i ${kod}` };
  if (!valbart(p)) return { ok: false, text: 'påståendet räknas aldrig (tillbakataget, osäkert eller utan spår) — inget att välja' };
  /* En fil som inte går att läsa skrivs inte över: då försvinner tidigare val tyst (till-fall varnar för den). */
  const gf = path.join(mapp, GODKANT);
  if (fs.existsSync(gf) && !lasJson(gf)) return { ok: false, text: `${GODKANT} i ${kod} går inte att läsa — rätta eller ta bort den för hand` };
  const g = lasGodkant(kod);
  if (val) g[id] = val; else delete g[id];
  fs.writeFileSync(path.join(mapp, GODKANT), JSON.stringify(g, null, 1) + '\n');
  /* Siffrorna efter valet räknas av till-fall.cjs (forhandMattest läser godkant.json), inte här. */
  return { ok: true, godkant: g, forhand: await forhandMattest(kod, mapp, { S }) };
}

async function listaHandlingar() {
  const rader = (await rattelseRader()).filter(arHandling);
  await hamtaAlla(rader.map(r => r.kod));
  const ut = [];
  for (const r of rader) {
    const vy = r.vy || {}, k = await S.konto(r.user_id), mapp = mappFor(r.kod);
    let forhand = null, fel = null;
    const fallFil = path.join(MATTEST, r.kod, 'fall.json'), fall = lasJson(fallFil);
    /* Sorterad: räkna inte om (en fråga till tabellen per rad, efter varje klick). Finns fallet visas det fallet bär. */
    if (r.anvandning) { if (fall && Array.isArray(fall.pastaenden)) forhand = { pastaenden: fall.pastaenden, antal: raknaPastaenden(fall.pastaenden), start: Date.parse(fall.bordStart), varning: null, urFallet: true }; }
    else if (!fs.existsSync(path.join(mapp, 'rapport.json'))) fel = `${r.kod} gick inte att hämta som en rapport (hamta.cjs: paketet saknas i hinken?)`;
    else try { forhand = await forhandMattest(r.kod, mapp, { S }); } catch (e) { fel = String(e && e.message || e); }
    ut.push({
      kod: r.kod, nar: r.created_at, vem: k ? (k.namn || k.epost) : String(r.user_id || '').slice(0, 8), game_id: r.game_id || null,
      spelkod: vy.spelkod || null, anvandning: r.anvandning || null, testSlag: r.anvandning === 'test' ? slagIRepot(r.kod) : null,
      forsta: vy.forsta || null, till: vy.till || null,
      handlingar: (Array.isArray(vy.handlingar) ? vy.handlingar : []).filter(h => h && typeof h === 'object').map(h => Object.fromEntries(HANDLING_FALT.filter(f => h[f] != null).map(f => [f, h[f]]))),
      forhand, fel, fallFinns: fs.existsSync(fallFil), godkant: lasGodkant(r.kod)
    });
  }
  return ut;
}

async function sortera(b) {
  const kod = String(b.kod || '').toUpperCase(), val = b.val;
  if (!KOD_RE.test(kod)) return { ok: false, text: 'okänd kod' };
  if (val === 'slangd') {
    const r = await korNode('satt.cjs', [kod, 'slangd'].concat(fs.existsSync(mappFor(kod)) ? ['--mapp', mappFor(kod)] : []));
    return { ok: r.kod === 0, sparr: r.kod === 3, text: r.ut };
  }
  if (val !== 'traning' && val !== 'test' && val !== 'mattest') return { ok: false, text: 'välj träning, test, Mat test eller släng' };
  if (!(await hamtaLokalt(kod))) return { ok: false, text: `${kod} gick inte att hämta (hamta.cjs)` };
  /* En rättelse av handlingar (MES-385): Mat test-fallet, som i terminalen — spärren och VARNING-raderna är till-fall.cjs. */
  if (val === 'mattest') {
    /* Först när varje påstående som kan räknas är bedömt (godkant.json) och minst ett är godkänt: det obedömda
       räknas inte, och ett fall som tyst tappat dem mäter mindre än det ser ut att göra. Siffrorna: till-fall.cjs. */
    let F;
    try { F = await forhandMattest(kod, mappFor(kod), { S }); } catch (e) { return { ok: false, text: String(e && e.message || e) }; }
    if (F.antal) {
      const vantar = F.pastaenden.filter(p => p.ejGodkand);
      if (vantar.length) return { ok: false, text: `${vantar.length} påstående${vantar.length === 1 ? '' : 'n'} väntar på Godkänn eller Kasta: ${vantar.map(p => `${p.kort || '?'} (${p.id})`).join(', ')}` };
      if (!F.antal.raknas) return { ok: false, text: 'inget godkänt påstående — fallet skulle mäta 0 av 0. Släng i stället' };
    }
    const r = await korNode('till-fall.cjs', [kod, '--mattest', '--mapp', mappFor(kod)]);
    return { ok: r.kod === 0, sparr: r.kod === 3, text: r.ut };
  }
  if (val === 'test' && !SORT_ID.has(b.sort)) return { ok: false, text: 'välj sorts fel först — bänken räknas per sort' };
  const args = [kod, val === 'traning' ? '--traning' : '--bank', '--mapp', mappFor(kod)];
  if (val === 'test') args.push('--sort', b.sort);
  const j = lasJson(path.join(mappFor(kod), 'rattelse.json')) || {};
  /* Namnet prövas alltid — också spelarens oförändrade — och Scryfalls stavning är den som skrivs. */
  const namn = String(b.ratt || j.ratt || '').trim();
  if (!namn) return { ok: false, text: 'inget namn — skriv kortets namn, eller Släng' };
  let k;
  try { k = await scryKort(namn); } catch (e) { return { ok: false, text: `Scryfall svarar inte (${e.message}) — försök igen` }; }
  if (!k) return { ok: false, text: `"${namn}" finns inte hos Scryfall — skriv kortets exakta engelska namn` };
  if (k.namn !== j.ratt) args.push('--ratt', k.namn);   // rättelsens beskärning, ruta och maskade gäller; bara namnet byts
  const r = await korNode('till-fall.cjs', args);
  return { ok: r.kod === 0, sparr: r.kod === 3, text: r.ut };
}

/* ── Scryfall: namnet prövas och bilden hämtas av servern, en fråga i taget ─ */
let scryKo = Promise.resolve();
const scryMinne = new Map();   // namn → { namn, bild } | null
function scryHamta(url) {
  const p = scryKo.then(async () => {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mesa-granska/1.0', Accept: '*/*' }, signal: AbortSignal.timeout(10000) });
    await new Promise(v => setTimeout(v, 120));   // Scryfall: högst ~10 frågor i sekunden
    return r;
  });
  scryKo = p.catch(() => {});
  return p;
}
/* { namn (Scryfalls stavning), bild } eller null när namnet inte finns. Kastar när Scryfall inte svarar (nätet,
   429, tidsgränsen): då minns vi inget, och nästa fråga försöker igen. */
async function scryKort(namn) {
  if (scryMinne.has(namn)) return scryMinne.get(namn);
  let k = null;
  const r = await scryHamta('https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(namn));
  if (r.ok) {
    const c = await r.json(), iu = c.image_uris || (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris) || {};
    k = { namn: c.name, bild: iu.normal || null };
  } else if (r.status !== 404) throw new Error('Scryfall ' + r.status);
  scryMinne.set(namn, k);
  return k;
}
async function scryBild(namn) {
  const fil = path.join(SCRY, crypto.createHash('sha1').update(namn).digest('hex') + '.jpg');
  if (fs.existsSync(fil)) return fs.readFileSync(fil);
  let k = null;
  try { k = await scryKort(namn); } catch (e) { return null; }
  if (!k || !k.bild) return null;
  const r = await scryHamta(k.bild);
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(SCRY, { recursive: true });
  fs.writeFileSync(fil, buf);
  return buf;
}

/* ── träningen ───────────────────────────────────────────────────────────── */
/* Nästa lediga vN: modellerna i repot (gitignorerade, finns bara i huvudträdet) och Kaggle-mapparna i cachen
   (kernel-v4-riktig, riktig-v4-ut) — en version som tränats men inte sparats tas inte igen. Datasetens mappar
   räknas inte: att bygga om före träningen ger samma vN, med en ny tidsstämpel. */
function nastaVersion() {
  let max = 1;
  const las = (dir, re) => { try { for (const f of fs.readdirSync(dir)) { const m = f.match(re); if (m) max = Math.max(max, +m[1]); } } catch (e) {} };
  las(MODELLER, /^mobileclip-s0-mesa-v(\d+)\.onnx$/);
  las(CACHE, /^(?:kernel|riktig|rok)-v(\d+)(?:-|$)/);
  return max + 1;
}
function datasetMappar() {
  try {
    return fs.readdirSync(CACHE).filter(n => /^ds-riktiga/.test(n)).map(n => {
      const M = lasJson(path.join(CACHE, n, 'manifest.json'));
      return { namn: n, skapad: M && M.skapad, utsnitt: M && M.rader ? M.rader.length : null, namnAntal: M && M.namn ? M.namn.length : null,
        rattelser: M && M.rader ? M.rader.filter(r => r.pass === 'rapporter-traning-mesa').length : null, prompt: fs.existsSync(path.join(CACHE, n, 'prompt.md')) };
    }).sort((a, b) => String(b.skapad || '').localeCompare(String(a.skapad || '')));
  } catch (e) { return []; }
}
async function traning() {
  const r = await kor(PY, [path.join('dev', 'remsa', 'tran', 'dataset.py'), 'rakna']);
  let lokala = 0;
  try { lokala = fs.readdirSync(TRAN).filter(n => KOD_RE.test(n) && fs.existsSync(path.join(TRAN, n, 'markning.json'))).length; } catch (e) {}
  return { rakna: r.ut, raknaOk: r.kod === 0, lokala, dataset: datasetMappar(), version: nastaVersion() };
}

function prompt(ut, M, v) {
  const fran = M.rader.filter(r => r.pass === 'rapporter-traning-mesa');
  const kn = path.basename(ut);
  return `# Prompt: bildmodellen v${v} med rättelserna (byggd ${M.skapad} på granskningssidan)

**Modell: Opus 5.5, effort high.** Kaggle-körningen tar ~3 h; vänta med Monitor, inte i en agent.

---

Träna bildmodellen v${v} på datasetet som granskningssidan byggde och mät den mot grinden i CLAUDE.md
("Grinden för en ny bildmodell"). Datasetet: \`${ut}\` — ${M.rader.length} utsnitt, ${M.namn.length} namn, varav
${fran.length} utsnitt ur spelarnas rättelser (passet \`rapporter-traning-mesa\`). Receptet är v4:s: alla märkta
pass, \`--utan-basvikt\`, samma valideringsklipp.

1. **Ladda upp** som ny version av det privata datasetet \`${DATASET}\`. Att Jesper startar den här sessionen med
   prompten är hans ja till uppladdningen och Kaggle-körningen; rättelserna kommer från spelare som delat dem med
   inställningen *Share pictures of cards I correct*:
   \`${KAGGLE} datasets version -p ${ut} -m "v${v}: ${M.rader.length} utsnitt, ${fran.length} ur rättelserna" --dir-mode zip\`
2. **Kärnan:** kopiera \`~/Library/Caches/mesa/kernel-v4-rok/\` till \`kernel-v${v}-rok/\` och \`kernel-v4-riktig/\` till
   \`kernel-v${v}-riktig/\`. ARGS-raden (rad 51) som v4: \`['--utan-basvikt', '--val-klipp', '${VAL_KLIPP}']\`
   (röken med \`'--rok'\` först). Rök först (\`${KAGGLE} kernels push -p ~/Library/Caches/mesa/kernel-v${v}-rok\`,
   ~3 min; loggen ska säga \`riktiga: … ${M.rader.length} …\`), sedan den riktiga (~3 h).
3. **Hämta:** \`${KAGGLE} kernels output jesperfunkrosling/mesa-remsa-tran -p ~/Library/Caches/mesa/riktig-v${v}-ut\`.
   Kopiera modellen till \`dev/embed/modeller/mobileclip-s0-mesa-v${v}.onnx\` (utfilen heter …-v2.onnx; nytt filnamn
   alltid — embed.js cachar per URL).
4. **Mät** (grinden): \`git diff --stat\` på index.html före. Golden baslinjen EN gång, v${v} TVÅ gånger med
   \`--rems-modell\` (remsvägen, det appen kör) och, om den håller, två med \`--modell\`; port enligt
   \`dev/golden/SNABBGUIDE.md\`, golden i kö via \`dev/golden/ko.sh\`. 0 säkra fel namn hårt; totalen bättre än baslinjen.
   Bänkarna (\`helkort_jamfor.py\`, \`remsregel.py\` och \`helkort_jamfor.py --bank dev/remsa/rapportbank\`) är diagnos.
5. **Skriv** resultatet i \`dev/golden/historik.md\` och en rapport i \`dev/material/arbete/markning/v${v}-resultat.md\`.
   Ingen modell in i appen utan Jespers ja.

Datasetets mapp: \`${kn}\`. Granskningssidan: \`node dev/rapport/granska.cjs\`.
`;
}
async function bygg() {
  const d = new Date(), tva = n => String(n).padStart(2, '0');   // lokal tid, som manifestets skapad
  const v = nastaVersion(), ut = path.join(CACHE, `ds-riktiga-v${v}-${d.getFullYear()}${tva(d.getMonth() + 1)}${tva(d.getDate())}-${tva(d.getHours())}${tva(d.getMinutes())}`);
  const r = await kor(PY, [path.join('dev', 'remsa', 'tran', 'dataset.py'), 'bygg', '--ut', ut]);
  if (r.kod !== 0) return { ok: false, text: r.ut };
  const M = lasJson(path.join(ut, 'manifest.json'));
  fs.writeFileSync(path.join(ut, 'dataset-metadata.json'), JSON.stringify({ title: 'mesa-riktiga-utsnitt', id: DATASET, licenses: [{ name: 'other' }], isPrivate: true }, null, 2) + '\n');
  const p = prompt(ut, M, v);
  fs.writeFileSync(path.join(ut, 'prompt.md'), p);
  return { ok: true, text: r.ut, ut, prompt: p };
}

/* Allt som skriver körs ett i taget. Spärren (sparr.cjs) läser tabellen och repot innan den skriver; två val ur
   samma parti samtidigt — Träning på en rad och Prov på nästa — hade båda hunnit läsa "fritt" (granskningen). */
let skrivKo = Promise.resolve();
function iTur(f) { const p = skrivKo.then(f); skrivKo = p.catch(() => {}); return p; }

/* ── servern ─────────────────────────────────────────────────────────────── */
const VARDAR = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
function svara(res, kod, kropp, typ) {
  res.writeHead(kod, { 'Content-Type': typ || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(typ ? kropp : JSON.stringify(kropp));
}
function lasKropp(req) {
  return new Promise((res, rej) => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e5) req.destroy(); }); req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch (e) { rej(e); } }); });
}
const server = http.createServer(async (req, res) => {
  try {
    /* Bara den här sidan: Host mot DNS-omdirigering, Origin mot en annan sajt som postar hit. */
    if (!VARDAR.has(req.headers.host)) return svara(res, 403, { fel: 'host' });
    if (req.method === 'POST' && !(req.headers.origin && VARDAR.has(req.headers.origin.replace(/^http:\/\//, '')))) return svara(res, 403, { fel: 'origin' });
    const u = new URL(req.url, `http://${req.headers.host}`), p = u.pathname;
    /* En annan sajt kan inte heller starta hämtningar eller räkningar via <img src> (webbläsaren säger varifrån). */
    const sfs = req.headers['sec-fetch-site'];
    if (p.startsWith('/api/') && sfs && sfs !== 'same-origin') return svara(res, 403, { fel: 'sec-fetch-site' });
    if (p === '/' && req.method === 'GET') return svara(res, 200, fs.readFileSync(path.join(__dirname, 'granska.html')), 'text/html; charset=utf-8');
    if (p === '/api/lista') return svara(res, 200, await lista());
    if (p === '/api/handlingar') return svara(res, 200, await listaHandlingar());
    if (p === '/api/godkann' && req.method === 'POST') { const b = await lasKropp(req); return svara(res, 200, await iTur(() => godkann(b))); }
    const mh = p.match(/^\/api\/handlingsbild\/(R-\d{4,})\/([^/]+)$/);
    if (mh) {   // telefonens utsnitt för ett påstående (handling-<id>.jpg), bara det namnet och bara i rättelsens mapp
      const f = path.join(mappFor(mh[1]), mh[2]);
      return HBILD_RE.test(mh[2]) && fs.existsSync(f) ? svara(res, 200, fs.readFileSync(f), 'image/jpeg') : svara(res, 404, { fel: 'ingen bild' });
    }
    let m = p.match(/^\/api\/bild\/(R-\d{4,})$/);
    if (m) {
      const f = path.join(mappFor(m[1]), 'beskarning.jpg');
      return fs.existsSync(f) ? svara(res, 200, fs.readFileSync(f), 'image/jpeg') : svara(res, 404, { fel: 'ingen beskärning' });
    }
    if (p === '/api/kort') {
      const buf = await scryBild(String(u.searchParams.get('namn') || '').slice(0, 200));
      return buf ? svara(res, 200, buf, 'image/jpeg') : svara(res, 404, { fel: 'ingen bild' });
    }
    if (p === '/api/sortera' && req.method === 'POST') { const b = await lasKropp(req); return svara(res, 200, await iTur(() => sortera(b))); }
    if (p === '/api/bank') return svara(res, 200, bankLage());
    if (p === '/api/traning') return svara(res, 200, await traning());
    if (p === '/api/bygg' && req.method === 'POST') return svara(res, 200, await iTur(bygg));
    if (p === '/api/prompt') {
      const n = String(u.searchParams.get('mapp') || '');
      const f = path.join(CACHE, path.basename(n), 'prompt.md');
      return /^ds-riktiga/.test(n) && fs.existsSync(f) ? svara(res, 200, fs.readFileSync(f), 'text/plain; charset=utf-8') : svara(res, 404, { fel: 'ingen prompt' });
    }
    svara(res, 404, { fel: 'okänd väg' });
  } catch (e) {
    console.error('granska: ' + (e && e.stack || e));
    svara(res, 500, { fel: String(e && e.message || e) });
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Granskningen av rättelserna: http://127.0.0.1:${PORT}`));
