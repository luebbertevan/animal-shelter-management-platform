import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import AnimalCard from "../../components/animals/AnimalCard";
import { fetchAnimals } from "../../lib/animalQueries";
import { isOffline } from "../../lib/errorUtils";

export default function AnimalsList() {
	const { user, profile } = useProtectedAuth();

	const {
		data = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["animals", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAnimals(profile.organization_id, {
				fields: ["id", "name", "status", "sex", "priority"],
				orderBy: "created_at",
				orderDirection: "desc",
				checkOffline: true,
			});
		},
	});

	const animals = useMemo(() => data, [data]);

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Animals
							</h1>
							<p className="text-gray-600">
								Browse all animals currently tracked in the
								system.
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
						{profile.role === "coordinator" && (
							<Link to="/animals/new" className="block">
								<Button>Create New Animal</Button>
							</Link>
						)}
					</div>
				</div>

				{isLoading && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading animals..." />
					</div>
				)}

				{isError && (
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-2">
								Unable to load animals right now.
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

				{!isLoading && !isError && animals.length === 0 && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-2">
									Unable to load animals right now.
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
								No animals found yet. Once you add animals, they
								will appear here.
							</div>
						)}
					</div>
				)}

				{animals.length > 0 && (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{animals.map((animal) => (
							<AnimalCard key={animal.id} animal={animal} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
