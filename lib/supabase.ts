import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Public client — safe to use in browser/client components */
export const supabase = createClient(url, anonKey);

/** Server-only admin client — bypasses Row Level Security.
 *  Lazily initialized so importing this module from a client component
 *  does not crash due to the missing service-role key. */
let _admin: SupabaseClient | null = null;

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_admin) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY is not set — supabaseAdmin can only be used on the server."
        );
      }
      _admin = createClient(url, serviceKey);
    }
    return (_admin as unknown as Record<string | symbol, unknown>)[prop];
  },
});
