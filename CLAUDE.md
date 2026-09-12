# Mesa — instruktioner för Claude

## Systemprompten ändras bara på uttrycklig begäran

Systemprompten — instruktionerna som skickas till Claude i `api/identify.js`,
alltså texten under `system:` och instruktionerna i frågan, till exempel under
`mode === 'kamera'` — ändras **bara** när Jesper uttryckligen ber om en ändring
i systemprompten. Inte som en del av en annan fix, inte som en förbättring på
vägen, och inte för att ett golden-fall blev bättre av det.

**Varför:** varje ändring i systemprompten ska kunna spåras mot en AI-eval, så
att det syns om just den ändringen gav en regression.

Ser en ändring i systemprompten ut att behövas: föreslå den och fråga.

När en ändring är beställd:

1. Kör `node dev/golden/kor.cjs --ai` före ändringen, med samma modell.
2. Ändra bara systemprompten i den commiten, och höj `PANE_PROMPT_V` i
   `api/identify.js`.
3. Kör samma kommando efter. Raden `metod:` visar `systemprompt vNN`, och
   `OBS:` säger att baslinjen gjordes med en annan version.
4. Skriv resultatet i `dev/golden/historik.md` och spara baslinjen
   (`--ai --spara`) först när ändringen ska behållas.

Hur golden setet och AI-evalen körs: `dev/golden/SNABBGUIDE.md`.

## Linear: skriv som "Claude AI agent", inte som Jesper

Skapar, ändrar eller tar bort du (Claude Code) en Linear-issue, eller lägger
en kommentar, på eget initiativ — inte för att Jesper bad om just den
skrivningen i chatten — använd `dev/linear-agent/klient.cjs` i stället för
den vanliga Linear-MCP-kopplingen. MCP-kopplingen autentiserar som Jespers
eget konto, så allt den skriver syns som honom. Se
`dev/linear-agent/SNABBGUIDE.md`. Kräver att `node
dev/linear-agent/installera.cjs` körts en gång (görs av Jesper).
