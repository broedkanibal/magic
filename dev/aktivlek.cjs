#!/usr/bin/env node
/* Den aktiva leken (MES-376, etapp 1b): regeln ur G4 (MES-374) som ren modul.

   Kör:  node dev/aktivlek.cjs            bänken (dev/kolla.sh), sekunder
         node dev/aktivlek.cjs <index.html>

   Klipper ut blocket `const AktivLek = (() => { … })();` ur index.html och
   kör det i node (samma sätt som dev/kamerabank.cjs), så att det som provas
   är appens egen regel. Fallen är regeln så som den står i issuen och i
   dev/plan/lekar-och-minnet.md (*Resultat G4*):
     starten, bytet vid minst 2 säkra kort och fler än den aktiva, lika
     behåller den aktiva och sedan den senast spelade, släpp efter 4 säkra
     kort utan träff, basland räknas inte, ett namn räknas en gång, och ett
     kort utanför den aktiva leken drar in sina grannar ur minnet.
   Slutkod 1 om något faller. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const fil = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(fil, 'utf8').split('\n');
const start = src.findIndex(l => l.startsWith('const AktivLek = (() => {'));
let slut = -1;
for (let i = start; i < src.length; i++) if (src[i].startsWith('})();')) { slut = i; break; }
if (start < 0 || slut < 0) throw new Error('hittar inte AktivLek-modulen i ' + fil);
const ctx = { console, Map, Set, String, RegExp, Array };
vm.createContext(ctx);
const AktivLek = vm.runInContext(src.slice(start, slut + 1).join('\n') + '\n;AktivLek', ctx);

let fel = 0, n = 0;
const check = (vad, ok) => { n++; if (!ok) { fel++; console.log('  FEL: ' + vad); } else console.log('  ok:  ' + vad); };
const A = { id: 'A', namn: 'Alfa', kort: ['Plains', 'Swamp', 'Fencing Ace', 'Pacifism', 'Militant Inquisitor', 'Flutterfox', 'Shock'] };
const B = { id: 'B', namn: 'Beta', kort: ['Mountain', 'Shock', 'Goblin Guide', 'Lightning Bolt', 'Monastery Swiftspear', 'Flutterfox'] };
const C = { id: 'C', namn: 'Gamma', kort: ['Island', 'Counterspell', 'Opt', 'Delver of Secrets'] };
const lekar = [A, B, C];
const se = (...namn) => namn.map(x => AktivLek.sett(x)).pop();

console.log('AktivLek: starten');
AktivLek.start({ lekar, vald: 'C', senast: 'A' });
check('vald lek i uppstarten är starten (C före senast A)', AktivLek.aktiv === 'C');
AktivLek.start({ lekar, senast: 'A' });
check('utan vald: den senast spelade (A)', AktivLek.aktiv === 'A');
AktivLek.start({ lekar, senast: 'X' });
check('senast som inte finns i minnet: ingen aktiv lek', AktivLek.aktiv === null);
AktivLek.start({ lekar });
check('inget alls: ingen aktiv lek', AktivLek.aktiv === null);
check('namn() är tom utan aktiv lek', AktivLek.namn().size === 0);
AktivLek.start({ lekar, senast: 'A' });
check('namn() är lekens alla namn, basland med', AktivLek.namn().size === 7 && AktivLek.namn().has('Plains'));

console.log('AktivLek: bytet (minst 2 och fler än den aktiva)');
AktivLek.start({ lekar, senast: 'A' });
let r = se('Goblin Guide');
check('ett kort ur B byter inte (1 < 2)', !r.bytt && r.aktiv === 'A');
r = se('Lightning Bolt');
check('två kort ur B byter till B', r.bytt && r.aktiv === 'B' && !r.slappt);
check('bytet står i lage().bytten med antalet kort', AktivLek.lage().bytten.length === 1 && AktivLek.lage().bytten[0].efter === 2 && AktivLek.lage().bytten[0].till === 'B');
AktivLek.start({ lekar, senast: 'A' });
se('Fencing Ace', 'Pacifism');            // A: 2
r = se('Goblin Guide', 'Lightning Bolt');  // B: 2 — lika: A behålls
check('lika (2 mot 2) behåller den aktiva', !r.bytt && r.aktiv === 'A');
r = se('Monastery Swiftspear');            // B: 3
check('fler än den aktiva (3 mot 2) byter', r.bytt && r.aktiv === 'B');
AktivLek.start({ lekar, senast: 'A' });
r = se('Shock', 'Flutterfox');            // både A och B: 2 — lika, A är aktiv
check('delade kort (Shock, Flutterfox i både A och B) byter inte', !r.bytt && r.aktiv === 'A');
AktivLek.start({ lekar, senast: 'B' });
AktivLek.sett('Opt'); r = AktivLek.sett('Counterspell');   // C: 2 — B: 0
check('från senast B till C efter två C-kort', r.aktiv === 'C' && r.bytt);

console.log('AktivLek: släppet (4 säkra kort utan träff)');
AktivLek.start({ lekar, senast: 'A' });
r = se('Okänt 1', 'Okänt 2', 'Okänt 3');
check('tre kort utan träff: A står kvar', r.aktiv === 'A' && !r.slappt);
r = se('Okänt 4');
check('fjärde kortet utan träff släpper leken', r.aktiv === null && r.slappt && r.bytt);
r = se('Okänt 5');
check('fortfarande ingen lek, inget nytt byte', r.aktiv === null && !r.bytt && !r.slappt);
r = se('Goblin Guide', 'Lightning Bolt');
check('släppt är inte låst: två B-kort gör B aktiv', r.aktiv === 'B' && r.bytt);
AktivLek.start({ lekar, senast: 'A' });
r = se('Fencing Ace', 'Okänt 1', 'Okänt 2', 'Okänt 3', 'Okänt 4', 'Okänt 5');
check('en träff i A: ingen släppning hur många okända som än kommer', r.aktiv === 'A');

console.log('AktivLek: basland och dubbletter');
AktivLek.start({ lekar, senast: 'A' });
r = se('Plains', 'Swamp', 'Mountain', 'Island', 'Forest', 'Snow-Covered Plains');
check('basland räknas inte: ingen släppning, inga träffar', r.aktiv === 'A' && r.traffar === 0 && AktivLek.lage().sedda === 0);
r = se('Goblin Guide', 'Goblin Guide', 'Goblin Guide');
check('samma namn tre gånger är ett kort (inget byte)', r.aktiv === 'A' && AktivLek.lage().sedda === 1);
r = se('Lightning Bolt');
check('…och det andra B-kortet byter', r.aktiv === 'B');
r = AktivLek.sett(null); check('null är inget kort', r.aktiv === 'B' && !r.bytt);

console.log('AktivLek: grannarna ur minnet');
const grupper = new Map([['parti-1', new Set(['Okänt X', 'Okänt Y', 'Okänt Z', 'Plains'])], ['lek-A', new Set(A.kort)]]);
AktivLek.start({ lekar, senast: 'A', grupper });
r = AktivLek.sett('Okänt X');
check('ett kort utanför A drar in sina grannar (nya)', r.nya && AktivLek.namn().has('Okänt Y') && AktivLek.namn().has('Okänt Z') && AktivLek.namn().has('Okänt X'));
check('…och A:s namn finns kvar i namn() (Plains delas: 7 + 3)', AktivLek.namn().has('Fencing Ace') && AktivLek.namn().size === 7 + 3);
r = AktivLek.sett('Fencing Ace');
check('ett kort i den aktiva leken drar inte in något', !r.nya);
r = AktivLek.sett('Helt nytt');
check('ett kort utan grupp drar in bara sig självt', r.nya && AktivLek.namn().has('Helt nytt') && AktivLek.namn().size === 7 + 3 + 1);
AktivLek.start({ lekar, senast: 'A', grupper });
se('Okänt X', 'Okänt 1', 'Okänt 2', 'Okänt 3');
check('släppt lek: namn() är bara grannarna', AktivLek.aktiv === null && !AktivLek.namn().has('Fencing Ace') && AktivLek.namn().has('Okänt Y'));
AktivLek.start({ lekar, senast: 'A', grupper });
check('start nollställer grannarna', AktivLek.namn().size === 7);

console.log(`\n${n} kontroller, ${fel} FEL`);
process.exit(fel ? 1 : 0);
