import { useState, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import type { Animal } from "../../types";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import Toggle from "../../components/ui/Toggle";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import NavLinkButton from "../../components/ui/NavLinkButton";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";

async function fetchAnimals(organizationId: string): Promise<Animal[]> {
	try {
		const { data, error } = await supabase
			.from("animals")
			.select("id, name, priority")
			.eq("organization_id", organizationId)
			.order("created_at", { ascending: false });

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to fetch animals. Please try again."
				)
			);
		}

		return (data || []) as Animal[];
	} catch (err) {
		throw new Error(
			getErrorMessage(err, "Failed to fetch animals. Please try again.")
		);
	}
}

export default function NewGroup() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { profile } = useUserProfile();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState(false);
	const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Fetch available animals
	const {
		data: animals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
	} = useQuery<Animal[], Error>({
		queryKey: ["animals", user?.id, profile?.organization_id],
		queryFn: () => {
			if (!profile?.organization_id) {
				throw new Error("Organization ID not available");
			}
			return fetchAnimals(profile.organization_id);
		},
		enabled: !!user && !!profile?.organization_id,
	});

	// Smart priority defaulting: check if any selected animal is high priority
	const selectedAnimals = useMemo(() => {
		return animals.filter((animal) =>
			selectedAnimalIds.includes(animal.id)
		);
	}, [animals, selectedAnimalIds]);

	const hasHighPriorityAnimal = useMemo(() => {
		return selectedAnimals.some((animal) => animal.priority === true);
	}, [selectedAnimals]);

	// Update priority when selected animals change (smart defaulting)
	// Only auto-SET to high when a high priority animal is selected
	// Never auto-clear - user must manually clear if they want
	useEffect(() => {
		if (hasHighPriorityAnimal && !priority) {
			// Auto-set to high if any animal is high priority and priority is currently false
			setPriority(true);
		}
		// Note: We don't auto-clear priority. If user manually sets it to high,
		// it stays high even if no high priority animals are selected.
		// This allows coordinators to mark groups as high priority for other reasons.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasHighPriorityAnimal]);

	const toggleAnimalSelection = (animalId: string) => {
		setSelectedAnimalIds((prev) => {
			if (prev.includes(animalId)) {
				return prev.filter((id) => id !== animalId);
			} else {
				return [...prev, animalId];
			}
		});
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (selectedAnimalIds.length === 0) {
			newErrors.animals = "Please select at least one animal";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrors({});
		setSubmitError(null);

		if (!validateForm()) {
			return;
		}

		if (!user) {
			setSubmitError("You must be logged in to create a group.");
			return;
		}

		if (!profile?.organization_id) {
			setSubmitError(
				"Unable to determine your organization. Please try again."
			);
			return;
		}

		setLoading(true);

		try {
			// Check if we're offline before making the request
			checkOfflineAndThrow();

			// Auto-fill name with "Group of #" if no name provided
			const groupName =
				name.trim() || `Group of ${selectedAnimalIds.length}`;

			// Prepare data for insertion
			const groupData: Record<string, unknown> = {
				name: groupName,
				description: description.trim() || null,
				animal_ids: selectedAnimalIds,
				priority: priority,
				organization_id: profile.organization_id,
			};

			const { data: insertedData, error: insertError } = await supabase
				.from("animal_groups")
				.insert(groupData)
				.select()
				.single();

			if (insertError) {
				console.error("Error creating group:", insertError);
				setSubmitError(
					getErrorMessage(
						insertError,
						"Failed to create group. Please try again."
					)
				);
			} else if (!insertedData) {
				setSubmitError("Group was not created. Please try again.");
			} else {
				setSuccessMessage("Group created successfully!");

				// Redirect to group detail page after a brief delay
				setTimeout(() => {
					navigate(`/groups/${insertedData.id}`, { replace: true });
				}, 1500);
			}
		} catch (err) {
			console.error("Unexpected error:", err);
			setSubmitError(
				getErrorMessage(
					err,
					"An unexpected error occurred. Please try again."
				)
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="mb-6">
					<NavLinkButton to="/groups" label="Back to Groups" />
				</div>
				<div className="bg-white rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-6">
						Create New Group
					</h1>

					<form onSubmit={handleSubmit} className="space-y-6">
						<Input
							label="Group Name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter group name (optional - will auto-fill if empty)"
							disabled={loading}
							error={errors.name}
						/>

						<Textarea
							label="Description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Enter group description (optional)"
							disabled={loading}
							rows={4}
							error={errors.description}
						/>

						<Toggle
							label="High Priority"
							checked={priority}
							onChange={setPriority}
							disabled={loading}
						/>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Animals
							</label>
							{isLoadingAnimals && (
								<div className="p-4">
									<LoadingSpinner message="Loading animals..." />
								</div>
							)}
							{isErrorAnimals && (
								<div className="p-4 bg-red-50 border border-red-200 rounded-md">
									<p className="text-sm text-red-700">
										Failed to load animals. Please try
										refreshing the page.
									</p>
								</div>
							)}
							{!isLoadingAnimals &&
								!isErrorAnimals &&
								animals.length === 0 && (
									<p className="text-sm text-gray-500">
										No animals available. Create animals
										first before creating a group.
									</p>
								)}
							{!isLoadingAnimals &&
								!isErrorAnimals &&
								animals.length > 0 && (
									<div className="border border-gray-300 rounded-md p-4 max-h-64 overflow-y-auto">
										<div className="space-y-2">
											{animals.map((animal) => (
												<label
													key={animal.id}
													className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
												>
													<input
														type="checkbox"
														checked={selectedAnimalIds.includes(
															animal.id
														)}
														onChange={() =>
															toggleAnimalSelection(
																animal.id
															)
														}
														disabled={loading}
														className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
													/>
													<span className="flex-1 text-sm text-gray-900">
														{animal.name?.trim() ||
															"Unnamed Animal"}
													</span>
													{animal.priority && (
														<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
															High Priority
														</span>
													)}
												</label>
											))}
										</div>
									</div>
								)}
							{selectedAnimalIds.length > 0 && (
								<p className="mt-2 text-sm text-gray-500">
									{selectedAnimalIds.length} animal
									{selectedAnimalIds.length !== 1
										? "s"
										: ""}{" "}
									selected
								</p>
							)}
							{errors.animals && (
								<p className="mt-2 text-sm text-red-600">
									{errors.animals}
								</p>
							)}
						</div>

						{submitError && (
							<ErrorMessage>{submitError}</ErrorMessage>
						)}

						{successMessage && (
							<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
								{successMessage}
							</div>
						)}

						<div className="flex gap-4">
							<Button type="submit" disabled={loading}>
								{loading ? "Creating..." : "Create Group"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
