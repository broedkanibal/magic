'use strict';
/* Vilka bilder en lek består av — samma urval som appens byggLekPoolRa
   (index.html), så att de förräknade vektorerna (forrakna.cjs) och bänkens
   referenser (hamta-referenser.cjs) täcker exakt det appen bäddar in:

     • lekens egna tryckningar (sid), när de är kända
     • alla konstverk per namn, högst KONST_TAK (12), nyaste först
     • baslanden: högst 24 konstverk per typ, från 2021 och framåt
     • kortbaksidan, som ett eget "kort" med id 'baksida'

   Dubbelsidiga ("Plains // Plains") hoppas över, som i appen. */
const fs = require('fs');

const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const KONST_TAK = 12, LAND_TAK = 24;
const BAKSIDA = { id: 'baksida', name: '(card back)', normal: 'https://backs.scryfall.io/normal/0/a/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg' };
const HUVUD = { 'User-Agent': 'MesaEmbed/0.2 (dev tools)', Accept: 'application/json' };
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

/* En lekfil: ett namn per rad ("4 Pacifism" går också), # = kommentar. */
function lasLekfil(fil) {
  const namn = [];
  for (const rad of fs.readFileSync(fil, 'utf8').split('\n')) {
    const r = rad.trim(); if (!r || r.startsWith('#')) continue;
    const m = r.match(/^(\d+)x?\s+(.*)$/);
    namn.push(m ? m[2] : r);
  }
  return [...new Set(namn)];
}

async function konstverk(namnen, tak, fraga, seen, logg) {
  const kort = [];
  for (let i = 0; i < namnen.length; i += 20) {
    const q = `(${namnen.slice(i, i + 20).map(n => '!"' + n.replace(/"/g, '') + '"').join(' or ')}) ${fraga}`;
    const per = new Map();
    for (const c of await sok(q, 'unique=art&order=released&dir=desc')) {
      if (c.name.includes(' // ') || seen.has(c.id)) continue;
      const k = per.get(c.name) || 0; if (k >= tak) continue;
      per.set(c.name, k + 1); seen.add(c.id); kort.push(c);
    }
    if (logg) process.stdout.write(`  ${Math.min(i + 20, namnen.length)}/${namnen.length} namn, ${kort.length} konstverk\r`);
  }
  if (logg) process.stdout.write('\n');
  return kort;
}

async function basland(land, seen) {
  if (!land.length) return [];
  const per = new Map(), ut = [];
  for (const c of await sok(`(${land.map(n => '!"' + n + '"').join(' or ')}) -is:digital -is:funny year>=2021`, 'unique=art&order=name')) {
    if (c.name.includes(' // ') || seen.has(c.id)) continue;
    const k = per.get(c.name) || 0; if (k >= LAND_TAK) continue;
    per.set(c.name, k + 1); seen.add(c.id); ut.push(c);
  }
  return ut;
}

/* Hela lekens bildlista. namnen: kortnamn; egna: [{sid, name, normal?}] —
   lekens egna tryckningar (decks.kort), som appen lägger först. */
async function lekensBilder(namnen, o) {
  o = o || {};
  const seen = new Set(), kort = [];
  for (const k of (o.egna || [])) { if (!k.sid || seen.has(k.sid)) continue; seen.add(k.sid); kort.push({ id: k.sid, name: k.name, normal: k.normal || null }); }
  kort.push(...await konstverk(namnen.filter(n => !BASICS.has(n) && !n.includes(' // ')), KONST_TAK, '-is:digital -is:funny', seen, o.logg));
  kort.push(...await basland(namnen.filter(n => BASICS.has(n)), seen));
  if (o.baksida !== false) kort.push(Object.assign({}, BAKSIDA));
  return kort;
}

/* Scryfalls 'normal' för ett id vi bara känner som sid (lekens egna kort). */
async function normalFor(id) {
  const c = await sf(`https://api.scryfall.com/cards/${encodeURIComponent(id)}`);
  const iu = c && (c.image_uris || (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris));
  return iu ? iu.normal : null;
}

module.exports = { BASICS, KONST_TAK, LAND_TAK, BAKSIDA, sf, sok, lasLekfil, konstverk, basland, lekensBilder, normalFor, vanta };
