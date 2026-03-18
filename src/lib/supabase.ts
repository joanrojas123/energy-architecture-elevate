import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Define "VITE_SUPABASE_URL" y "VITE_SUPABASE_ANON_KEY" (o "VITE_SUPABASE_PUBLISHABLE_KEY").'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
