import { supabase } from "@/lib/supabase";

export type Session = {
    userId: string;
    email: string;
};

export async function signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Sign in failed.");
    return { userId: data.user.id, email: data.user.email ?? email };
}
