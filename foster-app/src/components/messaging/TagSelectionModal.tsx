import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { MessageTag, PhotoMetadata, LifeStage } from "../../types";
import type { AnimalFilters } from "../animals/AnimalFilters";
import type { GroupFilters } from "../animals/GroupFilters";
import { fetchAnimals, fetchAnimalsCount } from "../../lib/animalQueries";
import { fetchGroups, fetchGroupsCount } from "../../lib/groupQueries";
import Tabs from "../shared/Tabs";
import SearchInput from "../shared/SearchInput";
import AnimalFiltersComponent from "../animals/AnimalFilters";
import GroupFiltersComponent from "../animals/GroupFilters";
import AnimalCard from "../animals/AnimalCard";
import GroupCard from "../animals/GroupCard";
import Pagination from "../shared/Pagination";
import LoadingSpinner from "../ui/LoadingSpinner";
import { TAG_TYPES } from "../../types";

interface TagSelectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (tag: MessageTag) => void;
	selectedTags: MessageTag[];
	maxTags: number;
}

const PAGE_SIZE = 40;

export default function TagSelectionModal({
	isOpen,
	onClose,
	onSelect,
	selectedTags,
	maxTags,
}: TagSelectionModalProps) {
	const { profile } = useProtectedAuth();
	const [activeTab, setActiveTab] = useState<"animals" | "groups">("animals");

	// Animals tab state
	const [animalSearchTerm, setAnimalSearchTerm] = useState("");
	const [animalFilters, setAnimalFilters] = useState<AnimalFilters>({});
	const [animalPage, setAnimalPage] = useState(1);

	// Groups tab state
	const [groupSearchTerm, setGroupSearchTerm] = useState("");
	const [groupFilters, setGroupFilters] = useState<GroupFilters>({});
	const [groupPage, setGroupPage] = useState(1);

	// Close on Escape key
	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	// Fetch animals
	const animalOffset = (animalPage - 1) * PAGE_SIZE;
	const { data: animals = [], isLoading: isLoadingAnimals } = useQuery({
		queryKey: [
			"tag-selection-animals",
			profile.organization_id,
			animalFilters,
			animalSearchTerm,
			animalPage,
		],
		queryFn: async () => {
			return fetchAnimals(profile.organization_id, {
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
				limit: PAGE_SIZE,
				offset: animalOffset,
				filters: animalFilters,
				searchTerm: animalSearchTerm,
			});
		},
		enabled: isOpen && activeTab === "animals",
	});

	// Fetch animals count
	const { data: animalCount = 0 } = useQuery({
		queryKey: [
			"tag-selection-animals-count",
			profile.organization_id,
			animalFilters,
			animalSearchTerm,
		],
		queryFn: () =>
			fetchAnimalsCount(
				profile.organization_id,
				animalFilters,
				animalSearchTerm
			),
		enabled: isOpen && activeTab === "animals",
	});

	// Fetch groups
	const groupOffset = (groupPage - 1) * PAGE_SIZE;
	const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
		queryKey: [
			"tag-selection-groups",
			profile.organization_id,
			groupFilters,
			groupSearchTerm,
			groupPage,
		],
		queryFn: async () => {
			const result = await fetchGroups(profile.organization_id, {
				fields: [
					"id",
					"name",
					"description",
					"animal_ids",
					"priority",
					"group_photos",
				],
				orderBy: "created_at",
				orderDirection: "desc",
				checkOffline: true,
				limit: PAGE_SIZE,
				offset: groupOffset,
				filters: groupFilters,
				searchTerm: groupSearchTerm,
			});
			return result;
		},
		enabled: isOpen && activeTab === "groups",
	});

	// Fetch groups count
	const { data: groupCount = 0 } = useQuery({
		queryKey: [
			"tag-selection-groups-count",
			profile.organization_id,
			groupFilters,
			groupSearchTerm,
		],
		queryFn: () =>
			fetchGroupsCount(
				profile.organization_id,
				groupFilters,
				groupSearchTerm
			),
		enabled: isOpen && activeTab === "groups",
	});

	// Fetch all animals for animalData map (needed for GroupCard fallback to animal photos)
	const { data: allAnimalsForGroups = [] } = useQuery({
		queryKey: [
			"tag-selection-all-animals-for-groups",
			profile.organization_id,
		],
		queryFn: async () => {
			return fetchAnimals(profile.organization_id, {
				fields: ["id", "photos", "life_stage"],
				checkOffline: true,
			});
		},
		enabled: isOpen && activeTab === "groups",
	});

	// Create animalData map for GroupCard (photos + life_stage)
	const animalDataMap = useMemo(() => {
		const map = new Map<
			string,
			{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
		>();
		allAnimalsForGroups.forEach((animal) => {
			if (animal.id) {
				map.set(animal.id, {
					photos: animal.photos,
					life_stage: animal.life_stage,
				});
			}
		});
		return map;
	}, [allAnimalsForGroups]);

	const handleAnimalSearch = (searchTerm: string) => {
		setAnimalSearchTerm(searchTerm);
		setAnimalPage(1); // Reset to page 1 when search changes
	};

	const handleGroupSearch = (searchTerm: string) => {
		setGroupSearchTerm(searchTerm);
		setGroupPage(1); // Reset to page 1 when search changes
	};

	const handleAnimalFiltersChange = (filters: AnimalFilters) => {
		setAnimalFilters(filters);
		setAnimalPage(1); // Reset to page 1 when filters change
	};

	const handleGroupFiltersChange = (filters: GroupFilters) => {
		setGroupFilters(filters);
		setGroupPage(1); // Reset to page 1 when filters change
	};

	const handleAnimalSelect = (animalId: string, animalName: string) => {
		// Check max tags limit
		if (selectedTags.length >= maxTags) {
			alert(
				`Maximum ${maxTags} tags per message. Please remove a tag first.`
			);
			return;
		}

		// Check if already selected
		const isAlreadySelected = selectedTags.some(
			(tag) => tag.type === TAG_TYPES.ANIMAL && tag.id === animalId
		);
		if (isAlreadySelected) {
			return;
		}

		onSelect({
			type: TAG_TYPES.ANIMAL,
			id: animalId,
			name: animalName || "Unnamed Animal",
		});
		onClose();
	};

	const handleGroupSelect = (groupId: string, groupName: string) => {
		// Check max tags limit
		if (selectedTags.length >= maxTags) {
			alert(
				`Maximum ${maxTags} tags per message. Please remove a tag first.`
			);
			return;
		}

		// Check if already selected
		const isAlreadySelected = selectedTags.some(
			(tag) => tag.type === TAG_TYPES.GROUP && tag.id === groupId
		);
		if (isAlreadySelected) {
			return;
		}

		onSelect({
			type: TAG_TYPES.GROUP,
			id: groupId,
			name: groupName || "Unnamed Group",
		});
		onClose();
	};

	if (!isOpen) return null;

	const animalTotalPages = Math.ceil(animalCount / PAGE_SIZE);
	const groupTotalPages = Math.ceil(groupCount / PAGE_SIZE);

	return (
		<>
			{/* Backdrop - very light overlay to keep background visible */}
			<div
				className="fixed inset-x-0 top-16 bottom-0 z-40"
				style={{
					backgroundColor: "rgba(0, 0, 0, 0.65)",
					backdropFilter: "blur(4px)",
					WebkitBackdropFilter: "blur(4px)",
				}}
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="fixed inset-x-0 top-16 bottom-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-none">
				<div
					className="bg-white rounded-lg shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl flex flex-col pointer-events-auto"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="p-4 border-b border-gray-200 flex items-center justify-between">
						<h3 className="text-lg font-semibold text-gray-900">
							Tag Animal or Group
						</h3>
						<button
							type="button"
							onClick={onClose}
							className="px-2 py-1 text-xs font-medium border-2 border-pink-500 text-pink-600 rounded-md hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-colors"
						>
							Cancel
						</button>
					</div>

					{/* Tabs */}
					<Tabs
						tabs={[
							{ id: "animals", label: "Animals" },
							{ id: "groups", label: "Groups" },
						]}
						activeTab={activeTab}
						onTabChange={(tabId) => {
							setActiveTab(tabId as "animals" | "groups");
						}}
					/>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-4">
						{activeTab === "animals" && (
							<div className="space-y-4">
								{/* Search and Filters */}
								<div className="flex items-center gap-2">
									<SearchInput
										value={animalSearchTerm}
										onSearch={handleAnimalSearch}
										placeholder="Search animals..."
									/>
									<AnimalFiltersComponent
										filters={animalFilters}
										onFiltersChange={
											handleAnimalFiltersChange
										}
									/>
								</div>

								{/* Loading State */}
								{isLoadingAnimals && (
									<div className="flex justify-center py-8">
										<LoadingSpinner />
									</div>
								)}

								{/* Animals Grid */}
								{!isLoadingAnimals && (
									<>
										{animals.length === 0 ? (
											<div className="text-center py-8 text-gray-500">
												No animals found
											</div>
										) : (
											<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
												{animals.map((animal) => (
													<div
														key={animal.id}
														onClick={(e) => {
															e.preventDefault();
															e.stopPropagation();
															handleAnimalSelect(
																animal.id,
																animal.name ||
																	"Unnamed Animal"
															);
														}}
														className="cursor-pointer [&_a]:pointer-events-none"
													>
														<AnimalCard
															animal={animal}
															hideGroupIndicator={
																true
															}
														/>
													</div>
												))}
											</div>
										)}

										{/* Pagination */}
										{animalTotalPages > 1 && (
											<Pagination
												currentPage={animalPage}
												totalPages={animalTotalPages}
												onPageChange={setAnimalPage}
												totalItems={animalCount}
												itemsPerPage={PAGE_SIZE}
											/>
										)}
									</>
								)}
							</div>
						)}

						{activeTab === "groups" && (
							<div className="space-y-4">
								{/* Search and Filters */}
								<div className="flex items-center gap-2">
									<SearchInput
										value={groupSearchTerm}
										onSearch={handleGroupSearch}
										placeholder="Search groups..."
									/>
									<GroupFiltersComponent
										filters={groupFilters}
										onFiltersChange={
											handleGroupFiltersChange
										}
									/>
								</div>

								{/* Loading State */}
								{isLoadingGroups && (
									<div className="flex justify-center py-8">
										<LoadingSpinner />
									</div>
								)}

								{/* Groups Grid */}
								{!isLoadingGroups && (
									<>
										{groups.length === 0 ? (
											<div className="text-center py-8 text-gray-500">
												No groups found
											</div>
										) : (
											<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
												{groups.map((group) => {
													return (
														<div
															key={group.id}
															onClick={(e) => {
																e.preventDefault();
																e.stopPropagation();
																handleGroupSelect(
																	group.id,
																	group.name ||
																		"Unnamed Group"
																);
															}}
															className="cursor-pointer [&_a]:pointer-events-none"
														>
															<GroupCard
																group={group}
																animalData={
																	animalDataMap
																}
															/>
														</div>
													);
												})}
											</div>
										)}

										{/* Pagination */}
										{groupTotalPages > 1 && (
											<Pagination
												currentPage={groupPage}
												totalPages={groupTotalPages}
												onPageChange={setGroupPage}
												totalItems={groupCount}
												itemsPerPage={PAGE_SIZE}
											/>
										)}
									</>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
