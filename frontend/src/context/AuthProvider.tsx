import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        void supabase.auth.getSession().then(({ data }) => {
            if (!active) return;
            setSession(data.session);
            setLoading(false);
        });

        const { data } = supabase.auth.onAuthStateChange((_event, next) => {
            setSession(next);
            setLoading(false);
        });

        return () => {
            active = false;
            data.subscription.unsubscribe();
        };
    }, []);

    const value = useMemo(() => ({ user: session?.user ?? null, session, loading }), [session, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
