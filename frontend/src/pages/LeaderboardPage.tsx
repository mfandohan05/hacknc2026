import { useEffect, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import AeroWindow from "@/components/layout/AeroWindow";
import { apiJson } from "@/services/api";

type LeaderboardEntry = {
    id: string;
    username: string;
    points: number;
    rank: number;
};

type LeaderboardApiEntry = {
    profileId: string;
    displayName: string;
    totalPoints: number;
    rank: number;
};

function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // bumped by Refresh to fetch again
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        apiJson<unknown>("/api/v1/leaderboards", { signal })
            .then((data) => {
                if (signal.aborted) return;
                const entries = Array.isArray(data) ? data : (data as { leaderboard?: unknown }).leaderboard;
                if (!Array.isArray(entries)) throw new Error("The leaderboard response was not a list.");

                // Map the API field names to the fields used by the UI. The API already
                // returns this list sorted, so keep its order unchanged.
                setLeaderboard(
                    (entries as LeaderboardApiEntry[]).map(({ profileId, displayName, totalPoints, rank }) => ({
                        id: profileId,
                        username: displayName,
                        points: totalPoints,
                        rank,
                    })),
                );
            })
            .catch((requestError: unknown) => {
                if (signal.aborted) return;
                if (requestError instanceof DOMException && requestError.name === "AbortError") return;
                setError(requestError instanceof Error ? requestError.message : "Unable to load leaderboard.");
            })
            .finally(() => {
                if (!signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [reloadKey]);

    const reload = () => {
        setLoading(true);
        setError(null);
        setReloadKey((key) => key + 1);
    };

    const columnHeader =
        "border-r border-[#d5dfe8] bg-gradient-to-b from-white via-[#f2f6fa] to-[#e1e9f0] px-3 py-1.5 text-xs font-normal text-[#1e395b] last:border-r-0";

    return (
        <main className="aero-bg relative flex h-full flex-col px-4 pt-16 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1.5rem)] md:px-6 md:pb-6">
            <span aria-hidden className="aero-bubble -right-10 top-24 size-36" />
            <span aria-hidden className="aero-bubble left-4 top-1/2 size-16" />

            <AeroWindow
                title="Global Leaderboard"
                Icon={Trophy}
                as="h1"
                className="mx-auto min-h-0 w-full max-w-2xl flex-1"
                bodyClassName="flex min-h-0 flex-1 flex-col p-0"
            >
                {/* command bar */}
                <div className="flex items-center gap-1 border-b border-[#17334A]/15 bg-gradient-to-b from-[#f9fbfd] to-[#e4ecf4] px-2 py-1 text-sm text-[#17334A]">
                    <button
                        type="button"
                        onClick={reload}
                        disabled={loading}
                        className="flex h-8 items-center gap-1.5 rounded-[3px] border border-transparent px-2.5 font-medium transition hover:border-[#8fbbd6] hover:bg-gradient-to-b hover:from-white hover:to-[#d6ebf8] disabled:opacity-50"
                    >
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                        Refresh
                    </button>
                </div>

                {/* details view */}
                <div className="flex min-h-0 flex-1 flex-col bg-white text-[#0f2f45]" role="table" aria-label="Global leaderboard">
                    <div role="row" className="grid grid-cols-1 border-b border-[#d5dfe8]">
                        <span role="columnheader" className={columnHeader}>
                            User
                        </span>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {loading ? (
                            <div aria-label="Loading leaderboard" role="status">
                                {Array.from({ length: 8 }, (_, index) => (
                                    <div key={index} className="grid grid-cols-1 items-center border-b border-[#eef3f7] py-2.5">
                                        <span className="mx-3 h-4 animate-pulse rounded-sm bg-[#e3ecf3]" />
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm">
                                <p>{error}</p>
                                <button
                                    type="button"
                                    onClick={reload}
                                    className="aero-orb inline-flex items-center gap-2 rounded-[3px] px-4 py-2 font-medium"
                                >
                                    <RefreshCw className="size-4" />
                                    Try again
                                </button>
                            </div>
                        ) : leaderboard.length > 0 ? (
                            leaderboard.map((entry) => {
                                return (
                                    <div
                                        key={entry.id}
                                        role="row"
                                        className="grid grid-cols-1 items-center border-b border-[#eef3f7] py-2 transition-colors hover:bg-gradient-to-b hover:from-[#f4fbff] hover:to-[#dbeffa]"
                                    >
                                        <span role="cell" className="truncate px-3 font-medium">
                                            {entry.username}
                                        </span>
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

                {/* status bar */}
                <div className="border-t border-[#17334A]/20 bg-gradient-to-b from-[#f5f8fb] to-[#dfe8f1] px-3 py-1.5 text-xs text-[#17334A]">
                    {loading ? "Loading…" : `${leaderboard.length} item${leaderboard.length === 1 ? "" : "s"}`}
                </div>
            </AeroWindow>
        </main>
    );
}

export default LeaderboardPage;
