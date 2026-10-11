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

export type SignUpProfile = {
    fullName: string;
    username: string;
};

// The name and username are stored as user metadata (full_name, username) so a database trigger
// can copy them into the profile row.
export async function signUp(email: string, password: string, profile: SignUpProfile): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: profile.fullName, username: profile.username } },
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
