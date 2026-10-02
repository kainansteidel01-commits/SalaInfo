const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./services.js');
const { createServices, today, KEY } = globalThis.SalaInfo;
function fixture() {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) };
  return { values, storage, api: createServices(storage) };
}
const input = () => ({ date: today(), lesson: 1, schoolClass: '1º ano A', purpose: '' });
test('cancel frees the lesson, persists and keeps other reservations', async () => {
  const { api, storage } = fixture();
  await api.auth.signIn('ana.evaldostaidel', '123456');
  const first = await api.reservations.create(input());
  const other = await api.reservations.create({ ...input(), lesson: 2 });
  await api.reservations.cancel(first.id);
  assert.deepEqual((await api.reservations.list()).map(r => r.id), [other.id]);
  const reloaded = createServices(storage);
  await reloaded.auth.signIn('ana.evaldostaidel', '123456');
  assert.equal((await reloaded.reservations.list()).length, 1);
  await reloaded.reservations.create(input());
  await assert.rejects(api.reservations.cancel(first.id), /não existe/);
});
test('cancel rejects unauthenticated, other owner and past reservations', async () => {
  const { api, values } = fixture();
  await assert.rejects(api.reservations.cancel('missing'), /Entre/);
  await api.auth.signIn('ana.evaldostaidel', '123456');
  const row = await api.reservations.create(input());
  values.set(KEY, JSON.stringify([{ ...row, userId: 'another-user' }]));
  await assert.rejects(api.reservations.cancel(row.id), /próprias/);
  values.set(KEY, JSON.stringify([{ ...row, date: '2020-01-01' }]));
  await assert.rejects(api.reservations.cancel(row.id), /passada/);
});
test('failed cancellation write preserves the reservation', async () => {
  const { api, storage } = fixture();
  await api.auth.signIn('ana.evaldostaidel', '123456');
  const row = await api.reservations.create(input());
  const blocked = createServices({ getItem: storage.getItem, setItem: () => { throw Error(); } });
  await blocked.auth.signIn('ana.evaldostaidel', '123456');
  await assert.rejects(blocked.reservations.cancel(row.id), /Não foi possível cancelar/);
  assert.equal((await api.reservations.list()).length, 1);
});
test('demo login validation and session requirement', async () => {
  const { api } = fixture();
  await assert.rejects(api.reservations.create(input()), /Entre/);
  await assert.rejects(api.auth.signIn('other', '123456'));
  await assert.rejects(api.auth.signIn('ana.evaldostaidel', '12345a'));
  await api.auth.signIn('ana.evaldostaidel', '000000');
  await api.auth.signOut();
  await assert.rejects(api.reservations.list(), /Entre/);
});
test('save, reload, duplicate rejection and optional purpose', async () => {
  const { api, storage, values } = fixture();
  await api.auth.signIn('ana.evaldostaidel', '123456');
  const row = await api.reservations.create(input());
  assert.equal(row.teacher, 'Ana');
  assert.equal(row.purpose, '');
  await assert.rejects(api.reservations.create(input()), /reservada/);
  await api.reservations.create({ ...input(), lesson: 2, purpose: '  Pesquisa  ' });
  const second = createServices(storage);
  await second.auth.signIn('ana.evaldostaidel', '123456');
  assert.equal((await second.reservations.list()).length, 2);
  assert.equal((await second.reservations.list())[1].purpose, 'Pesquisa');
  assert.ok(!values.get(KEY).includes('123456'));
});
test('reject past, impossible dates, bad lesson, class and long purpose', async () => {
  const { api } = fixture();
  await api.auth.signIn('ana.evaldostaidel', '123456');
  for (const patch of [{date:'2020-01-01'}, {date:'2099-02-30'}, {date:''}, {lesson:6}, {lesson:1.5}, {schoolClass:''}, {purpose:'a'.repeat(301)}]) {
    await assert.rejects(api.reservations.create({ ...input(), ...patch }));
  }
  assert.equal((await api.reservations.list()).length, 0);
});
test('corrupt storage and failed write never report a successful reservation', async () => {
  const { api, values } = fixture();
  await api.auth.signIn('ana.evaldostaidel', '123456');
  values.set(KEY, '{bad');
  await assert.rejects(api.reservations.list(), /ler/);
  const blocked = createServices({ getItem: () => null, setItem: () => { throw Error(); } });
  await blocked.auth.signIn('ana.evaldostaidel', '123456');
  await assert.rejects(blocked.reservations.create(input()), /salvar/);
});
test('two service instances contend for the same lesson through the lock', async () => {
  const { storage } = fixture();
  let chain = Promise.resolve();
  const locks = { request: (_key, fn) => { const next = chain.then(fn); chain = next.catch(() => {}); return next; } };
  const a = createServices(storage, locks), b = createServices(storage, locks);
  await a.auth.signIn('ana.evaldostaidel', '123456');
  await b.auth.signIn('ana.evaldostaidel', '123456');
  const results = await Promise.allSettled([a.reservations.create(input()), b.reservations.create(input())]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await a.reservations.list()).length, 1);
});
