import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Animal } from "../../types";
import Button from "../../components/ui/Button";

type AnimalsListItem = Pick<
	Animal,
	"id" | "name" | "status" | "sex" | "priority"
>;

// Helper function to create a URL-friendly slug from a name
function createSlug(name: string | undefined | null): string {
	if (!name || !name.trim()) {
		return "unnamed-animal";
	}
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
		.replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

async function fetchAnimals() {
	const { data, error } = await supabase
		.from("animals")
		.select("id, name, status, sex, priority")
		.order("created_at", { ascending: false });

	if (error) {
		throw error;
	}

	return data as AnimalsListItem[];
}

export default function AnimalsList() {
	const {
		data = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["animals"],
		queryFn: fetchAnimals,
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
						<Link to="/animals/new" className="block">
							<Button>Create New Animal</Button>
						</Link>
					</div>
				</div>

				{isLoading && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						<div className="flex items-center justify-center space-x-2 text-gray-600">
							<svg
								className="animate-spin h-5 w-5 text-pink-600"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span>Loading animals...</span>
						</div>
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
					<div className="bg-white rounded-lg shadow-sm p-6 text-gray-600">
						No animals found yet. Once you add animals, they will
						appear here.
					</div>
				)}

				{animals.length > 0 && (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{animals.map((animal) => {
							const slug = createSlug(animal.name);
							return (
								<Link
									key={animal.id}
									to={`/animals/${animal.id}/${slug}`}
									className="bg-white rounded-lg shadow-sm p-5 border border-pink-100 hover:shadow-md transition-shadow cursor-pointer block"
								>
									<h2 className="text-lg font-semibold text-gray-900 mb-3">
										{animal.name?.trim() ||
											"Unnamed Animal"}
									</h2>

									<div className="space-y-2 text-sm">
										{animal.status && (
											<p>
												<span className="text-gray-500">
													Status:
												</span>{" "}
												<span className="font-medium capitalize">
													{animal.status.replace(
														"_",
														" "
													)}
												</span>
											</p>
										)}
										{animal.sex && (
											<p>
												<span className="text-gray-500">
													Sex:
												</span>{" "}
												<span className="font-medium capitalize">
													{animal.sex}
												</span>
											</p>
										)}
										{animal.priority && (
											<p>
												<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
													High Priority
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
