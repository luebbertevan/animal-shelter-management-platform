import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		"Missing Supabase environment variables. Please check your .env.local file."
	);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// // Temporarily expose for testing RLS policies (remove after testing)
// if (typeof window !== "undefined") {
// 	// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 	(window as any).supabase = supabase;
// }
