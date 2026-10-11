import { supabase } from "@/lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
            ...init.headers,
        },
    });

    if (!res.ok) throw new Error(`Request to ${path} failed (${res.status})`);
    return res.json() as Promise<T>;
}
