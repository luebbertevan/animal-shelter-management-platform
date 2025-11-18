import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Animal } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import NavLinkButton from "../../components/ui/NavLinkButton";
import {
	getErrorMessage,
	checkOfflineAndThrow,
	handleSupabaseNotFound,
	isOffline,
} from "../../lib/errorUtils";

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

			try {
				// Check if we're offline before making the request
				checkOfflineAndThrow();

				const { data, error: fetchError } = await supabase
					.from("animals")
					.select("*")
					.eq("id", id)
					.single();

				if (fetchError) {
					// Check if it's a "not found" error or network error
					const notFoundError = handleSupabaseNotFound(
						fetchError,
						null,
						"Animal"
					);

					// If it's a network error (TypeError), use getErrorMessage for user-friendly message
					if (notFoundError instanceof TypeError) {
						throw new Error(
							getErrorMessage(
								notFoundError,
								"Failed to load animal details. Please try again."
							)
						);
					}

					// Otherwise, it's a real "not found" error
					throw notFoundError;
				}

				if (!data) {
					// Use helper to determine if it's "not found" or network error
					throw handleSupabaseNotFound(null, data, "Animal");
				}

				return data as Animal;
			} catch (err) {
				// Catch network errors that occur before Supabase returns (TypeError: Failed to fetch)
				// or any other unexpected errors
				throw new Error(
					getErrorMessage(
						err,
						"Failed to load animal details. Please try again."
					)
				);
			}
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
							<p className="font-medium mb-4">
								{error instanceof Error
									? error.message
									: "Unable to load animal details. Please try again."}
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
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-4">
									Unable to load animal details.
								</p>
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
								<NavLinkButton
									to="/animals"
									label="Back to Animals"
								/>
							</div>
						) : (
							<>
								<p className="text-gray-600 mb-4">
									Animal not found.
								</p>
								<NavLinkButton
									to="/animals"
									label="Back to Animals"
								/>
							</>
						)}
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
