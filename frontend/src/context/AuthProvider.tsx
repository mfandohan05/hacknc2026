import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "./AuthContext";
import WelcomeScreen from "@/components/auth/WelcomeScreen";
import { ensureProfile } from "@/services/profileService";
import { signOut } from "@/services/authService";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        let revision = 0;
        let readyUserId: string | null = null;

        const acceptSession = (next: Session | null) => {
            if (!active) return;
            const currentRevision = ++revision;
            setSession(next);
            setProfileError(null);
            if (!next) {
                readyUserId = null;
                setLoading(false);
                return;
            }
            if (readyUserId === next.user.id) {
                setLoading(false);
                return;
            }
            setLoading(true);
            void ensureProfile(next).then(() => {
                if (!active || revision !== currentRevision) return;
                readyUserId = next.user.id;
                setLoading(false);
            }).catch((error: unknown) => {
                if (!active || revision !== currentRevision) return;
                setProfileError(error instanceof Error ? error.message : "Couldn't set up your profile. Please retry.");
                setLoading(false);
            });
        };

        const { data } = supabase.auth.onAuthStateChange((_event, next) => {
            acceptSession(next);
        });

        const initialRevision = revision;
        void supabase.auth.getSession().then(({ data, error }) => {
            if (!active || revision !== initialRevision) return;
            if (error) throw error;
            acceptSession(data.session);
        }).catch((error: unknown) => {
            if (!active || revision !== initialRevision) return;
            setProfileError(error instanceof Error ? error.message : "Couldn't restore your session.");
            setLoading(false);
        });

        return () => {
            active = false;
            data.subscription.unsubscribe();
        };
    }, [retry]);

    const value = useMemo(() => ({ user: session?.user ?? null, session, loading }), [session, loading]);

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <WelcomeScreen
                    status={session ? "Setting up your profile…" : "Starting EcoQuest…"}
                />
            ) : profileError ? (
                <WelcomeScreen title="Something went wrong" status={profileError} busy={false}>
                    <div className="mt-2 flex flex-col items-center gap-3">
                        <button
                            className="aero-gel h-11 rounded-full px-6 font-semibold"
                            onClick={() => setRetry((value) => value + 1)}
                        >
                            Retry profile setup
                        </button>
                        <button
                            className="text-sm font-semibold text-white/90 underline"
                            onClick={() => {
                                void signOut().catch((error: unknown) => {
                                    setProfileError(error instanceof Error ? error.message : "Couldn't sign out.");
                                });
                            }}
                        >
                            Sign out
                        </button>
                    </div>
                </WelcomeScreen>
            ) : children}
        </AuthContext.Provider>
    );
}
