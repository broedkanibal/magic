#!/usr/bin/env node
/* Felboken (2026-10-04): varje facitkort som saknar säkert rätt namn, och
   var i kedjan det föll. Läser ett golden-resultat (förval senaste.json,
   eller en fil med samma form) och facit, och sorterar korten i steg:

     ej hittad          inget spår parades mot kortet (detektorn/spårningen)
     rätt överst        namnet stod överst men blev aldrig säkert (spärren/marginalen)
     rätt bland förslag rätt namn bland spårets tre förslag eller remsans
     fel förslag        rätt namn inte bland förslagen (pixlarna/modellen)
     SÄKERT FEL         ska aldrig hända

   och i synlighet: helt synligt (synlig ≥ 0,9 i facit) eller delvis.
   För videofall: om något spår någon gång hade namnet säkert (tappat på vägen).
   Kort som facit märkt oläsbara ("olasbar": orsak — går inte att läsa ens
   för ögat) står i ett eget avsnitt sist och räknas inte i sammanställningen;
   ett SÄKERT FEL på dem är fortfarande ett fel och sägs.

   node dev/golden/felbok.cjs [resultat.json] [--tsv]                       */
const fs = require('fs'), path = require('path');
const G = __dirname;
const args = process.argv.slice(2), tsv = args.includes('--tsv');
const s = require(path.resolve(args.find(a => !a.startsWith('--')) || path.join(G, 'senaste.json')));
const norm = n => (n || '').toLowerCase().split(' // ')[0].trim();
const rader = [];
for (const k of Object.keys(s)) {
  const x = s[k];
  const dir = fs.readdirSync(path.join(G, 'fall')).find(d => d.startsWith(x.id.slice(0, 2)));
  const facit = require(path.join(G, 'fall', dir, 'facit.json'));
  const video = fs.existsSync(path.join(G, 'fall', dir, 'video.mp4'));
  const kvar = facit.kort.slice();
  const rad = (c, t, steg, sp) => {
    const ratt = norm(c.namn);
    let tappat = '–';
    if (video && x.videoSpar) {
      const n = x.videoSpar.filter(v => (v.sakra || []).some(q => norm(q.namn) === ratt)).length;
      const av = facit.kort.filter(q => norm(q.namn) === ratt).length;
      tappat = n ? `säkert i ${n} spår (facit ${av})` : 'aldrig';
    }
    rader.push({ fall: x.id.slice(0, 2), kort: c.namn, steg, syn: c.synlig >= 0.9 ? 'helt' : 'delvis ' + c.synlig, hog: c.hog || '–', tappad: c.tappad ? 'ja' : '–',
      kortPx: sp ? `${Math.round(sp.w * (x.kallStorlek ? +x.kallStorlek.split('×')[0] : 0))}×${Math.round(sp.h * (x.kallStorlek ? +x.kallStorlek.split('×')[1] : 0))}` : '–',
      gissning: t && t.namn || '–', forslag: sp && sp.cands ? sp.cands.join(' / ') : '–',
      remsa: sp && sp.remsa ? `${sp.remsa.namn} ${sp.remsa.marginal}` : '–', video: video ? 'video' : 'foto', tappat, olasbar: c.olasbar || '' });
  };
  for (const t of x.traffar || []) {
    const i = kvar.findIndex(c => c.namn === t.facit && !!c.dold === !!t.dold);
    const c = i >= 0 ? kvar.splice(i, 1)[0] : { namn: t.facit };
    if (t.dold || (t.saker && norm(t.namn) === norm(t.facit))) continue;
    const sp = t.spar != null ? (x.spar || [])[t.spar - 1] : null;
    const ratt = norm(t.facit), cands = (sp && sp.cands) || [], rc = (sp && sp.remsa && sp.remsa.cands) || [];
    const steg = t.spar == null ? 'ej hittad' : t.saker ? 'SÄKERT FEL' : norm(t.namn) === ratt ? 'rätt överst'
      : (cands.some(n => norm(n) === ratt) || rc.some(n => norm(n).startsWith(ratt))) ? 'rätt bland förslag' : 'fel förslag';
    rad(c, t, steg, sp);
  }
  for (const c of kvar) if (!c.dold && !/^token/i.test(c.namn)) rad(c, null, 'ej hittad', null);
}
const kol = ['fall', 'kort', 'steg', 'syn', 'hog', 'tappad', 'kortPx', 'gissning', 'forslag', 'remsa', 'video', 'tappat'];
if (tsv) { console.log(kol.concat('olasbar').join('\t')); for (const r of rader) console.log(kol.concat('olasbar').map(k => r[k]).join('\t')); process.exit(0); }
const olasbara = rader.filter(r => r.olasbar), lasbara = rader.filter(r => !r.olasbar);
console.log(`Felboken: ${lasbara.length} läsbara kort utan säkert rätt namn${olasbara.length ? ` (+${olasbara.length} oläsbara, sist)` : ''}\n`);
const tabell = l => { console.log('| ' + kol.join(' | ') + ' |\n|' + kol.map(() => '---').join('|') + '|'); for (const r of l) console.log('| ' + kol.map(k => String(r[k]).replace(/\|/g, '/')).join(' | ') + ' |'); };
tabell(lasbara);
const tab = (titel, nyckel) => {
  const m = {}; for (const r of lasbara) { const v = nyckel(r); m[v] = (m[v] || 0) + 1; }
  console.log(`\n${titel}: ` + Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
};
tab('Steg', r => r.steg);
tab('Synlighet', r => r.syn.startsWith('helt') ? 'helt synligt' : 'delvis');
tab('Fall', r => r.fall);
tab('Video/foto', r => r.video);
tab('Videofall: namnet säkert någon gång', r => r.video === 'video' ? (r.tappat === 'aldrig' ? 'aldrig' : 'ja, tappat') : 'foto');
if (olasbara.length) {
  console.log(`\nOläsbara i facit (räknas inte i rätt namn av läsbara; fel namn räknas ändå): ${olasbara.length}\n`);
  tabell(olasbara);
  for (const r of olasbara) console.log(`  ${r.fall} ${r.kort}: ${r.olasbar}${r.steg === 'SÄKERT FEL' ? ' — SÄKERT FEL ändå (' + r.gissning + ')' : ''}`);
}
