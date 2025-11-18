import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Animal } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import NavLinkButton from "../../components/ui/NavLinkButton";
import { getErrorMessage } from "../../lib/errorUtils";

export default function AnimalDetail() {
	const { id } = useParams<{ id: string }>();

	const {
		data: animal,
		isLoading,
		isError,
		error,
	} = useQuery<Animal, Error>({
		queryKey: ["animals", id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Animal ID is required");
			}

			const { data, error: fetchError } = await supabase
				.from("animals")
				.select("*")
				.eq("id", id)
				.single();

			if (fetchError) {
				// Use errorUtils to get user-friendly message
				throw new Error(
					getErrorMessage(
						fetchError,
						"Failed to load animal details. Please try again."
					)
				);
			}

			if (!data) {
				throw new Error("Animal not found");
			}

			return data as Animal;
		},
		enabled: !!id, // Only run query if id exists
	});

	if (isLoading) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading animal details..." />
					</div>
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-2">
								Unable to load animal details.
							</p>
							<p className="text-sm mb-4">
								{error instanceof Error
									? error.message
									: "Unknown error"}
							</p>
							<NavLinkButton
								to="/animals"
								label="Back to Animals"
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!animal) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						<p className="text-gray-600 mb-4">Animal not found.</p>
						<NavLinkButton to="/animals" label="Back to Animals" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="mb-6">
					<NavLinkButton to="/animals" label="Back to Animals" />
				</div>

				<div className="bg-white rounded-lg shadow-sm p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-6">
						{animal.name?.trim() || "Unnamed Animal"}
					</h1>

					<div className="space-y-4">
						{animal.status && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Status
								</label>
								<p className="text-lg font-medium capitalize">
									{animal.status.replace("_", " ")}
								</p>
							</div>
						)}

						{animal.sex && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Sex
								</label>
								<p className="text-lg font-medium capitalize">
									{animal.sex}
								</p>
							</div>
						)}

						{animal.priority && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Priority
								</label>
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
									High Priority
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
