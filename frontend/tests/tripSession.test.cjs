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

test('transit estimates use the itinerary distance and request the transit points field', async () => {
    const requests = [];
    const { transitTripOption } = load('src/services/transitService.ts', {});
    const tripService = load('src/services/tripService.ts', {
        '@/services/api': { apiJson: async (url, init) => {
            requests.push([url, init?.body ? JSON.parse(init.body) : null]);
            return init?.method === 'POST' ? { id: 'transit-trip' }
                : { walking: 10, cycling: 10, driving: 0, transit: 25 };
        } },
        '@/services/routeService': { CAR_KG_CO2E_PER_KM: 0.2 },
    });
    const { TripSession } = load('src/services/tripSession.ts', {
        './tripService': tripService, './api': { ApiError: class extends Error {} },
    });
    const session = new TripSession();
    const option = transitTripOption({ id: 'bus', distanceMeters: 4000, durationSeconds: 600, fare: 2, currency: 'USD' });
    await session.plan({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, option);
    const points = await session.points(option.routeId);
    assert.equal(tripService.pointsForMode(points, option.mode), 25);
    assert.equal(requests[0][1].mode, 'TRANSIT');
    assert.equal(requests[0][1].distanceMeters, 4000);
    assert.equal(requests[0][1].durationSeconds, 600);
    assert.equal(requests[0][1].estimatedCost, 2);
    assert.equal(requests[1][0], '/api/v1/trips/transit-trip/points');
    await session.cancelExcept();
    assert.equal(requests[2][0], '/api/v1/trips/transit-trip/cancel');
});

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

test('a failed trip creation can be retried when starting a route', async () => {
    let attempts = 0;
    const { session } = setup({ createTrip: async () => {
        if (++attempts === 1) throw new Error('offline');
        return { id: 'retry' };
    } });
    await assert.rejects(session.plan({}, {}, { routeId: 'walk' }), /offline/);
    await session.plan({}, {}, { routeId: 'walk' });
    assert.equal(await session.start('walk'), 'retry');
    assert.equal(attempts, 2);
});

test('route cards have point estimates without authentication or a successful points request', () => {
    const { routePoints } = load('src/lib/routePoints.ts', {
        '@/services/routeService': { CAR_KG_CO2E_PER_KM: 0.192 },
    });
    const route = { distanceKm: 5, estimatedCo2Kg: 0 };
    assert.equal(routePoints({ ...route, mode: 'WALK' }), 19);
    assert.equal(routePoints({ ...route, mode: 'BIKE' }), 19);
    assert.equal(routePoints({ ...route, mode: 'CAR', estimatedCo2Kg: 0.96 }), 0);
    assert.equal(routePoints({ ...route, mode: 'TRANSIT', estimatedCo2Kg: null }), 9);
    assert.equal(routePoints({ ...route, mode: 'WALK', tripPoints: 42 }), 42);
    assert.equal(routePoints({ ...route, mode: 'WALK', tripPoints: 0 }), 0);
    assert.equal(routePoints({ ...route, mode: 'WALK', estimatedCo2Kg: null }), null);
    assert.equal(routePoints({ ...route, mode: 'WALK', distanceKm: NaN }), null);
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

test('transit trips send their itinerary estimates and use transit points', async () => {
    let payload;
    const service = load('src/services/tripService.ts', {
        '@/services/api': { apiJson: async (_url, init) => { payload = JSON.parse(init.body); } },
        '@/services/routeService': { CAR_KG_CO2E_PER_KM: 0.192 },
    });
    await service.createTrip({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, {
        mode: 'TRANSIT', distanceKm: 5, durationMinutes: 20, estimatedCo2Kg: null, estimatedCost: 2.5,
    });
    assert.equal(payload.mode, 'TRANSIT');
    assert.equal(payload.distanceMeters, 5000);
    assert.equal(payload.durationSeconds, 1200);
    assert.equal(payload.baselineCo2Kg, 0.96);
    assert.equal(payload.estimatedCost, 2.5);
    assert.equal(service.pointsForMode({ walking: 19, cycling: 19, driving: 0, transit: 9 }, 'TRANSIT'), 9);
});
