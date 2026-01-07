import { useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import AnimalCard from "../../components/animals/AnimalCard";
import Pagination from "../../components/shared/Pagination";
import { fetchAnimals, fetchAnimalsCount } from "../../lib/animalQueries";
import { isOffline } from "../../lib/errorUtils";
import { supabase } from "../../lib/supabase";
import { DEFAULT_PAGE_SIZE } from "../../lib/filterUtils";

export default function AnimalsList() {
	const { user, profile } = useProtectedAuth();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	// Get pagination from URL
	const page = parseInt(searchParams.get("page") || "1", 10);
	const pageSize = parseInt(
		searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE),
		10
	);
	const offset = (page - 1) * pageSize;

	// Fetch animals with pagination
	const {
		data = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["animals", user.id, profile.organization_id, page, pageSize],
		queryFn: async () => {
			const animals = await fetchAnimals(profile.organization_id, {
				fields: [
					"id",
					"name",
					"status",
					"sex_spay_neuter_status",
					"priority",
					"photos",
					"date_of_birth",
					"group_id",
				],
				orderBy: "created_at",
				orderDirection: "desc",
				checkOffline: true,
				limit: pageSize,
				offset,
			});

			// Fetch group names for animals that are in groups
			// Get unique group IDs first to minimize queries
			const groupIds = [
				...new Set(
					animals
						.map((a) => a.group_id)
						.filter((id): id is string => !!id)
				),
			];

			// Fetch all groups at once
			const groupsMap = new Map<string, string>();
			if (groupIds.length > 0) {
				try {
					const { data: groups, error: groupsError } = await supabase
						.from("animal_groups")
						.select("id, name")
						.in("id", groupIds);

					if (groupsError) {
						console.error("Error fetching groups:", groupsError);
					} else {
						if (groups) {
							groups.forEach((group) => {
								if (group.id && group.name) {
									groupsMap.set(group.id, group.name);
								}
							});
						}
					}
				} catch (error) {
					console.error("Error fetching groups:", error);
				}
			}

			// Map animals with their group names
			const animalsWithGroups = animals.map((animal) => {
				if (animal.group_id) {
					const groupName = groupsMap.get(animal.group_id);
					return {
						...animal,
						group_name: groupName,
					};
				}
				return animal;
			});

			return animalsWithGroups;
		},
	});

	// Fetch total count for pagination
	const { data: totalCount = 0 } = useQuery({
		queryKey: ["animals-count", profile.organization_id],
		queryFn: () => fetchAnimalsCount(profile.organization_id),
	});

	const animals = useMemo(() => data, [data]);
	const totalPages = Math.ceil(totalCount / pageSize);

	// Handle page change
	const handlePageChange = (newPage: number) => {
		const params = new URLSearchParams(searchParams);
		if (newPage === 1) {
			params.delete("page");
		} else {
			params.set("page", String(newPage));
		}
		navigate(`/animals?${params.toString()}`, { replace: true });
	};

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
						<div className="flex items-center gap-3">
							{profile.role === "coordinator" && (
								<Link to="/animals/new">
									<Button>Add Animal</Button>
								</Link>
							)}
							<button
								type="button"
								onClick={() => refetch()}
								className="text-sm text-pink-600 hover:text-pink-700 font-medium"
								disabled={isLoading}
							>
								Refresh
							</button>
						</div>
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
					<>
						<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{animals.map((animal) => (
								<AnimalCard key={animal.id} animal={animal} />
							))}
						</div>
						{totalPages > 1 && (
							<Pagination
								currentPage={page}
								totalPages={totalPages}
								onPageChange={handlePageChange}
								totalItems={totalCount}
								itemsPerPage={pageSize}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}
