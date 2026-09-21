'use strict';
/* Återanvändbar Linear-klient som skriver som "Claude AI agent" — inte som
   Jesper. Använd den här (inte det vanliga Linear-MCP-kopplingen) för
   issues/kommentarer som Claude Code själv initierar. Se SNABBGUIDE.md.

   Kräver dev/linear-agent/token.json, skapad en gång med:
     node dev/linear-agent/installera.cjs */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..', '..');
const TOKEN_FIL = path.join(__dirname, 'token.json');

/* Praxis: en människa ska alltid stå som assignee, agenten som delegate
   bredvid — annars ser Linear-UI:t ut som om issuen saknar ägare. Jesper
   Funks Linear-användar-id (stabilt, hittas igen med list_users om det
   nånsin behövs). */
const JESPER_ID = '9d2c299c-942f-4080-814a-847d34a659b1';

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

function lasToken() {
  try { return JSON.parse(fs.readFileSync(TOKEN_FIL, 'utf8')); }
  catch (e) {
    throw new Error(`Ingen token i ${path.relative(ROT, TOKEN_FIL)} — kör: node dev/linear-agent/installera.cjs`);
  }
}

async function fornyaToken(token) {
  const env = lasEnvLokal(['LINEAR_AGENT_CLIENT_ID', 'LINEAR_AGENT_CLIENT_SECRET']);
  if (!token.refresh_token) {
    throw new Error('Token har gått ut och inget refresh_token finns — kör: node dev/linear-agent/installera.cjs');
  }
  const svar = await fetch('https://api.linear.app/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: token.refresh_token,
      client_id: env.LINEAR_AGENT_CLIENT_ID,
      client_secret: env.LINEAR_AGENT_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  const data = await svar.json();
  if (!svar.ok || !data.access_token) throw new Error(`Kunde inte förnya token: ${JSON.stringify(data)}`);
  const nytt = Object.assign({}, token, {
    access_token: data.access_token,
    refresh_token: data.refresh_token || token.refresh_token,
    hamtad_epoch_ms: Date.now(),
    forfaller_epoch_ms: Date.now() + (data.expires_in || 0) * 1000,
  });
  fs.writeFileSync(TOKEN_FIL, JSON.stringify(nytt, null, 2) + '\n');
  return nytt;
}

async function hamtaGiltigToken() {
  let token = lasToken();
  const enMinutMarginal = 60 * 1000;
  if (!token.forfaller_epoch_ms || Date.now() > token.forfaller_epoch_ms - enMinutMarginal) {
    token = await fornyaToken(token);
  }
  return token;
}

async function graphql(query, variables) {
  const token = await hamtaGiltigToken();
  const svar = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.access_token}` },
    body: JSON.stringify({ query, variables }),
  });
  const data = await svar.json();
  if (data.errors) throw new Error(`Linear GraphQL-fel: ${JSON.stringify(data.errors)}`);
  return data.data;
}

let agentIdCache = null;
async function agentAnvandarId() {
  if (agentIdCache) return agentIdCache;
  const token = await hamtaGiltigToken();
  if (token.agent && token.agent.id) return (agentIdCache = token.agent.id);
  const data = await graphql('{ viewer { id name } }');
  return (agentIdCache = data.viewer.id);
}

/* Etiketter anges med namn ('Bug', 'Feature', 'Research' …) och slås upp
   bland lagets och workspacets etiketter. Ett namn som inte finns är ett fel
   — hellre det än en issue som tyst blir utan etikett. */
async function hittaEtiketter(teamId, namn) {
  if (!namn || !namn.length) return undefined;
  const data = await graphql(
    `query($id: String!) { team(id: $id) { labels(first: 250) { nodes { id name } } } issueLabels(first: 250, filter: { team: { null: true } }) { nodes { id name } } }`,
    { id: teamId }
  );
  const alla = data.team.labels.nodes.concat(data.issueLabels.nodes);
  return namn.map(n => {
    const etikett = alla.find(e => e.name.toLowerCase() === n.toLowerCase());
    if (!etikett) throw new Error(`Etiketten "${n}" finns inte — finns: ${[...new Set(alla.map(e => e.name))].join(', ')}`);
    return etikett.id;
  });
}

/* Projektet anges med namn ('Mesa Magic') eller id och slås upp bland
   lagets projekt. Ett namn som inte finns är ett fel, som för etiketterna —
   annars hamnar issuen tyst utanför projektet och syns inte i dess vy. */
async function hittaProjekt(teamId, projekt) {
  if (!projekt) return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projekt)) return projekt;
  const data = await graphql(
    `query($id: String!) { team(id: $id) { projects(first: 250) { nodes { id name } } } }`,
    { id: teamId }
  );
  const alla = data.team.projects.nodes;
  const p = alla.find(x => x.name.toLowerCase() === projekt.toLowerCase());
  if (!p) throw new Error(`Projektet "${projekt}" finns inte — finns: ${alla.map(x => x.name).join(', ')}`);
  return p.id;
}

/* Sedan 2026-09-20 finns fyra projekt som var och en tar slut, i stället för
   ett evigt "Mesa Magic" (arkiverat). Det finns därför inget vettigt förval:
   den som skapar issuen väljer projekt, eller sätter projekt: null plus
   etiketten "Plattform" för det som inte hör till någon leverans. Se
   CLAUDE.md, avsnittet "Projekt — fyra, och de tar slut". */
const PROJEKT_FORVAL = null;
const PROJEKTEN = ['Spegelläget i realtid', 'Uppstarten vid bordet',
  'Lekbyggaren och vägen till spel', 'Spelvyn och bordsvyn'];

/* status: lagets state-typ — 'backlog', 'unstarted' (Todo), 'started' (In
   Progress) … Utelämnad får issuen lagets förval (Backlog). projekt: namn
   eller id, se hittaProjekt; utelämnat blir det Mesa Magic, och null lägger
   issuen utanför alla projekt. */
async function skapaIssue({ teamId, title, description, etiketter, status, projekt = PROJEKT_FORVAL, assigneeId = JESPER_ID, delegeraTillAgenten = true }) {
  if (projekt === undefined) projekt = PROJEKT_FORVAL;
  if (projekt === null) {
    console.warn(`[linear-agent] Inget projekt satt på "${title}". Det är rätt bara för\n` +
      `  Plattform-saker (konton, drift, mätverktyg, arbetssätt) — sätt då etiketten "Plattform".\n` +
      `  Annars välj ett av: ${PROJEKTEN.join(', ')}`);
  }
  const delegateId = delegeraTillAgenten ? await agentAnvandarId() : undefined;
  const labelIds = await hittaEtiketter(teamId, etiketter);
  const stateId = status ? await hittaState(teamId, status) : undefined;
  const projectId = await hittaProjekt(teamId, projekt);
  const data = await graphql(
    `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }`,
    { input: { teamId, title, description, assigneeId, delegateId, labelIds, stateId, projectId } }
  );
  return data.issueCreate.issue;
}

async function uppdateraIssue(issueId, input) {
  const data = await graphql(
    `mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier state { name } assignee { name } delegate { name } } } }`,
    { id: issueId, input }
  );
  return data.issueUpdate.issue;
}

/* Sätter agenten som delegate OCH Jesper som assignee (förval) — Linear
   tillåter aldrig en app som ren assignee, men utan en mänsklig assignee ser
   issuen ägarlös ut i UI:t. Skicka { assigneeId: null } för att bara sätta
   delegate och lämna en befintlig assignee orörd. */
async function tilldelaAgent(issueId, { assigneeId = JESPER_ID } = {}) {
  const delegateId = await agentAnvandarId();
  return uppdateraIssue(issueId, assigneeId ? { assigneeId, delegateId } : { delegateId });
}

/* typ: lagets state-typ ('backlog', 'unstarted', 'started' …), namn: en
   bestämd kolumn ('In Progress', 'Blocked'). Ange ena eller båda; finns flera
   träffar vinner den som ligger först på brädan. */
let stateCache = {};
async function hittaState(teamId, typ, namn) {
  const nyckel = `${teamId}:${typ || ''}:${namn || ''}`;
  if (stateCache[nyckel]) return stateCache[nyckel];
  const data = await graphql(
    `query($id: String!) { team(id: $id) { states(first: 50) { nodes { id name type position } } } }`,
    { id: teamId }
  );
  const state = data.team.states.nodes
    .filter(s => (!typ || s.type === typ) && (!namn || s.name.toLowerCase() === namn.toLowerCase()))
    .sort((a, b) => a.position - b.position)[0];
  if (!state) throw new Error(`Hittar ingen status ${namn ? `"${namn}"` : `av typen "${typ}"`} för team ${teamId}`);
  return (stateCache[nyckel] = state.id);
}

const AVSLUTAD = ['completed', 'canceled', 'duplicate'];

/* Körs innan en issue plockas upp ur Todo. Ger tillbaka:
   - blockerare: issues som enligt Linears relationer blockerar den här och
     inte är avslutade
   - pagaende: lagets övriga issues i In Progress (inte Blocked), med början
     av beskrivningen — för att se om arbetet krockar med något som byggs nu.
   Bedömningen av krockar gör Claude Code; funktionen samlar bara underlaget. */
async function kontrolleraInnanStart(issueId) {
  const data = await graphql(
    `query($id: String!) { issue(id: $id) { id identifier team { id }
       inverseRelations(first: 50) { nodes { type issue { identifier title state { name type } } } } } }`,
    { id: issueId }
  );
  const issue = data.issue;
  const blockerare = issue.inverseRelations.nodes
    .filter(r => r.type === 'blocks' && !AVSLUTAD.includes(r.issue.state.type))
    .map(r => ({ identifier: r.issue.identifier, title: r.issue.title, status: r.issue.state.name }));
  const pag = await graphql(
    `query($team: ID!) { issues(first: 50, filter: { team: { id: { eq: $team } }, state: { type: { eq: "started" } } }) {
       nodes { identifier title description state { name } } } }`,
    { team: issue.team.id }
  );
  const pagaende = pag.issues.nodes
    .filter(i => i.identifier !== issue.identifier && i.state.name.toLowerCase() !== 'blocked')
    .map(i => ({ identifier: i.identifier, title: i.title, beskrivning: (i.description || '').slice(0, 400) }));
  return { issue: issue.identifier, blockerare, pagaende };
}

/* Flyttar issuen till kolumnen "Blocked" och kommenterar vad den är blockad
   av. blockeradAv: issue-nycklar (['MES-12']) som också läggs in som
   "blocked by"-relationer, så att Linear visar kopplingen. */
async function blockeraIssue(issueId, orsak, { blockeradAv = [] } = {}) {
  const info = await graphql(`query($id: String!) { issue(id: $id) { id team { id } } }`, { id: issueId });
  const stateId = await hittaState(info.issue.team.id, null, 'Blocked');
  for (const nyckel of blockeradAv) {
    const b = await graphql(`query($id: String!) { issue(id: $id) { id } }`, { id: nyckel });
    await graphql(
      `mutation($input: IssueRelationCreateInput!) { issueRelationCreate(input: $input) { success } }`,
      { input: { issueId: b.issue.id, relatedIssueId: info.issue.id, type: 'blocks' } }
    );
  }
  const issue = await uppdateraIssue(info.issue.id, { stateId });
  await kommentera(info.issue.id, `**Blocked:** ${orsak}`);
  return issue;
}

/* Kallas när Claude Code faktiskt börjar jobba på en issue: sätter status
   till lagets "started"-läge (t.ex. In Progress), agenten som delegate och
   Jesper som assignee — i ett anrop. Praxis, se SNABBGUIDE.md. */
async function paborjaIssue(issueId) {
  const info = await graphql(`query($id: String!) { issue(id: $id) { team { id } } }`, { id: issueId });
  const stateId = await hittaState(info.issue.team.id, 'started', 'In Progress');
  const delegateId = await agentAnvandarId();
  return uppdateraIssue(issueId, { stateId, delegateId, assigneeId: JESPER_ID });
}

async function kommentera(issueId, body) {
  const data = await graphql(
    `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id url } } }`,
    { input: { issueId, body } }
  );
  return data.commentCreate.comment;
}

/* "Needs Jesper" (2026-09-20): issuen väntar på något bara Jesper kan göra —
   ett prov på telefonen, en inspelning, ett beslut. Etiketten läggs på och
   en kommentar säger konkret vad som behövs; Claude Code går inte vidare
   med issuen förrän det är gjort. Etiketten skapas om den saknas. */
const BEHOVER_JESPER = 'Needs Jesper';
async function markeraBehoverJesper(issueId, varfor) {
  const info = await graphql(`query($id: String!) { issue(id: $id) { id team { id } labels { nodes { id name } } } }`, { id: issueId });
  const teamId = info.issue.team.id;
  let lab = info.issue.labels.nodes.find(l => l.name === BEHOVER_JESPER);
  if (!lab) {
    const fanns = await graphql(`query($teamId: String!, $namn: String!) { team(id: $teamId) { labels(filter: { name: { eq: $namn } }) { nodes { id name } } } }`, { teamId, namn: BEHOVER_JESPER });
    lab = fanns.team.labels.nodes[0];
    if (!lab) {
      const d = await graphql(`mutation($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { issueLabel { id name } } }`,
        { input: { name: BEHOVER_JESPER, color: '#e5484d', teamId, description: 'Väntar på Jespers input: ett prov, en inspelning, ett beslut. Claude Code stannar här.' } });
      lab = d.issueLabelCreate.issueLabel;
    }
    await graphql(`mutation($id: String!, $labelId: String!) { issueAddLabel(id: $id, labelId: $labelId) { success } }`, { id: issueId, labelId: lab.id });
  }
  await kommentera(issueId, `**Behöver dig, Jesper:** ${varfor}. Claude Code går inte vidare här förrän det är gjort — etiketten *${BEHOVER_JESPER}* tas bort då.`);
  return lab;
}
/* Jesper har gjort sitt: etiketten tas bort. */
async function slappBehoverJesper(issueId) {
  const info = await graphql(`query($id: String!) { issue(id: $id) { labels { nodes { id name } } } }`, { id: issueId });
  const lab = info.issue.labels.nodes.find(l => l.name === BEHOVER_JESPER);
  if (lab) await graphql(`mutation($id: String!, $labelId: String!) { issueRemoveLabel(id: $id, labelId: $labelId) { success } }`, { id: issueId, labelId: lab.id });
  return !!lab;
}

async function arkiveraIssue(issueId) {
  const data = await graphql(`mutation($id: String!) { issueArchive(id: $id) { success } }`, { id: issueId });
  return data.issueArchive.success;
}

async function taBortIssue(issueId) {
  const data = await graphql(`mutation($id: String!) { issueDelete(id: $id) { success } }`, { id: issueId });
  return data.issueDelete.success;
}

module.exports = {
  graphql,
  agentAnvandarId,
  hittaEtiketter,
  hittaProjekt,
  hittaState,
  skapaIssue,
  uppdateraIssue,
  tilldelaAgent,
  paborjaIssue,
  kontrolleraInnanStart,
  blockeraIssue,
  kommentera,
  markeraBehoverJesper,
  slappBehoverJesper,
  arkiveraIssue,
  taBortIssue,
};
