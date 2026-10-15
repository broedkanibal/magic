/* Raderingen (granskningen i skala, steg 5): spelaren har raderat sina
   rapporter (Settings → Delete my reports and pictures) — då ska varje kopia
   i repot och i träningsmaterialet bort. Privacy-texten lovar det.

   Kör:  node dev/rapport/radera.cjs --torr        visar vad som skulle tas bort (raderingar som inte hanterats)
         node dev/rapport/radera.cjs               tar bort det och märker raderingen hanterad (hanterad_at)
         node dev/rapport/radera.cjs --lokal R-0412 [R-0413 …] [--torr]
                                                   utan tabellen: koderna på raden (provet, eller
                                                   innan migrationen 20261015120000 körts)

   För varje kod:
     1. Kopiorna: raderna i kopieindexet (kopior.cjs) + det som ligger i platserna
        själva (fall.json:s rapport, bänkens manifest.json, markning.json) — en
        kopia utan rad i indexet hittas ändå.
     2. Bort: Mat test-fallets mapp, bänkposten ur manifest.json med bilden och
        kontextbilden, träningsmappen, den hämtade mappen dev/diagnos/rapporter/<kod>/,
        och kodens rader i indexet. Ett bänkfall i en FRYST utgåva tas bort ändå
        (privacy-löftet): filnamnet stryks ur utgavor.json och utgåvans `raderade`
        räknas upp, så att helkort_jamfor.py --utgava N säger att utgåvan saknar ett fall.
     3. Kontrollen: grep på koden i dev/ (innehåll och filnamn; träningsmaterialet:
        bara json/jsonl/tsv). En träff i en .md är ett omnämnande i text (en plan, en
        logg) och skrivs ut som varning; en träff i något annat betyder att en kopia
        finns kvar — då märks raderingen INTE hanterad och slutkoden är 1.
     4. raderingar.hanterad_at = nu (inte med --lokal eller --torr).
   Hinkens filer och raden i rapporter tar appen bort själv när spelaren raderar.
   Bänkens bilder finns kvar i git-historiken, och en bild som redan tränats
   finns kvar i modellen och i äldre Kaggle-versioner (planen, beslut 7).

   Service role ur .env.local. Inget här frågar Claude. */
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const kopior = require('./kopior.cjs');
const { iPlatserna } = kopior;

const ROT = path.join(__dirname, '..', '..');
const UTROT = process.env.MESA_FALL_UT ? path.resolve(process.env.MESA_FALL_UT) : ROT;   // som i till-fall.cjs
const DEV = path.join(UTROT, 'dev');
const PLATS = {
  mattest: path.join(DEV, 'mattest', 'underlag', 'rapporter'),
  bank: path.join(DEV, 'remsa', 'rapportbank'),
  traning: path.join(DEV, 'material', 'arbete', 'markning', 'rapporter-traning-mesa'),
  diagnos: path.join(DEV, 'diagnos', 'rapporter')
};
const KOD_RE = /^R-\d{4,}$/;
const rel = f => path.relative(UTROT, f).split(path.sep).join('/');
const inuti = (f, d) => { const r = path.relative(d, f); return !!r && !r.startsWith('..') && !path.isAbsolute(r); };
const lasJ = (f, tom) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return tom; } };

/* Kopiorna av en kod: indexet + platserna, en gång per plats och id. */
function kopiorAv(kod, platser) {
  const ut = new Map();
  for (const r of kopior.alla().concat(platser)) if (r.kod === kod && !ut.has(r.plats + '|' + r.id)) ut.set(r.plats + '|' + r.id, Object.assign({ iIndex: false }, r));
  for (const r of kopior.alla()) if (r.kod === kod) ut.get(r.plats + '|' + r.id).iIndex = true;
  return [...ut.values()];
}

/* Vad som ska bort för en kod: [{ vad, text, stigar, gor() }] — stigar: det steget tar bort eller skriver om
   (relativt roten, en mapp slutar med '/'), för torrkörningens kontroll. Inget tas bort förrän gor() körs. */
function plan(kod, platser) {
  const steg = [], varn = [];
  for (const k of kopiorAv(kod, platser)) {
    if (k.plats === 'mattest' || k.plats === 'traning') {
      const mapp = path.join(UTROT, k.filer[0]);
      if (!inuti(mapp, PLATS[k.plats])) { varn.push(`indexet pekar utanför ${rel(PLATS[k.plats])}: ${k.filer[0]} — rörs inte`); continue; }
      if (!fs.existsSync(mapp)) { steg.push({ vad: k.plats, text: `${k.filer[0]} finns inte längre (bara raden i indexet)`, stigar: [], gor() {} }); continue; }
      steg.push({ vad: k.plats, stigar: [k.filer[0]], text: `${k.plats === 'mattest' ? 'Mat test-fallet' : 'träningen'} ${k.filer[0]}${k.iIndex ? '' : ' (saknade rad i indexet)'}`, gor: () => fs.rmSync(mapp, { recursive: true, force: true }) });
    }
  }
  /* Bänken: alla poster med koden (ett spår ur en rapport är ett fall per spår), med bilderna och utgåvorna. */
  const man = path.join(PLATS.bank, 'manifest.json'), lista = lasJ(man, []);
  const mina = lista.filter(p => p && p.kod === kod);
  if (mina.length) {
    const filer = mina.flatMap(p => [p.fil, p.kontext].filter(Boolean));
    const utgf = path.join(PLATS.bank, 'utgavor.json'), utg = lasJ(utgf, []);
    const frysta = utg.filter(u => (u.filer || []).some(f => filer.includes(f))).map(u => 'v' + u.utgava);
    steg.push({ vad: 'bank', stigar: filer.map(f => rel(path.join(PLATS.bank, f))).concat([rel(man), rel(utgf)]), text: `bänken: ${mina.map(p => p.fil).join(', ')} ur manifest.json, ${filer.length} bilder${frysta.length ? ` — ingår i den frysta utgåvan ${frysta.join(', ')}, tas bort ändå (privacy-löftet); utgåvan saknar då ett fall` : ''}`,
      gor() {
        fs.writeFileSync(man, JSON.stringify(lista.filter(p => !(p && p.kod === kod)), null, 1) + '\n');
        for (const f of filer) { const b = path.join(PLATS.bank, f); if (inuti(b, PLATS.bank)) fs.rmSync(b, { force: true }); }
        if (frysta.length) {
          /* utgåvans filer är fallens bilder (inte kontexten): en struken fil = ett raderat fall */
          for (const u of utg) { const n = (u.filer || []).filter(f => filer.includes(f)).length; if (n) { u.filer = u.filer.filter(f => !filer.includes(f)); u.raderade = (u.raderade || 0) + n; } }
          fs.writeFileSync(utgf, JSON.stringify(utg, null, 1) + '\n');
        }
      } });
  }
  const hamtad = path.join(PLATS.diagnos, kod);
  if (fs.existsSync(hamtad)) steg.push({ vad: 'diagnos', stigar: [rel(hamtad) + '/'], text: `den hämtade mappen ${rel(hamtad)}/`, gor: () => fs.rmSync(hamtad, { recursive: true, force: true }) });
  const iIndex = kopior.alla().filter(r => r.kod === kod).length;
  if (iIndex) steg.push({ vad: 'index', stigar: Object.values(kopior.INDEX).map(rel), text: `${iIndex} rad${iIndex === 1 ? '' : 'er'} i kopieindexet`, gor: () => kopior.stryk(kod) });
  return { steg, varn };
}

/* grep på koden: innehåll (som ett helt ord: R-0412 hittar inte R-04120) och filnamn. → [relativa sökvägar]. */
function grep(kod) {
  const traffar = new Set(), uteslut = ['material', 'videos', 'bilder', 'node_modules', '.git'];
  const g = spawnSync('grep', ['-rlwI', ...uteslut.map(d => '--exclude-dir=' + d), '-e', kod, DEV], { encoding: 'utf8' });
  for (const f of (g.stdout || '').split('\n').filter(Boolean)) traffar.add(rel(f));
  const mark = path.join(DEV, 'material', 'arbete', 'markning');
  if (fs.existsSync(mark)) {
    const m = spawnSync('grep', ['-rlw', '--include=*.json', '--include=*.jsonl', '--include=*.tsv', '-e', kod, mark + '/'], { encoding: 'utf8' });
    for (const f of (m.stdout || '').split('\n').filter(Boolean)) traffar.add(rel(f));
  }
  const prune = uteslut.flatMap((d, i) => (i ? ['-o'] : []).concat(['-name', d]));
  for (const d of [DEV, mark]) {
    if (!fs.existsSync(d)) continue;
    const f = spawnSync('find', [d + '/', '(', ...prune, ')', '-prune', '-o', '-name', `*${kod}*`, '-print'], { encoding: 'utf8' });
    for (const x of (f.stdout || '').split('\n').filter(Boolean)) traffar.add(rel(x));
  }
  return [...traffar].sort();
}
const arText = f => /\.md$/i.test(f);

/* Raderingarna som inte hanterats. Utan kolumnen hanterad_at (migrationen inte körd): alla, och migrationSaknas. */
async function ohanterade(S) {
  try { return { rader: await S.rest('GET', 'raderingar?select=kod,raderad_at,hanterad_at&hanterad_at=is.null&order=raderad_at.asc&limit=1000'), migrationSaknas: false }; }
  catch (e) {
    if (!/hanterad_at/.test(e.message)) throw e;
    return { rader: await S.rest('GET', 'raderingar?select=kod,raderad_at&order=raderad_at.asc&limit=1000'), migrationSaknas: true };
  }
}

async function kor(a) {
  const torr = a.includes('--torr'), lokal = a.includes('--lokal'), ut = [];
  let koder, S = null, migrationSaknas = false;
  if (lokal) {
    koder = a.filter(x => !x.startsWith('--')).map(x => x.toUpperCase());
    if (!koder.length) throw Object.assign(new Error('--lokal kräver koderna: radera.cjs --lokal R-0412 [R-0413 …]'), { kod: 2 });
  } else {
    S = require('./supa.cjs').supa();
    const r = await ohanterade(S);
    migrationSaknas = r.migrationSaknas;
    koder = r.rader.map(x => x.kod);
    if (migrationSaknas) {
      ut.push('OBS: kolumnen raderingar.hanterad_at finns inte — migrationen supabase/migrations/20261015120000_raderingar_hanterad.sql är inte körd. Alla raderingar visas.');
      if (!torr) throw Object.assign(new Error(ut[0] + ' Kör migrationen först (eller --torr, eller --lokal <koder>) — utan kolumnen kan en radering inte märkas hanterad'), { kod: 2 });
    }
    if (!koder.length) { ut.push('Inga ohanterade raderingar.'); return { rad: ut, fel: 0 }; }
  }
  const fel = koder.filter(k => !KOD_RE.test(k));
  if (fel.length) throw Object.assign(new Error(`inte rapportkoder (R-NNNN): ${fel.join(', ')} — vägrar`), { kod: 2 });

  let ohanterad = 0;
  const platser = iPlatserna();
  for (const kod of koder) {
    const { steg, varn } = plan(kod, platser);
    ut.push(`${kod}: ${steg.length ? steg.length + ' steg' : 'inga kopior'}`);
    for (const v of varn) ut.push('  VARNING: ' + v);
    for (const s of steg) { ut.push(`  ${torr ? 'skulle ta bort' : 'tar bort'} ${s.text}`); if (!torr) s.gor(); }
    /* Kontrollen. Torrt: det grep hittar nu, minus det stegen tar bort — det som skulle bli kvar. */
    const borta = steg.flatMap(s => s.stigar);
    let kvar = grep(kod);
    if (torr) kvar = kvar.filter(f => !borta.some(b => b.endsWith('/') ? f === b.slice(0, -1) || f.startsWith(b) : f === b));
    const data = kvar.filter(f => !arText(f)), text = kvar.filter(arText);
    if (text.length) ut.push(`  omnämnanden i text (inga bilder eller data — ta bort för hand om de pekar ut spelaren): ${text.join(', ')}`);
    if (data.length) { ut.push(`  FEL: grep hittar koden ${torr ? 'också efter stegen' : 'kvar'} i ${data.join(', ')} — inte hanterad`); ohanterad++; continue; }
    ut.push(`  grep: 0 träffar${text.length ? ' utanför text' : ''}${torr ? ' efter stegen' : ''}`);
    if (lokal || torr) continue;
    const r = await S.rest('PATCH', `raderingar?kod=eq.${encodeURIComponent(kod)}`, { hanterad_at: new Date().toISOString() });
    ut.push(`  hanterad: raderingar.hanterad_at ${r && r.length ? 'satt' : 'INTE satt (raden finns inte?)'}`);
  }
  ut.push(`${torr ? 'Torrkörning: ' : ''}${koder.length} raderingar, ${ohanterad} ${torr ? 'skulle inte bli' : 'inte'} hanterade${lokal ? ' (--lokal: tabellen inte rörd)' : ''}.`);
  return { rad: ut, fel: ohanterad };
}

if (require.main === module) {
  kor(process.argv.slice(2)).then(r => { console.log(r.rad.join('\n')); process.exit(r.fel ? 1 : 0); })
    .catch(e => { console.error('radera: ' + e.message); process.exit(e.kod || 1); });
}
module.exports = { kor, ohanterade, grep };
