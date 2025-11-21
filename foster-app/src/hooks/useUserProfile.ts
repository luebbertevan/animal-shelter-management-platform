import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

interface UserProfile {
	role: "coordinator" | "foster";
	organization_id: string;
	organization_name?: string;
}

/**
 * Hook to fetch the current user's profile (including role)
 * Uses React Query for caching and automatic refetching
 */
export function useUserProfile() {
	const { user } = useAuth();

	const { data: profile, isLoading } = useQuery<UserProfile | null>({
		queryKey: ["profile", user?.id],
		queryFn: async () => {
			if (!user?.id) return null;

			try {
				// Fetch profile with organization name via join
				const { data, error } = await supabase
					.from("profiles")
					.select("role, organization_id, organizations(name)")
					.eq("id", user.id)
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
		enabled: !!user?.id,
	});

	const isCoordinator = profile?.role === "coordinator";
	const isFoster = profile?.role === "foster";

	return {
		profile,
		isLoading,
		isCoordinator,
		isFoster,
	};
}
