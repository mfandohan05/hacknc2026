import { apiJson } from "@/services/api";

export type Cosmetic = { id: string; name: string; description: string; requiredLevel: number; unlocked: boolean };
export type Rewards = {
    totalPoints: number; lifetimePoints: number; level: number; pointsIntoLevel: number;
    pointsPerLevel: number; completedTrips: number;
    achievements: { id: string; name: string; description: string; progress: number; target: number; unlocked: boolean }[];
    cosmetics: Cosmetic[];
};
export type Ledger = {
    content: { id: string; tripId: string | null; points: number; reason: string; createdAt: string }[];
    page: number; hasNext: boolean; totalElements: number;
};
export const getRewards = (signal?: AbortSignal) => apiJson<Rewards>("/api/v1/rewards", { signal });
export const getLedger = (page: number, signal?: AbortSignal) => apiJson<Ledger>(`/api/v1/rewards/ledger?page=${page}`, { signal });
export function readCosmetic(userId: string): string {
    try { return localStorage.getItem(`aeropath:cosmetic:${userId}`) ?? "sprout"; }
    catch { return "sprout"; }
}
export function saveCosmetic(userId: string, id: string): boolean {
    try { localStorage.setItem(`aeropath:cosmetic:${userId}`, id); return true; }
    catch { return false; }
}
