'use strict';
/* Hämtar referensbilderna för en lek från Scryfall — samma urval som appens
   byggLekPoolRa (index.html): alla konstverk per namn (högst 12, nyaste
   först), baslanden med högst 24 konstverk från 2021 och framåt.

     node dev/embed/hamta-referenser.cjs                      golden-leken (dev/golden/lek.txt)
     node dev/embed/hamta-referenser.cjs --edhrec 100         de N mest spelade Commander-korten
     node dev/embed/hamta-referenser.cjs --edhrec 300 --ut commander300
     node dev/embed/hamta-referenser.cjs --tryck              alla TRYCKNINGAR av golden-lekens namn (samma konst, olika ram)

   Bilderna hamnar i dev/embed/cache/ref/ (gitignorerad), listan i
   dev/embed/cache/<ut>.json. Körs om utan att hämta det som redan finns. */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..', '..');
const CACHE = path.join(__dirname, 'cache');
const REF = path.join(CACHE, 'ref');
const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const HUVUD = { 'User-Agent': 'MesaEmbedBank/0.1 (dev bench)', Accept: 'application/json' };

const arg = (namn, forval) => { const i = process.argv.indexOf('--' + namn); return i < 0 ? forval : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const vanta = ms => new Promise(r => setTimeout(r, ms));

async function sf(url) {
  for (let forsok = 0; forsok < 5; forsok++) {
    const svar = await fetch(url, { headers: HUVUD });
    if (svar.status === 429) { await vanta(2000 * (forsok + 1)); continue; }
    if (svar.status === 404) return { data: [] };
    if (!svar.ok) throw new Error(`Scryfall ${svar.status} för ${url}`);
    await vanta(120);
    return svar.json();
  }
  throw new Error('Scryfall svarar 429 — vänta en stund och kör om');
}

async function sok(q, extra, tak) {
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&${extra}`;
  const ut = [];
  while (url) {
    const d = await sf(url);
    for (const c of (d.data || [])) {
      const iu = c.image_uris || (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris);
      if (!iu || !iu.small) continue;
      ut.push({ id: c.id, name: c.name, set: c.set, released: c.released_at, frame: c.frame, full_art: !!c.full_art, border: c.border_color,
                illustration: c.illustration_id || (c.card_faces && c.card_faces[0] && c.card_faces[0].illustration_id) || null,
                small: iu.small, normal: iu.normal });
    }
    url = d.has_more && !(tak && ut.length >= tak) ? d.next_page : null;   // tak: sluta bläddra när det räcker
  }
  return ut;
}

function lasLek(fil) {
  const namn = [];
  for (const rad of fs.readFileSync(fil, 'utf8').split('\n')) {
    const r = rad.trim(); if (!r || r.startsWith('#')) continue;
    const m = r.match(/^(\d+)\s+(.*)$/);
    namn.push(m ? m[2] : r);
  }
  return [...new Set(namn)];
}

async function hamtaBild(url, fil) {
  if (fs.existsSync(fil) && fs.statSync(fil).size > 1000) return false;
  const svar = await fetch(url, { headers: { 'User-Agent': HUVUD['User-Agent'] } });
  if (!svar.ok) throw new Error(`bild ${svar.status} ${url}`);
  fs.writeFileSync(fil, Buffer.from(await svar.arrayBuffer()));
  await vanta(60);
  return true;
}

async function konstverk(namnen, tak, fraga) {
  const kort = [], seen = new Set();
  for (let i = 0; i < namnen.length; i += 20) {
    const q = `(${namnen.slice(i, i + 20).map(n => '!"' + n.replace(/"/g, '') + '"').join(' or ')}) ${fraga}`;
    const per = new Map();
    for (const c of await sok(q, 'unique=art&order=released&dir=desc')) {
      if (c.name.includes(' // ') || seen.has(c.id)) continue;
      const k = per.get(c.name) || 0; if (k >= tak) continue;
      per.set(c.name, k + 1); seen.add(c.id); kort.push(c);
    }
    process.stdout.write(`  ${Math.min(i + 20, namnen.length)}/${namnen.length} namn, ${kort.length} konstverk\r`);
  }
  process.stdout.write('\n');
  return kort;
}

(async () => {
  fs.mkdirSync(REF, { recursive: true });
  let namnen, ut;
  if (arg('edhrec')) {
    const n = +arg('edhrec'); ut = arg('ut', 'commander' + n);
    /* De mest spelade Commander-korten enligt EDHREC-rankningen: en rimlig
       bild av vad som ligger på ett Commander-bord. Baslanden läggs till. */
    const alla = await sok('f:commander -t:basic -is:digital -is:funny game:paper', 'unique=cards&order=edhrec', n + 40);
    namnen = [...new Set(alla.map(c => c.name).filter(x => !x.includes(' // ')))].slice(0, n - 2).concat(['Plains', 'Swamp']);
  } else {
    namnen = lasLek(arg('lek', path.join(ROT, 'dev', 'golden', 'lek.txt'))); ut = arg('ut', 'lek-golden');
  }
  let kort;
  if (arg('tryck')) {
    /* Alla tryckningar, för provet "samma konst i olika tryck". */
    ut = arg('ut', 'lek-golden-tryck'); kort = [];
    const icke = namnen.filter(n => !BASICS.has(n));
    for (let i = 0; i < icke.length; i += 20) {
      const q = `(${icke.slice(i, i + 20).map(n => '!"' + n.replace(/"/g, '') + '"').join(' or ')}) -is:digital -is:funny`;
      kort.push(...(await sok(q, 'unique=prints&order=released&dir=desc')).filter(c => !c.name.includes(' // ')));
    }
  } else {
    kort = await konstverk(namnen.filter(n => !BASICS.has(n)), 12, '-is:digital -is:funny');
    const land = namnen.filter(n => BASICS.has(n));
    if (land.length) {
      const per = new Map();
      for (const c of await sok(`(${land.map(n => '!"' + n + '"').join(' or ')}) -is:digital -is:funny year>=2021`, 'unique=art&order=name')) {
        if (c.name.includes(' // ')) continue;
        const k = per.get(c.name) || 0; if (k >= 24) continue;
        per.set(c.name, k + 1); kort.push(c);
      }
    }
  }
  let nya = 0, fel = 0;
  for (let i = 0; i < kort.length; i++) {
    const c = kort[i];
    for (const storlek of ['normal', 'small']) {
      const fil = path.join(REF, `${c.id}-${storlek}.jpg`);
      try { if (await hamtaBild(c[storlek], fil)) nya++; } catch (e) { fel++; console.error('\n' + e.message); }
      c[storlek + 'Fil'] = path.relative(__dirname, fil);
    }
    process.stdout.write(`  bilder ${i + 1}/${kort.length}\r`);
  }
  process.stdout.write('\n');
  const saknas = namnen.filter(n => !kort.some(c => c.name === n));
  fs.writeFileSync(path.join(CACHE, ut + '.json'), JSON.stringify({ namn: namnen, kort }, null, 1));
  console.log(`${ut}: ${namnen.length} namn, ${kort.length} bilder (${nya} nya filer, ${fel} fel)${saknas.length ? ' — SAKNAS: ' + saknas.join(', ') : ''}`);
})().catch(e => { console.error('FEL', e.message); process.exit(1); });
