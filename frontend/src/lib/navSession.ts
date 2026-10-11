import type { DirectionsRoute, NavProfile } from "@/types/navigation";
import type { LngLat } from "@/types/route";

const KEY = "ecoquest:navSession";
// a session older than this is treated as abandoned
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const VERSION = 1;
const SAVE_INTERVAL_MS = 1000;

// Everything needed to put an in-progress trip back on screen after a page refresh.
export type NavSession = {
    phase: "navigating" | "arrived";
    profile: NavProfile;
    route: DirectionsRoute;
    destination: LngLat;
    stepIndex: number;
    // where the arrow last was (already snapped to the route)
    lastPosition: { lng: number; lat: number; bearing: number } | null;
    isDemo: boolean;
    // meters travelled along the route by the demo simulator
    demoDistance: number;
    muted: boolean;
    // the server-side trip, when one was started
    tripId: string | null;
};

type Stored = NavSession & { v: number; savedAt: number };

let lastSavedAt = 0;
let pending: NavSession | null = null;
let timer: number | undefined;

function flush() {
    if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
    }
    if (!pending) return;
    const now = Date.now();
    try {
        const stored: Stored = { ...pending, v: VERSION, savedAt: now };
        localStorage.setItem(KEY, JSON.stringify(stored));
    } catch {
        // storage unavailable or full; the trip just won't survive a refresh
    }
    lastSavedAt = now;
    pending = null;
}

// write the latest state out as the page goes away, so a refresh loses nothing
if (typeof window !== "undefined") window.addEventListener("pagehide", flush);

// Storage can throw (private mode, quota), so every access is guarded.
export function loadNavSession(): NavSession | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const s = JSON.parse(raw) as Partial<Stored>;
        if (
            s.v !== VERSION ||
            typeof s.savedAt !== "number" ||
            Date.now() - s.savedAt > MAX_AGE_MS ||
            !s.route?.geometry?.coordinates?.length ||
            !s.destination ||
            (s.phase !== "navigating" && s.phase !== "arrived")
        ) {
            return null;
        }
        return s as NavSession;
    } catch {
        return null;
    }
}

// Writes are limited to about one per second (a trailing write always lands), since the session
// includes the whole route. `force` writes immediately.
export function saveNavSession(session: NavSession, force = false) {
    pending = session;
    const wait = SAVE_INTERVAL_MS - (Date.now() - lastSavedAt);
    if (force || wait <= 0) {
        flush();
        return;
    }
    if (timer === undefined) timer = window.setTimeout(flush, wait);
}

export function clearNavSession() {
    pending = null;
    if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
    }
    lastSavedAt = 0;
    try {
        localStorage.removeItem(KEY);
    } catch {
        // nothing to clear
    }
}
