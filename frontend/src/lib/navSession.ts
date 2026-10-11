import type { DirectionsRoute, NavProfile } from "@/types/navigation";
import type { LngLat } from "@/types/route";

const KEY = "ecoquest:navSession";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const VERSION = 1;
const SAVE_INTERVAL_MS = 1000;

export type NavSession = {
    phase: "navigating" | "arrived";
    profile: NavProfile;
    route: DirectionsRoute;
    destination: LngLat;
    stepIndex: number;
    lastPosition: { lng: number; lat: number; bearing: number } | null;
    isDemo: boolean;
    demoDistance: number;
    muted: boolean;
    tripId: string | null;
    transit?: boolean;
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
    }
    lastSavedAt = now;
    pending = null;
}

if (typeof window !== "undefined") window.addEventListener("pagehide", flush);

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
    }
}
