// Sida 2 i "Mesa Mirror Animations": D · När kameran vet (Jesper 2026-09-25).
// Två artboards ur src2/: "Alla lägen" (varje händelse som stillbilder, räknade
// med samma motor) och "Prototyp" (spela upp dem, med tidslinjen under).
//
//   node gen2.mjs                        → artboards/D*.dc.html + TIDSLINJER.md
//   node gen2.mjs <ut> src/bilder.json   → <ut>/project/D*.dc.html för designytan
import fs from 'node:fs';
import path from 'node:path';

const S = path.dirname(new URL(import.meta.url).pathname);
const rd = f => fs.readFileSync(path.join(S, 'src2', f), 'utf8');
const [, , UT_ARG, BILD_ARG] = process.argv;
const blob = BILD_ARG ? JSON.parse(fs.readFileSync(BILD_ARG, 'utf8')) : null;
const bild = n => blob ? blob[n] : `${n}.jpg`;
const BILD = { llanowar: bild('llanowar'), serra: bild('serra'), woodelves: bild('woodelves'), forest1: bild('forest'), forest2: bild('forest'),
  plains1: bild('plains'), plains2: bild('plains'), anthem: bild('anthem') };

const KORT = ['forest1', 'forest2', 'plains1', 'plains2', 'llanowar', 'serra', 'woodelves', 'anthem'];
const kortHtml = id => `<div class="k" data-k="${id}"><i class="k-ring"></i><i class="k-sh"></i><img class="k-face" src="${BILD[id]}" alt="" draggable="false"><i class="k-lost"></i><i class="k-glow"></i></div>`;
const hogar = (gravN, nySt) => `<div class="gravhog">
        <div class="grav">
          <i class="glager" style="transform: translate(1.5px, -1.5px)"></i>
          <img src="${bild('pikemaster')}" alt="" draggable="false">
          <img class="g-ny" data-hog="1" data-src="${bild('woodelves')}"${nySt ? ` src="${bild('woodelves')}" style="${nySt}"` : ''} alt="" draggable="false">
          <i class="g-ring" data-hogring="1"></i>
        </div>
        <span class="hograd"><i></i>Graveyard<b data-hogtal="1">${gravN}</b></span>
      </div>
      <div class="bibhog">
        <div class="bib"><img src="${bild('baksida')}" alt=""><img src="${bild('baksida')}" alt=""><img src="${bild('baksida')}" alt=""></div>
        <span class="hograd"><i></i>Library<b>47</b></span>
      </div>`;
const matHtml = (m, vrid) => `<div class="mat" data-mat="${m}" data-rot="${vrid}">
      <div class="surf">
        ${KORT.map(kortHtml).join('\n        ')}
      </div>
      ${hogar('{{gravN}}')}
      <div class="mattachrome"><span class="zs">−</span><span>65 %</span><span class="zs">+</span></div>
    </div>`;
const statiskKort = v => `<div class="k" style="{{${v}.st.el}}"><i class="k-ring" style="{{${v}.st.ring}}"></i><i class="k-sh" style="{{${v}.st.sh}}"></i><img class="k-face" src="{{${v}.bild}}" style="{{${v}.st.face}}" alt="" draggable="false"><i class="k-lost" style="{{${v}.st.lost}}"></i><i class="k-glow" style="{{${v}.st.glow}}"></i></div>`;

const CSS = rd('style.css');
const attr = o => JSON.stringify(o).replace(/&/g, '&amp;').replace(/'/g, '&#39;');
const skal = ({ titel, et, h1, p, kropp, js, props, h }) => `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<title>${titel}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
${CSS}
</style>
</helmet>
<div class="ab" ref="{{rotRef}}" style="width: 1440px; height: ${h}px">
  <div class="hu">
    <span class="et">${et}</span>
    <h1>${h1}</h1>
    <p>${p}</p>
  </div>
${kropp}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${attr(Object.assign({}, props, { $preview: { width: 1440, height: h } }))}'>
const BILD = ${JSON.stringify(BILD)};
${rd('spec.js')}
${rd('motor.js')}
${js}
</script>
</body>
</html>
`;

const PROTO = skal({
  titel: 'D · Prototyp — spegelns animeringar', h: 1180,
  et: 'D · När kameran vet', h1: 'Prototyp',
  p: 'Klicka en händelse. Tempo, minskad rörelse och hur snabbt namnet kommer ställs under Tweaks.',
  props: {
    tempo: { editor: 'enum', options: ['1×', '½×', '¼×'], default: '1×' },
    rorelse: { editor: 'enum', options: ['Full', 'Minskad'], default: 'Full' },
    namn: { editor: 'enum', options: ['0,5 s', '1,2 s', '4 s'], default: '1,2 s' },
  },
  js: rd('proto.js'),
  kropp: `  <div class="rad">
    <div class="v">
      ${matHtml(0, 0)}
    </div>
    <div class="h">
      <div class="grupp">
        <div class="rub">Händelser</div>
        <div class="hk-grid">
          <sc-for list="{{knappar}}" as="k" hint-placeholder-count="9">
            <button type="button" class="hk {{k.cls}}" onClick="{{k.kor}}"><b>{{k.namn}}</b><span>{{k.under}}</span></button>
          </sc-for>
        </div>
        <div class="btnrad">
          <button type="button" class="btn" onClick="{{hoppa}}">Hoppa fram »</button>
          <button type="button" class="btn" onClick="{{aterstall}}">Återställ bordet</button>
        </div>
      </div>
      <div class="grupp">
        <div class="rub">Kameran säger</div>
        <div class="logg">
          <sc-if value="{{loggTom}}" hint-placeholder-val="{{true}}"><span class="ltom">Välj en händelse. Tiderna räknas från händelsens början.</span></sc-if>
          <sc-for list="{{logg}}" as="l" hint-placeholder-count="0"><div class="lrad"><span class="lt">{{l.t}}</span><span>{{l.txt}}</span></div></sc-for>
        </div>
      </div>
    </div>
  </div>
  <div class="rad">
    <div class="v tl">
      <div class="tl-rubrik"><b>Tidslinje · {{tlTitel}}</b><span>ms från kamerans uppdatering</span></div>
      <sc-for list="{{tl}}" as="f" hint-placeholder-count="3">
        <div class="tl-fas">
          <div class="tl-fh"><b>{{f.titel}}</b><span class="nar">{{f.nar}}</span></div>
          <sc-if value="{{f.harRader}}" hint-placeholder-val="{{true}}">
          <div class="tl-grid">
            <span></span>
            <div class="tl-ax"><sc-for list="{{f.ticks}}" as="t" hint-placeholder-count="5"><span class="tl-tick" style="{{t.stil}}"><i>{{t.txt}}</i></span></sc-for></div>
            <span></span>
            <sc-for list="{{f.rader}}" as="r" hint-placeholder-count="2">
              <span class="tl-lbl">{{r.lbl}}</span>
              <div class="tl-bana {{r.cls}}"><sc-for list="{{r.bitar}}" as="b" hint-placeholder-count="1"><i class="{{b.cls}}" style="{{b.stil}}"></i></sc-for></div>
              <span class="tl-txt">{{r.txt}}</span>
            </sc-for>
          </div>
          </sc-if>
          <sc-if value="{{f.tom}}" hint-placeholder-val="{{false}}"><div class="tl-tom">{{f.tomTxt}}</div></sc-if>
          <i class="tl-head"></i>
        </div>
      </sc-for>
    </div>
    <div class="h">
      <div class="grupp">
        <div class="cap">Så ser motståndaren ditt bord</div>
        <div class="mini">
          ${matHtml(1, 180)}
        </div>
      </div>
    </div>
  </div>`,
});

const LAGEN = skal({
  titel: 'D · Alla lägen — spegelns animeringar', h: 1330,
  et: 'D · När kameran vet', h1: 'Alla lägen',
  p: 'Bordet visar bara det kameran vet, och varje ändring är en enda rörelse från det gamla läget till det nya. I mattorna: streckad ram är där kortet låg, svaga kort är vägen, helt kort är där det landar.',
  props: {},
  js: rd('lagen.js'),
  kropp: `  <div class="lg">
    <sc-for list="{{celler}}" as="c" hint-placeholder-count="9">
      <div class="cell">
        <div class="cell-hu"><b>{{c.rub}}</b><span>{{c.forst}}</span></div>
        <sc-if value="{{c.bana}}" hint-placeholder-val="{{false}}">
          <div class="bmat"><div class="mat">
            <div class="surf">
              <i class="ram" style="{{c.ram}}"></i>
              <sc-for list="{{c.spoken}}" as="k" hint-placeholder-count="4">${statiskKort('k')}</sc-for>
              <sc-for list="{{c.kort}}" as="k" hint-placeholder-count="8">${statiskKort('k')}</sc-for>
            </div>
            <div class="gravhog">
              <div class="grav">
                <i class="glager" style="transform: translate(1.5px, -1.5px)"></i>
                <img src="${bild('pikemaster')}" alt="" draggable="false">
                <img class="g-ny" src="${bild('woodelves')}" style="{{c.hogSt}}" alt="" draggable="false">
              </div>
              <span class="hograd"><i></i>Graveyard<b>{{c.gravN}}</b></span>
            </div>
            <div class="bibhog">
              <div class="bib"><img src="${bild('baksida')}" alt=""><img src="${bild('baksida')}" alt=""><img src="${bild('baksida')}" alt=""></div>
              <span class="hograd"><i></i>Library<b>47</b></span>
            </div>
          </div></div>
        </sc-if>
        <sc-if value="{{c.remsa}}" hint-placeholder-val="{{false}}">
          <div class="remsa">
            <sc-for list="{{c.bilder}}" as="k" hint-placeholder-count="4">
              <div class="ruta">${statiskKort('k')}<span class="tid">{{k.t}}</span></div>
            </sc-for>
          </div>
        </sc-if>
        <div class="cell-fot">{{c.fore}}<sc-if value="{{c.bana}}" hint-placeholder-val="{{false}}"> · {{c.efterTxt}}</sc-if></div>
      </div>
    </sc-for>
  </div>`,
});

const utDir = UT_ARG ? path.join(UT_ARG, 'project') : path.join(S, 'artboards');
fs.mkdirSync(utDir, { recursive: true });
fs.writeFileSync(path.join(utDir, 'DPrototyp.dc.html'), PROTO);
fs.writeFileSync(path.join(utDir, 'DLagen.dc.html'), LAGEN);
console.log('skrev DPrototyp och DLagen till', utDir);

/* TIDSLINJER.md för D, ur samma SPEC. */
if (!blob) {
  const vm = await import('node:vm');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(rd('spec.js') + '\n;globalThis.__ = { SPEC, EASE, EGENSKAP, MAL, FAS, TOM };', ctx);
  const { SPEC, EASE, EGENSKAP, MAL, FAS, TOM } = ctx.__;
  const tal = v => typeof v === 'number' ? String(Math.round(v * 1000) / 1000).replace('.', ',') : ({ cur: 'nu', mal: 'nya platsen', in: 'platsen + 90 px mot spelaren', mal2: 'rättade platsen', hog: 'högen', hogS: 'högens storlek (0,8)' }[v] || v);
  const ORDNING = [
    ['Utspel', ['syns', 'claude', 'namn']],
    ['Knuff (kameran har kortet hela tiden)', ['knuff']],
    ['Flytt', ['tappad', 'syns', 'flytt']],
    ['Flytt som avbryts halvvägs (210 ms in i flytten)', ['avbrott']],
    ['Nedtonat efter 5 s', ['nedtonad']],
    ['Tillbaka', ['tillbaka', 'tillbakaNy']],
    ['Till graveyard', ['grav']],
    ['Tap och untap', ['tap', 'untap']],
  ];
  let md = `# Tidslinjerna — D · När kameran vet

Genererad ur \`src2/spec.js\` av \`node gen2.mjs\` — samma data som artboardsen kör. Ändra inte här.
Sida 1:s varianter (I dag, A, B, C) står i \`TIDSLINJER-sida1.md\`.

**Principen (Jesper 2026-09-25):** inga laddlägen. Bordet visar bara det kameran vet, och varje ändring är en enda rörelse från det gamla läget till det nya.

- Ett nytt kort syns först när namnet finns, och läggs då ned. Platshållaren ("Reading the card…") visas inte.
- Ett kort kameran tappat står kvar orört tills den vet var det hamnade (upp till 5 s). Sedan bärs det dit i en rörelse.
- Till graveyard flyger kortet direkt när högen växer, utan att tonas först, och landar som högens toppkort.

Så läses tabellerna:
- **t** räknas i ms från kamerans uppdatering.
- **Nycklar** skrivs \`t: värde\`. En enda nyckel betyder att värdet sätts direkt.
- **Easing** gäller segmentet som börjar vid nyckeln. \`nu\` = där egenskapen står när spåret börjar.
- **Avbrott:** ett spår som tar över en egenskap som redan rör sig börjar från \`nu\`. För position, vridning och skala tas farten med: första segmentet blir \`cubic-bezier(x1, k·x1, x2, y2)\`, \`k = v·T/Δ\`, med x1 ≥ 0,15 och k·x1 inom −1,2…3.
- **svag** = spåret hoppas över om egenskapen redan rör sig. Tap mitt i en flytt tar alltså inte över skalan.

| Easing | CSS | Ursprung |
|---|---|---|
${Object.entries(EASE).filter(([, e]) => Array.isArray(e.b)).map(([k, e]) => `| ${k} | \`${e.css}\` | ${e.om || ''} |`).join('\n')}
| LIN | \`linear\` | |
| STEP | hopp vid segmentets slut | |

| Egenskap | Betyder i CSS |
|---|---|
| position | \`translate(x, y)\` i brädets px (mattans zoom ovanpå) |
| skala | \`scale()\` kring kortets mitt |
| vridning | \`rotate()\`; 90° = tappat |
| opacitet | hela kortets \`opacity\` |
| skugga | opaciteten på ett eget lager med \`box-shadow: 0 26px 40px -12px #000f\` (.card.held) |
| nedtoning | 0→1 = \`grayscale(0→.8) brightness(1→.55)\` + streckad kant \`#e8b33a88\` (.card.lyft) |
| graveyard-ton | 0→1 = \`grayscale(0→.6) brightness(1→.55) contrast(1→1.05)\`, samma som högens toppkort, så att bytet inte syns |
| grön ring | 0→1 = nypuls: en grön yta \`#5fbf7f\` bakom kortet som växer 0→12 px och tonas .53→0 |
| grön kant | minskad rörelse: en fast kant \`0 0 0 3px #5fbf7f\` som tonas |
| högens toppkort / ring / tal | graveyard-högen: settle, cRing och cBump (GRAVEYARD_ANIMATION.md §3) |
`;
  for (const v of ['D', 'R']) {
    const sp = SPEC[v];
    md += `\n## ${v === 'D' ? 'D · När kameran vet' : 'Minskad rörelse (prefers-reduced-motion)'}\n`;
    for (const [rub, kinds] of ORDNING) {
      md += `\n### ${rub}\n`;
      for (const k of kinds) {
        const spar = (sp[k] || []).filter(t => t[3] !== 'intern');
        md += `\n**${FAS[k]}**${spar.length ? '' : ' — ' + (TOM[k] || 'ingenting rör sig.')}\n`;
        if (!spar.length) continue;
        md += `\n| Mål · egenskap | Nycklar (ms: värde) | Easing | |\n|---|---|---|---|\n`;
        for (const [m, p, keys, fl] of spar) {
          const g = p === 'r' ? '°' : '';
          const nyck = keys.map(([t, val]) => `${t}: ${tal(val)}${typeof val === 'number' ? g : ''}`).join(' → ');
          const e = keys.length > 1 ? keys.slice(0, -1).map(x => x[2] || 'LIN').join(', ') : 'direkt';
          md += `| ${MAL[m]} · ${EGENSKAP[p]} | ${nyck} | ${e} | ${fl === 'svag' ? 'svag' : ''} |\n`;
        }
      }
    }
  }
  fs.writeFileSync(path.join(S, 'TIDSLINJER.md'), md);
  console.log('skrev TIDSLINJER.md');
}
