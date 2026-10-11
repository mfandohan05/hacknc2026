import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthState = {
    user: User | null;
    session: Session | null;
    // true until the session is read and an authenticated user's profile is ready
    loading: boolean;
};

export const AuthContext = createContext<AuthState>({ user: null, session: null, loading: true });
