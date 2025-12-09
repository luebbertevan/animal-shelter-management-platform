import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Discriminated union type for authentication state
 * Makes it impossible to have invalid states (e.g., loading: false but user: null)
 */
export type AuthState =
	| { status: "loading" }
	| { status: "authenticated"; user: User }
	| { status: "unauthenticated" };

/**
 * Hook to get the current authentication state
 * Returns a discriminated union that encodes loading, authenticated, and unauthenticated states
 */
export function useAuth(): AuthState {
	const [state, setState] = useState<AuthState>({ status: "loading" });

	useEffect(() => {
		// Check for existing session on mount (handles page refresh)
		supabase.auth
			.getSession()
			.then(({ data: { session } }) => {
				if (session?.user) {
					setState({ status: "authenticated", user: session.user });
				} else {
					setState({ status: "unauthenticated" });
				}
			})
			.catch((error) => {
				console.error("Error getting session:", error);
				// On error, assume no user is logged in
				setState({ status: "unauthenticated" });
			});

		// Listen for auth state changes (login, logout, token refresh)
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (session?.user) {
				setState({ status: "authenticated", user: session.user });
			} else {
				setState({ status: "unauthenticated" });
			}
		});

		// Cleanup: unsubscribe when component unmounts
		return () => subscription.unsubscribe();
	}, []);

	return state;
}
