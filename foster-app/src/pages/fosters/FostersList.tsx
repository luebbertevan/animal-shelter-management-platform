import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { fetchFosters } from "../../lib/fosterQueries";
import { isOffline } from "../../lib/errorUtils";

export default function FostersList() {
	const { user } = useAuth();
	const { profile, isCoordinator } = useUserProfile();

	const {
		data: fosters = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["fosters", user?.id, profile?.organization_id],
		queryFn: () => {
			if (!profile?.organization_id) {
				throw new Error("Organization ID not available");
			}
			return fetchFosters(profile.organization_id, {
				fields: [
					"id",
					"email",
					"full_name",
					"phone_number",
					"availability",
				],
				orderBy: "full_name",
				orderDirection: "asc",
				checkOffline: true,
			});
		},
		enabled: !!user && !!profile?.organization_id && isCoordinator,
	});

	// Redirect non-coordinators (handled by route protection, but double-check)
	if (!isCoordinator) {
		return null;
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Fosters
							</h1>
							<p className="text-gray-600">
								Browse all fosters in your organization.
							</p>
						</div>
						<button
							type="button"
							onClick={() => refetch()}
							className="text-sm text-pink-600 hover:text-pink-700 font-medium"
							disabled={isLoading}
						>
							Refresh
						</button>
					</div>
					<div className="space-y-4">
						<Link to="/dashboard" className="block">
							<Button variant="outline">Back to Dashboard</Button>
						</Link>
					</div>
				</div>

				{isLoading && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading fosters..." />
					</div>
				)}

				{isError && (
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-2">
								Unable to load fosters right now.
							</p>
							<p className="text-sm mb-4">
								{error instanceof Error
									? error.message
									: "Unknown error"}
							</p>
							<button
								type="button"
								onClick={() => refetch()}
								className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
							>
								Try Again
							</button>
						</div>
					</div>
				)}

				{!isLoading && !isError && fosters.length === 0 && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-2">
									Unable to load fosters right now.
								</p>
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
								<button
									type="button"
									onClick={() => refetch()}
									className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
								>
									Try Again
								</button>
							</div>
						) : (
							<div className="text-gray-600">
								No fosters found yet. Once fosters sign up, they
								will appear here.
							</div>
						)}
					</div>
				)}

				{fosters.length > 0 && (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{fosters.map((foster) => {
							return (
								<Link
									key={foster.id}
									to={`/fosters/${foster.id}`}
									className="bg-white rounded-lg shadow-sm p-5 border border-pink-100 hover:shadow-md transition-shadow cursor-pointer block"
								>
									<h2 className="text-lg font-semibold text-gray-900 mb-3">
										{foster.full_name?.trim() ||
											"Unnamed Foster"}
									</h2>

									<div className="space-y-2 text-sm">
										{foster.email && (
											<p>
												<span className="text-gray-500">
													Email:
												</span>{" "}
												<span className="font-medium">
													{foster.email}
												</span>
											</p>
										)}
										{foster.phone_number && (
											<p>
												<span className="text-gray-500">
													Phone:
												</span>{" "}
												<span className="font-medium">
													{foster.phone_number}
												</span>
											</p>
										)}
										{foster.availability != null && (
											<p>
												<span
													className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
														foster.availability
															? "bg-green-100 text-green-800"
															: "bg-gray-100 text-gray-800"
													}`}
												>
													{foster.availability
														? "Available"
														: "Not Available"}
												</span>
											</p>
										)}
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
