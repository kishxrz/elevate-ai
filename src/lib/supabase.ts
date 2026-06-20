import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if ((typeof window === "undefined" && !supabaseUrl) || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
if (typeof window !== "undefined") {
  (window as any).supabase = supabase;
}

