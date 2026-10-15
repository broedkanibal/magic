/* Bänkens sorter av fel och målet per sort (granskningen av rättelserna).

   Varje bänkfall (till-fall.cjs --bank) bär en sort: varför telefonen läste
   fel eller inte alls. Granskningssidan räknar bänken per sort mot MAL och
   rekommenderar Prov så länge sorten har färre än MAL fall — så att bänken
   fylls jämnt i stället för med det som råkar komma oftast. När sorten är
   full gör kortet mer nytta i träningen.

   Ändra listan här: sidan, till-fall.cjs (--sort) och bankutgava.cjs läser
   den. En sort som tas bort finns kvar i gamla bänkfall och räknas då under
   sitt id. MAL är en bedömning (2026-10-15), inte mätt: med 20 fall är ett
   fel 5 procentenheter, fint nog att se om en modell blivit bättre på sorten. */
'use strict';

const MAL = 20;   // fall per sort som bänken ska ha

const SORTER = [
  { id: 'blank', namn: 'Blänk', text: 'ljusreflex över namnraden eller bilden' },
  { id: 'vinkel', namn: 'Sned vinkel', text: 'kortet ses snett, perspektivet förvränger det' },
  { id: 'morker', namn: 'Mörker eller skugga', text: 'för lite ljus, eller en skugga över kortet' },
  { id: 'suddig', namn: 'Suddig', text: 'rörelseoskärpa eller ur fokus' },
  { id: 'litet', namn: 'Litet kort', text: 'långt bort eller 0,5×: få pixlar på kortet' },
  { id: 'skymt', namn: 'Delvis skymt', text: 'hand, tärning eller ett annat kort (omlott) över delar av kortet' },
  { id: 'utgava', namn: 'Ovanlig utgåva', text: 'foil, showcase, borderless, gammal ram, annat språk' },
  { id: 'liknande', namn: 'Liknande kort', text: 'förväxlat med ett kort som ser likadant ut' },
  { id: 'annat', namn: 'Annat', text: 'inget av ovan — skriv gärna varför i commit eller historik' }
];
const SORT_ID = new Set(SORTER.map(s => s.id));
const sortNamn = id => (SORTER.find(s => s.id === id) || { namn: id || 'utan sort' }).namn;

module.exports = { MAL, SORTER, SORT_ID, sortNamn };
