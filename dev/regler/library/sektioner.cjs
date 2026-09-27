// Genererar katalogens kategoritabeller ur fragor.json (Scryfall) och den lokala klassningen.
const fs = require('fs');
const { klassa } = require('./klassa.cjs');
const F = JSON.parse(fs.readFileSync('fragor.json'));
const K = require('./korpus.json');
for (const c of K) c.ids = klassa(c);
const has = (c, id) => c.ids.includes(id);
const LOK = {
  mill_egen: c => has(c, 'mill') && !has(c, 'mill_annan'),
};
function lokal(lk) {
  if (!lk) return '–';
  const f = LOK[lk] || (c => has(c, lk));
  const L = K.filter(f);
  return `${L.length} / ${L.filter(c => c.edh && c.edh <= 5000).length} / ${L.filter(c => c.edh && c.edh <= 1000).length}`;
}
const fmt = n => n.toLocaleString('sv-SE').replace(/ /g, ' ');
const S = [
 { t: '1. Dra kort (referens)', g: 'G1', rows: [
   ['Dra kort (alla ordalydelser)', 'draw', null],
   ['"Drawn this turn" (Sylvan Library)', 'dragna', 'dragna'],
   ['Miracle (avslöja när kortet dras)', 'miracle', 'miracle'],
   ['Dredge (ersätter en dragning med mill)', 'dredge', 'dredge'],
 ], ui: 'G1 **Dra N** (översta → hand). Appen bör logga vilka kort som dragits denna tur (Sylvan Library, miracle, "third card you drew"). Dredge och miracle är ersättnings-/utlösningsregler kring dragningen och kan vänta; spelaren gör dem manuellt med G5.' },
 { t: '2. Titta på översta N privat (look at the top N)', g: 'G2', rows: [
   ['Look at the top N kort (N ≥ 2 eller X)', 'titta_n', 'titta_n'],
   ['Look at the top card (engångs)', 'titta_1', 'titta_1'],
   ['… resten underst (valfri eller slumpad ordning)', 'titta_rest_botten', null],
   ['… resten underst i **slumpad** ordning', 'titta_slump', null],
   ['… underst i **valfri** ordning (alla källor)', 'botten_valfri', null],
   ['… ett eller flera till handen', 'titta_hand', null],
   ['… "you may reveal" (privat → valfritt offentligt)', 'titta_reveal', null],
   ['"In any order" (ordna om: Sensei\'s Top, Brainstorm)', 'ordna', 'ordna'],
 ], ui: 'G2 **Topp-N-dialogen, privat**: visa översta N bara för ägaren; varje kort dras till hand / överst (spelaren väljer ordning) / underst (valfri eller slumpad ordning enligt kortet) / graveyard / exile / battlefield. Knapp "avslöja det här kortet" per kort. Förinställningar: Scry N, Surveil N, Ponder ("blanda?"), Impulse (1 till hand, resten underst), "upp till 1 till hand, resten underst i slumpad ordning".' },
 { t: '3. Scry, Surveil, Fateseal, Clash', g: 'G2/G3', rows: [
   ['Scry', 'scry', 'scry'],
   ['Surveil', 'surveil', 'surveil'],
   ['Fateseal (scry på motståndarens lek)', 'fateseal', 'fateseal'],
   ['Clash (båda avslöjar översta, väljer överst/underst)', 'clash', 'clash'],
 ], ui: 'Förinställningar av Topp-N-dialogen: **Scry** = {överst i valfri ordning, underst}; **Surveil** = {överst i valfri ordning, graveyard}; **Fateseal** = scry på en annan spelares lek (G12); **Clash** = avslöja 1 från två lekar, var och en väljer överst/underst (G3 + G12). Fateseal och clash är så sällsynta (2 resp. 29 kort, 0 i topp-5000) att de kan vänta.' },
 { t: '4. Mill (översta N till graveyard)', g: 'G5', rows: [
   ['Mill (alla)', 'mill', 'mill'],
   ['… bara egen lek', 'mill_egen', 'mill_egen'],
   ['… annan/alla spelare (target player, each opponent)', 'mill_annan', 'mill_annan'],
   ['Halva leken (Traumatize, Maddening Cacophony)', 'mill_halva', 'hela_leken'],
   ['Utlöses av kort som lämnar leken ("from your library")', 'fran_lek', 'fran_lek'],
 ], ui: 'G5 **Flytta översta N direkt** → graveyard, med N som tal, X eller "halva (avrunda upp/ned)". Ingen dialog behövs, men appen ska sända en händelse "kort X gick från lek till graveyard" (Sidisi, Hedge Shredder och liknande reagerar på det). Lokalt räknas "halva/hela leken" bredare (även exile av hela leken).' },
 { t: '5. Avslöja översta N offentligt (reveal) och välj', g: 'G3', rows: [
   ['Reveal the top N kort', 'avsloja_n', 'avsloja_n'],
   ['Reveal the top card', 'avsloja_1', 'avsloja_1'],
   ['Motståndaren delar i högar (Fact or Fiction)', 'avsloja_pilar', null],
   ['Explore', 'explore', 'explore'],
   ['Översta kortet direkt till battlefield', 'topp_till_bf', 'topp_till_bf'],
 ], ui: 'G3 **Topp-N-dialogen, offentlig**: samma komponent som G2 men alla vid bordet ser korten. Dark Confidant och Ad Nauseam behöver kortets mana value (appen har det). Fact or Fiction kräver att *motståndaren* delar högarna, vilket är samma problem som G12; beta: ägaren gör det muntligt.' },
 { t: '6. Avslöja tills något kommer (cascade, discover, "until")', g: 'G8', rows: [
   ['Reveal/exile cards … until (text)', 'tills_text', 'tills'],
   ['Cascade', 'cascade', 'cascade'],
   ['Discover', 'discover', 'discover'],
   ['Ripple', 'ripple', 'ripple'],
   ['Alla ovan', 'tills_alla', null],
 ], ui: 'G8 **Avslöja tills**: avslöja ett kort i taget ("+1 kort") tills spelaren säger stopp; träffen → hand / battlefield / "kasta gratis"; resten → underst i slumpad ordning, graveyard eller exile enligt kortet. Villkoren är mest "nonland", "creature", "land" eller "MV mindre än" (cascade/discover), som appen kan pröva automatiskt eftersom den känner korten. Beta: manuellt stopp räcker.' },
 { t: '7. Exile översta och få spela det (impulse draw)', g: 'G7', rows: [
   ['Exile the top N (alla, face up)', 'exil_topp', 'exil_topp'],
   ['Impulse draw (exile + "you may play/cast")', 'impuls', 'impuls'],
   ['… längre fönster ("until the end of your next turn", "as long as")', 'impuls_lang', null],
   ['Exile från toppen face down (Necropotence, Praetor\'s Grasp)', 'exil_nedvand', 'exil_nedvand'],
   ['Hideaway', 'hideaway', 'hideaway'],
 ], ui: 'G7 **Exile med spelrätt**: exile översta N face up eller face down, och märk varje kort med *vem* som får spela det och *hur länge* (denna tur / t.o.m. nästa tur / så länge det ligger kvar). Kortet spelas direkt från exile-zonen. Beta: märkningen tas bort manuellt; automatisk utgång kräver att appen vet vems tur det är.' },
 { t: '8. Spela från toppen / översta kortet synligt', g: 'G10', rows: [
   ['"Look at the top card of your library any time"', 'titta_alltid', 'titta_alltid'],
   ['"Play with the top card of your library revealed"', 'avslojt_topp', 'avslojt_topp'],
   ['Play/cast från toppen av leken', 'spela_topp', 'spela_topp'],
 ], ui: 'G10 **Löpande toppläge**: en växel på leken, "visa översta kortet: av / för mig / för alla", plus att översta kortet går att dra direkt till battlefield eller stack. Få kort, men många av dem spelas i Commander (Bolas\'s Citadel, Mystic Forge, Courser of Kruphix, Oracle of Mul Daya).' },
 { t: '9. Söka i leken (tutors, fetchlands, ramp)', g: 'G4', rows: [
   ['Search … library (oracle-text)', 'sok', 'sok'],
   ['… inkl. påminnelsetext (partner with, typecycling)', 'sok_fo', null],
   ['Söker land (ramp, fetch)', 'sok_land', 'sok_land'],
   ['Land som söker (fetchlands)', 'fetchland', null],
   ['Tutor till handen', 'sok_hand', null],
   ['Till battlefield', 'sok_bf', null],
   ['Överst i leken (Vampiric/Mystical/Worldly Tutor)', 'sok_topp', null],
   ['Till graveyard (Entomb, Buried Alive)', 'sok_gy', null],
   ['Med "reveal" (det hittade kortet visas)', 'sok_reveal', null],
   ['Transmute, typecycling, landcycling', 'transmute_cycling', null],
   ['Partner with (söker partnern)', 'partner_with', null],
 ], ui: 'G4 **Sök i leken**: visa hela leken privat, sorterad och filtrerbar (typ, subtyp som "basic Forest", namn, MV). Välj 0–k kort, med *egen destination per kort* (Cultivate: ett till battlefield tapped, ett till handen), växeln "avslöja", sedan automatisk blandning. Ordningen spelar roll: Vampiric Tutor och Long-Term Plans blandar *först* och lägger sedan kortet överst eller tredje uppifrån. "Fail to find" måste gå när sökningen gäller kort med en angiven egenskap.' },
 { t: '10. Blanda (shuffle) och blanda in i leken', g: 'G4/G6', rows: [
   ['Shuffle (alla)', 'blanda', 'blanda'],
   ['Shuffle utan search (Ponder, Chaos Warp …)', 'blanda_utan_sok', null],
   ['Blanda in kort i leken (alla källor)', 'blanda_in', 'blanda_in'],
   ['Blanda in graveyard (Elixir of Immortality, Kozilek)', 'blanda_gy', null],
   ['Blanda in handen (Timetwister, Winds of Change)', 'blanda_hand', null],
   ['Blanda in ett permanent/kort (Chaos Warp, Blightsteel)', 'blanda_perm', null],
 ], ui: '**Blanda** är en knapp (ingår i G4). **Blanda in** hör till G6: flytta ett kort eller en hel zon (graveyard, hand) in i leken och blanda. Lokalt nämner 1 229 kort shuffle. 1 004 av dem är sökningar och 171 till blandar in något; där ingår blandningen redan. Bara 54 kort behöver en fristående blanda-knapp (Ponder, Urza, Lord High Artificer, Lim-Dûl\'s Vault).' },
 { t: '11. Lägga kort överst, underst eller N:te uppifrån', g: 'G6', rows: [
   ['On top of library (från annan zon)', 'topp_fran_zon', 'topp_fran_zon'],
   ['Från handen överst (Brainstorm)', 'topp_fran_hand', 'topp_fran_hand'],
   ['Från graveyard överst (Mystic Sanctuary, Academy Ruins)', 'topp_fran_gy', null],
   ['Överst i ägarens lek (tuck till toppen)', 'topp_tuck', null],
   ['Underst i ägarens lek (tuck till botten: Condemn, Terminus)', 'botten_tuck', null],
   ['N:te uppifrån (Approach of the Second Sun, God-Eternals)', 'nte', 'nte'],
 ], ui: 'G6 **Lägg i leken på position**: i varje korts meny, "till leken: överst / underst / N:te uppifrån / blanda in". Flera kort till botten: valfri eller slumpad ordning. Kort som läggs dit från en offentlig zon blir *kända* för alla tills leken blandas (Approach: alla vet att den ligger sjunde).' },
 { t: '12. Understa kortet (bottom of library)', g: 'G6/G13', rows: [
   ['"Bottom of … library" (alla omnämnanden)', 'botten', 'botten'],
   ['Underst i slumpad ordning (random order)', 'botten_slump', 'botten_slump'],
   ['"Bottom card of" (titta på, dra, spela understa)', 'botten_kort', 'botten_kort'],
   ['Slumpat kort ur leken', 'slump', 'slump'],
 ], ui: 'Nästan all "bottom" ingår i Topp-N-dialogen (resten underst), i avslöja-tills (cascade) eller i G6. Att titta på eller dra *understa* kortet och slumpa ur leken (G13) gäller bara 6 kort och kan vänta.' },
 { t: '13. Ansiktet nedåt från toppen (manifest, cloak) och Gonti-typen', g: 'G11', rows: [
   ['Manifest / manifest dread / cloak', 'manifest', 'manifest'],
   ['Titta och exile face down (Gonti, Thief of Sanity)', 'titta_nedvand', null],
 ], ui: 'G11 **Ansiktet nedåt**: översta kortet till battlefield som en face-down 2/2 som ägaren kan titta på och vända upp. Kräver face-down-permanents på bordet i Mesa. Få kort i Commander (6 i topp-5000). Gonti-typen hör till G12.' },
 { t: '14. Motståndarens lek', g: 'G12', rows: [
   ['Söker i en annan spelares lek', 'sok_annan', 'sok_annan'],
   ['… namnbaserat (Surgical Extraction, Cranial Extraction)', 'sok_annan_namn', null],
   ['Tittar i en annan spelares lek', 'titta_annan', 'titta_annan'],
   ['Exile/titta på andras topp och spela kortet', 'spela_annans', 'spela_annans'],
   ['Exile the top of another player\'s library (alla)', 'exil_topp_annan', null],
   ['Mill på andra (se avsnitt 4)', 'mill_annan', 'mill_annan'],
 ], ui: 'G12 **Annan spelares lek**: någon annan än ägaren ser leken (Gonti, Praetor\'s Grasp), får kort ur den (Bribery), eller spelar kort ur den (Ragavan, Etali). Det svåraste fallet: den dolda informationen ska till en annan person än ägaren, och kort får en kontrollant som inte är ägaren. Namnbaserad sökning (Surgical Extraction) kan appen däremot göra automatiskt, utan att visa leken.' },
 { t: '15. Lekens storlek: vinna eller förlora', g: 'G9', rows: [
   ['Antal kort i leken spelar roll', 'lekstorlek', 'lekstorlek'],
   ['Vinna/förlora via tom lek (Thassa\'s Oracle, Lab Man)', 'vinst_tom', 'vinst_tom'],
 ], ui: 'G9 **Lekräknare**: visa alltid antal kort i leken för alla (det är offentlig information), varna vid dragning ur tom lek (man förlorar vid nästa kontroll). Laboratory Maniac, Jace och Thassa\'s Oracle behöver bara räknaren; vinsten sköter spelarna.' },
];
let md = '';
const alla = [];
for (const s of S) {
  md += `### ${s.t}\n\n**Grundoperation:** ${s.g}\n\n`;
  md += '| Delkategori | Scryfall total_cards | Lokalt: alla / topp‑5000 / topp‑1000 | Mest spelade (order=edhrec) |\n|---|---:|---:|---|\n';
  const q = [];
  for (const [namn, fq, lk] of s.rows) {
    const f = F[fq];
    if (!f) throw new Error('saknar ' + fq);
    md += `| ${namn} | ${fmt(f.total)} | ${lokal(lk)} | ${f.topp.slice(0, 4).join(' · ') || '–'} |\n`;
    q.push(`${fq.padEnd(18)} ${String(f.total).padStart(5)}  ${f.q}`);
  }
  md += '\n<details><summary>Exakta sökfrågor</summary>\n\n```\n' + q.join('\n') + '\n```\n\n</details>\n\n';
  md += `**UI-primitiv:** ${s.ui}\n\n`;
}
fs.writeFileSync('sektioner.md', md);
console.log(md.length, 'tecken');
