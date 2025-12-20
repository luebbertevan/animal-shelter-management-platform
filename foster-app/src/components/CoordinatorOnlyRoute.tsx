import { Navigate } from "react-router-dom";
import { useProtectedAuth } from "../hooks/useProtectedAuth";

/**
 * Route component that only allows coordinators to access.
 * Fosters are redirected to /fosters-needed
 */
export default function CoordinatorOnlyRoute({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isCoordinator } = useProtectedAuth();

	if (!isCoordinator) {
		return <Navigate to="/fosters-needed" replace />;
	}

	return <>{children}</>;
}
