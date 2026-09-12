#!/usr/bin/env node
'use strict';
/* Engångsscript: kopplar den här datorn mot Linear-agent-appen "Claude AI
   agent" och sparar tokens i dev/linear-agent/token.json (gitignorerad).
   Appen måste redan finnas i Linear — se SNABBGUIDE.md steg 1–2 för hur du
   registrerar den och fyller i LINEAR_AGENT_CLIENT_ID/SECRET i .env.local
   innan du kör det här. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROT = path.join(__dirname, '..', '..');
const TOKEN_FIL = path.join(__dirname, 'token.json');
const PORT = 53219;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = 'read,write,issues:create,comments:create,app:assignable,app:mentionable';

function lasEnvLokal(nycklar) {
  let text = '';
  try { text = fs.readFileSync(path.join(ROT, '.env.local'), 'utf8'); } catch (e) {}
  const resultat = {};
  for (const namn of nycklar) {
    const m = text.match(new RegExp(`^\\s*${namn}\\s*=\\s*("?)(.*?)\\1\\s*$`, 'm'));
    if (m && m[2]) resultat[namn] = m[2];
  }
  return resultat;
}

async function main() {
  const env = lasEnvLokal(['LINEAR_AGENT_CLIENT_ID', 'LINEAR_AGENT_CLIENT_SECRET']);
  const clientId = env.LINEAR_AGENT_CLIENT_ID;
  const clientSecret = env.LINEAR_AGENT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('Saknar LINEAR_AGENT_CLIENT_ID / LINEAR_AGENT_CLIENT_SECRET i .env.local — se SNABBGUIDE.md steg 1–2.');
    process.exit(1);
  }

  const state = crypto.randomBytes(16).toString('hex');
  const url = new URL('https://linear.app/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('actor', 'app');
  url.searchParams.set('state', state);

  console.log('\nÖppnar Linear i webbläsaren — logga in som admin i Mesa-workspacet och godkänn:\n');
  console.log(url.toString());
  console.log('\nVäntar på svaret (avbryt med Ctrl+C) …\n');
  try { execSync(`open "${url.toString()}"`); } catch (e) {}

  const kod = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let inkommande;
      try { inkommande = new URL(req.url, REDIRECT_URI); } catch (e) { res.writeHead(400); return res.end(); }
      if (inkommande.pathname !== '/callback') { res.writeHead(404); return res.end(); }
      const fel = inkommande.searchParams.get('error');
      const mottagetState = inkommande.searchParams.get('state');
      const mottagenKod = inkommande.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (fel) {
        res.end(`<p>Fel från Linear: ${fel}. Stäng fliken och kör scriptet igen.</p>`);
        server.close();
        return reject(new Error(fel));
      }
      if (mottagetState !== state) {
        res.end('<p>State stämde inte — avbryter av säkerhetsskäl. Kör scriptet igen.</p>');
        server.close();
        return reject(new Error('state stämde inte'));
      }
      res.end('<p>Klart! Stäng fliken och gå tillbaka till terminalen.</p>');
      server.close();
      resolve(mottagenKod);
    });
    server.listen(PORT);
  });

  const svar = await fetch('https://api.linear.app/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: kod,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
    }),
  });
  const data = await svar.json();
  if (!svar.ok || !data.access_token) {
    console.error('Tokenbytet misslyckades:', data);
    process.exit(1);
  }

  const viewerSvar = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.access_token}` },
    body: JSON.stringify({ query: '{ viewer { id name email } }' }),
  });
  const viewerData = await viewerSvar.json();
  const viewer = viewerData && viewerData.data && viewerData.data.viewer;

  const post = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
    hamtad_epoch_ms: Date.now(),
    forfaller_epoch_ms: Date.now() + (data.expires_in || 0) * 1000,
    scope: data.scope,
    agent: viewer || null,
  };
  fs.writeFileSync(TOKEN_FIL, JSON.stringify(post, null, 2) + '\n');
  console.log(`\nSparat i ${path.relative(ROT, TOKEN_FIL)}.`);
  if (viewer) console.log(`Agenten är nu Linear-användaren: ${viewer.name} <${viewer.email}> (${viewer.id})`);
  if (!data.refresh_token) console.log('OBS: inget refresh_token kom tillbaka — kör om det här scriptet när token går ut.');
}

main().catch(e => { console.error(e); process.exit(1); });
