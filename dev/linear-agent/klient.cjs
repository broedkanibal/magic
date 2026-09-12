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

async function skapaIssue({ teamId, title, description, assigneeId = JESPER_ID, delegeraTillAgenten = true }) {
  const delegateId = delegeraTillAgenten ? await agentAnvandarId() : undefined;
  const data = await graphql(
    `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }`,
    { input: { teamId, title, description, assigneeId, delegateId } }
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

let startadStateCache = {};
async function hittaStartadState(teamId) {
  if (startadStateCache[teamId]) return startadStateCache[teamId];
  const data = await graphql(
    `query($id: String!) { team(id: $id) { states(first: 50) { nodes { id name type } } } }`,
    { id: teamId }
  );
  const state = data.team.states.nodes.find(s => s.type === 'started');
  if (!state) throw new Error(`Hittar ingen "started"-status för team ${teamId}`);
  return (startadStateCache[teamId] = state.id);
}

/* Kallas när Claude Code faktiskt börjar jobba på en issue: sätter status
   till lagets "started"-läge (t.ex. In Progress), agenten som delegate och
   Jesper som assignee — i ett anrop. Praxis, se SNABBGUIDE.md. */
async function paborjaIssue(issueId) {
  const info = await graphql(`query($id: String!) { issue(id: $id) { team { id } } }`, { id: issueId });
  const stateId = await hittaStartadState(info.issue.team.id);
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
  skapaIssue,
  uppdateraIssue,
  tilldelaAgent,
  paborjaIssue,
  kommentera,
  arkiveraIssue,
  taBortIssue,
};
