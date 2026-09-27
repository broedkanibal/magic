# Mekaniker i Commander — hur vanliga är de?

Mätt 2026-09-27 mot Scryfall. Library-effekter (scry, mill, tutor, shuffle) ingår inte — de utreds separat.

## Det viktigaste

- **Tokens är den största luckan.** 262 av topp 2 000 (13 %) skapar tokens. I topp 100 finns 5 — och 4 av dem (Beast Within, An Offer You Can't Refuse, Generous Gift, Swan Song) ger token till **en annan spelare**. Treasure ensam: 66 kort.
- **Räknare nästan lika vanliga:** 228 (11 %), varav +1/+1 144. Övriga räknartyper har var för sig ≤ 20 kort, men ~20 olika namngivna räknare förekommer — räknare behöver fritt namn, inte en fast lista.
- **Zoner bortom hand/bord/graveyard:** reanimation 44, spela ur exile 44, spela ur graveyard 35, regrowth 26, flicker 21.
- **Kort som korsar spelargränsen:** 57 kort (2,9 %). 28 byter kontrollant eller låter en spela motståndarens kort, 21 ger token till en annan spelare och 8 är auror som läggs på motståndarens creature eller på en spelare.
- **Kortformer:** 50 dubbelsidiga (38 MDFC, oftast spelade med landet uppåt), 17 kloner. Nedvänt på bordet bara 2.
- **Nästan frånvarande i topp 2 000 (0 kort):** initiative, dungeon, day/night, meld, flip, prototype, mutate, fortification, suspect, shield/oil/rad-räknare, Blood/Powerstone/Incubator. Monarch och battle: 1 kort var.

## Metod

| Steg | Vad |
|---|---|
| Urval | `f:commander` sorterat `order=edhrec`. Topp 2 000 = de 2 000 Commander-lagliga korten med `edhrec_rank ≤ 2011` (11 rankplatser tas av bannade kort, t.ex. Dockside Extortionist). Alla Commander-lagliga kort: **32 116**. |
| Mått | Varje mekanik är **en** Scryfall-fråga (lista S1–S93 längst ned). Samma fråga ger både *totalt* (`total_cards`) och *topp 2 000* (sidor i EDHREC-ordning tills rank > 2011). Båda talen har alltså exakt samma definition. |
| Syntax | `o:` = regeltext utan påminnelsetext, `fo:` = med påminnelsetext, `kw:` = nyckelord, `t:` = typrad, `is:` = layout. |
| Kontroll | En oberoende lokal regex-klassning av de 2 000 nedladdade korten (`oracle_text` + `card_faces`, `keywords`, `layout`, `all_parts`) gav samma tal ±6 för tokens (256 mot 262), räknare (224 mot 228), +1/+1 (145 mot 144), equipment (57 = 57) och aura (32 = 32). Discard (126 mot 85) och "commander" i texten (31 mot 23) skiljer sig, eftersom den lokala räkningen tog med påminnelsetext (t.ex. cycling: "Discard this card"). Det gör frågorna medvetet inte. Listorna för auror, kontrollbyte, token till annan spelare, O-Ring, exile-removal och flicker är granskade kort för kort; rättelser står i kolumnen *Not*. |
| Topp 100 / 500 | Kort med EDHREC-rank ≤ 100 resp. ≤ 500. Visar om mekaniken finns på de riktiga staplarna — ett topp 100-kort ligger i en stor andel av alla lekar. |

**Vad måttet inte säger:** det räknar *olika kort*, inte hur ofta de spelas. En mekanik med få kort i topp 2 000 (t.ex. initiative) kan ändå dominera ett parti om en lek är byggd kring den. EDHREC-ranken ändras över tid: Banishing Light (#2376), Clone (#3717), Oblivion Ring (#5054) och Pacifism (#5234) ligger i dag utanför topp 2 000.

## Alla mekaniker, sorterade efter topp 2 000

| # | Mekanik | Topp 2 000 | Andel | Topp 100 | Topp 500 | Totalt | Sök |
|---:|---|---:|---:|---:|---:|---:|---|
| 1 | Skapar tokens (alla slag) | 262 | 13,1 % | 5 | 39 | 3 949 | S1 |
| 2 | Räknare på permanents (alla slag) | 228 | 11,4 % | 2 | 18 | 5 090 | S22 |
| 3 | +1/+1-räknare | 144 | 7,2 % | 0 | 11 | 3 242 | S23 |
| 4 | Discard | 85 | 4,3 % | 4 | 15 | 1 692 | S70 |
| 5 | Fördefinierade tokens (nämner någon av nedan) | 78 | 3,9 % | 2 | 16 | 899 | S3 |
| 6 | Treasure | 66 | 3,3 % | 2 | 16 | 367 | S4 |
| 7 | Equipment | 57 | 2,9 % | 3 | 11 | 624 | S41 |
| 8 | Dubbelsidiga (transform, mdfc, meld, battle) | 50 | 2,5 % | 0 | 7 | 507 | S75 |
| 9 | Token-kopior av kort | 48 | 2,4 % | 0 | 3 | 479 | S12 |
| 10 | Spelar ur exile (adventure, foretell, impulse draw …) | 44 | 2,2 % | 0 | 6 | 774 | S67 |
| 11 | Reanimation (graveyard → battlefield) | 44 | 2,2 % | 1 | 5 | 624 | S65 |
| 12 | layout modal_dfc | 38 | 1,9 % | 0 | 7 | 98 | S77 |
| 13 | Spelar ur graveyard (flashback, escape, "cast from your graveyard" …) | 35 | 1,8 % | 1 | 5 | 733 | S63 |
| 14 | Aura (alla) | 32 | 1,6 % | 0 | 3 | 1 241 | S42 |
| 15 | Exile av permanents (removal) | 29 | 1,4 % | 2 | 8 | 454 | S59 |
| 16 | Regrowth (graveyard → hand) | 26 | 1,3 % | 0 | 4 | 610 | S66 |
| 17 | Kontrollbyte (alla slag) | 23 | 1,1 % | 1 | 3 | 472 | S50 |
| 18 | "commander" i regeltexten | 23 | 1,1 % | 6 | 13 | 184 | S73 |
| 19 | Flicker / blink | 21 | 1,1 % | 0 | 2 | 179 | S62 |
| 20 | Token ges till annan spelare | 21 | 1,1 % | 4 | 7 | 166 | S13 |
| 21 | Räknar kort i graveyard (delve, threshold, descend …) | 20 | 1,0 % | 0 | 2 | 514 | S71 |
| 22 | Proliferate | 20 | 1,0 % | 0 | 2 | 96 | S34 |
| 23 | varav nyckelord (flashback, escape, unearth …) | 18 | 0,9 % | 1 | 3 | 478 | S64 |
| 24 | Loyalty (planeswalkers) | 18 | 0,9 % | 0 | 1 | 339 | S25 |
| 25 | varav planeswalker-kort | 17 | 0,8 % | 0 | 0 | 311 | S26 |
| 26 | Kopia av annat kort (Clone, "as a copy of") | 17 | 0,8 % | 0 | 3 | 128 | S87 |
| 27 | Adventure / foretell / suspend / plot / warp | 16 | 0,8 % | 0 | 0 | 343 | S69 |
| 28 | Spelnivå-markör (någon av: emblem, monarch, initiative, dungeon, day/night, Ring, blessing, speed) | 14 | 0,7 % | 0 | 0 | 381 | S21 |
| 29 | Impulse draw ("exile the top … you may play") | 14 | 0,7 % | 0 | 4 | 190 | S68 |
| 30 | layout transform | 12 | 0,6 % | 0 | 0 | 388 | S76 |
| 31 | -1/-1-räknare | 12 | 0,6 % | 0 | 0 | 298 | S24 |
| 32 | Exile face down (inkl. foretell, hideaway) | 11 | 0,6 % | 0 | 1 | 139 | S61 |
| 33 | Reanimation ur valfri/motståndares graveyard | 10 | 0,5 % | 1 | 3 | 58 | S53 |
| 34 | Token-dubblare ("tokens would be created") | 10 | 0,5 % | 0 | 1 | 17 | S2 |
| 35 | Lore (sagor) | 9 | 0,5 % | 0 | 1 | 234 | S27 |
| 36 | Commander-zonen: partner / background / companion | 9 | 0,5 % | 0 | 0 | 226 | S72 |
| 37 | Saga | 9 | 0,5 % | 0 | 1 | 223 | S82 |
| 38 | Food | 9 | 0,5 % | 0 | 2 | 183 | S5 |
| 39 | Keyword counters (flying, lifelink …) | 9 | 0,5 % | 0 | 1 | 109 | S33 |
| 40 | Fäster utan att vara equipment/aura ("attach") | 8 | 0,4 % | 0 | 0 | 219 | S45 |
| 41 | Phasing | 8 | 0,4 % | 0 | 1 | 65 | S89 |
| 42 | Charge | 7 | 0,3 % | 0 | 1 | 124 | S28 |
| 43 | Spacecraft / station | 7 | 0,3 % | 0 | 0 | 31 | S92 |
| 44 | Räknare på spelare (poison, energy, experience, rad, ticket) | 6 | 0,3 % | 0 | 0 | 315 | S35 |
| 45 | "doesn't untap during … untap step" | 6 | 0,3 % | 0 | 1 | 307 | S93 |
| 46 | Aura på motståndarens creature (Pacifism, Control Magic …) | 6 | 0,3 % | 0 | 0 | 291 | S43 |
| 47 | Adventure | 6 | 0,3 % | 0 | 0 | 151 | S80 |
| 48 | Class | 6 | 0,3 % | 0 | 0 | 34 | S83 |
| 49 | Varaktigt (Control Magic, Treachery, "for as long as") | 5 | 0,3 % | 0 | 0 | 180 | S52 |
| 50 | Time (suspend, vanishing, impending) | 5 | 0,3 % | 0 | 0 | 139 | S29 |
| 51 | Emblem | 5 | 0,3 % | 0 | 0 | 90 | S14 |
| 52 | Spelar kort som motståndaren äger | 5 | 0,3 % | 0 | 1 | 62 | S55 |
| 53 | "… until ~ leaves the battlefield" (O-Ring) | 4 | 0,2 % | 0 | 0 | 151 | S60 |
| 54 | Poison / infect / toxic | 4 | 0,2 % | 0 | 0 | 134 | S36 |
| 55 | Split (inkl. room, fuse, aftermath) | 4 | 0,2 % | 0 | 0 | 123 | S79 |
| 56 | Sideboard / utanför spelet (learn, lesson, wish) | 4 | 0,2 % | 0 | 0 | 117 | S74 |
| 57 | Donate / exchange (ger bort) | 4 | 0,2 % | 0 | 0 | 85 | S54 |
| 58 | Goad | 4 | 0,2 % | 0 | 0 | 82 | S57 |
| 59 | City's blessing / ascend | 4 | 0,2 % | 0 | 0 | 27 | S20 |
| 60 | Clue / investigate | 3 | 0,1 % | 0 | 1 | 170 | S6 |
| 61 | The Ring tempts you | 3 | 0,1 % | 0 | 0 | 54 | S19 |
| 62 | Reconfigure | 3 | 0,1 % | 0 | 0 | 17 | S47 |
| 63 | Nedvänt på bordet: morph/megamorph/disguise/manifest/cloak | 2 | 0,1 % | 0 | 1 | 340 | S88 |
| 64 | Vehicles / crew | 2 | 0,1 % | 0 | 0 | 201 | S91 |
| 65 | Tillfälligt ("… until end of turn", Threaten) | 2 | 0,1 % | 0 | 0 | 113 | S51 |
| 66 | Room | 2 | 0,1 % | 0 | 0 | 28 | S85 |
| 67 | Energy | 1 | 0,1 % | 0 | 0 | 142 | S37 |
| 68 | Stun | 1 | 0,1 % | 0 | 0 | 91 | S31 |
| 69 | Monarch | 1 | 0,1 % | 0 | 0 | 62 | S15 |
| 70 | Bestow | 1 | 0,1 % | 0 | 0 | 43 | S48 |
| 71 | Curse (aura på spelare) | 1 | 0,1 % | 0 | 0 | 42 | S44 |
| 72 | Role-tokens | 1 | 0,1 % | 0 | 0 | 38 | S11 |
| 73 | Role-tokens (auror som tokens) | 1 | 0,1 % | 0 | 0 | 38 | S49 |
| 74 | Battle-kort | 1 | 0,1 % | 0 | 0 | 36 | S56 |
| 75 | Experience | 1 | 0,1 % | 0 | 0 | 16 | S38 |
| 76 | Map | 1 | 0,1 % | 0 | 0 | 15 | S8 |
| 77 | Case | 1 | 0,1 % | 0 | 0 | 13 | S84 |
| 78 | Oil | 0 | 0,0 % | 0 | 0 | 48 | S32 |
| 79 | Day/night | 0 | 0,0 % | 0 | 0 | 47 | S18 |
| 80 | Blood | 0 | 0,0 % | 0 | 0 | 41 | S7 |
| 81 | Venture into the dungeon | 0 | 0,0 % | 0 | 0 | 38 | S17 |
| 82 | Incubator / incubate | 0 | 0,0 % | 0 | 0 | 35 | S10 |
| 83 | Mutate | 0 | 0,0 % | 0 | 0 | 34 | S90 |
| 84 | Powerstone | 0 | 0,0 % | 0 | 0 | 33 | S9 |
| 85 | Shield | 0 | 0,0 % | 0 | 0 | 28 | S30 |
| 86 | Initiative | 0 | 0,0 % | 0 | 0 | 26 | S16 |
| 87 | Suspect | 0 | 0,0 % | 0 | 0 | 24 | S58 |
| 88 | Rad | 0 | 0,0 % | 0 | 0 | 23 | S39 |
| 89 | layout meld | 0 | 0,0 % | 0 | 0 | 21 | S78 |
| 90 | Flip | 0 | 0,0 % | 0 | 0 | 19 | S81 |
| 91 | Prototype | 0 | 0,0 % | 0 | 0 | 19 | S86 |
| 92 | Fortification | 0 | 0,0 % | 0 | 0 | 2 | S46 |
| 93 | Commander damage (nämns i texten) | 0 | 0,0 % | 0 | 0 | 1 | S40 |

Indragna rader i tabellerna nedan är delmängder av raden ovanför.

## Tokens och spelnivå

| Mekanik | Topp 2 000 | Topp 100 / 500 | Totalt | Sök | Exempel (mest spelade först; #EDHREC-rank, över 2011 = utanför topp 2 000) | Not |
|---|---:|---:|---:|---|---|---|
| Skapar tokens (alla slag) | 262 | 5 / 39 | 3 949 | S1 | Beast Within (#25); An Offer You Can't Refuse (#34); Generous Gift (#61) | 5 i topp 100 — och 4 av dem (Beast Within, An Offer You Can't Refuse, Generous Gift, Swan Song) ger token till **motståndaren**. Enligt `all_parts` förekommer ~86 token-slag (namn+typ) i topp 2 000: 76 creature-tokens och 10 andra, där Treasure och "Copy" (token-kopior) dominerar, följda av Food, Clue, Map, Gold, Lander och Role. |
| Token-dubblare ("tokens would be created") | 10 | 0 / 1 | 17 | S2 | Mondrak, Glory Dominus (#429); Elspeth, Storm Slayer (#702); Peregrin Took (#790) |  |
| Fördefinierade tokens (nämner någon av nedan) | 78 | 2 / 16 | 899 | S3 | An Offer You Can't Refuse (#34); Smothering Tithe (#65); Black Market Connections (#130) | Treasure står för 66 av 78. |
| &nbsp;&nbsp;↳&nbsp;Treasure | 66 | 2 / 16 | 367 | S4 | An Offer You Can't Refuse (#34); Smothering Tithe (#65); Black Market Connections (#130) |  |
| &nbsp;&nbsp;↳&nbsp;Food | 9 | 0 / 2 | 183 | S5 | Tireless Provisioner (#184); Academy Manufactor (#262); Peregrin Took (#790) |  |
| &nbsp;&nbsp;↳&nbsp;Clue / investigate | 3 | 0 / 1 | 170 | S6 | Academy Manufactor (#262); Tireless Tracker (#661); Forensic Gadgeteer (#1394) |  |
| &nbsp;&nbsp;↳&nbsp;Blood | 0 | 0 / 0 | 41 | S7 | Voldaren Estate (#2495); Transmutation Font (#3418); Glass-Cast Heart (#4906) |  |
| &nbsp;&nbsp;↳&nbsp;Map | 1 | 0 / 0 | 15 | S8 | Get Lost (#1816); Pip-Boy 3000 (#2693); Treasure Map // Treasure Cove (#3035) |  |
| &nbsp;&nbsp;↳&nbsp;Powerstone | 0 | 0 / 0 | 33 | S9 | Cityscape Leveler (#2114); Karn, Living Legacy (#5567); Hall of Tagsin (#6303) |  |
| &nbsp;&nbsp;↳&nbsp;Incubator / incubate | 0 | 0 / 0 | 35 | S10 | Chrome Host Seedshark (#3510); Sunfall (#3908); Elesh Norn // The Argent Etchings (#4157) |  |
| &nbsp;&nbsp;↳&nbsp;Role-tokens | 1 | 0 / 0 | 38 | S11 | Not Dead After All (#1101); Royal Treatment (#3014); Monstrous Rage (#3414) |  |
| Token-kopior av kort | 48 | 0 / 3 | 479 | S12 | Scute Swarm (#240); Helm of the Host (#393); Fanatic of Rhonas (#407) |  |
| Token ges till annan spelare | 21 | 4 / 7 | 166 | S13 | Beast Within (#25); An Offer You Can't Refuse (#34); Generous Gift (#61) | Manuellt granskade: alla 21 kan ge token till en annan spelare. Prismari Command ("target player") ges oftast till en själv. |
| Emblem | 5 | 0 / 0 | 90 | S14 | Elspeth, Sun's Champion (#827); Tezzeret, Cruel Captain (#1223); Sephiroth, Fabled SOLDIER // Sephiroth, One-Winged Angel (#1263) |  |
| Monarch | 1 | 0 / 0 | 62 | S15 | Court of Grace (#1663); Court of Garenbrig (#2261); Regal Behemoth (#2417) |  |
| Initiative | 0 | 0 / 0 | 26 | S16 | White Plume Adventurer (#3305); Seasoned Dungeoneer (#4589); Explore the Underdark (#5753) |  |
| Venture into the dungeon | 0 | 0 / 0 | 38 | S17 | Acererak the Archlich (#5853); Nadaar, Selfless Paladin (#6507); Radiant Solar (#6969) |  |
| Day/night | 0 | 0 / 0 | 47 | S18 | The Celestus (#6259); Outland Liberator // Frenzied Trapbreaker (#6827); Tovolar, Dire Overlord // Tovolar, the Midnight Scourge (#7119) |  |
| The Ring tempts you | 3 | 0 / 0 | 54 | S19 | Boromir, Warden of the Tower (#860); Fiery Inscription (#1144); Call of the Ring (#1405) |  |
| City's blessing / ascend | 4 | 0 / 0 | 27 | S20 | Wayward Swordtooth (#1046); Ocelot Pride (#1103); Twilight Prophet (#1134) |  |
| Spelnivå-markör (någon av: emblem, monarch, initiative, dungeon, day/night, Ring, blessing, speed) | 14 | 0 / 0 | 381 | S21 | Elspeth, Sun's Champion (#827); Boromir, Warden of the Tower (#860); Wayward Swordtooth (#1046) | Emblem 5, ascend 4, Ring 3, monarch 1, speed 1. |

## Räknare på permanents

| Mekanik | Topp 2 000 | Topp 100 / 500 | Totalt | Sök | Exempel (mest spelade först; #EDHREC-rank, över 2011 = utanför topp 2 000) | Not |
|---|---:|---:|---:|---|---|---|
| Räknare på permanents (alla slag) | 228 | 2 / 18 | 5 090 | S22 | The One Ring (#95); Mystic Remora (#100); Urza's Saga (#117) | Utöver typerna nedan finns ~20 namngivna räknare med 1–2 kort var i topp 2 000: quest, burden (The One Ring), luck, void (Dauthi Voidwalker, **på kort i exile**), wish, fellowship, hour, descent, vow, gold, growth, influence, foreshadow, ice (Dark Depths), nest, chorus, bore, night. |
| &nbsp;&nbsp;↳&nbsp;+1/+1-räknare | 144 | 0 / 11 | 3 242 | S23 | Hardened Scales (#185); Rhythm of the Wild (#221); The Great Henge (#227) |  |
| &nbsp;&nbsp;↳&nbsp;-1/-1-räknare | 12 | 0 / 0 | 298 | S24 | Yawgmoth, Thran Physician (#835); Devoted Druid (#966); Blightsteel Colossus (#982) |  |
| &nbsp;&nbsp;↳&nbsp;Loyalty (planeswalkers) | 18 | 0 / 1 | 339 | S25 | Spark Double (#391); Elspeth, Storm Slayer (#702); Liliana, Dreadhorde General (#796) |  |
| &nbsp;&nbsp;&nbsp;&nbsp;↳&nbsp;varav planeswalker-kort | 17 | 0 / 0 | 311 | S26 | Elspeth, Storm Slayer (#702); Liliana, Dreadhorde General (#796); Elspeth, Sun's Champion (#827) |  |
| &nbsp;&nbsp;↳&nbsp;Lore (sagor) | 9 | 0 / 1 | 234 | S27 | Urza's Saga (#117); Summon: Bahamut (#1252); Binding the Old Gods (#1358) |  |
| &nbsp;&nbsp;↳&nbsp;Charge | 7 | 0 / 1 | 124 | S28 | Everflowing Chalice (#254); Black Market (#680); Door of Destinies (#1082) |  |
| &nbsp;&nbsp;↳&nbsp;Time (suspend, vanishing, impending) | 5 | 0 / 0 | 139 | S29 | Dreamtide Whale (#1199); Profane Tutor (#1711); Overlord of the Hauntwoods (#1721) |  |
| &nbsp;&nbsp;↳&nbsp;Shield | 0 | 0 / 0 | 28 | S30 | Titan of Industry (#2555); Diamond City (#3128); Protection Magic (#4177) |  |
| &nbsp;&nbsp;↳&nbsp;Stun | 1 | 0 / 0 | 91 | S31 | Unstoppable Slasher (#1552); Mjölnir, Storm Hammer (#3191); Fear of Sleep Paralysis (#3442) |  |
| &nbsp;&nbsp;↳&nbsp;Oil | 0 | 0 / 0 | 48 | S32 | Urabrask's Forge (#2581); Vat of Rebirth (#2643); Mindsplice Apparatus (#2965) |  |
| &nbsp;&nbsp;↳&nbsp;Keyword counters (flying, lifelink …) | 9 | 0 / 1 | 109 | S33 | Mondrak, Glory Dominus (#429); Solphim, Mayhem Dominus (#889); Tyrite Sanctum (#1124) | Främst de fem Dominus-korten (Mondrak, Solphim …): indestructible counter. |
| &nbsp;&nbsp;↳&nbsp;Proliferate | 20 | 0 / 2 | 96 | S34 | Karn's Bastion (#208); Evolution Sage (#403); Cankerbloom (#814) |  |

## Räknare på spelare

| Mekanik | Topp 2 000 | Topp 100 / 500 | Totalt | Sök | Exempel (mest spelade först; #EDHREC-rank, över 2011 = utanför topp 2 000) | Not |
|---|---:|---:|---:|---|---|---|
| Räknare på spelare (poison, energy, experience, rad, ticket) | 6 | 0 / 0 | 315 | S35 | Etali, Primal Conqueror // Etali, Primal Sickness (#806); Blightsteel Colossus (#982); Skrelv, Defector Mite (#1123) |  |
| &nbsp;&nbsp;↳&nbsp;Poison / infect / toxic | 4 | 0 / 0 | 134 | S36 | Etali, Primal Conqueror // Etali, Primal Sickness (#806); Blightsteel Colossus (#982); Skrelv, Defector Mite (#1123) |  |
| &nbsp;&nbsp;↳&nbsp;Energy | 1 | 0 / 0 | 142 | S37 | Guide of Souls (#1504); Volatile Stormdrake (#2044); Chthonian Nightmare (#2344) |  |
| &nbsp;&nbsp;↳&nbsp;Experience | 1 | 0 / 0 | 16 | S38 | Meren of Clan Nel Toth (#1506); Otharri, Suns' Glory (#2917); Toph, Earthbending Master (#3056) |  |
| &nbsp;&nbsp;↳&nbsp;Rad | 0 | 0 / 0 | 23 | S39 | Struggle for Project Purity (#2787); Nuclear Fallout (#3081); The Wise Mothman (#3702) |  |
| &nbsp;&nbsp;↳&nbsp;Commander damage (nämns i texten) | 0 | 0 / 0 | 1 | S40 | Geode Golem (#3201) | Regeln (21 combat damage från samma commander) gäller alla partier men nämns nästan aldrig i korttext. |

## Fästa kort

| Mekanik | Topp 2 000 | Topp 100 / 500 | Totalt | Sök | Exempel (mest spelade först; #EDHREC-rank, över 2011 = utanför topp 2 000) | Not |
|---|---:|---:|---:|---|---|---|
| Equipment | 57 | 3 / 11 | 624 | S41 | Swiftfoot Boots (#12); Lightning Greaves (#13); Skullclamp (#41) |  |
| Aura (alla) | 32 | 0 / 3 | 1 241 | S42 | Wild Growth (#212); Animate Dead (#223); Utopia Sprawl (#349) | 23 av 32 läggs på egna permanents (Wild Growth, Utopia Sprawl, Rancor, Curiosity, umbras). 7 läggs på motståndarens creature/permanent, 1 på en spelare (Curse of Opulence) och Animate Dead på en creature ur valfri graveyard. |
| &nbsp;&nbsp;↳&nbsp;Aura på motståndarens creature (Pacifism, Control Magic …) | 6 | 0 / 0 | 291 | S43 | Darksteel Mutation (#586); Kenrith's Transformation (#743); Imprisoned in the Moon (#764) | **Manuellt granskat: 7** — Darksteel Mutation, Kenrith's Transformation, Imprisoned in the Moon, Amphibian Downpour, Witness Protection, Song of the Dryads, Shiny Impetus. Frågan ger 6, varav 1 fel (Sheltered by Ghosts). 6 av de 7 **gör om** varelsen (Insect 0/1, Elk 3/3, Frog 1/1, Forest, "Legitimate Businessperson"). Pacifism (#5234) och Control Magic ligger utanför topp 2 000. |
| &nbsp;&nbsp;↳&nbsp;Curse (aura på spelare) | 1 | 0 / 0 | 42 | S44 | Curse of Opulence (#699); Fraying Sanity (#2892); Curse of Verbosity (#3812) |  |
| Fäster utan att vara equipment/aura ("attach") | 8 | 0 / 0 | 219 | S45 | Springheart Nantuko (#701); Sigarda's Aid (#830); Necromancy (#1017) |  |
| Fortification | 0 | 0 / 0 | 2 | S46 | C.A.M.P. (#14115); Darksteel Garrison (#20085) |  |
| Reconfigure | 3 | 0 / 0 | 17 | S47 | The Reality Chip (#1068); Lizard Blades (#1459); Lion Sash (#1782) |  |
| Bestow | 1 | 0 / 0 | 43 | S48 | Springheart Nantuko (#701); Nyxborn Hydra (#3412); Eidolon of Countless Battles (#3427) |  |
| Role-tokens (auror som tokens) | 1 | 0 / 0 | 38 | S49 | Not Dead After All (#1101); Royal Treatment (#3014); Monstrous Rage (#3414) |  |

## Kontroll och ägande

| Mekanik | Topp 2 000 | Topp 100 / 500 | Totalt | Sök | Exempel (mest spelade först; #EDHREC-rank, över 2011 = utanför topp 2 000) | Not |
|---|---:|---:|---:|---|---|---|
| Kontrollbyte (alla slag) | 23 | 1 / 3 | 472 | S50 | Reanimate (#54); Animate Dead (#223); Rise of the Dark Realms (#495) | Manuellt uppdelat: 11 reanimerar ur valfri graveyard (Reanimate, Animate Dead, Necromancy, Ancient Brass Dragon …), 5 stjäl permanents (Hellkite Tyrant, Archmage's Charm, Treasure Nabber, Seize the Spotlight, Insurrection), 5 ger bort/skickar runt (Wishclaw Talisman, Coveted Jewel, Humble Defector, Alexios — byter kontrollant **varje upkeep**, Homeward Path tar tillbaka), 2 övrigt (Emrakul: styr en spelare; Commandeer: stjäl en spell). |
| &nbsp;&nbsp;↳&nbsp;Tillfälligt ("… until end of turn", Threaten) | 2 | 0 / 0 | 113 | S51 | Seize the Spotlight (#1754); Insurrection (#1839); Zealous Conscripts (#2401) | Threaten/Act of Treason ligger utanför topp 2 000. Treasure Nabber ("until the end of your next turn") räknas här inte. |
| &nbsp;&nbsp;↳&nbsp;Varaktigt (Control Magic, Treachery, "for as long as") | 5 | 0 / 0 | 180 | S52 | Hellkite Tyrant (#748); Treasure Nabber (#1467); Archmage's Charm (#1745) |  |
| &nbsp;&nbsp;↳&nbsp;Reanimation ur valfri/motståndares graveyard | 10 | 1 / 3 | 58 | S53 | Reanimate (#54); Animate Dead (#223); Rise of the Dark Realms (#495) | Manuellt: 11. Frågan missar Ancient Brass Dragon. |
| &nbsp;&nbsp;↳&nbsp;Donate / exchange (ger bort) | 4 | 0 / 0 | 85 | S54 | Wishclaw Talisman (#520); Homeward Path (#1196); Alexios, Deimos of Kosmos (#1277) |  |
| Spelar kort som motståndaren äger | 5 | 0 / 1 | 62 | S55 | Dauthi Voidwalker (#392); Opposition Agent (#579); Praetor's Grasp (#1691) | Ägare ≠ kontrollant uppstår också här: kortet går tillbaka till **ägarens** graveyard. |
| Battle-kort | 1 | 0 / 0 | 36 | S56 | Invasion of Ikoria // Zilortha, Apex of Ikoria (#1381); Invasion of Zendikar // Awakened Skyclave (#3513); Invasion of Segovia // Caetus, Sea Tyrant of Segovia (#5620) |  |
| Goad | 4 | 0 / 0 | 82 | S57 | Disrupt Decorum (#888); Shiny Impetus (#1388); Grenzo, Havoc Raiser (#1645) |  |
| Suspect | 0 | 0 / 0 | 24 | S58 | Nelly Borca, Impulsive Accuser (#4856); Barbed Servitor (#5595); Hot Pursuit (#6388) |  |

## Zoner

| Mekanik | Topp 2 000 | Topp 100 / 500 | Totalt | Sök | Exempel (mest spelade först; #EDHREC-rank, över 2011 = utanför topp 2 000) | Not |
|---|---:|---:|---:|---|---|---|
| Exile av permanents (removal) | 29 | 2 / 8 | 454 | S59 | Swords to Plowshares (#11); Path to Exile (#15); Deadly Rollick (#107) | Swords to Plowshares (#11) och Path to Exile (#15) är två av de mest spelade korten över huvud taget. |
| &nbsp;&nbsp;↳&nbsp;"… until ~ leaves the battlefield" (O-Ring) | 4 | 0 / 0 | 151 | S60 | Grasp of Fate (#1151); Sheltered by Ghosts (#1267); Touch the Spirit Realm (#1870) | Banishing Light (#2376) och Oblivion Ring (#5054) ligger precis utanför topp 2 000. |
| Exile face down (inkl. foretell, hideaway) | 11 | 0 / 1 | 139 | S61 | Mosswort Bridge (#196); Necropotence (#513); Windbrisk Heights (#662) |  |
| Flicker / blink | 21 | 0 / 2 | 179 | S62 | Ephemerate (#437); Conjurer's Closet (#467); Displacer Kitten (#549) |  |
| Spelar ur graveyard (flashback, escape, "cast from your graveyard" …) | 35 | 1 / 5 | 733 | S63 | Faithless Looting (#98); Sevinne's Reclamation (#341); Underworld Breach (#389) |  |
| &nbsp;&nbsp;↳&nbsp;varav nyckelord (flashback, escape, unearth …) | 18 | 1 / 3 | 478 | S64 | Faithless Looting (#98); Sevinne's Reclamation (#341); Fanatic of Rhonas (#407) |  |
| Reanimation (graveyard → battlefield) | 44 | 1 / 5 | 624 | S65 | Reanimate (#54); Animate Dead (#223); Sun Titan (#311) | Frågan missar Ancient Brass Dragon ("from graveyards" utan artikel), så det rätta talet är 45. |
| Regrowth (graveyard → hand) | 26 | 0 / 4 | 610 | S66 | Eternal Witness (#119); Buried Ruin (#193); Takenuma, Abandoned Mire (#244) |  |
| Spelar ur exile (adventure, foretell, impulse draw …) | 44 | 0 / 6 | 774 | S67 | Jeska's Will (#104); Professional Face-Breaker (#206); Ragavan, Nimble Pilferer (#281) |  |
| &nbsp;&nbsp;↳&nbsp;Impulse draw ("exile the top … you may play") | 14 | 0 / 4 | 190 | S68 | Jeska's Will (#104); Professional Face-Breaker (#206); Ragavan, Nimble Pilferer (#281) |  |
| &nbsp;&nbsp;↳&nbsp;Adventure / foretell / suspend / plot / warp | 16 | 0 / 0 | 343 | S69 | Midgar, City of Mako // Reactor Raid (#1220); Exalted Sunborn (#1356); Weftstalker Ardent (#1401) |  |
| Discard | 85 | 4 / 15 | 1 692 | S70 | Boseiju, Who Endures (#76); Otawara, Soaring City (#88); Faithless Looting (#98) | Inkluderar channel-länderna (Boseiju, Otawara) som kastas ur handen som kostnad. Zonflytten hand → graveyard. |
| Räknar kort i graveyard (delve, threshold, descend …) | 20 | 0 / 2 | 514 | S71 | Shifting Woodland (#360); Cabal Ritual (#441); Dig Through Time (#624) |  |
| Commander-zonen: partner / background / companion | 9 | 0 / 0 | 226 | S72 | Jaheira, Friend of the Forest (#918); Kodama of the East Tree (#985); Karlach, Fury of Avernus (#1055) | Partner/background = två commanders → två separata commander damage-räkningar. |
| "commander" i regeltexten | 23 | 6 / 13 | 184 | S73 | Command Tower (#2); Arcane Signet (#3); Path of Ancestry (#14) | Command Tower, Arcane Signet (färgidentitet), Deadly Rollick och Fierce Guardianship ("if you control a commander") — appen behöver veta vilket kort som är commander. 6 i topp 100. |
| Sideboard / utanför spelet (learn, lesson, wish) | 4 | 0 / 0 | 117 | S74 | Redirect Lightning (#554); Shared Roots (#1063); Origin of Metalbending (#1856) |  |

## Kortformer

| Mekanik | Topp 2 000 | Topp 100 / 500 | Totalt | Sök | Exempel (mest spelade först; #EDHREC-rank, över 2011 = utanför topp 2 000) | Not |
|---|---:|---:|---:|---|---|---|
| Dubbelsidiga (transform, mdfc, meld, battle) | 50 | 0 / 7 | 507 | S75 | Sink into Stupor // Soporific Springs (#168); Fell the Profane // Fell Mire (#200); Malakir Rebirth // Malakir Mire (#239) | 38 av 50 är MDFC: 25 "spell // land" (Malakir Rebirth // Malakir Mire, som ofta spelas med **baksidan** upp) och 10 Pathway-länder (land // land). Spelaren väljer sida när kortet spelas. |
| &nbsp;&nbsp;↳&nbsp;layout transform | 12 | 0 / 0 | 388 | S76 | Growing Rites of Itlimoc // Itlimoc, Cradle of the Sun (#571); Etali, Primal Conqueror // Etali, Primal Sickness (#806); Ojer Taq, Deepest Foundation // Temple of Civilization (#904) |  |
| &nbsp;&nbsp;↳&nbsp;layout modal_dfc | 38 | 0 / 7 | 98 | S77 | Sink into Stupor // Soporific Springs (#168); Fell the Profane // Fell Mire (#200); Malakir Rebirth // Malakir Mire (#239) |  |
| &nbsp;&nbsp;↳&nbsp;layout meld | 0 | 0 / 0 | 21 | S78 | Bruna, the Fading Light (#2436); Gisela, the Broken Blade (#2571); The Mightstone and Weakstone (#3034) |  |
| Split (inkl. room, fuse, aftermath) | 4 | 0 / 0 | 123 | S79 | Dusk // Dawn (#953); Wear // Tear (#1039); Walk-In Closet // Forgotten Cellar (#1778) |  |
| Adventure | 6 | 0 / 0 | 151 | S80 | Midgar, City of Mako // Reactor Raid (#1220); Lindblum, Industrial Regency // Mage Siege (#1410); Ishgard, the Holy See // Faith & Grief (#1444) |  |
| Flip | 0 | 0 / 0 | 19 | S81 | Rune-Tail, Kitsune Ascendant // Rune-Tail's Essence (#7532); Nezumi Graverobber // Nighteyes the Desecrator (#11740); Budoka Gardener // Dokai, Weaver of Life (#11767) |  |
| Saga | 9 | 0 / 1 | 223 | S82 | Urza's Saga (#117); Summon: Bahamut (#1252); Binding the Old Gods (#1358) |  |
| Class | 6 | 0 / 0 | 34 | S83 | Caretaker's Talent (#631); Wizard Class (#634); Innkeeper's Talent (#688) |  |
| Case | 1 | 0 / 0 | 13 | S84 | Case of the Locked Hothouse (#1509); Case of the Ransacked Lab (#2793); Case of the Uneaten Feast (#5660) |  |
| Room | 2 | 0 / 0 | 28 | S85 | Walk-In Closet // Forgotten Cellar (#1778); Dazzling Theater // Prop Room (#1786); Funeral Room // Awakening Hall (#2073) |  |
| Prototype | 0 | 0 / 0 | 19 | S86 | Steel Seraph (#5734); Skitterbeam Battalion (#6735); Hulking Metamorph (#8123) |  |
| Kopia av annat kort (Clone, "as a copy of") | 17 | 0 / 3 | 128 | S87 | Phyrexian Metamorph (#312); Shifting Woodland (#360); Spark Double (#391) | Spark Double, Phyrexian Metamorph, Sculpting Steel — och länder som Thespian's Stage/Vesuva. Kortet som syns ≠ kortet det är. |
| Nedvänt på bordet: morph/megamorph/disguise/manifest/cloak | 2 | 0 / 1 | 340 | S88 | Reality Shift (#283); Grim Haruspex (#1142); Kozilek, the Broken Reality (#2479) | Reality Shift (#283) manifesterar åt **motståndaren**. |
| Phasing | 8 | 0 / 1 | 65 | S89 | Teferi's Protection (#109); Clever Concealment (#568); Talon Gates of Madara (#572) | Teferi's Protection (#109) fasar ut **alla** ens permanents. |
| Mutate | 0 | 0 / 0 | 34 | S90 | Gemrazer (#3912); Sea-Dasher Octopus (#4748); Migratory Greathorn (#5496) |  |
| Vehicles / crew | 2 | 0 / 0 | 201 | S91 | Hedge Shredder (#1259); Smuggler's Copter (#1909); Imposter Mech (#2224) |  |
| Spacecraft / station | 7 | 0 / 0 | 31 | S92 | Evendo, Waking Haven (#936); Uthros, Titanic Godcore (#1321); Exploration Broodship (#1582) |  |
| "doesn't untap during … untap step" | 6 | 0 / 1 | 307 | S93 | Mana Vault (#149); Basalt Monolith (#566); Grim Monolith (#668) |  |

## De 10 som oftast dyker upp i ett Commander-parti

Rangordnat efter antal kort i topp 2 000. Delmängder är slagna ihop med sin huvudrad.

| # | Mekanik | Topp 2 000 | Topp 100 | Vad Mesa måste kunna visa |
|---:|---|---:|---:|---|
| 1 | Tokens (alla slag) | 262 | 5 | en token med namn, typ och P/T, och **vem** som kontrollerar den |
| 2 | Räknare på permanents | 228 (+1/+1: 144) | 2 | antal per permanent, med fritt namn på räknaren |
| 3 | Discard | 85 | 4 | hand → graveyard (troligen redan täckt) |
| 4 | Treasure och andra färdiga tokens | 78 (Treasure: 66) | 2 | färdiga mallar: Treasure, Food, Clue, Map |
| 5 | Equipment | 57 | 3 | ett kort fäst vid en creature, flyttbart, lossnar när creaturen lämnar bordet |
| 6 | Dubbelsidiga kort | 50 (MDFC: 38) | 0 | vilken sida som är upp, och baksidans namn |
| 7 | Token-kopior | 48 | 0 | en token som är kopia av ett visst kort |
| 8 | Reanimation (graveyard → bord) | 44 | 1 | graveyard → bord, i 11 fall ur valfri spelares graveyard — alltså även **motståndarens** |
| 9 | Spela ur exile | 44 | 0 | exile som zon där kort får spelas, och av vem |
| 10 | Spela ur graveyard | 35 | 1 | graveyard som zon där kort får spelas. Flashback exilar kortet efteråt, escape och unearth har egna regler |

Strax under: aura 32, exile-removal 29, regrowth 26, kontrollbyte 23, flicker 21, token till annan spelare 21.

**Viktat mot staplarna ser ordningen annorlunda ut.** "Token till annan spelare" har 4 kort i topp 100 (Beast Within, An Offer You Can't Refuse, Generous Gift, Swan Song), lika många som discard. Bara "commander i texten" (6) och tokens totalt (5, där de fyra ingår) har fler. Exile-removal har Swords to Plowshares (#11) och Path to Exile (#15). De två bör räknas till topp 10 i praktiken, eftersom de ligger i en mycket stor andel av alla lekar.

## Tre fällor

### 1. Ägare och kontrollant är olika saker

Ett kort hamnar alltid i sin **ägares** zoner (graveyard, hand, library, exile), aldrig hos kontrollanten.

| Fall | Vad som händer |
|---|---|
| Reanimate/Animate Dead på ett kort ur motståndarens graveyard | Du styr creaturen, men motståndaren äger den. När den dör går den till **motståndarens** graveyard, medan Animate Dead går till din |
| Beast Within, Generous Gift, Swan Song | Token ägs av den som skapar den, alltså motståndaren. Den ska synas på **deras** sida |
| Flicker | Ephemerate, Grasp of Fate och O-Ring lämnar tillbaka "under its **owner's** control". Cloudshift, Ghostly Flicker och Restoration Angel ger "under **your** control". Flickrar du en stulen creature med Ephemerate får ägaren tillbaka den |
| Stulen commander | Den är fortfarande ägarens commander: den går till ägarens command zone. Commander damage räknas **per commander**, inte per kontrollant. Partners har två separata räkningar |

Omfång i topp 2 000: 28 kort kan ge ägare ≠ kontrollant (kontrollbyte, eller att man spelar motståndarens kort). Dessutom finns 21 som ger token till en annan spelare och 8 auror som läggs på motståndarens creature eller på en spelare.

### 2. Zonbyte nollställer allt, utom phasing

När en permanent lämnar bordet (flicker, bounce, exile, dör) händer följande:

- alla räknare försvinner
- auror går till graveyard, medan equipment blir kvar på bordet ofäst
- tokens upphör att finnas — en exilad token kommer aldrig tillbaka, inte ens med O-Ring
- ett transformerat kort kommer tillbaka med framsidan upp, och nedvända kort vänds upp

**Phasing är inget zonbyte.** Teferi's Protection (#109) fasar ut alla ens permanents, men räknare, auror, equipment och tokens ligger kvar. De räknas bara som obefintliga fram till nästa untap. En app som gör "phase out" till "lämnar bordet" tappar räknare och tokens.

Räknare kan också ligga på kort **utanför** bordet: void counters från Dauthi Voidwalker och time counters från suspend ligger på kort i exile.

### 3. Det tryckta kortet är inte alltid det kortet är i spelet (kamerans fälla)

| Fall | Kameran ser | Kortet är |
|---|---|---|
| Kloner (17 i topp 2 000: Spark Double, Phyrexian Metamorph, Thespian's Stage) | Spark Double | en kopia av något annat |
| Auror på motståndarens creature (6 av 7 i topp 2 000 gör om den) | originalvarelsen | Darksteel Mutation → 0/1 Insect, Kenrith's Transformation → 3/3 Elk, Imprisoned in the Moon → ett land |
| MDFC (38: 25 spell // land, 10 Pathway-länder) | den sida som ligger upp | den sida spelaren valde (Malakir Rebirth → Malakir Mire) |
| Token-kopior (48) och tokens överlag | en tärning, en papperslapp eller ett proxykort | en viss token |

Placeringen på bordet lurar också. En Pacifism-typ ligger fysiskt i motståndarens område, men den kontrolleras och ägs av den som spelade den. Kopplar kameran kort till spelare efter var de ligger, hamnar den hos fel spelare.

## Förslag på prioritering för private beta

| Nivå | Vad | Varför |
|---|---|---|
| Måste | Tokens med kontrollant, även åt en annan spelare. Treasure-mall. Token-kopia av ett kort | 262 kort, 5 i topp 100, 4 av dem ger token till annan spelare |
| Måste | Räknare per permanent, med fritt namn (+1/+1 förvalt) | 228 kort |
| Måste | Fästa kort (equipment/aura), också på en annan spelares permanent | 57 + 32 kort |
| Måste | Ägare skilt från kontrollant, där korten går till ägarens zoner | 28 + 21 + 8 = 57 kort, och regelfällan ovan |
| Måste | Exile som zon: synligt eller nedvänt, med "får spelas av X" | removal 29, spela ur exile 44, face down 11 |
| Borde | Välja sida på dubbelsidiga kort, och "är kopia av" (klon) | 50 + 17 kort |
| Borde | Phasing som eget läge, inte zonbyte | 8 kort, men Teferi's Protection är #109 |
| Borde | Markera commander och räkna commander damage per commander | regel i varje parti. 23 kort i topp 2 000 nämner "commander" |
| Kan vänta | Spelarmarkörer: emblem, monarch, Ring, city's blessing | 14 kort sammanlagt |
| Kan vänta | Poison/energy/experience, initiative/dungeon, day/night, meld, mutate, prototype, battle, fortification | 0–6 kort var |

## Sökfrågorna (exakta, kopierbara)

Klistra in i scryfall.com eller `https://api.scryfall.com/cards/search?order=edhrec&q=…`. Alla börjar med `f:commander`.

```
S1  Skapar tokens (alla slag)
     f:commander (fo:/\bcreates?\b[^.]*\btokens?\b/ or fo:/tokens? would be created/ or kw:amass or kw:incubate or kw:investigate or kw:fabricate or kw:afterlife or kw:"living weapon" or kw:populate or kw:embalm or kw:eternalize or kw:myriad or kw:encore or kw:offspring or kw:squad or kw:mobilize or fo:"becomes a token")
S2  Token-dubblare ("tokens would be created")
     f:commander fo:/tokens? would be created/
S3  Fördefinierade tokens (nämner någon av nedan)
     f:commander (fo:/\b(treasures?|foods?|clues?|blood tokens?|maps?|powerstones?|incubators?|gold tokens?|junk tokens?|shard tokens?|landers?|role tokens?)\b/ or kw:investigate or kw:incubate)
S4  Treasure
     f:commander fo:/\btreasures?\b/
S5  Food
     f:commander fo:/\bfoods?\b/
S6  Clue / investigate
     f:commander (fo:/\bclues?\b/ or kw:investigate)
S7  Blood
     f:commander fo:/\bblood tokens?\b/
S8  Map
     f:commander fo:/\bmaps?\b/
S9  Powerstone
     f:commander fo:/\bpowerstones?\b/
S10  Incubator / incubate
     f:commander (fo:/\bincubators?\b/ or kw:incubate)
S11  Role-tokens
     f:commander fo:/\brole tokens?\b/
S12  Token-kopior av kort
     f:commander (fo:/tokens? (that's|that are) (a )?cop(y|ies)/ or fo:/token cop(y|ies)/ or fo:"becomes a token" or fo:"copies become tokens" or kw:populate or kw:embalm or kw:eternalize or kw:myriad or kw:encore or kw:offspring or kw:squad)
S13  Token ges till annan spelare
     f:commander (fo:/(controller|owner|opponent|target player|that player|each player|each other player|chosen player|defending player|they) (may )?creates?\b[^.]*\btokens?/ or fo:/tokens?[^.]*under (target|that|an|each) (opponent|player)'s control/)
S14  Emblem
     f:commander o:emblem
S15  Monarch
     f:commander o:monarch
S16  Initiative
     f:commander o:"the initiative"
S17  Venture into the dungeon
     f:commander o:"venture into the dungeon"
S18  Day/night
     f:commander (kw:daybound or kw:nightbound or o:"it becomes day" or o:"it becomes night")
S19  The Ring tempts you
     f:commander o:"the ring tempts you"
S20  City's blessing / ascend
     f:commander (kw:ascend or o:"city's blessing")
S21  Spelnivå-markör (någon av: emblem, monarch, initiative, dungeon, day/night, Ring, blessing, speed)
     f:commander (o:emblem or o:monarch or o:"the initiative" or o:"venture into the dungeon" or kw:daybound or o:"it becomes day" or o:"the ring tempts you" or kw:ascend or o:"city's blessing" or o:"start your engines")
S22  Räknare på permanents (alla slag)
     f:commander (fo:/\bcounters? (on|from)\b/ or fo:/enters with [^.]*counters?/ or t:planeswalker or t:saga or t:battle or kw:proliferate)
S23  +1/+1-räknare
     f:commander fo:"+1/+1 counter"
S24  -1/-1-räknare
     f:commander (fo:"-1/-1 counter" or kw:wither or kw:infect or kw:persist)
S25  Loyalty (planeswalkers)
     f:commander (t:planeswalker or o:"loyalty counter")
S26  varav planeswalker-kort
     f:commander t:planeswalker
S27  Lore (sagor)
     f:commander (t:saga or o:"lore counter")
S28  Charge
     f:commander o:"charge counter"
S29  Time (suspend, vanishing, impending)
     f:commander (fo:"time counter" or kw:suspend or kw:vanishing or kw:impending)
S30  Shield
     f:commander o:"shield counter"
S31  Stun
     f:commander o:"stun counter"
S32  Oil
     f:commander o:"oil counter"
S33  Keyword counters (flying, lifelink …)
     f:commander o:/(flying|first strike|double strike|deathtouch|haste|hexproof|indestructible|lifelink|menace|reach|trample|vigilance) counters?/
S34  Proliferate
     f:commander o:proliferate
S35  Räknare på spelare (poison, energy, experience, rad, ticket)
     f:commander (o:"poison counter" or kw:infect or kw:toxic or kw:poisonous or o:{E} or o:"energy counter" or o:"experience counter" or o:"rad counter" or o:"ticket counter")
S36  Poison / infect / toxic
     f:commander (o:"poison counter" or kw:infect or kw:toxic or kw:poisonous)
S37  Energy
     f:commander (o:{E} or o:"energy counter")
S38  Experience
     f:commander o:"experience counter"
S39  Rad
     f:commander o:"rad counter"
S40  Commander damage (nämns i texten)
     f:commander o:/combat damage[^.]*\bcommander/
S41  Equipment
     f:commander t:equipment
S42  Aura (alla)
     f:commander t:aura
S43  Aura på motståndarens creature (Pacifism, Control Magic …)
     f:commander t:aura (o:/enchanted (creature|permanent|artifact|land|planeswalker)[^.]*(can't attack|can't block|doesn't untap|activated abilities can't|loses all|base power and toughness)/ or o:"you control enchanted" or o:"an opponent controls" or o:/enchanted creature gets -[0-9]+\/-[1-9]/)
S44  Curse (aura på spelare)
     f:commander t:curse
S45  Fäster utan att vara equipment/aura ("attach")
     f:commander -t:equipment -t:aura o:/\battach/
S46  Fortification
     f:commander t:fortification
S47  Reconfigure
     f:commander kw:reconfigure
S48  Bestow
     f:commander kw:bestow
S49  Role-tokens (auror som tokens)
     f:commander fo:/\brole tokens?\b/
S50  Kontrollbyte (alla slag)
     f:commander (o:"gain control of" or o:"gains control of" or o:"exchange control" or o:"you control enchanted" or o:/graveyards?[^.]*onto the battlefield under your control/ or (o:"card in a graveyard" o:"under your control"))
S51  Tillfälligt ("… until end of turn", Threaten)
     f:commander o:/gains? control of[^.]*until end of turn/
S52  Varaktigt (Control Magic, Treachery, "for as long as")
     f:commander ((o:"gain control of" -o:/gain control of[^.]*until end of turn/) or o:"you control enchanted")
S53  Reanimation ur valfri/motståndares graveyard
     f:commander (o:/(from|in) (a|an opponent's|any|each opponent's|target opponent's|all|opponents') graveyards?[^.]*onto the battlefield under your control/ or o:/onto the battlefield under your control[^.]*from (a|an opponent's|any|all) graveyards?/ or (o:"card in a graveyard" o:"under your control"))
S54  Donate / exchange (ger bort)
     f:commander (o:"exchange control" or o:/(target|that|an|each) (player|opponent) gains control of/)
S55  Spelar kort som motståndaren äger
     f:commander (o:"you don't own" or o:"an opponent owns" or o:"your opponents own" or o:/cast[^.]*from (an opponent's|opponents'|their) graveyards?/ or (o:/(target|each|an) opponent's library/ o:/you may (cast|play)/) or (o:/exile (another |up to one )?target (artifact|creature|nonland permanent|permanent)/ o:/you may (cast|play) (that|the exiled) card/) or (o:"an opponent" o:"you may play those cards"))
S56  Battle-kort
     f:commander t:battle
S57  Goad
     f:commander o:goad
S58  Suspect
     f:commander o:/\bsuspect/
S59  Exile av permanents (removal)
     f:commander ((o:/exiles? [a-z, -]*target [a-z, -]*(creature|permanent|artifact|enchantment|planeswalker|battle)s?[.,;]/ or o:/exiles? [a-z, -]*target [a-z, -]*(creature|permanent|artifact|enchantment|planeswalker)s? (you|an|or|and|with|that|until|without|each|of|your|they|it|to|defending)\b/ or o:/exile (all|each) [a-z, -]*(creatures|permanents|artifacts|enchantments|planeswalkers)/ or o:/exile (that|the) (creature|permanent)\b/) -o:/return (it|that card|those cards|them|the exiled cards?) to the battlefield/)
S60  "… until ~ leaves the battlefield" (O-Ring)
     f:commander (o:/until [^.]*leaves the battlefield/ or o:/leaves the battlefield, return the exiled/)
S61  Exile face down (inkl. foretell, hideaway)
     f:commander (fo:/exile[^.]*face down/ or fo:"exiled face down" or fo:"face down in exile" or kw:foretell or kw:hideaway)
S62  Flicker / blink
     f:commander (o:/exile[^.]*, then return (it|that card|them|those cards|the exiled cards?)[^.]* to the battlefield/ or o:/exile[^.]*\. (at the beginning of the next end step, )?return (it|that card|them|those cards|the exiled cards?|that permanent|that creature)[^.]* to the battlefield/)
S63  Spelar ur graveyard (flashback, escape, "cast from your graveyard" …)
     f:commander (kw:flashback or kw:escape or kw:unearth or kw:disturb or kw:embalm or kw:eternalize or kw:jump-start or kw:retrace or kw:aftermath or kw:encore or kw:scavenge or kw:harmonize or kw:mayhem or o:/(cast|play)[^.]*from (your|a|any) graveyards?/ or o:/(has|have|gains?) (flashback|escape|unearth|retrace|jump-start|disturb)/)
S64  varav nyckelord (flashback, escape, unearth …)
     f:commander (kw:flashback or kw:escape or kw:unearth or kw:disturb or kw:embalm or kw:eternalize or kw:jump-start or kw:retrace or kw:aftermath or kw:encore or kw:scavenge or kw:harmonize or kw:mayhem)
S65  Reanimation (graveyard → battlefield)
     f:commander (o:/from (your|a|any|target player's|their|an opponent's|all|each player's) graveyards? (to|onto) the battlefield/ or o:/(return|put)[^.]*(to|onto) the battlefield[^.]*from (your|a|any|their) graveyards?/ or (o:/card in (a|your) graveyard/ o:"to the battlefield"))
S66  Regrowth (graveyard → hand)
     f:commander o:/from (your|a) graveyard to (your|its owner's|their) hand/
S67  Spelar ur exile (adventure, foretell, impulse draw …)
     f:commander (is:adventure or kw:foretell or kw:suspend or kw:plot or kw:warp or kw:rebound or kw:airbend or o:/exile[^.]*\. (until [^.]*, )?(you may|you can) (play|cast)/ or o:/you may (play|cast)[^.]*(exiled with|from exile|cards exiled)/ or o:/(play|cast)[^.]*from exile/)
S68  Impulse draw ("exile the top … you may play")
     f:commander o:/exile the top [^.]*cards? of [^.]*librar(y|ies)[^.]*\. (until [^.]*, )?(you may|you can) (play|cast)/
S69  Adventure / foretell / suspend / plot / warp
     f:commander (is:adventure or kw:foretell or kw:suspend or kw:plot or kw:warp)
S70  Discard
     f:commander o:/\bdiscards?\b/
S71  Räknar kort i graveyard (delve, threshold, descend …)
     f:commander (kw:delve or kw:threshold or kw:delirium or kw:descend or kw:"fathomless descent" or kw:undergrowth or o:/(number of|for each|seven or more|four or more|card types among)[^.]*cards? in [^.]*graveyards?/ or o:/descend [0-9]/)
S72  Commander-zonen: partner / background / companion
     f:commander (o:/\bpartner\b/ or kw:"friends forever" or kw:"choose a background" or kw:companion or t:background or kw:"doctor's companion")
S73  "commander" i regeltexten
     f:commander o:/\bcommanders?\b/
S74  Sideboard / utanför spelet (learn, lesson, wish)
     f:commander (o:/\blearn\b/ or o:"outside the game" or t:lesson)
S75  Dubbelsidiga (transform, mdfc, meld, battle)
     f:commander (is:transform or is:mdfc or is:meld or t:battle)
S76  layout transform
     f:commander is:transform
S77  layout modal_dfc
     f:commander is:mdfc
S78  layout meld
     f:commander is:meld
S79  Split (inkl. room, fuse, aftermath)
     f:commander is:split
S80  Adventure
     f:commander is:adventure
S81  Flip
     f:commander is:flip
S82  Saga
     f:commander t:saga
S83  Class
     f:commander t:class
S84  Case
     f:commander t:case
S85  Room
     f:commander t:room
S86  Prototype
     f:commander kw:prototype
S87  Kopia av annat kort (Clone, "as a copy of")
     f:commander (o:/(enter|enters|entering) as a copy of/ or o:"becomes a copy of" or o:"as a copy of")
S88  Nedvänt på bordet: morph/megamorph/disguise/manifest/cloak
     f:commander (kw:morph or kw:megamorph or kw:disguise or kw:manifest or kw:"manifest dread" or kw:cloak or o:/\bmanifests?\b/ or o:/\bcloaks?\b/ or o:/face.down (creature|permanent)/ or o:/turn[^.]*face down/)
S89  Phasing
     f:commander (kw:phasing or o:/\bphases? (out|in)\b/)
S90  Mutate
     f:commander kw:mutate
S91  Vehicles / crew
     f:commander (t:vehicle or kw:crew)
S92  Spacecraft / station
     f:commander (t:spacecraft or kw:station)
S93  "doesn't untap during … untap step"
     f:commander o:/(doesn't|don't) untap during/
```

Skripten ligger i `dev/regler/mekaniker/` (`fragor.js`, `hamta.js`, `klassa.js`, `skriv.js`). Rådatan (`top2000.json`, `fraga-res.json`) är inte sparad — kör `hamta.js` igen; vägarna pekar på sessionens scratchpad.
