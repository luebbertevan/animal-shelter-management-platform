import { useContext } from "react";
import {
	ProtectedAuthContext,
	type ProtectedAuthContextValue,
} from "../contexts/ProtectedAuthContext";

/**
 * Hook to access authenticated user and profile within ProtectedRoute
 * Returns guaranteed non-null types - TypeScript knows these exist
 *
 * @throws Error if used outside ProtectedRoute
 */
export function useProtectedAuth(): ProtectedAuthContextValue {
	const context = useContext(ProtectedAuthContext);
	if (!context) {
		throw new Error(
			"useProtectedAuth must be used within a ProtectedRoute component"
		);
	}
	return context;
}
