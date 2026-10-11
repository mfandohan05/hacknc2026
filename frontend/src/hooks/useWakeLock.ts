import { useEffect } from "react";

// Keeps the screen on while `active`; re-acquires after the tab becomes visible again.
export function useWakeLock(active: boolean) {
    useEffect(() => {
        if (!active || !("wakeLock" in navigator)) return;

        let sentinel: WakeLockSentinel | null = null;
        let cancelled = false;

        const request = async () => {
            try {
                const s = await navigator.wakeLock.request("screen");
                if (cancelled) {
                    void s.release();
                    return;
                }
                sentinel = s;
            } catch {
                // denied or unsupported in this context; navigation still works
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) void request();
        };

        void request();
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", onVisibility);
            void sentinel?.release().catch(() => undefined);
            sentinel = null;
        };
    }, [active]);
}
