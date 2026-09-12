# Linear-agenten "Claude AI agent" — snabbguide

Ger Claude Code en egen Linear-identitet ("Claude AI agent") för issues den
skapar, kommentarer den lägger, och assignments — i stället för att allt
syns som Jesper Funk. Bygger på Linears egen agent-plattform
(linear.app/developers/agents): en OAuth-app med rättigheterna
`app:assignable`/`app:mentionable` blir en riktig, assignable/mentionable
Linear-användare, och **tar ingen betald plats**.

Omfånget här är **bara attribution**: ingen webhook-mottagare, ingen kod som
svarar live i Linear. Klienten (`klient.cjs`) används när Claude Code själv
gör en skrivning — skapar/ändrar/tar bort en issue, kommenterar, assignar —
och vill att det synas som agenten, inte som Jesper. Se *Varför en
webhook-mottagare inte behövs* längst ner.

## 1. Registrera appen i Linear (görs en gång, av en admin — Jesper)

1. Gå till <https://linear.app/settings/api/applications/new> i workspacet
   *Mesa*.
2. Namn: `Claude AI agent` (syns i mention-menyer och filter — välj något
   kort och unikt). Ladda gärna upp en ikon.
3. **Redirect URLs:** lägg till exakt `http://localhost:53219/callback`.
4. **Webhooks:** slå på, och kryssa i **Agent session events** (krävs för att
   appen ska räknas som en agent — även om vi inte har någon mottagare som
   lyssnar på dem ännu).
5. Spara. Kopiera **Client ID** och **Client secret**.

## 2. Fyll i `.env.local`

```
LINEAR_AGENT_CLIENT_ID=<client id från steg 1>
LINEAR_AGENT_CLIENT_SECRET=<client secret från steg 1>
```

`.env.local` är gitignorad — hemligheten checkas aldrig in.

## 3. Koppla den här datorn mot agenten

```bash
node dev/linear-agent/installera.cjs
```

Öppnar webbläsaren mot Linears godkännandesida (du loggar in som dig själv,
men `actor=app` i länken gör att det är appen — inte ditt konto — som får
åtkomsten). Godkänn. Scriptet fångar svaret på `localhost:53219`, byter det
mot en token och sparar den i `dev/linear-agent/token.json` (gitignorad).
Sista raden bekräftar agentens Linear-användar-id.

Token förnyas automatiskt (`klient.cjs` gör det åt dig). Skulle Linear sluta
ge tillbaka ett `refresh_token` säger scriptet ifrån — kör då om steg 3.

## 4. Använda klienten

```js
const agent = require('./dev/linear-agent/klient.cjs');

// Skapa en issue, assignad till agenten som förval
const issue = await agent.skapaIssue({ teamId: '...', title: '...', description: '...' });

// Kommentera en befintlig issue
await agent.kommentera(issueId, 'Text som agenten skrev.');

// Assigna en befintlig issue till agenten
await agent.tilldelaAgent(issueId);

// Ändra fält (status, prioritet, m.m.) eller ta bort
await agent.uppdateraIssue(issueId, { stateId: '...' });
await agent.taBortIssue(issueId);
```

Alla anrop går direkt mot Linears GraphQL-API med agentens egen token —
oberoende av den vanliga Linear-MCP-kopplingen (den skriver alltid som
Jesper, eftersom den är kopplad till hans konto).

## Vad det INTE gör

- **Git-commits länkas till issues som förut**, via grenens/committens
  `MES-NN`-referens — det är GitHub-integrationen i Linear, och den bryr sig
  inte om vilken Linear-användare som gjorde skrivningen. Ingen ändring
  behövs där, och agent-token påverkar det inte.
- **Ingen live-respons.** Agenten svarar inte på @omnämnanden eller på att bli
  assignad av någon annan — det hade krävt en webhook-mottagare som lyssnar
  på "Agent session events" och svarar inom 10 sekunder (Linears krav för
  interaktiva agenter). Se nästa avsnitt för varför det inte behövs här.

## Varför en webhook-mottagare inte behövs

Claude Code kan redan skapa issues och kommentera via den vanliga
Linear-MCP-kopplingen — problemet är bara att allt då syns som skrivet av
Jesper, eftersom den kopplingen autentiserar som hans personliga konto.
Linear har ingen "skriv som en annan användare"-flagga för vanliga
API-anrop; den enda vägen till en egen, synlig identitet är en separat
inloggning (token) som hör till en annan användare — här: agent-appens egen
OAuth-token, kopplad till användaren "Claude AI agent" i stället för till
Jesper.

En webhook-mottagare är en helt annan sak: den behövs bara om agenten ska
**reagera på egen hand** när någon i Linear assignar den, @omnämner den,
eller kommenterar på en issue den äger — d.v.s. om Linear ska kunna väcka
Claude utan att en Claude Code-session redan är igång och kör det här
scriptet. Det är byggt för att köra tvärtom: Claude Code (redan igång, redan
jobbar med en uppgift) gör en skrivning och vill att den synas som agenten.
Ingen som väntar på ett anrop utifrån, alltså ingen mottagare.
