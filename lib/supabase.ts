import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Public client — safe to use in browser/client components */
export const supabase = createClient(url, anonKey);

/** Server-only admin client — bypasses Row Level Security */
export const supabaseAdmin = createClient(url, serviceKey);
