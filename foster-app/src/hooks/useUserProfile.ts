import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { AuthState } from "./useAuth";

export interface UserProfile {
	role: "coordinator" | "foster";
	organization_id: string;
	organization_name?: string;
}

/**
 * Discriminated union type for user profile state
 * Only loads when user is authenticated
 */
export type ProfileState =
	| { status: "loading" }
	| { status: "loaded"; profile: UserProfile }
	| { status: "error" };

/**
 * Hook to fetch the current user's profile (including role)
 * Uses React Query for caching and automatic refetching
 *
 * @param authState - The authentication state from useAuth()
 */
export function useUserProfile(authState: AuthState): ProfileState {
	const {
		data: profile,
		isLoading,
		isError,
	} = useQuery<UserProfile | null>({
		queryKey: [
			"profile",
			authState.status === "authenticated" ? authState.user.id : null,
		],
		queryFn: async () => {
			// TypeScript knows user exists here because of enabled check
			if (authState.status !== "authenticated") return null;

			try {
				// Fetch profile with organization name via join
				const { data, error } = await supabase
					.from("profiles")
					.select("role, organization_id, organizations(name)")
					.eq("id", authState.user.id)
					.single();

				if (error) {
					console.error("Error fetching profile:", error);
					return null;
				}

				// Extract organization name from the joined data
				// Supabase returns joined data as nested object: { organizations: { name: "..." } }
				const organizationName =
					data.organizations &&
					typeof data.organizations === "object" &&
					!Array.isArray(data.organizations) &&
					"name" in data.organizations
						? (data.organizations as { name: string }).name
						: undefined;

				return {
					role: data.role,
					organization_id: data.organization_id,
					organization_name: organizationName,
				} as UserProfile;
			} catch (err) {
				console.error("Error fetching profile:", err);
				return null;
			}
		},
		enabled: authState.status === "authenticated",
	});

	if (isLoading) {
		return { status: "loading" };
	}

	if (isError || !profile) {
		return { status: "error" };
	}

	return {
		status: "loaded",
		profile,
	};
}
