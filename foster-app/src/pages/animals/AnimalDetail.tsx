import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { Animal, SexSpayNeuterStatus } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import NavLinkButton from "../../components/ui/NavLinkButton";
import Button from "../../components/ui/Button";
import { fetchAnimalById } from "../../lib/animalQueries";
import { isOffline } from "../../lib/errorUtils";

// Helper function to format sex/spay-neuter status for display
function formatSexSpayNeuterStatus(status: SexSpayNeuterStatus): string {
	switch (status) {
		case "male":
			return "Male";
		case "female":
			return "Female";
		case "spayed_female":
			return "Spayed Female";
		case "neutered_male":
			return "Neutered Male";
		default:
			return status;
	}
}

export default function AnimalDetail() {
	const { id } = useParams<{ id: string }>();
	const { user, profile, isCoordinator } = useProtectedAuth();

	const {
		data: animal,
		isLoading,
		isError,
		error,
	} = useQuery<Animal, Error>({
		queryKey: ["animals", user.id, profile.organization_id, id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Animal ID is required");
			}
			return fetchAnimalById(id, profile.organization_id);
		},
		enabled: !!id,
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
					<div className="mb-6">
						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							{animal.name?.trim() || "Unnamed Animal"}
						</h1>
						{isCoordinator && (
							<Button
								variant="outline"
								className="w-auto text-sm py-1.5 px-3"
								onClick={() => {
									// Placeholder - will be functional in a later milestone
									alert("Edit functionality coming soon!");
								}}
							>
								Edit
							</Button>
						)}
					</div>

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

						{animal.sex_spay_neuter_status && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Sex
								</label>
								<p className="text-lg font-medium">
									{formatSexSpayNeuterStatus(
										animal.sex_spay_neuter_status
									)}
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
