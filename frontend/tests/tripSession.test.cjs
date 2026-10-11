const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies) {
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(output, { exports, require: (name) => dependencies[name] });
    return exports;
}

function setup(overrides = {}) {
    const calls = [];
    const api = {
        createTrip: async (_from, _to, route) => ({ id: route.routeId }),
        getTripPoints: async (id) => { calls.push(['points', id]); return { walking: 20, cycling: 20, driving: 0 }; },
        startTrip: async (id) => { calls.push(['start', id]); },
        cancelTrip: async (id) => { calls.push(['cancel', id]); },
        ...overrides,
    };
    const { TripSession } = load('src/services/tripSession.ts', {
        './tripService': api, './api': { ApiError: class extends Error {} },
    });
    return { session: new TripSession(), calls };
}

test('viewing options plans trips, fetches points, and starts only the selected trip', async () => {
    const { session, calls } = setup();
    await session.plan({}, {}, { routeId: 'walk' });
    await session.plan({}, {}, { routeId: 'bike' });
    await session.points('walk');
    assert.equal(await session.start('walk'), 'walk');
    assert.deepEqual(calls, [['points', 'walk'], ['cancel', 'bike'], ['start', 'walk']]);
    await session.cancelExcept();
    assert.deepEqual(calls.at(-1), ['cancel', 'walk']);
});

test('canceling before CREATE returns still cancels the created trip', async () => {
    let resolve;
    const { session, calls } = setup({ createTrip: () => new Promise((done) => { resolve = done; }) });
    const pending = session.plan({}, {}, { routeId: 'walk' });
    const cancellation = session.cancelExcept();
    resolve({ id: 'created-later' });
    await pending;
    await cancellation;
    assert.deepEqual(calls, [['cancel', 'created-later']]);
});

test('failed cancellation retains the trip for retry', async () => {
    let attempts = 0;
    const { session } = setup({ cancelTrip: async () => { if (++attempts === 1) throw new Error('offline'); } });
    await session.plan({}, {}, { routeId: 'walk' });
    await assert.rejects(session.cancelExcept(), /offline/);
    await session.cancelExcept();
    assert.equal(attempts, 2);
});

test('a completed trip is never canceled during cleanup', async () => {
    const { session, calls } = setup();
    await session.plan({}, {}, { routeId: 'walk' });
    await session.start('walk');
    session.complete('walk');
    await session.cancelExcept();
    assert.deepEqual(calls, [['start', 'walk']]);
});

test('API uses CREATE, per-ID START, points, completion, and cancellation endpoints', async () => {
    const calls = [];
    const service = load('src/services/tripService.ts', {
        '@/services/api': { apiJson: async (url, init) => { calls.push([url, init]); } },
        '@/services/routeService': { CAR_KG_CO2E_PER_KM: 0.192 },
    });
    await service.createTrip({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, {
        mode: 'BIKE', distanceKm: 2, durationMinutes: 10, estimatedCo2Kg: 0, estimatedCost: 0,
    });
    assert.equal(calls[0][0], '/api/v1/trips');
    assert.equal(JSON.parse(calls[0][1].body).mode, 'CYCLING');
    await service.startTrip('id');
    await service.getTripPoints('id');
    await service.completeTrip('id');
    await service.cancelTrip('id');
    assert.deepEqual(calls.slice(1).map(([url]) => url), [
        '/api/v1/trips/id/start', '/api/v1/trips/id/points', '/api/v1/trips/id/complete', '/api/v1/trips/id/cancel',
    ]);
});
