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
        createTrip: async (_from, _to, route) => { calls.push(['create', route.routeId]); return { id: route.routeId }; },
        estimateTripPoints: async (_from, _to, route) => { calls.push(['estimate', route.routeId]); return { walking: 20, cycling: 20, driving: 0 }; },
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

test('repeated points previews save no trips and starting creates only the selected trip', async () => {
    const { session, calls } = setup();
    await session.plan({}, {}, { routeId: 'walk' });
    await session.plan({}, {}, { routeId: 'bike' });
    await session.points('walk');
    await session.points('walk');
    assert.deepEqual(calls, [['estimate', 'walk'], ['estimate', 'walk']]);
    assert.equal(await session.start('walk'), 'walk');
    assert.deepEqual(calls.slice(2), [['create', 'walk'], ['start', 'walk']]);
    await session.cancelExcept();
    assert.deepEqual(calls.at(-1), ['cancel', 'walk']);
});

test('canceling before CREATE returns still cancels the created trip', async () => {
    let resolve;
    const { session, calls } = setup({ createTrip: () => new Promise((done) => { resolve = done; }) });
    session.plan({}, {}, { routeId: 'walk' });
    const pending = session.start('walk');
    const cancellation = session.cancelExcept();
    resolve({ id: 'created-later' });
    await assert.rejects(pending, /canceled/);
    await cancellation;
    assert.deepEqual(calls, [['cancel', 'created-later']]);
});

test('failed cancellation retains the trip for retry', async () => {
    let attempts = 0;
    const { session } = setup({ cancelTrip: async () => { if (++attempts === 1) throw new Error('offline'); } });
    await session.plan({}, {}, { routeId: 'walk' });
    await session.start('walk');
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
    assert.deepEqual(calls, [['create', 'walk'], ['start', 'walk']]);
});

test('concurrent and repeated starts create a single trip', async () => {
    const { session, calls } = setup();
    session.plan({}, {}, { routeId: 'walk' });
    assert.deepEqual(await Promise.all([session.start('walk'), session.start('walk')]), ['walk', 'walk']);
    assert.equal(await session.start('walk'), 'walk');
    assert.deepEqual(calls, [['create', 'walk'], ['start', 'walk']]);
});

test('discarding previews makes no creation or cancellation calls', async () => {
    const { session, calls } = setup();
    session.plan({}, {}, { routeId: 'walk' });
    await session.cancelExcept();
    assert.deepEqual(calls, []);
});

test('a failed creation can be retried, and a failed start reuses its saved trip', async () => {
    let creations = 0;
    let starts = 0;
    const { session } = setup({
        createTrip: async () => {
            if (++creations === 1) throw new Error('offline');
            return { id: 'walk' };
        },
        startTrip: async () => { if (++starts === 1) throw new Error('offline'); },
    });
    session.plan({}, {}, { routeId: 'walk' });
    await assert.rejects(session.start('walk'), /offline/);
    await assert.rejects(session.start('walk'), /offline/);
    assert.equal(await session.start('walk'), 'walk');
    assert.equal(creations, 2);
    assert.equal(starts, 2);
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
    await service.estimateTripPoints({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, {
        mode: 'BIKE', distanceKm: 2, durationMinutes: 10, estimatedCo2Kg: 0, estimatedCost: 0,
    });
    assert.equal(calls[1][0], '/api/v1/trips/points');
    assert.equal(calls[1][1].body, calls[0][1].body);
    await service.startTrip('id');
    await service.getTripPoints('id');
    await service.completeTrip('id');
    await service.cancelTrip('id');
    assert.deepEqual(calls.slice(2).map(([url]) => url), [
        '/api/v1/trips/id/start', '/api/v1/trips/id/points', '/api/v1/trips/id/complete', '/api/v1/trips/id/cancel',
    ]);
});
