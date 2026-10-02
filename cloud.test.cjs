const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./services.js');
require('./supabase-service.js');
globalThis.SALAINFO_CONFIG = {url:'https://example.supabase.co',publishableKey:'public-test'};
function fixture(response) {
  const calls = [];
  const query = {};
  for (const name of ['select','order','range','insert','delete','eq','maybeSingle','single']) {
    query[name] = (...args) => { calls.push([name,...args]); return query; };
  }
  query.then = (resolve,reject) => Promise.resolve(response).then(resolve,reject);
  globalThis.supabase = { createClient: () => ({
    from: name => { calls.push(['from',name]); return query; },
    auth: { signInWithPassword: async () => ({data:{user:{id:'ana'}}}), signOut: async () => ({error:null}) }
  }) };
  return {api:SalaInfo.createCloudServices(),calls};
}
test('cloud creation sends only allowed fields and maps profile name', async () => {
  const {api,calls} = fixture({data:{id:'r1',date:'2026-10-02',lesson:1,school_class:'1º ano A',purpose:'Pesquisa',user_id:'ana',profiles:{name:'Ana'}}});
  const row = await api.reservations.create({date:'2026-10-02',lesson:1,schoolClass:'1º ano A',purpose:' Pesquisa ',userId:'forged'});
  assert.equal(row.teacher,'Ana');
  assert.deepEqual(calls.find(c => c[0] === 'insert')[1],{date:'2026-10-02',lesson:1,school_class:'1º ano A',purpose:'Pesquisa'});
});
test('cloud duplicate and permission errors are surfaced', async () => {
  await assert.rejects(fixture({error:{code:'23505'}}).api.reservations.create({purpose:''}), /já foi reservada/);
  await assert.rejects(fixture({error:{code:'42501'}}).api.reservations.cancel('r1'), /não autorizado/);
});
test('cloud cancellation with no accessible row is not reported as success', async () => {
  await assert.rejects(fixture({data:null,error:null}).api.reservations.cancel('r1'), /não encontrada/);
});
test('cloud login requires authorized profile', async () => {
  await assert.rejects(fixture({data:null,error:null}).api.auth.signIn('a@example.com','test'), /não foi autorizada/);
});
