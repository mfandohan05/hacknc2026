import { formatNavDistance } from "./formatNav";

export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatDistance(km: number): string {
    return formatNavDistance(km * 1000);
}

export function formatCost(cost: number | null): string {
    return cost === null ? "—" : `$${cost.toFixed(2)}`;
}

export function formatCo2(kg: number | null): string {
    if (kg === null) return "—";
    return kg === 0 ? "0 kg" : `${kg < 10 ? kg.toFixed(2) : kg.toFixed(1)} kg`;
}
