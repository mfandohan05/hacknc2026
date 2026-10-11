import { useCallback, useEffect, useState } from "react";
import { Crown, Medal, RefreshCw, Trophy } from "lucide-react";
import AeroWindow from "@/components/layout/AeroWindow";
import { apiFetch } from "@/services/api";

type LeaderboardEntry = {
    id: string;
    username: string;
    points: number;
    rank: number;
};

// The API has returned both a flat entry and one nested under `profile`; accept either.
type LeaderboardApiEntry = {
    profileId?: string;
    displayName?: string;
    totalPoints?: number;
    rank?: number;
    profile?: { id?: string; displayName?: string | null; username?: string | null };
};

const LEADERBOARD_URL = "/api/v1/leaderboards";

const rankStyles = [
    "bg-amber-100 text-amber-700",
    "bg-slate-200 text-slate-700",
    "bg-orange-100 text-orange-700",
];

function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadLeaderboard = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiFetch(LEADERBOARD_URL, { signal });

            if (!response.ok) {
                throw new Error(`Leaderboard request failed (${response.status})`);
            }

            const data: unknown = await response.json();
            const entries = Array.isArray(data)
                ? data
                : (data as { leaderboard?: unknown }).leaderboard;

            if (!Array.isArray(entries)) {
                throw new Error("The leaderboard response was not a list.");
            }

            // Map the API field names to the fields used by the UI. The API already
            // returns this list sorted, so keep its order unchanged.
            setLeaderboard(
                (entries as LeaderboardApiEntry[]).map((entry, index) => ({
                    id: entry.profileId ?? entry.profile?.id ?? String(index),
                    username:
                        entry.displayName ?? entry.profile?.displayName ?? entry.profile?.username ?? "Explorer",
                    points: entry.totalPoints ?? 0,
                    rank: entry.rank ?? index + 1,
                })),
            );
        } catch (requestError) {
            if (requestError instanceof DOMException && requestError.name === "AbortError") return;
            setError(requestError instanceof Error ? requestError.message : "Unable to load leaderboard.");
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void loadLeaderboard(controller.signal);

        return () => controller.abort();
    }, [loadLeaderboard]);

    return (
        <main className="aero-bg relative flex h-full flex-col px-4 pt-16 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1.5rem)] md:px-6 md:pb-6">
            <span aria-hidden className="aero-bubble -right-10 top-24 size-36" />
            <span aria-hidden className="aero-bubble left-4 top-1/2 size-16" />

            <AeroWindow
                title="Global Leaderboard"
                Icon={Trophy}
                as="h1"
                className="mx-auto min-h-0 w-full max-w-lg flex-1"
                bodyClassName="flex min-h-0 flex-1 flex-col p-4 sm:p-5"
            >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/35">
                    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#17334A]/60">
                        <span>Rank</span>
                        <span>User</span>
                        <span>Points</span>
                    </div>

                    <div
                        className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-color:auto] [scrollbar-width:auto] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-track]:my-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:border [&::-webkit-scrollbar-track]:border-white/60 [&::-webkit-scrollbar-track]:bg-white/25 [&::-webkit-scrollbar-track]:shadow-[inset_0_1px_3px_rgba(23,51,74,0.12)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-white/60 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-white/90 [&::-webkit-scrollbar-thumb]:via-[#7fcdf5]/75 [&::-webkit-scrollbar-thumb]:to-[#208A5D]/75 [&::-webkit-scrollbar-thumb]:shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),inset_-1px_-1px_0_rgba(23,51,74,0.25),0_0_6px_rgba(47,182,232,0.35)] hover:[&::-webkit-scrollbar-thumb]:from-white hover:[&::-webkit-scrollbar-thumb]:via-[#9edfff] hover:[&::-webkit-scrollbar-thumb]:to-[#34b57f]"
                    >
                        {loading ? (
                            <div className="space-y-2 p-2" aria-label="Loading leaderboard" role="status">
                                {Array.from({ length: 6 }, (_, index) => (
                                    <div key={index} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-3">
                                        <span className="size-8 animate-pulse rounded-full bg-white/60" />
                                        <span className="h-4 animate-pulse rounded-full bg-white/60" />
                                        <span className="h-4 w-12 animate-pulse rounded-full bg-white/60" />
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-[#17334A]/70">
                                <p>{error}</p>
                                <button
                                    type="button"
                                    onClick={() => void loadLeaderboard()}
                                    className="aero-orb inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium text-[#17334A]"
                                >
                                    <RefreshCw className="size-4" />
                                    Try again
                                </button>
                            </div>
                        ) : leaderboard.length > 0 ? (
                            leaderboard.map((entry, index) => {
                                const rank = entry.rank ?? index + 1;

                                return (
                                    <div
                                        key={entry.id}
                                        className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-3 text-[#17334A] transition-colors hover:bg-white/50"
                                    >
                                        <span
                                        className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${rankStyles[rank - 1] ?? "bg-white/70 text-[#17334A]/70"}`}
                                        >
                                            {rank <= 3 ? (
                                                rank === 1 ? <Crown className="size-4" /> : <Medal className="size-4" />
                                            ) : (
                                                rank
                                            )}
                                        </span>
                                        <span className="truncate font-medium">{entry.username}</span>
                                        <span className="font-semibold tabular-nums">{entry.points.toLocaleString()}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="px-4 py-10 text-center text-sm text-[#17334A]/65">
                                The leaderboard is empty right now.
                            </p>
                        )}
                    </div>
                </div>
            </AeroWindow>
        </main>
    );
}

export default LeaderboardPage;
