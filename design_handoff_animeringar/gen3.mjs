// Sida 3 i "Mesa Mirror Animations": E · Lugn matta (Jesper 2026-10-02,
// dev/plan/spegelmattan-principer.md). En artboard ur src3/: "Prototyp" —
// det fysiska bordet och mattan sida vid sida.
//
//   node gen3.mjs                        → artboards/EPrototyp.dc.html + TIDSLINJER-E.md
//   node gen3.mjs <ut> src/bilder.json   → <ut>/project/EPrototyp.dc.html för designytan
import fs from 'node:fs';
import path from 'node:path';

const S = path.dirname(new URL(import.meta.url).pathname);
const rd = f => fs.readFileSync(path.join(S, 'src3', f), 'utf8');
const [, , UT_ARG, BILD_ARG] = process.argv;
const blob = BILD_ARG ? JSON.parse(fs.readFileSync(BILD_ARG, 'utf8')) : null;
const bild = n => blob ? blob[n] : `${n}.jpg`;
const BILD = { llanowar: bild('llanowar'), serra: bild('serra'), woodelves: bild('woodelves'), forest1: bild('forest'), forest2: bild('forest'),
  plains1: bild('plains'), plains2: bild('plains'), anthem: bild('anthem'), okand: bild('pikemaster') };
const KORT = ['forest1', 'forest2', 'plains1', 'plains2', 'llanowar', 'serra', 'woodelves', 'anthem', 'okand'];

const kortHtml = id => `<div class="k" data-k="${id}"><i class="k-ring"></i><i class="k-sh"></i><img class="k-face" src="${BILD[id]}" alt="" draggable="false"><img class="k-foto" src="${BILD[id]}" alt="" draggable="false"><i class="k-glans"></i><i class="k-glow"></i></div>`;
const fysHtml = id => `<div class="fk" data-f="${id}"><i class="fk-sh"></i><img src="${BILD[id]}" alt="" draggable="false"></div>`;
/* Handen ovanifrån: fyra fingrar, tummen och handflatan. */
const hand = h => `<div class="hand" data-hand="${h}"><svg viewBox="0 0 210 260" aria-hidden="true"><g fill="#d6b298" stroke="#9a7560" stroke-width="3"><rect x="46" y="20" width="30" height="120" rx="15"></rect><rect x="82" y="4" width="30" height="134" rx="15"></rect><rect x="118" y="10" width="30" height="128" rx="15"></rect><rect x="152" y="36" width="27" height="106" rx="13.5"></rect><rect x="8" y="118" width="32" height="96" rx="16" transform="rotate(-38 24 166)"></rect><rect x="38" y="96" width="146" height="152" rx="58"></rect></g></svg></div>`;

const CSS = rd('style3.css');
const attr = o => JSON.stringify(o).replace(/&/g, '&amp;').replace(/'/g, '&#39;');
const H = 1030;
const props = {
  tempo: { editor: 'enum', options: ['1×', '½×', '¼×'], default: '1×' },
  namn: { editor: 'enum', options: ['0,3 s', '1,2 s', '4 s'], default: '1,2 s' },
  troskel: { editor: 'enum', options: ['0,3 s', '0,5 s', '0,8 s'], default: '0,5 s' },
  sudd: { editor: 'enum', options: ['Låg', 'Mellan', 'Hög'], default: 'Mellan' },
  ring: { editor: 'enum', options: ['På', 'Av'], default: 'På' },
  rorelse: { editor: 'enum', options: ['Full', 'Minskad'], default: 'Full' },
};

const PROTO = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<title>E · Prototyp — lugn matta</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
${CSS}
</style>
</helmet>
<div class="ab" ref="{{rotRef}}" style="width: 1440px; height: ${H}px">
  <div class="hu">
    <span class="et">E · Lugn matta</span>
    <h1>Prototyp: bordet och mattan</h1>
    <p>Välj vad du gör vid bordet. Till vänster det fysiska bordet som kameran ser det, till höger mattan som spelarna ser. Den streckade ramen på bordet är det mattan visar just nu.</p>
  </div>
  <div class="rad3">
    <div class="kf">
      <div class="cap"><b>Fysiskt bord</b> det kameran ser</div>
      <div class="fbord">
        <div class="fsurf">
          <img class="fhog lager" src="${bild('pikemaster')}" alt="" draggable="false">
          <img class="fhog" src="${bild('pikemaster')}" alt="" draggable="false">
          <img class="fbib" src="${bild('baksida')}" style="left: 242px; top: 504px; filter: brightness(.55)" alt="" draggable="false">
          <img class="fbib" src="${bild('baksida')}" style="left: 238px; top: 508px; filter: brightness(.75)" alt="" draggable="false">
          <img class="fbib" src="${bild('baksida')}" style="left: 234px; top: 512px" alt="" draggable="false">
          ${KORT.map(fysHtml).join('\n          ')}
          <i class="vy" data-vy="1"><span>Mattans utsnitt</span></i>
          ${hand('h1')}
          ${hand('h2')}
        </div>
      </div>
      <div class="kant">din sida av bordet</div>
      <div class="grupp">
        <div class="rub">Vad du gör</div>
        <div class="hk-grid">
          <sc-for list="{{knappar}}" as="k" hint-placeholder-count="11">
            <button type="button" class="hk {{k.cls}}" onClick="{{k.kor}}"><b>{{k.namn}}</b><span>{{k.under}}</span></button>
          </sc-for>
        </div>
        <div class="btnrad">
          <button type="button" class="btn" onClick="{{spelaIgen}}">Spela igen</button>
          <button type="button" class="btn" onClick="{{aterstall}}">Återställ bordet</button>
        </div>
      </div>
    </div>
    <div class="km">
      <div class="cap"><b>Mattan</b> det spelarna ser</div>
      <div class="mat">
        <div class="surf" data-yta="1">
          <div class="hd1 gr" style="left: 30px; top: 512px">
            <img class="u1" src="${bild('plains')}" alt="" draggable="false">
            <img class="topp" src="${bild('pikemaster')}" alt="" draggable="false">
            <img class="g-ny" data-hog="1" data-src="${bild('woodelves')}" alt="" draggable="false">
            <i class="g-ring" data-hogring="1"></i>
            <span class="bricka gul"><i></i>Graveyard<b data-hogtal="1">{{gravN}}</b></span>
          </div>
          <div class="hd1 lk" data-bib="1" style="left: 234px; top: 512px">
            <img src="${bild('baksida')}" alt="" draggable="false">
            <span class="bricka"><i></i>Library</span>
          </div>
          ${KORT.map(kortHtml).join('\n          ')}
        </div>
        <div class="mattachrome"><span class="zs">−</span><span>{{zoomTxt}}</span><span class="zs">+</span></div>
        <sc-if value="{{rad.visa}}" hint-placeholder-val="{{false}}">
          <div class="hrad">
            <span class="hrad-t"><b>{{rad.namn}}</b> {{rad.txt}}</span>
            <sc-if value="{{rad.val}}" hint-placeholder-val="{{true}}">
              <div class="hrad-v">
                <button type="button" onClick="{{rad.exile}}">Exile</button>
                <button type="button" onClick="{{rad.kvar}}">Still on the table</button>
                <button type="button" onClick="{{rad.bib}}">Library</button>
              </div>
            </sc-if>
            <i class="hrad-bar" data-radbar="1"></i>
          </div>
        </sc-if>
        <sc-if value="{{mark.visa}}" hint-placeholder-val="{{false}}">
          <button type="button" class="mark" style="{{mark.stil}}" onClick="{{mark.klick}}">Name this card</button>
        </sc-if>
        <sc-if value="{{sok.visa}}" hint-placeholder-val="{{false}}">
          <div class="sok" style="{{sok.stil}}">
            <div class="sok-hu">
              <label class="sok-l" for="sok-namn">Which card is this?</label>
              <button type="button" class="sok-x" aria-label="Close" onClick="{{sok.stang}}"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg></button>
            </div>
            <input id="sok-namn" class="sok-in" type="text" autocomplete="off" placeholder="Type a card name" value="{{sok.q}}" onChange="{{sok.skriv}}">
            <span class="sok-grp">From your deck</span>
            <div class="sok-lista">
              <sc-for list="{{sok.traffar}}" as="t" hint-placeholder-count="5">
                <button type="button" class="sok-t" onClick="{{t.valj}}"><span>{{t.a}}</span><b>{{t.b}}</b><span>{{t.c}}</span></button>
              </sc-for>
              <sc-if value="{{sok.ingen}}" hint-placeholder-val="{{false}}"><span class="sok-tom">Nothing in your deck — searching all cards</span></sc-if>
            </div>
          </div>
        </sc-if>
      </div>
      <div class="grupp">
        <div class="rub">Vad som händer</div>
        <div class="logg3">
          <span class="lh c-t">Tid</span><span class="lh c-du">Du gör</span><span class="lh c-kam">Kameran ser</span><span class="lh c-mat">Mattan gör</span>
          <sc-if value="{{loggTom}}" hint-placeholder-val="{{true}}"><span class="ltom">Välj något att göra vid bordet. Tiderna räknas från att du börjar.</span></sc-if>
          <sc-for list="{{logg}}" as="l" hint-placeholder-count="0">
            <span class="lc c-t">{{l.t}}</span><span class="lc c-du">{{l.du}}</span><span class="lc c-kam">{{l.kam}}</span><span class="lc c-mat">{{l.mat}}</span>
          </sc-for>
        </div>
      </div>
    </div>
  </div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${attr(Object.assign({}, props, { $preview: { width: 1440, height: H } }))}'>
const BILD = ${JSON.stringify(BILD)};
${rd('spec3.js')}
${rd('motor3.js')}
${rd('bord3.js')}
${rd('proto3.js')}
</script>
</body>
</html>
`;

const utDir = UT_ARG ? path.join(UT_ARG, 'project') : path.join(S, 'artboards');
fs.mkdirSync(utDir, { recursive: true });
fs.writeFileSync(path.join(utDir, 'EPrototyp.dc.html'), PROTO);
console.log('skrev EPrototyp till', utDir);

/* TIDSLINJER-E.md, ur samma SPEC. */
if (!blob) {
  const vm = await import('node:vm');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(rd('spec3.js') + '\n;globalThis.__ = { SPEC, EASE, EGENSKAP, MAL, FAS };', ctx);
  const { SPEC, EASE, EGENSKAP, MAL, FAS } = ctx.__;
  const tal = v => typeof v === 'number' ? String(Math.round(v * 1000) / 1000).replace('.', ',')
    : ({ cur: 'nu', mal: 'nya platsen', in: 'platsen + 90 px mot spelaren', hem: 'kortets plats', ut: 'under nederkanten', hog: 'högen', hogS: 'högens storlek', bib: 'library-högen', bibS: 'högens storlek', zf: 'nya zoomsteget', vx: 'nya utsnittet', vy: 'nya utsnittet' }[v] || v);
  const ORDNING = [
    ['Utspel', ['namn', 'oframkallad', 'framkalla']],
    ['Knuff', ['knuff']],
    ['Flytt', ['flytt']],
    ['Till handen, och valen efteråt', ['tillHanden', 'tillbaka', 'tillBib']],
    ['Till graveyard', ['grav']],
    ['Tap och untap', ['tap', 'untap']],
    ['Zoomsteg', ['zoom']],
  ];
  let md = `# Tidslinjerna — E · Lugn matta

Genererad ur \`src3/spec3.js\` av \`node gen3.mjs\` — samma data som prototypen kör. Ändra inte här.
Besluten bakom står i \`dev/plan/spegelmattan-principer.md\`. D:s tidslinjer står i \`TIDSLINJER.md\`.

Läses som D:s tabeller: **t** i ms från att mattan får beskedet, nycklar \`t: värde\`, easing per segment, \`nu\` = där egenskapen står. **svag** = hoppas över om egenskapen redan rör sig. **ring** = bara när den gröna ringen är på.

| Easing | CSS |
|---|---|
${Object.entries(EASE).filter(([, e]) => Array.isArray(e.b)).map(([k, e]) => `| ${k} | \`${e.css}\` |`).join('\n')}
| LIN | \`linear\` |

| Egenskap | Betyder |
|---|---|
| framkallning | 0→1: kamerans foto i kortets unika ytor (namn, bild, typrad, text, P/T), suddigt. Ramen runt dem är skarp. 1 = oframkallat, 0 = kortets riktiga bild |
| zoom, utsnitt | mattans zoomsteg (100 %, 86 %, 75 % = hela kamerabilden) och vilken del av bordet den visar |
| övriga | som i D |
`;
  for (const v of ['E', 'R']) {
    const sp = SPEC[v];
    md += `\n## ${v === 'E' ? 'E · Lugn matta' : 'Minskad rörelse (prefers-reduced-motion)'}\n`;
    for (const [rub, kinds] of ORDNING) {
      md += `\n### ${rub}\n`;
      for (const k of kinds) {
        const spar = sp[k] || [];
        md += `\n**${FAS[k]}**${spar.length ? '' : ' — ingenting rör sig.'}\n`;
        if (!spar.length) continue;
        md += `\n| Mål · egenskap | Nycklar (ms: värde) | Easing | |\n|---|---|---|---|\n`;
        for (const [m, p, keys, fl] of spar) {
          const g = p === 'r' ? '°' : '';
          const nyck = keys.map(([t, val]) => `${t}: ${tal(val)}${typeof val === 'number' ? g : ''}`).join(' → ');
          const e = keys.length > 1 ? keys.slice(0, -1).map(x => x[2] || 'LIN').join(', ') : 'direkt';
          md += `| ${MAL[m]} · ${EGENSKAP[p]} | ${nyck} | ${e} | ${fl || ''} |\n`;
        }
      }
    }
  }
  fs.writeFileSync(path.join(S, 'TIDSLINJER-E.md'), md);
  console.log('skrev TIDSLINJER-E.md');
}
