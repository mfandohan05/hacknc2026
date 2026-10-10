const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;

export function formatNavDistance(meters: number): string {
    const feet = meters / METERS_PER_FOOT;
    if (feet < 528) {
        const rounded = feet < 100 ? Math.round(feet / 10) * 10 : Math.round(feet / 50) * 50;
        return `${Math.max(0, rounded)} ft`;
    }
    const miles = meters / METERS_PER_MILE;
    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

export function formatNavDuration(seconds: number): string {
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatEta(secondsFromNow: number): string {
    return new Date(Date.now() + secondsFromNow * 1000).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
}
