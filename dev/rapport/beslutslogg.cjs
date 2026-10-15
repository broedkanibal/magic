/* Granskningens beslutslogg (dev/plan/granskning-skala.md, steg 1): en rad JSON per val på granskningssidan —
   förslaget och dess skäl, sorten bilden föreslog, Jespers val, vald sort, om namnet ändrades, tiden på kortet,
   facits förtroende (steg 3). Allt i skugga: loggen läses bara av granska-matt.cjs, ingenting styr av den.

   Var: ~/.mesa/granska-beslut.jsonl. Inte i git (besluten nämner spelarnas rättelser, och loggen växer), inte i
   dev/diagnos/ (den finns en gång per arbetsträd: sidan kan köras ur main eller ur en worktree, och loggen ska vara
   EN), och inte i ~/Library/Caches/ (macOS och städprogram får tömma den, och mätningen behöver hundratals beslut
   över veckor). ~/.mesa håller redan det som ska ligga kvar utanför repot (venv:erna).
   MESA_FALL_UT (provet): <MESA_FALL_UT>/granska-beslut.jsonl, före allt annat, så att ett prov aldrig skriver i en
   riktig logg. MESA_BESLUT_LOGG: en annan fil. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');

const LOGG = process.env.MESA_FALL_UT ? path.join(path.resolve(process.env.MESA_FALL_UT), 'granska-beslut.jsonl')   // provet först: det skriver aldrig i en riktig logg
  : process.env.MESA_BESLUT_LOGG ? path.resolve(process.env.MESA_BESLUT_LOGG)
  : path.join(os.homedir(), '.mesa', 'granska-beslut.jsonl');

/* En rad, sist i filen. Kastar när den inte går att skriva: den som anropar säger det (en mätning som tyst
   tappar rader ser ut att stämma utan att göra det). */
function logga(rad, fil) {
  const f = fil || LOGG;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.appendFileSync(f, JSON.stringify(rad) + '\n');
  return f;
}

/* Alla rader; en rad som inte går att läsa räknas i trasiga, den hoppas inte tyst över. */
function las(fil) {
  const f = fil || LOGG;
  if (!fs.existsSync(f)) return { rader: [], trasiga: 0, fil: f };
  let trasiga = 0;
  const rader = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch (e) { trasiga++; return null; } }).filter(Boolean);
  return { rader, trasiga, fil: f };
}

module.exports = { LOGG, logga, las };
