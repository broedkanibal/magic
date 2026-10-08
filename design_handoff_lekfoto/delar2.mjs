// Sida 2, "D · Combined": A som ram, C:s antal som slutkoll, B:s grannsignal under huven.
// Jespers svar 2026-09-26: överlappstexten var förvirrande; basländer ska kunna vara med eller inte,
// och det ska vara tydligt före fotot och vad man gör efter.
import { C, SANS, MONO, esc, ik, pst, btn, tx, ok, telefon, dator, steg, OUT, fs, path } from './delar.mjs';

const W = '#d9d2bc', B = '#3d3d44', A = '#a3abb3', T = '#c4a54a', P = '#b9ad8f', S = '#6e6a78';
const k = (n, c) => ({ n, c });
const Pl = () => k('Plains', P), Sw = () => k('Swamp', S);
const G = {
  fencing: [Pl(), k('Scourge of the Undercity', B), k('Mirran Bardiche', A), k('Ancestral Blade', W), k('Faithful Pikemaster', W), k('Fencing Ace', W)],
  venomous: [k('Venomous Hierophant', B), Pl(), Pl(), Sw()],
  pharika: [k('Pharika’s Chosen', B), k('Killing Glare', B), k('Ukud Cobra', B), Sw(), Pl(), Sw()],
  valkyrie: [k('Valkyrie’s Sword', A), k('Trusty Retriever', W), k('Flutterfox', W), Sw(), k('Gorgon Flail', A), k('Night’s Whisper', B)],
  maul: [Sw(), k('Thriving Moor', T), k('Resistance Reunited', W), k('Pacifism', W), Pl(), k('Maul of the Skyclaves', W)],
  hooded: [k('Hooded Blightfang', B), k('Aphelia, Viper Whisperer', B), k('Thriving Heath', T), Pl(), k('Coat with Venom', B), Sw()],
  militant: [Sw(), k('Danitha Capashen, Paragon', W), k('Serpent Assassin', B), Pl(), k('Vraska’s Finisher', B), k('Militant Inquisitor', W)],
};
const LEK = 'Gorgons &amp; Knights';

/* Ett kort i fotot. hl: 'dim' (redan räknat), 'q' (osäkert), 'acc' (frågan gäller det), 'cut' (kapat av ramen). */
function kortD(kk, sist, w, hl) {
  const ring = hl === 'q' || hl === 'acc' ? `box-shadow: 0 0 0 2px ${C.acc};` : '';
  const dim = hl === 'dim' ? 'opacity: 0.3;' : '';
  const fs_ = w < 60 ? 7 : w < 80 ? 8 : 9, th = w < 60 ? 13 : 15;
  const lagg = hl === 'q' ? `<span style="position: absolute; right: -5px; top: -6px; width: 17px; height: 17px; border-radius: 50%; background: ${C.acc}; color: ${C.ink}; display: grid; place-items: center; font: 800 11px ${SANS}; z-index: 3">?</span>` : '';
  const titel = `<div style="height: ${th}px; background: #ece4cf; color: #1b1b1b; font-size: ${fs_}px; font-weight: 700; line-height: ${th}px; padding: 0 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 3px 3px 0 0">${kk.n}</div>`;
  const bas = `position: relative; box-sizing: border-box; border: 2px solid ${kk.c}; background: ${kk.c}; ${ring}${dim}${hl === 'q' || hl === 'acc' ? ' z-index: 2;' : ''}`;
  if (!sist) return `<div style="${bas} border-bottom-width: 0; border-radius: 5px 5px 0 0">${titel}${lagg}</div>`;
  const art = Math.round(w * 0.62);
  return `<div style="${bas} border-radius: 5px">${titel}<div style="height: ${art}px; margin: 2px; background: #4a4450; border-radius: 2px"></div><div style="height: ${Math.round(art * 0.5)}px; margin: 0 2px 2px; background: #e6dcc4; border-radius: 2px"></div>${lagg}</div>`;
}
function fotoD(cols, o = {}) {
  const w = o.w || 354, pad = o.pad ?? 10, gap = o.gap ?? 7, n = cols.length;
  const cw = Math.floor((w - 2 * pad - gap * (n - 1)) / n);
  const kol = cols.map((col, ci) => `<div style="width: ${cw}px; display: flex; flex-direction: column; flex: none">${col.map((kk, ri) =>
    kortD(kk, ri === col.length - 1, cw, o.mark ? o.mark(ci, ri) : null)).join('')}</div>`).join('');
  const et = o.label ? `<div style="position: absolute; left: 8px; top: 8px; padding: 3px 7px; border-radius: 6px; background: #0d1015d9; color: ${C.txt}; font: 600 11px ${MONO}">${o.label}</div>` : '';
  return `<div style="position: relative; width: ${w}px; box-sizing: border-box; padding: ${o.label ? pad + 22 : pad}px ${pad}px ${pad}px; background: #5a3d22; border-radius: 10px; display: flex; gap: ${gap}px; align-items: flex-start; overflow: visible; flex: none">${et}${kol}</div>`;
}
/* Ringen, i två storlekar. */
function ringD(n, av, o = {}) {
  const s = o.s || 132, sw = s > 100 ? 10 : 8, r = s / 2 - sw, om = 2 * Math.PI * r, del = Math.min(1, n / av);
  const farg = o.farg || (n === av ? C.green : C.acc);
  return `<div style="position: relative; width: ${s}px; height: ${s}px; flex: none"><svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${C.bg4}" stroke-width="${sw}"></circle><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${farg}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(om * del).toFixed(1)} ${om.toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"></circle></svg><div style="position: absolute; left: 0; top: 0; width: ${s}px; height: ${s}px; display: flex; flex-direction: column; align-items: center; justify-content: center"><b style="font: 800 ${s > 100 ? 34 : 24}px ${SANS}; letter-spacing: -1px">${n}</b><span style="font: 500 ${s > 100 ? 13 : 11.5}px ${SANS}; color: ${C.dim}">of ${av}</span></div></div>`;
}
const tillD = `<div style="display: flex; flex-direction: column; gap: 2px"><span style="font: 500 12.5px ${SANS}; color: ${C.dim}">Adding cards to</span><b style="font: 700 19px ${SANS}; color: ${C.txt}">${LEK}</b></div>`;
const ruta = (inner, o = '') => `<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 12px; background: ${C.bg2}; border: 1px solid ${C.line}; ${o}">${inner}</div>`;
const rubrik = t => `<b style="font: 700 17px ${SANS}">${t}</b>`;

export { G, LEK, kortD, fotoD, ringD, tillD, ruta, rubrik, W, B, A, T, P, S };
