import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Check for existing session on mount (handles page refresh)
		supabase.auth
			.getSession()
			.then(({ data: { session } }) => {
				setUser(session?.user ?? null);
				setLoading(false);
			})
			.catch((error) => {
				console.error("Error getting session:", error);
				// On error, assume no user is logged in
				setUser(null);
				setLoading(false);
			});

		// Listen for auth state changes (login, logout, token refresh)
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
			setLoading(false);
		});

		// Cleanup: unsubscribe when component unmounts
		return () => subscription.unsubscribe();
	}, []);

	return { user, loading };
}
