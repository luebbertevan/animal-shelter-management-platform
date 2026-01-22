import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { MessageTag } from "../../types";
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
			return fetchGroups(profile.organization_id, {
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
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black bg-opacity-50 z-40"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
				<div
					className="bg-white rounded-lg shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl flex flex-col"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="p-4 border-b border-gray-200">
						<h3 className="text-lg font-semibold text-gray-900">
							Tag Animal or Group
						</h3>
					</div>

					{/* Tabs */}
					<Tabs
						tabs={[
							{ id: "animals", label: "Animals" },
							{ id: "groups", label: "Groups" },
						]}
						activeTab={activeTab}
						onTabChange={(tabId) =>
							setActiveTab(tabId as "animals" | "groups")
						}
					/>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-4">
						{activeTab === "animals" && (
							<div className="space-y-4">
								{/* Search and Filters */}
								<div className="space-y-3">
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
								<div className="space-y-3">
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
												{groups.map((group) => (
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
														/>
													</div>
												))}
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
