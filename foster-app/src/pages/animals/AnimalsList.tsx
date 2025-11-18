import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Animal } from "../../types";

type AnimalsListItem = Pick<Animal, "id" | "name" | "status" | "sex" | "tags">;

async function fetchAnimals() {
	const { data, error } = await supabase
		.from("animals")
		.select("id, name, status, sex, tags")
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
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							Animals
						</h1>
						<p className="text-gray-600">
							Browse all animals currently tracked in the system.
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

				{isLoading && (
					<div className="bg-white rounded-lg shadow-sm p-6 text-gray-600">
						Loading animals...
					</div>
				)}

				{isError && (
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200 text-red-700">
						<p className="font-medium">
							Unable to load animals right now.
						</p>
						<p className="text-sm mt-2">
							{error instanceof Error
								? error.message
								: "Unknown error"}
						</p>
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
						{animals.map((animal) => (
							<div
								key={animal.id}
								className="bg-white rounded-lg shadow-sm p-5 border border-pink-100 hover:shadow-md transition-shadow cursor-pointer"
							>
								<h2 className="text-lg font-semibold text-gray-900 mb-3">
									{animal.name?.trim() || "Unnamed Animal"}
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
									{animal.tags?.includes("high_priority") && (
										<p>
											<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
												High Priority
											</span>
										</p>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
