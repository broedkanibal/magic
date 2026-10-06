// Bygger designytan "Mesa Mirror Animations" (MES-292): animeringarna på det
// digitala bordet i spegelläget, i dag + tre varianter. Allt rörligt i en
// artboard styrs av src/spec.js (tidslinjerna som data) och src/logic.js
// (motorn), så att tidslinjen under bordet och rörelsen på det är samma sak.
//
//   node gen.mjs            → artboards/*.dc.html med bilderna bredvid (fristående)
//   node gen.mjs <ut> <bilder.json>
//                           → <ut>/project/*.dc.html med bildernas uppladdade
//                             adresser (designytan)
//
// Bilderna (Scryfall, 272×380) är samma som i design_handoff_bordsvy/artboards/.
import fs from 'node:fs';
import path from 'node:path';

const S = path.dirname(new URL(import.meta.url).pathname);
const rd = f => fs.readFileSync(path.join(S, 'src', f), 'utf8');
const [, , UT_ARG, BILD_ARG] = process.argv;
const BILDER = ['llanowar', 'serra', 'woodelves', 'forest', 'plains', 'anthem', 'pikemaster', 'baksida'];
const blob = BILD_ARG ? JSON.parse(fs.readFileSync(BILD_ARG, 'utf8')) : null;
const bild = n => blob ? blob[n] : `${n}.jpg`;

const ARTBOARDS = [
  { file: 'Today.dc.html', v: 'N', et: 'I dag · så gör index.html nu', titel: 'I dag',
    text: 'Platshållaren och kortet poppar fram, och den gröna ringen pulsar i 1,4 s. Ett kort kameran tappar tonas ned efter 0,6 s och hoppar till den nya platsen när namnet kommer, 1,5–5 s senare. Tap har ett överslag på 0,34 s.' },
  { file: 'VariantA.dc.html', v: 'A', et: 'Variant A', titel: 'A · Stilla',
    text: 'Minsta möjliga rörelse. Nya kort tonas in, en flytt glider rakt dit, tap vrids på 0,2 s. Ingenting lyfts och ingenting studsar — den gröna ringen är det enda som säger att kortet spelades just ut.' },
  { file: 'Main.dc.html', v: 'B', et: 'Variant B · förslaget', titel: 'B · Handen',
    text: 'Kortet rör sig som när en hand flyttar det. Det läggs ned när det spelas ut, lyfts, bärs och sätts ned när det flyttas, och landar som högens nya toppkort i graveyard. Väntan medan kameran letar syns inte.' },
  { file: 'VariantC.dc.html', v: 'C', et: 'Variant C', titel: 'C · Kameran',
    text: 'Visar vad kameran vet. Sökarhörn medan kortet läses, sedan skannas framsidan fram. Där ett flyttat kort låg står ett spår kvar en stund, och har ett kort varit borta i 1,5 s letar hörnen diskret efter det.' },
];

const KORT = [['forest1', 'forest'], ['forest2', 'forest'], ['plains1', 'plains'], ['plains2', 'plains'],
  ['llanowar', 'llanowar'], ['serra', 'serra'], ['woodelves', 'woodelves'], ['anthem', 'anthem'], ['P', null]];
const kortHtml = ([id, img]) => `<div class="k${img ? '' : ' p'}" data-k="${id}">
          <i class="k-ring"></i><i class="k-sh"></i>
          <div class="k-ph"><span class="t1">Reading the card…</span><span class="t2">Asking Claude…</span></div>
          ${img ? `<img class="k-face" src="${bild(img)}" alt="" draggable="false">` : ''}
          <i class="k-scan"></i><i class="k-lost"></i><i class="k-glow"></i>
          <i class="k-cb"><b class="c1"></b><b class="c2"></b><b class="c3"></b><b class="c4"></b></i>
        </div>`;
const matHtml = (m, vrid) => `<div class="mat" data-mat="${m}" data-rot="${vrid}">
      <div class="surf">
        <i class="k-spok" data-spok="1"></i>
        ${KORT.map(kortHtml).join('\n        ')}
      </div>
      <div class="gravhog">
        <div class="grav">
          <i class="glager" style="transform: translate(1.5px, -1.5px)"></i>
          <img src="${bild('pikemaster')}" alt="" draggable="false">
          <img class="g-ny" data-hog="1" data-src="${bild('woodelves')}" alt="" draggable="false">
          <i class="g-ring" data-hogring="1"></i>
        </div>
        <span class="hograd"><i></i>Graveyard<b data-hogtal="1">{{gravN}}</b></span>
      </div>
      <div class="bibhog">
        <div class="bib"><img src="${bild('baksida')}" alt=""><img src="${bild('baksida')}" alt=""><img src="${bild('baksida')}" alt=""></div>
        <span class="hograd"><i></i>Library<b>47</b></span>
      </div>
      <div class="mattachrome"><span class="zs">−</span><span>65 %</span><span class="zs">+</span></div>
    </div>`;

const REGLER = {
  N: `<li><b>Det här är nuläget</b>, inte ett förslag — samma knappar, så att varianterna går att jämföra.</li>
      <li><b>Flytten</b> läses som att ett kort försvann och ett annat kom: nedtonat efter 0,6 s, hopp när namnet kommer.</li>
      <li><b>Till graveyard</b> tonas kortet först ned, sedan flyger en kopia dit.</li>`,
  X: `<li><b>Start:</b> animeringen börjar i samma bildruta som kamerans uppdatering. Ingenting väntar in något annat, så löftet om 0,3 s står kvar.</li>
      <li><b>Avbrott:</b> ett nytt spår tar över från där kortet står. Position, vridning och skala behåller farten: första segmentet blir cubic-bezier(x1, k·x1, x2, y2), k = v·T/Δ.</li>
      <li><b>Prestanda:</b> varje bildruta bara transform och opacitet. Skuggan är ett eget lager som tonas, filter används bara under nedtoningen.</li>
      <li><b>Små bord:</b> samma tider. Rörelsen skalas med mattan — lyftet blir ett par pixlar i en motståndares kolumn.</li>`,
};
const LEGEND = v => [
  ['UT', 'cubic-bezier(.2,.8,.3,1) — landning och settle'],
  ['HF', 'cubic-bezier(.3,.75,.25,1) — flygturen ur solfjädern'],
  ['FLY', 'cubic-bezier(.4,0,.2,1) — flygTillGrav'],
  v === 'B' ? ['SOFT', 'cubic-bezier(.3,.7,.3,1) — mjuk vridning (ny)'] : null,
  v === 'N' ? ['OS', 'cubic-bezier(.34,1.4,.5,1) — tap med överslag'] : null,
  ['OUT/IN', 'ease-out, ease-in, ease-in-out, linear'],
  ['värden', 'nedtoning 1 = grayscale(.8) brightness(.55) + streckad kant · skugga 1 = 0 26px 40px -12px #000f · grön ring 0→1 = 0→12 px, alfa .53→0'],
  ['färger', 'blå = kortet · grå = platshållaren · lila = spåret · gul = graveyard-högen · ◆ = mellanläge'],
].filter(Boolean).map(([a, b]) => `<span class="mono">${a}</span><span>${b}</span>`).join('\n        ');

const CSS = rd('style.css');
const JS = rd('spec.js') + '\n' + rd('logic.js');
const attr = o => JSON.stringify(o).replace(/&/g, '&amp;').replace(/'/g, '&#39;');

function artboard(a) {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<title>${a.titel} — spegelns animeringar</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
${CSS}
</style>
</helmet>
<div class="ab" ref="{{rotRef}}" style="width: 1440px; height: 1500px">
  <div class="hu">
    <span class="et">${a.et}</span>
    <h1>${a.titel}</h1>
    <p>${a.text}</p>
  </div>
  <div class="rad">
    <div class="v">
      ${matHtml(0, 0)}
    </div>
    <div class="h">
      <div class="grupp">
        <div class="rub">Händelser</div>
        <div class="hk-grid">
          <sc-for list="{{knappar}}" as="k" hint-placeholder-count="8">
            <button type="button" class="hk {{k.cls}}" onClick="{{k.kor}}"><b>{{k.namn}}</b><span>{{k.under}}</span></button>
          </sc-for>
        </div>
        <div class="btnrad">
          <button type="button" class="btn" onClick="{{hoppa}}">Hoppa fram »</button>
          <button type="button" class="btn" onClick="{{aterstall}}">Återställ bordet</button>
        </div>
      </div>
      <div class="ctl">
        <span class="l">Tempo</span>
        <div class="seg"><sc-for list="{{farter}}" as="f" hint-placeholder-count="3"><button type="button" class="{{f.cls}}" onClick="{{f.val}}">{{f.txt}}</button></sc-for></div>
        <sc-if value="{{visaRorelse}}" hint-placeholder-val="{{true}}">
          <span class="l">Rörelse</span>
          <div class="seg"><sc-for list="{{rorelse}}" as="f" hint-placeholder-count="2"><button type="button" class="{{f.cls}}" onClick="{{f.val}}">{{f.txt}}</button></sc-for></div>
        </sc-if>
        <span class="l">Namnet efter</span>
        <div class="seg"><sc-for list="{{namnval}}" as="f" hint-placeholder-count="3"><button type="button" class="{{f.cls}}" onClick="{{f.val}}">{{f.txt}}</button></sc-for></div>
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
      <div class="tl-rubrik"><b>Tidslinje · {{tlTitel}}</b><span>tider i ms från kamerans uppdatering · spelhuvudet följer uppspelningen</span></div>
      <sc-for list="{{tl}}" as="f" hint-placeholder-count="3">
        <div class="tl-fas">
          <div class="tl-fh"><b>{{f.titel}}</b><span class="nar">{{f.nar}}</span><span class="om">{{f.om}}</span></div>
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
        <p class="minitxt">Samma händelser på mattan en motståndare ser i bordsvyn: 0,41 gånger så stor och vänd mot hen, korten upprätta.</p>
      </div>
      <div class="grupp">
        <div class="rub">Regler</div>
        <ul class="regler">
      ${REGLER[a.v === 'N' ? 'N' : 'X']}
        </ul>
      </div>
      <div class="grupp">
        <div class="rub">Easing och värden</div>
        <div class="leg">
        ${LEGEND(a.v)}
        </div>
      </div>
    </div>
  </div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${attr({ $preview: { width: 1440, height: 1500 } })}'>
const VAR = '${a.v}';
${JS}
</script>
</body>
</html>
`;
}

const utDir = UT_ARG ? path.join(UT_ARG, 'project') : path.join(S, 'artboards');
fs.mkdirSync(utDir, { recursive: true });
for (const a of ARTBOARDS) fs.writeFileSync(path.join(utDir, a.file), artboard(a));
if (!blob) {
  const kalla = path.join(S, '..', 'design_handoff_bordsvy', 'artboards');
  for (const n of BILDER) fs.copyFileSync(path.join(kalla, n + '.jpg'), path.join(utDir, n + '.jpg'));
  fs.copyFileSync(path.join(S, '..', 'design_handoff_fri_matta', 'support.js'), path.join(utDir, 'support.js'));
}
console.log('skrev', ARTBOARDS.length, 'artboards till', utDir);

/* TIDSLINJER.md: varje variants tidslinjer som tabeller, ur samma SPEC som
   artboardsen kör. Skrivs bara vid den fristående byggningen. */
if (!blob) {
  const vm = await import('node:vm');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(rd('spec.js') + '\n;globalThis.__ = { SPEC, EASE, EGENSKAP, MAL, FAS };', ctx);
  const { SPEC, EASE, EGENSKAP, MAL, FAS } = ctx.__;
  const tal = v => typeof v === 'number' ? String(Math.round(v * 1000) / 1000).replace('.', ',') : ({ cur: 'nu', mal: 'nya platsen', mal2: 'rättade platsen', hog: 'högen', hogS: 'högens storlek (0,8)', flygS: '0,751' }[v] || v);
  const NAMN = { N: 'I dag', A: 'A · Stilla', B: 'B · Handen', C: 'C · Kameran', R: 'Minskad rörelse (A, B och C)' };
  const ORDNING = [
    ['Utspel', ['plats', 'namn']],
    ['Flytt', ['tappad', 'plats', 'flytt']],
    ['Flytt som avbryts halvvägs', ['avbrott']],
    ['Nedtonat efter väntan', ['nedtonad']],
    ['Tillbaka', ['tillbaka', 'tillbakaNy']],
    ['Till graveyard', ['grav']],
    ['Tap och untap', ['tap', 'untap']],
  ];
  let md = `# Tidslinjerna — sida 1 (I dag, A, B, C)

Genererad ur \`src/spec.js\` av \`node gen.mjs\` — samma data som artboardsen kör. Ändra inte här.

- **t** räknas i ms från kamerans uppdatering (inte från handen).
- **Nycklar**: \`t: värde\`. En enda nyckel = värdet sätts direkt.
- **Easing** gäller segmentet som börjar vid nyckeln. \`nu\` = där egenskapen står när spåret börjar.
- **Avbrott**: ett spår som tar över en egenskap som redan rör sig börjar från \`nu\`. För position, vridning och skala tas farten med: första segmentets easing blir \`cubic-bezier(x1, k·x1, x2, y2)\`, \`k = v·T/Δ\`, med x1 ≥ 0,15 och k·x1 inom −1,2…3.
- **svag** = spåret hoppas över om egenskapen redan animeras (tap mitt i en flytt tar inte över skalan).

| Easing | CSS | Ursprung |
|---|---|---|
${Object.entries(EASE).filter(([, e]) => Array.isArray(e.b)).map(([k, e]) => `| ${k} | \`${e.css}\` | ${e.om || ''} |`).join('\n')}
| LIN | \`linear\` | |
| STEP | hopp vid segmentets slut | |

| Egenskap | Betyder i CSS |
|---|---|
| position | \`translate(x, y)\` i brädets px (mattans zoom ovanpå) |
| lyft i y | extra \`translateY\`, bara platshållarens landning |
| skala | \`scale()\` kring kortets mitt |
| vridning | \`rotate()\`; 90° = tappat |
| opacitet | hela kortets \`opacity\` |
| skugga | opaciteten på ett eget lager med \`box-shadow: 0 26px 40px -12px #000f\` (.card.held) |
| framsida / platshållare | opaciteten på bilden / på platshållarens skimmer (.plats) |
| nedtoning | 0→1 = \`grayscale(0→.8) brightness(1→.55)\` på bilden + streckad kant \`#e8b33a88\` (.card.lyft) |
| grön ring | 0→1 = nypuls: en grön yta \`#5fbf7f\` bakom kortet som växer 0→12 px och tonas .53→0 |
| grön kant | minskad rörelse: fast kant \`0 0 0 3px #5fbf7f\` som tonas |
| framsidan skannas / skannerlinje | C: \`clip-path: inset(0 0 (1−v)·100% 0)\` och en 3 px ljus linje vid kanten |
| sökarhörn / hörnens skala | C: fyra hörnvinklar 10 px utanför kortet; vita medan kameran läser, gröna när den vet |
| högens toppkort / ring / tal | graveyard-högen: cLand, cRing, cBump (GRAVEYARD_ANIMATION.md §3) |

`;
  for (const v of ['A', 'B', 'C', 'R', 'N']) {
    const sp = SPEC[v];
    md += `\n## ${NAMN[v]}\n\nVäntan innan nedtoning: **${String(sp.vanta / 1000).replace('.', ',')} s**${v === 'N' ? ' (BORTA_NAD 600 + lyftT 100)' : ' (MES-291). Graveyard-högen som växer avbryter väntan.'}\n`;
    for (const [rub, kinds] of ORDNING) {
      md += `\n### ${rub}\n`;
      for (const k of kinds) {
        const spar = (sp[k] || []).filter(t => t[3] !== 'intern');
        md += `\n**${FAS[k]}**${spar.length ? '' : ' — ingenting rör sig.'}\n`;
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
  fs.writeFileSync(path.join(S, 'TIDSLINJER-sida1.md'), md);
  console.log('skrev TIDSLINJER-sida1.md');
}
