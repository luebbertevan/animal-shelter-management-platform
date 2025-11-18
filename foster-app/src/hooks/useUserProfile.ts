import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

interface UserProfile {
	role: "coordinator" | "foster";
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
				const { data, error } = await supabase
					.from("profiles")
					.select("role")
					.eq("id", user.id)
					.single();

				if (error) {
					console.error("Error fetching profile:", error);
					return null;
				}

				return data as UserProfile;
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
