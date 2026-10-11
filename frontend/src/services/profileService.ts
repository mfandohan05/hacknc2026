import type { Session } from "@supabase/supabase-js";
import { API_ORIGIN } from "@/services/api";

const pending = new Map<string, Promise<void>>();

// Use the event's token directly: calling getSession from an auth callback can
// contend with Supabase's auth lock. No privileged key or client user ID is sent.
export function ensureProfile(session: Session): Promise<void> {
    const existing = pending.get(session.user.id);
    if (existing) return existing;
    const request = provisionProfile(session).finally(() => pending.delete(session.user.id));
    pending.set(session.user.id, request);
    return request;
}

async function provisionProfile(session: Session): Promise<void> {
    const headers = {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
    };
    const current = await fetch(`${API_ORIGIN}/api/v1/profiles/me`, { headers });
    if (current.ok) return;
    if (current.status !== 404) {
        throw new Error(`Couldn't load your profile (${current.status}). Please try again.`);
    }

    const name = session.user.user_metadata?.full_name;
    const username = session.user.user_metadata?.username;
    const created = await fetch(`${API_ORIGIN}/api/v1/profiles`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            // Keep a fallback for older accounts created without signup metadata.
            username: typeof username === "string" && username.trim()
                ? username.trim() : `user_${session.user.id.replaceAll("-", "")}`,
            displayName: typeof name === "string" && name.trim()
                ? name.trim().slice(0, 100) : "Explorer",
        }),
    });
    if (created.ok) return;
    if (created.status === 409) {
        // Another tab may have created this same user's profile in the meantime.
        const concurrent = await fetch(`${API_ORIGIN}/api/v1/profiles/me`, { headers });
        if (concurrent.ok) return;
    }
    throw new Error(`Your account is signed in, but profile setup failed (${created.status}). Please retry.`);
}
