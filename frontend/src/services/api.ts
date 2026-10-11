import { getAccessToken } from "@/services/authService";

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export const API_ORIGIN = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await getAccessToken();
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(`${API_ORIGIN}${path}`, { ...init, headers });
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await apiFetch(path, init);
    if (!res.ok) {
        let detail = "";
        try {
            const body = (await res.json()) as { message?: string; error?: string };
            detail = body.message ?? body.error ?? "";
        } catch {
        }
        throw new ApiError(res.status, detail || `Request failed (${res.status})`);
    }
    return (await res.json()) as T;
}
