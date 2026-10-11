import { createClient } from "@supabase/supabase-js";

// The anon key is public by design; Row Level Security and the backend's JWT check protect the data.
export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
);
