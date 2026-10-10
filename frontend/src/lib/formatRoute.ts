export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatStepDuration(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    return minutes < 1 ? "< 1 min" : formatDuration(minutes);
}

export function formatDistance(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// null is unknown, never shown as zero or free
export function formatCost(cost: number | null): string {
    return cost === null ? "—" : `$${cost.toFixed(2)}`;
}

export function formatCo2(kg: number | null): string {
    if (kg === null) return "—";
    return kg === 0 ? "0 kg" : `${kg < 10 ? kg.toFixed(2) : kg.toFixed(1)} kg`;
}
