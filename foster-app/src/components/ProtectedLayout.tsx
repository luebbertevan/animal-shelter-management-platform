import NavigationBar from "./NavigationBar";

/**
 * Layout wrapper for protected routes that includes the navigation bar.
 * Adds top padding to account for the fixed navigation bar.
 */
export default function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<NavigationBar />
			<div className="pt-20">{children}</div>
		</>
	);
}

