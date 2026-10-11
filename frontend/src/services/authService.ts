import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type SignUpResult = {
    // false when the project requires email confirmation before the first sign-in
    signedIn: boolean;
};

export async function signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.session;
}

export async function signUp(email: string, password: string, username: string, fullName: string): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username: username.trim(), full_name: fullName.trim() },
        },
    });
    if (error) throw new Error(error.message);
    return { signedIn: data.session !== null };
}

export async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
}

export async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}
