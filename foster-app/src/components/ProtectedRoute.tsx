import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import { ProtectedAuthContext } from "../contexts/ProtectedAuthContext";
import LoadingSpinner from "./ui/LoadingSpinner";
import Button from "./ui/Button";

/**
 * ProtectedRoute ensures both authentication and profile are loaded
 * before rendering children. This eliminates the need for components
 * to handle loading/error states individually.
 */
export default function ProtectedRoute({
	children,
}: {
	children: React.ReactNode;
}) {
	const authState = useAuth();
	const profileState = useUserProfile(authState);

	// Handle loading state
	if (authState.status === "loading" || profileState.status === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	// Handle unauthenticated state
	if (authState.status === "unauthenticated") {
		return <Navigate to="/login" replace />;
	}

	// Handle profile error state
	if (profileState.status === "error") {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<p className="text-red-500 mb-4">
						Failed to load profile. Please refresh the page.
					</p>
					<Button onClick={() => window.location.reload()}>
						Refresh
					</Button>
				</div>
			</div>
		);
	}

	// At this point, TypeScript knows:
	// - authState.status === "authenticated" (user exists)
	// - profileState.status === "loaded" (profile exists)
	// Provide guaranteed non-null values via context
	const contextValue = {
		user: authState.user,
		profile: profileState.profile,
		isFoster: profileState.profile.role === "foster",
		isCoordinator: profileState.profile.role === "coordinator",
	};

	return (
		<ProtectedAuthContext.Provider value={contextValue}>
			{children}
		</ProtectedAuthContext.Provider>
	);
}
