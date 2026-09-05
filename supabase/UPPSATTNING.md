# Sätta upp Supabase för Handvy

Tre steg. Du gör dem i webbläsaren, jag kan inte nå dina konsoler härifrån.
Räkna med en kvart.

---

## 1. Skapa projektet

1. Gå till <https://supabase.com/dashboard> och logga in.
2. **New project**. Välj organisation, ge det namnet `handvy`.
3. Sätt ett databaslösenord och spara det i din lösenordshanterare. Du
   behöver det inte för appen, men du får inte se det igen.
4. Välj region **North EU (Stockholm)** — närmast er, och spelet är
   känsligt för fördröjning eftersom borden uppdateras i realtid.
5. Under **Security**, sätt de tre rutorna så här:

   | Inställning | Läge | Varför |
   | --- | --- | --- |
   | Enable Data API | **på** | `supabase-js` pratar med det. Utan det når klienten ingenting. |
   | Automatically expose new tables | **av** | Påslagen blir varje ny tabell i `public` nåbar utifrån direkt, och då är radsäkerheten det enda som står mellan en glömd tabell och internet. `schema.sql` ger rättigheterna uttryckligen i stället. |
   | Enable automatic RLS | **på** | Slår på radsäkerhet för varje ny tabell. Schemat gör det redan självt för de tre tabellerna, men den här gör att något du lägger till senare är stängt från början i stället för öppet. |

6. Vänta ut provisioneringen, ungefär två minuter.

---

## 2. Slå på Google-inloggning

Google kräver att du registrerar appen hos dem först, och att du klistrar
in en adress från Supabase i Google och två nycklar från Google i Supabase.

### 2a. Hämta adressen från Supabase

I ditt Supabase-projekt: **Authentication → Sign In / Providers → Google**.
Där står en rad märkt **Callback URL (for OAuth)**. Den ser ut så här:

```
https://<ditt-projekt>.supabase.co/auth/v1/callback
```

Kopiera den. Låt fliken vara kvar.

### 2b. Registrera appen hos Google

1. Gå till <https://console.cloud.google.com/apis/credentials>.
2. Skapa ett projekt om du inte har ett, eller använd ett befintligt.
   Consent screen är per projekt, så appnamnet du sätter i nästa steg
   blir vad som visas för alla OAuth-flöden i det projektet.
3. Står det en röd banderoll om att din free trial är slut — strunta i
   den. Inloggning och consent screen är gratis och kräver ingen
   aktiverad betalning.
4. Har du aldrig gjort det förut måste du först fylla i **OAuth consent
   screen** (knappen **Configure consent screen** på Credentials-sidan).
   Appnamn `Handvy`, din e-post som support, **Audience: External**, din
   e-post som utvecklarkontakt, godkänn villkoren.
5. Gå till **OAuth consent screen → Audience** och lägg till dig själv
   och de du ska spela med under **Test users**. Så länge appen står som
   **Testing** släpps bara de kontona in; alla andra möts av en varning.
   Vill du slippa listan trycker du **Publish app** — för att bara läsa
   namn och e-post krävs ingen granskning från Google.
6. **Credentials → Create credentials → OAuth client ID**.
7. Application type: **Web application**. Namn: `Handvy`.
8. Under **Authorized redirect URIs**: klistra in callback-adressen från
   steg 2a. Det är den enda adress som ska stå där — Supabase tar emot
   svaret från Google och skickar sedan vidare till appen. Appens egen
   adress ska alltså INTE in här. **Authorized JavaScript origins**
   lämnas tomt.
9. Skapa. Du får en **Client ID** och en **Client secret** i en ruta —
   kopiera båda direkt, secreten är lättare att hämta nu än sedan.

Du behöver inte aktivera något API. Äldre guider säger "enable Google+
API"; den finns inte längre och behövs inte.

### 2c. Tillbaka i Supabase

I fliken från steg 2a: slå på **Enable Sign in with Google**, klistra in
Client ID och Client secret, spara.

Fältet heter **Client IDs** i plural och tar en kommaseparerad lista, för
att det också stödjer Android och Chrome-tillägg. Du ska bara ha en — den
för webben, den ser ut så här:

```
418302941746-k3f9d8s7a2n1m4p6q8r0t5v7w9x1y3z5.apps.googleusercontent.com
```

Två reglage längre ner ska stå kvar som de är: **Skip nonce checks** av,
och **Allow users without an email** av. Appen hämtar spelarens förnamn ur
Google-kontot, så vi vill ha uppgifterna.

### 2d. Tala om vart appen får skickas efter inloggning

**Authentication → URL Configuration**:

- **Site URL**: `https://magic-mauve-xi.vercel.app`
- **Redirect URLs** — lägg till båda:
  - `https://magic-mauve-xi.vercel.app/**`
  - `http://localhost:8231/**`

Den andra behövs för att inloggning ska fungera när du kör lokalt.
Utan de här raderna vägrar Supabase skicka tillbaka dig och du landar
på en felsida efter Google-rutan.

---

## 3. Lägg upp tabellerna

1. I Supabase: **SQL Editor → New query**.
2. Klistra in hela innehållet i `supabase/schema.sql` från det här repot.
3. **Run**. Det ska sluta med `Success`.

Filen går att köra om utan att något går sönder, så om du behöver ändra
något senare kör du bara hela filen igen.

---

## 4. Nycklarna till appen

Två värden ska in i appen. Ingen av dem är hemlig — anon-nyckeln är
gjord för att ligga i klientkod, och det är radsäkerheten i steg 3 som
skyddar data, inte nyckeln. Men de ligger ändå i miljövariabler i
stället för i repot, så att du kan byta projekt utan att röra koden.

Hämta dem i Supabase under **Project Settings → API**:

- **Project URL**
- **anon public** under Project API keys

### Lokalt

Skapa filen `.env.local` i repots rot:

```
SUPABASE_URL=https://<ditt-projekt>.supabase.co
SUPABASE_ANON_KEY=<anon public-nyckeln>
```

Den filen är redan ignorerad av git.

### I produktion

```bash
vercel env add SUPABASE_URL production
```

```bash
vercel env add SUPABASE_ANON_KEY production
```

Kör sedan om deployen så att de nya variablerna följer med.

---

## Kontrollera att det tog

När allt är på plats ska den här ge `ok: true` och visa din projektadress:

```bash
curl -s https://magic-mauve-xi.vercel.app/api/config | head -c 300
```

Svarar den med `konfigurerad: false` saknas miljövariablerna i Vercel.
