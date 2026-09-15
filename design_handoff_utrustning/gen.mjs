// Bygger artboardsen för MES-127 (vad utrustning ger värden) ur appens egna mått:
// kort 178×248, bifogat kort förskjutet 17 px i sidled och 44 px uppåt per steg,
// .kwkort/.pt/.bifbricka som i index.html. Allt skalas med S för läsbarhet.
import { writeFileSync } from 'node:fs';

const S = 1.3;
const px = n => Math.round(n * S) + 'px';
const CW = 178 * S, CH = 248 * S, XSTEP = 17 * S, YSTEP = 44 * S;
const SANS = '-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Helvetica,Arial,sans-serif';
const MONO = 'ui-monospace,SFMono-Regular,&quot;SF Mono&quot;,Menlo,monospace';

const KORT = {
  ace: { name: 'Fencing Ace', mana: '1', type: 'Creature — Human Soldier', text: 'Double strike', art: '#6b4a2e,#2b2016', pt: [1, 1], kw: ['Double strike'] },
  blade: { name: 'Ancestral Blade', mana: '1', type: 'Artifact — Equipment', text: 'Equipped creature gets +1/+1.', art: '#5a4632,#1f1a15', ger: { p: 1, t: 1, kw: [] } },
  collar: { name: 'Basilisk Collar', mana: '1', type: 'Artifact — Equipment', text: 'Equipped creature has deathtouch and lifelink.', art: '#3d4a3a,#161b16', ger: { p: 0, t: 0, kw: ['Deathtouch', 'Lifelink'] } },
  danitha: { name: 'Danitha Capashen, Paragon', mana: '2', type: 'Legendary Creature — Human Knight', text: 'First strike, vigilance, lifelink', art: '#7a6a52,#2a2630', pt: [2, 2], kw: ['Lifelink', 'Vigilance', 'First strike'] },   // Scryfalls ordning, som i appen
  weakness: { name: 'Weakness', mana: 'B', type: 'Enchantment — Aura', text: 'Enchanted creature gets −2/−1.', art: '#3b2a44,#141018', ger: { p: -2, t: -1, kw: [] } },
};

const kedja = `<svg width="${px(8)}" height="${px(8)}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex: none"><path d="M6.5 9.5l3-3"></path><path d="M7 4.5l1.2-1.2a2.8 2.8 0 014 4L11 8.5"></path><path d="M9 11.5l-1.2 1.2a2.8 2.8 0 01-4-4L5 7.5"></path></svg>`;

// Ett nyckelord. givet = kommer från ett bifogat kort; stil 'A' markerar det, 'plain' ritar det som ett tryckt.
function ord(t, givet, stil) {
  const bas = `display: flex; align-items: center; gap: ${px(3)}; padding: ${px(2)} ${px(6)}; font: 700 ${px(9)}/1.3 ${SANS}; letter-spacing: ${px(0.7)}; text-transform: uppercase; border-radius: ${px(4)}; white-space: nowrap;`;
  if (givet && stil === 'A') return `<b style="${bas} color: #ffd98a; background: #1a1408f0; border: 1px solid #8a5d10">${kedja}${t}</b>`;
  return `<b style="${bas} color: #e7ecf4; background: #0b1017e8; border: 1px solid #3a4658">${t}</b>`;
}

/* Mått för krocken mellan orden och P/T-brickan (appens värden × S). Bredderna
   uppskattas ur teckenantalet — appen mäter i stället. */
const HORN = `position: absolute; right: ${px(6)}; bottom: ${px(6)};`;
const INFLODE = 'position: relative; flex: none;';
const PTSTIL = `display: flex; align-items: center; gap: ${px(4)}; padding: ${px(2)} ${px(7)}; border-radius: ${px(6)}; background: #0b1017ee; font: 700 ${px(13.5)}/1.25 ${MONO}; white-space: nowrap;`;
const KANT = 6 * S, GAP = 3 * S, CHIPH = (9 * 1.3 + 6) * S, PTH = (13.5 * 1.25 + 6) * S, MONO_CH = 13.5 * 0.6;
const ordBredd = o => (o.t.length * 6.8 + 14 + (o.g ? 11 : 0)) * S;
function ptBredd(bas, tot, kompakt) {
  if (!tot) return (bas.length * MONO_CH + 16) * S;
  if (kompakt) return (tot.v.length * MONO_CH + 28) * S;
  return ((bas.length + tot.v.length) * MONO_CH + 30.6) * S;
}
// K3: bara totalen, med en pil som säger att något ändrat den.
function ptKompakt(bas, tot, plats = HORN) {
  if (!tot) return ptBricka(bas, tot, plats);
  const neg = tot.neg;
  const pil = `<svg width="${px(9)}" height="${px(9)}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="flex: none"><path d="${neg ? 'M3 6l5 5 5-5' : 'M3 10l5-5 5 5'}"></path></svg>`;
  return `<span style="${plats} z-index: 3; ${PTSTIL} border: 1px solid ${neg ? '#6b2f36' : '#2f6b48'}; color: ${neg ? '#ff9099' : '#7fd6a2'}">${pil}<b>${tot.v}</b></span>`;
}
// K4: orden fyller rader nedifrån brickan; brickan delar sista raden när den får plats.
function flode(visade, ptHtml, ptB) {
  const max = CW - KANT * 2, rader = [[]];
  let w = 0;
  for (const o of visade) {
    const b = ordBredd(o), rad = rader[rader.length - 1];
    if (rad.length && w + GAP + b > max) { rader.push([o]); w = b; }
    else { rad.push(o); w += (rad.length > 1 ? GAP : 0) + b; }
  }
  const sista = rader[rader.length - 1];
  const delar = sista.length > 0 && w + GAP * 2 + ptB <= max;
  const radHtml = r => `<span style="display: flex; gap: ${px(3)}; align-items: flex-end">${r.map(o => ord(o.t, o.g, 'A')).join('')}</span>`;
  const html = rader.filter(r => r.length).map((r, i, alla) => i === alla.length - 1 && delar
    ? `<span style="display: flex; justify-content: space-between; align-items: flex-end; gap: ${px(6)}">${radHtml(r)}${ptHtml}</span>` : radHtml(r)).join('');
  const egen = delar ? '' : `<span style="display: flex; justify-content: flex-end">${ptHtml}</span>`;
  return `<span style="position: absolute; left: ${px(6)}; right: ${px(6)}; bottom: ${px(6)}; z-index: 3; display: flex; flex-direction: column; gap: ${px(3)}">${html}${egen}</span>`;
}

function ptBricka(bas, tot, plats = HORN) {
  const b = `${plats} z-index: 3; ${PTSTIL}`;
  if (!tot) return `<span style="${b} border: 1px solid #4a5a72; color: #f4f7fc">${bas}</span>`;
  const neg = tot.neg;
  return `<span style="${b} border: 1px solid ${neg ? '#6b2f36' : '#2f6b48'}"><b style="color: #7e8ea6; font-weight: 600">${bas}</b><i style="font-style: normal; color: #66748a; font-size: ${px(11)}">→</i><b style="color: ${neg ? '#ff9099' : '#7fd6a2'}">${tot.v}</b></span>`;
}

// Kortets yta: ram, namnrad, bild, typrad, textruta. Platshållare — ingen riktig kortbild.
function kortYta(k) {
  const [a1, a2] = k.art.split(',');
  return `<div style="position: absolute; inset: 0; border-radius: ${px(10)}; background: #121212; padding: ${px(6)}; display: flex; flex-direction: column; gap: ${px(3)}">
    <div style="display: flex; justify-content: space-between; align-items: center; height: ${px(17)}; padding: 0 ${px(6)}; border-radius: ${px(4)}; background: #f1ecdf; border: 1px solid #b9b09a; font: 600 ${px(9.5)}/1 Georgia, 'Times New Roman', serif; color: #1a1712; overflow: hidden"><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${k.name}</span><span style="flex: none; margin-left: ${px(4)}; width: ${px(11)}; height: ${px(11)}; border-radius: 50%; background: #d9d2c0; border: 1px solid #8f8672; font: 700 ${px(7.5)}/${px(10)} Georgia, serif; text-align: center">${k.mana}</span></div>
    <div style="flex: 1 1 0; border-radius: ${px(2)}; background: linear-gradient(160deg, ${a1}, ${a2}); border: 1px solid #0006"></div>
    <div style="height: ${px(14)}; padding: 0 ${px(6)}; border-radius: ${px(4)}; background: #f1ecdf; border: 1px solid #b9b09a; font: 600 ${px(7.5)}/${px(13)} Georgia, serif; color: #1a1712; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${k.type}</div>
    <div style="height: ${px(62)}; padding: ${px(5)} ${px(7)}; border-radius: ${px(2)}; background: #f4efe3; font: ${px(8.5)}/1.35 Georgia, serif; color: #1a1712">${k.text}</div>
  </div>`;
}

/* En scen: en värd med noll eller flera bifogade kort bakom sig, placerade som
   bifogadPlats() i appen. opt.variant styr vad som ritas:
   'nu' = dagens (bara +N), 'A' = givet på värden markerat, 'B' = givet på
   utrustningens remsa, 'C' = allt på värden omarkerat (+ ruta vid pekning). */
function scen(vardNyckel, bifNycklar, opt = {}) {
  const v = KORT[vardNyckel], bif = bifNycklar.map(n => KORT[n]);
  const n = bif.length;
  const ox = 0, oy = YSTEP * n;            // värdens hörn i scenen
  const bredd = CW + XSTEP * n + (opt.extraBredd || 0), hojd = CH + YSTEP * n + px(10).replace('px', '') * 1;

  // Summan av det bifogade: P/T och nyckelord (tryckta vinner, visas en gång).
  let dp = 0, dt = 0; const givna = [];
  for (const b of bif) { dp += b.ger.p; dt += b.ger.t; for (const w of b.ger.kw) if (!v.kw.includes(w) && !givna.includes(w)) givna.push(w); }
  if (opt.counter) { dp += opt.counter; dt += opt.counter; }
  const bas = v.pt.join('/');
  const visaSumma = opt.variant !== 'nu' || opt.counter;
  const tot = visaSumma && (dp || dt) ? { v: (v.pt[0] + dp) + '/' + (v.pt[1] + dt), neg: dp < 0 || dt < 0 } : null;

  // Nyckelord på värden
  let lista;
  if (opt.variant === 'A') lista = [...v.kw.map(t => ({ t, g: false })), ...givna.map(t => ({ t, g: true }))];
  else if (opt.variant === 'C') lista = [...v.kw, ...givna].map(t => ({ t, g: false }));
  else lista = v.kw.map(t => ({ t, g: false }));
  // Taket är tre + "+N". I A viks tryckta ihop före givna, så att det nya aldrig göms.
  let visade = lista;
  if (lista.length > 3) {
    if (opt.variant === 'A') {
      const g = lista.filter(o => o.g), t = lista.filter(o => !o.g);
      const plats = Math.max(0, 3 - g.length);
      visade = [...t.slice(0, plats), { t: '+' + (t.length - plats), g: false, plus: true }, ...g];
    } else visade = [...lista.slice(0, 3), { t: '+' + (lista.length - 3), g: false, plus: true }];
  }
  /* Krocken med P/T-brickan. Utan opt.krock ritas det som tidigare (A–C).
     'hylla' = orden alltid ovanför brickan, 'lyft' = bara när ett ord i
     brickans höjd inte får plats bredvid den, 'kompakt' = bara totalen (lyft
     som reserv), 'flode' = orden i rader, brickan delar sista raden. */
  const kr = opt.krock, harPT = !!v.pt, kompakt = kr === 'kompakt';
  const ptB = ptBredd(bas, tot, kompakt);
  let kw;
  if (kr === 'flode' && harPT) kw = flode(visade, ptBricka(bas, tot, INFLODE), ptB);
  else {
    let lyft = kr === 'hylla' && harPT && visade.length > 0;
    if ((kr === 'lyft' || kompakt) && harPT) {
      [...visade].reverse().forEach((o, j) => {
        if (j * (CHIPH + GAP) < PTH && ordBredd(o) + ptB + KANT * 2 + GAP * 2 > CW) lyft = true;
      });
    }
    kw = `<span style="position: absolute; left: ${px(6)}; bottom: ${Math.round(KANT + (lyft ? PTH + GAP : 0))}px; display: flex; flex-direction: column; gap: ${px(3)}; align-items: flex-start; z-index: 3">${visade.map(o => ord(o.t, o.g, 'A')).join('')}</span>${kompakt ? ptKompakt(bas, tot) : ptBricka(bas, tot)}`;
  }

  const delar = [];
  // Bifogade kort bakom värden: k=0 närmast, sedan uppåt och åt höger.
  bif.forEach((b, k) => {
    const x = ox + XSTEP * (k + 1), y = oy - YSTEP * (k + 1);
    let tagg = '';
    if (opt.variant === 'B') {
      const text = [b.ger.p || b.ger.t ? `${b.ger.p >= 0 ? '+' : '−'}${Math.abs(b.ger.p)}/${b.ger.t >= 0 ? '+' : '−'}${Math.abs(b.ger.t)}` : '', ...b.ger.kw].filter(Boolean).join(' · ');
      const neg = b.ger.p < 0 || b.ger.t < 0;
      tagg = `<span style="position: absolute; right: ${px(8)}; top: ${px(27)}; z-index: 3; display: flex; align-items: center; gap: ${px(3)}; padding: ${px(2)} ${px(6)}; border-radius: ${px(4)}; background: ${neg ? '#2a1216f0' : '#1a1408f0'}; border: 1px solid ${neg ? '#6b2f36' : '#8a5d10'}; color: ${neg ? '#ff9099' : '#ffd98a'}; font: 700 ${px(9)}/1.3 ${SANS}; letter-spacing: ${px(0.7)}; text-transform: uppercase; white-space: nowrap">${kedja}${text}</span>`;
    }
    delar.push(`<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${CW}px; height: ${CH}px; z-index: ${10 - k - 1}; filter: brightness(.85)">${kortYta(b)}</div>${tagg ? `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${CW}px; height: ${CH}px; z-index: ${10 - k - 1}">${tagg}</div>` : ''}`);
  });
  const ring = opt.hover ? `<span style="position: absolute; inset: 0; border-radius: ${px(10)}; border: 2px solid #6b8cff; box-shadow: inset 0 0 0 4px #6b8cff1f; z-index: 4"></span>` : '';
  const bricka = opt.variant === 'nu' && n ? `<span style="position: absolute; right: -4px; bottom: -6px; z-index: 5; padding: 1px 5px; border-radius: 9px; background: #232c3c; border: 1px solid #3d4a5f; font: 600 ${px(9)}/1.5 ${SANS}; color: #cfd9e8">+${n}</span>` : '';
  delar.push(`<div style="position: absolute; left: ${ox}px; top: ${oy}px; width: ${CW}px; height: ${CH}px; z-index: 10; box-shadow: 0 8px 28px -8px #000a, 0 2px 6px #0006; border-radius: ${px(10)}">
    ${kortYta(v)}
    <span style="position: absolute; left: 0; right: 0; bottom: 0; height: ${px(44)}; border-radius: 0 0 ${px(10)} ${px(10)}; background: linear-gradient(#0000, #000b)"></span>
    ${kw}${ring}${bricka}
  </div>`);
  if (opt.ruta) delar.push(opt.ruta(ox + CW + 14, oy + 40));
  return `<div style="position: relative; flex: none; width: ${Math.round(bredd)}px; height: ${Math.round(hojd)}px">${delar.join('\n')}</div>`;
}

// Variant C: rutan som visar var allt kommer ifrån, när pekaren står på värden.
function ursprungsRuta(rader, total) {
  return (x, y) => `<div style="position: absolute; left: ${x}px; top: ${y}px; z-index: 20; width: 244px; padding: 6px; border-radius: 9px; background: #0b1017f8; border: 1px solid #3d4a5f; box-shadow: 0 14px 34px -10px #000e; display: flex; flex-direction: column; gap: 2px">
    <div style="display: flex; justify-content: space-between; padding: 5px 8px 7px; margin-bottom: 3px; border-bottom: 1px solid #28313f; font: 600 10px/1 ${SANS}; letter-spacing: .7px; text-transform: uppercase; color: #66748a"><span>Fencing Ace</span><span style="font-family: ${MONO}; color: #7fd6a2; letter-spacing: 0">${total}</span></div>
    ${rader.map(([namn, vad, stil]) => `<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 6px 8px; border-radius: 6px"><span style="font: 12.5px/1.25 ${SANS}; color: ${stil === 'bas' ? '#93a1b6' : '#e7ecf4'}; white-space: nowrap">${namn}</span><span style="font: 600 11.5px/1.25 ${MONO}; color: ${stil === 'bas' ? '#93a1b6' : '#ffd98a'}; text-align: right">${vad}</span></div>`).join('')}
  </div>`;
}

function artboard({ etikett, titel, varfor, plus, minus, scener, notis }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; background: #0d1015; }
    a { color: #6b8cff; } a:hover { color: #9db0ff; }
  </style>
</helmet>
<div style="box-sizing: border-box; min-height: 100vh; padding: 36px 40px 44px; background: #0d1015; color: #e7ecf4; font: 14px/1.45 ${SANS}; display: flex; flex-direction: column; gap: 28px">
  <div style="display: flex; flex-direction: column; gap: 8px; max-width: 720px">
    <span style="font: 700 11px/1 ${MONO}; letter-spacing: 1.2px; text-transform: uppercase; color: #f0a52a">${etikett}</span>
    <h1 style="margin: 0; font: 650 24px/1.2 ${SANS}; color: #e7ecf4; text-wrap: pretty">${titel}</h1>
    <p style="margin: 0; font: 14.5px/1.5 ${SANS}; color: #93a1b6; text-wrap: pretty">${varfor}</p>
    ${plus ? `<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px; font: 13.5px/1.45 ${SANS}">
      <span style="color: #7fd6a2">+ ${plus}</span>
      <span style="color: #ff9099">− ${minus}</span>
    </div>` : ''}
  </div>
  <div style="display: flex; flex-wrap: wrap; gap: 56px; align-items: flex-end">
    ${scener.map(([rubrik, html, under]) => `<div style="display: flex; flex-direction: column; gap: 14px">
      <span style="font: 600 10.5px/1 ${SANS}; letter-spacing: .8px; text-transform: uppercase; color: #66748a">${rubrik}</span>
      ${html}
      ${under ? `<span style="max-width: 330px; font: 12.5px/1.45 ${SANS}; color: #93a1b6; text-wrap: pretty">${under}</span>` : ''}
    </div>`).join('\n')}
  </div>
  ${notis ? `<p style="margin: 0; max-width: 760px; padding-top: 16px; border-top: 1px solid #28313f; font: 13px/1.5 ${SANS}; color: #93a1b6; text-wrap: pretty">${notis}</p>` : ''}
</div>
</x-dc>
</body>
</html>
`;
}

const filer = {
  'Nulage.dc.html': artboard({
    etikett: 'Nuläge',
    titel: '”+1” är antalet bifogade kort — inte bladets +1/+1',
    varfor: 'Brickan i hörnet räknar kort som sitter på värden. Vad korten gör syns ingenstans: Fencing Ace står kvar som 1/1 fast den är 2/2 med Ancestral Blade.',
    scener: [
      ['Så ser det ut idag', scen('ace', ['blade'], { variant: 'nu' }), 'P/T 1/1, fast den är 2/2. ”+1” betyder ”1 kort sitter på”.'],
      ['Danitha, som jämförelse', scen('danitha', [], { variant: 'nu', counter: 1 }), 'Här kommer 2/2 → 3/3 från en riktig +1/+1-counter.'],
    ],
    notis: '<b style="color: #e7ecf4">Regeln:</b> utrustning lägger ingen counter. +1/+1 är en effekt som sitter på Ancestral Blade och försvinner direkt när bladet flyttas. Därför ska summan synas i P/T-brickan (1/1 → 2/2) precis som counters gör — men ingen counter ska läggas på kortet. Titelraderna som sticker upp visar redan vad som sitter på, så ”+N” kan tas bort i alla tre varianterna.',
  }),
  'Main.dc.html': artboard({
    etikett: 'Variant A · förslaget',
    titel: 'Allt på värden — det givna markerat med en länk',
    varfor: 'Värden visar sin riktiga P/T och alla förmågor den har just nu. Förmågor som kommer från ett bifogat kort får bifogningens bärnstensfärg och en länk, så de skiljs från de tryckta.',
    plus: 'Allt som betyder något i striden står på ett ställe, i samma form som idag. Fungerar likadant för auror och fortifikationer.',
    minus: 'Vilket kort som gav vad syns inte — det står i detaljvyn. Taket på tre ord nås snabbare.',
    scener: [
      ['Ancestral Blade', scen('ace', ['blade'], { variant: 'A' }), 'Bara P/T ändras: 1/1 → 2/2, samma bricka som för counters.'],
      ['Blade + Basilisk Collar', scen('ace', ['blade', 'collar'], { variant: 'A' }), 'Deathtouch och lifelink läggs till under det tryckta ordet.'],
    ],
    notis: '<b style="color: #e7ecf4">Regler:</b> tryckt ord först, givna under. En förmåga kortet redan har visas en gång, som tryckt. Över taket viks de tryckta ihop till ”+N” — det givna göms aldrig. Bärnsten är redan bifogningens färg i appen (målramen när du släpper ett kort på en värd).',
  }),
  'VariantB.dc.html': artboard({
    etikett: 'Variant B',
    titel: 'Det givna står på utrustningen som ger det',
    varfor: 'Varje bifogat kort visar sin effekt på remsan som sticker upp bakom värden. Värden visar bara sina tryckta ord, plus den totala P/T:n.',
    plus: 'Källan är självklar, och varje nytt kort tar med sig sin egen etikett — skalar utan regler om ordning och tak.',
    minus: 'Man måste läsa flera ställen för att veta vad värden kan. Remsorna är smala, och på ett utzoomat bräde blir etiketterna små.',
    scener: [
      ['Ancestral Blade', scen('ace', ['blade'], { variant: 'B' }), '”+1/+1” står på bladets remsa; totalen står ändå på värden.'],
      ['Blade + Basilisk Collar', scen('ace', ['blade', 'collar'], { variant: 'B' }), 'Kragens remsa bär ”Deathtouch · Lifelink”.'],
    ],
    notis: 'En aura med en negativ effekt (till exempel Weakness, −2/−1) får samma etikett i rött. Värdens egna ord ändras aldrig — det som står på värden är alltid det tryckta.',
  }),
  'VariantC.dc.html': artboard({
    etikett: 'Variant C',
    titel: 'Summan på värden, ursprunget när du pekar',
    varfor: 'Värden visar allt den kan, i en och samma stil, som om det vore tryckt. När pekaren står på kortet visar en ruta vad som kommer varifrån.',
    plus: 'Renast bräde: bara det som gäller, inga nya färger. Rutan kan också visa counters, så allt samlas på ett ställe.',
    minus: 'Tryckt och givet ser likadana ut tills du pekar. Flyttas utrustningen försvinner ord utan synlig förklaring.',
    scener: [
      ['Blade + Basilisk Collar', scen('ace', ['blade', 'collar'], { variant: 'C' }), 'Tre ord, alla lika.'],
      ['Samma kort, pekaren på', scen('ace', ['blade', 'collar'], {
        variant: 'C', hover: true, extraBredd: 262,
        ruta: ursprungsRuta([
          ['Printed', '1/1 · Double strike', 'bas'],
          ['Ancestral Blade', '+1/+1', ''],
          ['Basilisk Collar', 'Deathtouch, Lifelink', ''],
        ], '2/2'),
      }), 'Rutan ligger bredvid kortet, i samma stil som kortmenyn.'],
    ],
  }),
  'Kantfall.dc.html': artboard({
    etikett: 'Kantfall · visade i variant A',
    titel: 'Samma regler håller för fler kort',
    varfor: 'Fyra fall som avgör om lösningen skalar. Reglerna gäller alla tre varianterna; här ritade i A.',
    scener: [
      ['Förmågan finns redan', scen('danitha', ['collar'], { variant: 'A' }), 'Danitha har redan lifelink. Den står kvar som tryckt; bara deathtouch är nytt. Fyra ord → ett tryckt viks in i ”+1”.'],
      ['Counter och utrustning', scen('danitha', ['blade'], { variant: 'A', counter: 1 }), 'En +1/+1-counter och bladet räknas ihop: 2/2 → 4/4. Countern syns i counters-panelen, bladet på sin remsa.'],
      ['Negativ aura', scen('danitha', ['weakness'], { variant: 'A' }), 'Weakness −2/−1: totalen blir röd i stället för grön.'],
      ['Det appen inte kan läsa', scen('ace', ['blade'], { variant: 'nu' }).replace(/<span style="position: absolute; right: -4px[^]*?<\/span>/, ''), 'Villkor (”as long as …”), ”for each …” och X-värden: appen gissar inte. Brickan visar basen som idag.'],
    ],
    notis: '<b style="color: #e7ecf4">Läsningen:</b> två mönster i bifogade korts oracle-text räcker för de flesta: <span style="font-family: ui-monospace, monospace; color: #e7ecf4">(Equipped|Enchanted) creature gets ±X/±Y</span> och <span style="font-family: ui-monospace, monospace; color: #e7ecf4">… has A, B and C</span>, där orden prövas mot Scryfalls nyckelordslista. Står meningen i ett villkor lämnas den bort.',
  }),
};

/* Sida 2: krocken mellan orden och P/T-brickan. Samma fyra kort i varje
   variant, så att de går att jämföra rad för rad. */
const krockScener = (kr, texter) => [
  ['Fencing Ace', scen('ace', [], { variant: 'A', krock: kr }), texter[0]],
  ['+ Ancestral Blade', scen('ace', ['blade'], { variant: 'A', krock: kr }), texter[1]],
  ['+ Blade + Basilisk Collar', scen('ace', ['blade', 'collar'], { variant: 'A', krock: kr }), texter[2]],
  ['Danitha med en counter', scen('danitha', [], { variant: 'A', counter: 1, krock: kr }), texter[3]],
];
Object.assign(filer, {
  'Krock1.dc.html': artboard({
    etikett: 'K1',
    titel: 'Orden står alltid ovanför P/T-brickan',
    varfor: 'Brickan får en egen rad längst ner. Orden börjar ovanför den, på varje kort med P/T — oavsett om de hade fått plats bredvid.',
    plus: 'Enklast att bygga (bara CSS) och alltid likadant: orden hoppar aldrig.',
    minus: 'Täcker en rad mer av kortet, också när ingenting krockar.',
    scener: krockScener('hylla', [
      'Ovanför, fast ordet hade fått plats bredvid 1/1.',
      'Ingen krock — raden var redan ledig.',
      'Tre ord plus brickan: fyra rader över textrutan.',
      'Samma regel för counters.',
    ]),
    notis: '<b style="color: #e7ecf4">I appen:</b> <span style="font-family: ui-monospace, monospace; color: #e7ecf4">.card:has(.pt) .kwkort { bottom: 32px }</span> — brickans höjd plus 3 px. Tappade kort fungerar som idag, eftersom allt ligger i kortets egna koordinater.',
  }),
  'Krock2.dc.html': artboard({
    etikett: 'K2 · förslaget',
    titel: 'Orden lyfts bara när de krockar',
    varfor: 'Får orden plats bredvid brickan står de kvar som idag. Är något ord i brickans höjd för brett lyfts hela kolumnen upp ovanför brickan.',
    plus: 'Kompakt när det får plats, och krockar aldrig. Lyftet är samtidigt en signal: något har ändrat kortet.',
    minus: 'Orden flyttar sig när utrustning kommer eller går. Kräver en mätning per kort.',
    scener: krockScener('lyft', [
      'Får plats: ordet står bredvid 1/1, som idag.',
      '1/1 → 2/2 är bredare — orden lyfts en rad.',
      'Lifelink hade fått plats, men brickan är högre än en ordrad och når upp i deathtouchs rad. Därför lyfts de.',
      'Counters också: first strike och 2/2 → 3/3 ligger redan idag kant i kant. Mätningen avgör.',
    ]),
    notis: '<b style="color: #e7ecf4">Regeln:</b> brickan är högre än en ordrad, så både nedersta ordet och ordet ovanför måste få plats bredvid den. <b style="color: #e7ecf4">I appen:</b> efter render, jämför <span style="font-family: ui-monospace, monospace; color: #e7ecf4">offsetWidth</span> för de ord som når upp i brickans höjd mot brickan och kortet (offsetWidth påverkas inte av tappningens rotation). Krockar något får kortet en klass som flyttar orden upp.',
  }),
  'Krock3.dc.html': artboard({
    etikett: 'K3',
    titel: 'Brickan visar bara totalen',
    varfor: 'Ett ändrat kort visar bara sin nuvarande P/T, i grönt med en pil upp (rött med pil ned). Basen står i detaljvyn och när du pekar. Brickan blir smal nog att krocken nästan försvinner.',
    plus: 'Minst yta på kortet. Det man spelar efter är totalen.',
    minus: 'Basen syns inte på kortet, och det bryter mot hur counters visas idag (2/2 → 3/3). Ett långt ord mot 12/12 kan fortfarande krocka — då lyfts orden som i K2.',
    scener: krockScener('kompakt', [
      'Oförändrat kort: basen som idag.',
      'Bara 2/2 med en pil — får plats bredvid double strike.',
      'Smal bricka: inget behöver lyftas.',
      'Danitha står som 3/3; basen 2/2 syns i detaljvyn.',
    ]),
  }),
  'Krock4.dc.html': artboard({
    etikett: 'K4',
    titel: 'Orden fyller rader, brickan delar sista raden',
    varfor: 'Korta ord ställs bredvid varandra när bredden räcker, och brickan tar plats i nedersta raden när den ryms där — annars en egen rad.',
    plus: 'Använder bredden bäst: färre rader och mindre av kortet täckt.',
    minus: 'Orden står inte längre i en prydlig kolumn, och deras plats beror på längden. Mest logik att bygga.',
    scener: krockScener('flode', [
      'Ordet och brickan delar rad.',
      'Får inte plats — brickan tar en egen rad.',
      'Lifelink delar rad med brickan; deathtouch ovanför.',
      'Lifelink och vigilance delar rad; brickan får en egen.',
    ]),
  }),
});

for (const [namn, html] of Object.entries(filer)) writeFileSync(new URL(namn, import.meta.url), html);

const canvas = {
  artboards: [
    { file: 'Nulage.dc.html', title: 'Nuläge', x: 0, y: 0, w: 860, h: 900, page: 'page-1' },
    { file: 'Main.dc.html', title: 'A · Allt på värden, markerat', x: 940, y: 0, w: 860, h: 900, page: 'page-1' },
    { file: 'VariantB.dc.html', title: 'B · På utrustningen', x: 1880, y: 0, w: 860, h: 900, page: 'page-1' },
    { file: 'VariantC.dc.html', title: 'C · Ursprunget vid pekning', x: 2820, y: 0, w: 1100, h: 900, page: 'page-1' },
    { file: 'Kantfall.dc.html', title: 'Kantfall', x: 940, y: 1020, w: 1500, h: 920, page: 'page-1' },
    { file: 'Krock1.dc.html', title: 'K1 · Alltid egen rad', x: 0, y: 0, w: 1280, h: 980, page: 'page-2' },
    { file: 'Krock2.dc.html', title: 'K2 · Lyft vid krock', x: 1360, y: 0, w: 1280, h: 980, page: 'page-2' },
    { file: 'Krock3.dc.html', title: 'K3 · Bara totalen', x: 0, y: 1100, w: 1280, h: 980, page: 'page-2' },
    { file: 'Krock4.dc.html', title: 'K4 · Ord i flöde', x: 1360, y: 1100, w: 1280, h: 980, page: 'page-2' },
  ],
  pages: [{ id: 'page-1', name: 'Varianter A–C' }, { id: 'page-2', name: 'Krock med P/T' }],
  annotations: [
    { id: 'krocken', page: 'page-2', x: 0, y: -190, w: 620, text: 'Varför det krockar: 1/1 → 2/2 är bredare än 1/1, och brickan är högre än en ordrad — den når upp i raden ovanför. Därför hamnar deathtouch under siffrorna fast lifelink får plats. Med counters ligger det redan idag kant i kant (Danitha).\nLösningen gäller A, B och C lika; här ritad i A.' },
    { id: 'fragan', page: 'page-1', x: 0, y: -170, w: 520, text:'MES-127 — vad utrustning och auror ger värden.\nExemplet: Fencing Ace (1/1, double strike) med Ancestral Blade (+1/+1) och Basilisk Collar (deathtouch, lifelink). Rätt svar: 2/2 med double strike, deathtouch och lifelink.' },
  ],
  launch: { view: 'canvas', page: 'page-2' },
};
writeFileSync(new URL('canvas.json', import.meta.url), JSON.stringify(canvas, null, 2));
console.log('skrev', Object.keys(filer).length, 'artboards');
