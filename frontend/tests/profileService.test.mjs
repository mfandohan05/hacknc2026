import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { ensureProfile } from "../src/services/profileService.ts";

const originalFetch = globalThis.fetch;
const session = {
    access_token: "test-access-token",
    user: { id: "741a51a4-3bd6-41f1-ad97-9f9307f36904", user_metadata: {} },
};
afterEach(() => { globalThis.fetch = originalFetch; });

function mockResponses(statuses) {
    const calls = [];
    globalThis.fetch = async (url, init) => {
        calls.push({ url, ...init });
        assert.ok(statuses.length, "Unexpected HTTP request");
        return new Response(null, { status: statuses.shift() });
    };
    return calls;
}

test("creates a missing profile using the access token and stable default identity", async () => {
    const calls = mockResponses([404, 201]);
    await ensureProfile(session);
    assert.equal(calls[0].url, "/api/v1/profiles/me");
    assert.equal(calls[1].url, "/api/v1/profiles");
    assert.equal(calls[1].method, "POST");
    assert.equal(calls[1].headers.Authorization, "Bearer test-access-token");
    assert.deepEqual(JSON.parse(calls[1].body), {
        username: "user_741a51a43bd641f1ad979f9307f36904", displayName: "Explorer",
    });
});

test("preserves an existing profile without attempting creation", async () => {
    const calls = mockResponses([200]);
    await ensureProfile(session);
    assert.equal(calls.length, 1);
});

test("does not treat authentication or backend failures as missing profiles", async () => {
    for (const status of [401, 403, 500]) {
        const calls = mockResponses([status]);
        await assert.rejects(ensureProfile(session), new RegExp(String(status)));
        assert.equal(calls.length, 1);
    }
});

test("accepts a creation conflict only if this user's profile now exists", async () => {
    const calls = mockResponses([404, 409, 200]);
    await ensureProfile(session);
    assert.equal(calls[2].url, "/api/v1/profiles/me");
    mockResponses([404, 409, 404]);
    await assert.rejects(ensureProfile(session), /409/);
});

test("deduplicates concurrent auth events", async () => {
    const calls = mockResponses([404, 201]);
    await Promise.all([ensureProfile(session), ensureProfile(session)]);
    assert.equal(calls.length, 2);
});

test("retries after creation failure instead of caching the failure", async () => {
    mockResponses([404, 503]);
    await assert.rejects(ensureProfile(session), /503/);
    const calls = mockResponses([404, 201]);
    await ensureProfile(session);
    assert.equal(calls.length, 2);
});

test("uses a bounded metadata display name when provided", async () => {
    const calls = mockResponses([404, 201]);
    await ensureProfile({ ...session, user: { ...session.user, user_metadata: { full_name: " Alex " } } });
    assert.equal(JSON.parse(calls[1].body).displayName, "Alex");
});
