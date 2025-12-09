import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import type { Animal, AnimalGroup } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import NavLinkButton from "../../components/ui/NavLinkButton";
import { fetchFosterById } from "../../lib/fosterQueries";
import { fetchAnimalsByFosterId } from "../../lib/animalQueries";
import { fetchGroupsByFosterId } from "../../lib/groupQueries";
import { isOffline } from "../../lib/errorUtils";

export default function FosterDetail() {
	const { id } = useParams<{ id: string }>();
	const { user } = useAuth();
	const { profile, isCoordinator } = useUserProfile();

	const {
		data: foster,
		isLoading: isLoadingFoster,
		isError: isErrorFoster,
		error: fosterError,
	} = useQuery({
		queryKey: ["fosters", user?.id, profile?.organization_id, id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Foster ID is required");
			}

			if (!profile?.organization_id) {
				throw new Error("Organization ID not available");
			}

			return fetchFosterById(id, profile.organization_id);
		},
		enabled: !!id && !!user && !!profile?.organization_id && isCoordinator,
	});

	// Fetch assigned animals
	const { data: assignedAnimals = [], isLoading: isLoadingAnimals } =
		useQuery<Animal[], Error>({
			queryKey: [
				"foster-animals",
				user?.id,
				profile?.organization_id,
				foster?.id,
			],
			queryFn: async () => {
				if (!foster?.id || !profile?.organization_id) {
					return [];
				}

				return fetchAnimalsByFosterId(
					foster.id,
					profile.organization_id,
					{
						fields: ["id", "name", "priority"],
					}
				);
			},
			enabled: !!foster && !!user && !!profile?.organization_id,
		});

	// Fetch assigned groups
	const { data: assignedGroups = [], isLoading: isLoadingGroups } = useQuery<
		AnimalGroup[],
		Error
	>({
		queryKey: [
			"foster-groups",
			user?.id,
			profile?.organization_id,
			foster?.id,
		],
		queryFn: async () => {
			if (!foster?.id || !profile?.organization_id) {
				return [];
			}

			return fetchGroupsByFosterId(foster.id, profile.organization_id, {
				fields: ["id", "name", "description", "priority"],
			});
		},
		enabled: !!foster && !!user && !!profile?.organization_id,
	});

	const isLoading = isLoadingFoster || isLoadingAnimals || isLoadingGroups;
	const isError = isErrorFoster;
	const error = fosterError;

	if (isLoading) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading foster details..." />
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
									: "Unable to load foster details. Please try again."}
							</p>
							<NavLinkButton
								to="/fosters"
								label="Back to Fosters"
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!foster) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-4">
									Unable to load foster details.
								</p>
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
								<NavLinkButton
									to="/fosters"
									label="Back to Fosters"
								/>
							</div>
						) : (
							<>
								<p className="text-gray-600 mb-4">
									Foster not found.
								</p>
								<NavLinkButton
									to="/fosters"
									label="Back to Fosters"
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
					<NavLinkButton to="/fosters" label="Back to Fosters" />
				</div>

				<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
					<div className="mb-6">
						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							{foster.full_name?.trim() ||
								foster.email ||
								"Unnamed Foster"}
						</h1>
					</div>

					<div className="space-y-4">
						{foster.email && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Email
								</label>
								<p className="text-lg font-medium">
									{foster.email}
								</p>
							</div>
						)}

						{foster.phone_number && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Phone Number
								</label>
								<p className="text-lg font-medium">
									{foster.phone_number}
								</p>
							</div>
						)}

						{foster.full_address && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Address
								</label>
								<p className="text-lg font-medium">
									{foster.full_address}
								</p>
							</div>
						)}

						{foster.home_inspection && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Home Inspection
								</label>
								<p className="text-lg font-medium whitespace-pre-wrap">
									{foster.home_inspection}
								</p>
							</div>
						)}

						{foster.experience_level && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Experience Level
								</label>
								<p className="text-lg font-medium capitalize">
									{foster.experience_level}
								</p>
							</div>
						)}

						{foster.availability != null && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Availability
								</label>
								<span
									className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
										foster.availability
											? "bg-green-100 text-green-800"
											: "bg-gray-100 text-gray-800"
									}`}
								>
									{foster.availability
										? "Available"
										: "Not Available"}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Assigned Animals */}
				{assignedAnimals.length > 0 && (
					<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Assigned Animals
						</h2>
						<div className="space-y-2">
							{assignedAnimals.map((animal) => {
								const slug =
									animal.name
										?.toLowerCase()
										.replace(/[^a-z0-9]+/g, "-")
										.replace(/^-+|-+$/g, "") ||
									"unnamed-animal";
								return (
									<Link
										key={animal.id}
										to={`/animals/${animal.id}/${slug}`}
										className="block p-3 border border-pink-100 rounded-md hover:bg-pink-50 transition-colors"
									>
										<div className="flex items-center justify-between">
											<span className="font-medium text-gray-900">
												{animal.name?.trim() ||
													"Unnamed Animal"}
											</span>
											{animal.priority && (
												<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
													High Priority
												</span>
											)}
										</div>
									</Link>
								);
							})}
						</div>
					</div>
				)}

				{/* Assigned Groups */}
				{assignedGroups.length > 0 && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Assigned Groups
						</h2>
						<div className="space-y-2">
							{assignedGroups.map((group) => {
								return (
									<Link
										key={group.id}
										to={`/groups/${group.id}`}
										className="block p-3 border border-pink-100 rounded-md hover:bg-pink-50 transition-colors"
									>
										<div className="flex items-center justify-between">
											<span className="font-medium text-gray-900">
												{group.name?.trim() ||
													"Unnamed Group"}
											</span>
											{group.priority && (
												<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
													High Priority
												</span>
											)}
										</div>
										{group.description && (
											<p className="text-sm text-gray-600 mt-1 line-clamp-2">
												{group.description}
											</p>
										)}
									</Link>
								);
							})}
						</div>
					</div>
				)}

				{assignedAnimals.length === 0 &&
					assignedGroups.length === 0 && (
						<div className="bg-white rounded-lg shadow-sm p-6">
							<p className="text-gray-600">
								No animals or groups currently assigned to this
								foster.
							</p>
						</div>
					)}
			</div>
		</div>
	);
}
