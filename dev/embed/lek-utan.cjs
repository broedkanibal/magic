'use strict';
/* Leken utan tolv namn (MES-287, MES-266): cache/lek-golden.json → cache/lek-golden-utan.json.
   Samma tolv som golden --utan-leken efter tvillingprincipen (varje borttaget
   namns lookalike står kvar i leken), så att bänken mäter kort UTANFÖR leken:
   28 av de 61 riktiga beskärningarna saknar då sitt rätta namn, och varje
   säkert namn på dem är ett säkert fel.

     node dev/embed/lek-utan.cjs
     node dev/embed/webb.cjs bank.html "RAK('riktiga', {lek: 'lek-golden-utan', tagg: 'utan'})" --gpu */
const fs = require('fs');
const path = require('path');
const CACHE = path.join(__dirname, 'cache');
const TOLV = ['Faithful Pikemaster', 'Maul of the Skyclaves', 'Thriving Heath', "Valkyrie's Sword", 'Mirran Bardiche', 'Killing Glare',
              'Serpent Assassin', "Vraska's Finisher", 'Scourge of the Undercity', 'Resistance Reunited', 'Trusty Retriever', "Pharika's Chosen"];
const j = JSON.parse(fs.readFileSync(path.join(CACHE, 'lek-golden.json'), 'utf8'));
const bort = new Set(TOLV), kort = j.kort.filter(c => !bort.has(c.name));
fs.writeFileSync(path.join(CACHE, 'lek-golden-utan.json'), JSON.stringify(Object.assign({}, j, { kort })));
console.log(`lek-golden-utan.json: ${new Set(kort.map(c => c.name)).size} namn, ${kort.length} bilder (${j.kort.length - kort.length} borttagna)`);
