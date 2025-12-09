import { createContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "../hooks/useUserProfile";

/**
 * Context value providing guaranteed non-null user and profile
 * Only available inside ProtectedRoute components
 */
export interface ProtectedAuthContextValue {
	user: User;
	profile: UserProfile;
	isFoster: boolean;
	isCoordinator: boolean;
}

export const ProtectedAuthContext =
	createContext<ProtectedAuthContextValue | null>(null);
