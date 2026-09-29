import { createClient } from "@supabase/supabase-js";

// Klien anonim tanpa cookie: untuk data publik agar halaman dapat di-cache (ISR).
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
