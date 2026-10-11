const KEY = "ecoquest:lastLocation";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type StoredLocation = {
    longitude: number;
    latitude: number;
};

type Saved = StoredLocation & { savedAt: number };

export function loadLastLocation(): StoredLocation | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw) as Partial<Saved>;
        if (
            typeof saved.longitude !== "number" ||
            typeof saved.latitude !== "number" ||
            typeof saved.savedAt !== "number" ||
            !Number.isFinite(saved.longitude) ||
            !Number.isFinite(saved.latitude) ||
            Date.now() - saved.savedAt > MAX_AGE_MS
        ) {
            return null;
        }
        return { longitude: saved.longitude, latitude: saved.latitude };
    } catch {
        return null;
    }
}

export function saveLastLocation(location: StoredLocation) {
    try {
        const saved: Saved = { ...location, savedAt: Date.now() };
        localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
        // storage unavailable; the map just starts from its default view next time
    }
}
