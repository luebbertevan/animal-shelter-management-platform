import type { FostersNeededFilters } from "../components/fosters/FostersNeededFilters";
import type {
	Animal,
	AnimalGroup,
	FosterVisibility,
	LifeStage,
	PhotoMetadata,
} from "../types";
import { getGroupFosterVisibility } from "./groupUtils";

export type FostersNeededCombinedItem =
	| { type: "animal"; data: Animal; priority: boolean; created_at: string }
	| {
			type: "group";
			data: AnimalGroup;
			priority: boolean;
			created_at: string;
			foster_visibility: FosterVisibility;
	  };

export function filterAnimalsForFostersNeededList(
	allAnimals: Animal[]
): Animal[] {
	return allAnimals.filter(
		(animal) =>
			animal.foster_visibility !== "not_visible" && !animal.group_id
	);
}

export function buildAnimalMapByGroupMembership(
	allAnimals: Animal[]
): Map<string, Animal> {
	const map = new Map<string, Animal>();
	allAnimals.forEach((animal) => {
		if (animal.id && animal.group_id) {
			map.set(animal.id, animal);
		}
	});
	return map;
}

export function buildGroupsWithFosterVisibility(
	groupsData: AnimalGroup[],
	animalMapById: Map<string, Animal>
): Array<{ group: AnimalGroup; foster_visibility: FosterVisibility }> {
	return groupsData
		.map((group) => {
			if (!group.animal_ids || group.animal_ids.length === 0) {
				return { group, foster_visibility: null };
			}

			const groupAnimals: Animal[] =
				group.animal_ids
					?.map((id) => animalMapById.get(id))
					.filter((animal): animal is Animal => !!animal) || [];

			const { sharedValue: fosterVisibility } =
				getGroupFosterVisibility(groupAnimals);

			return {
				group,
				foster_visibility: fosterVisibility,
			};
		})
		.filter(
			(
				entry
			): entry is {
				group: AnimalGroup;
				foster_visibility: FosterVisibility;
			} => {
				const v = entry.foster_visibility;
				return !!v && v !== "not_visible";
			}
		);
}

export function buildFostersNeededAnimalDataMap(
	allAnimals: Animal[]
): Map<string, { photos?: PhotoMetadata[]; life_stage?: LifeStage }> {
	const map = new Map<
		string,
		{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
	>();
	allAnimals.forEach((animal) => {
		if (animal.id && animal.group_id) {
			map.set(animal.id, {
				photos: animal.photos,
				life_stage: animal.life_stage,
			});
		}
	});
	return map;
}

export function combineAndSortFostersNeededItems(
	animalsData: Animal[],
	groupsWithVisibility: Array<{
		group: AnimalGroup;
		foster_visibility: FosterVisibility;
	}>,
	animalMapById: Map<string, Animal>,
	filters: FostersNeededFilters,
	searchTerm: string
): FostersNeededCombinedItem[] {
	const items: FostersNeededCombinedItem[] = [];

	const shouldHideGroups = !!filters.sex;

	let typeFilter = filters.type;
	if (shouldHideGroups) {
		typeFilter = "singles";
	}

	if (typeFilter === undefined || typeFilter === "singles") {
		animalsData.forEach((animal) => {
			if (filters.priority === true && !animal.priority) return;
			if (filters.sex && animal.sex_spay_neuter_status !== filters.sex)
				return;
			if (
				filters.life_stage &&
				animal.life_stage !== filters.life_stage
			)
				return;
			if (filters.status && animal.status !== filters.status) return;
			if (
				filters.availability &&
				animal.foster_visibility !== filters.availability
			)
				return;

			if (searchTerm) {
				const searchLower = searchTerm.toLowerCase();
				const animalName = animal.name?.toLowerCase() || "";
				if (!animalName.includes(searchLower)) return;
			}

			items.push({
				type: "animal",
				data: animal,
				priority: animal.priority || false,
				created_at: animal.created_at,
			});
		});
	}

	if (
		!shouldHideGroups &&
		(typeFilter === undefined || typeFilter === "groups")
	) {
		groupsWithVisibility.forEach(({ group, foster_visibility }) => {
			if (filters.priority === true && !group.priority) return;

			if (filters.life_stage) {
				const groupAnimals: Animal[] =
					group.animal_ids
						?.map((id) => animalMapById.get(id))
						.filter((animal): animal is Animal => !!animal) || [];

				const hasMatchingLifeStage = groupAnimals.some(
					(animal) => animal.life_stage === filters.life_stage
				);

				if (!hasMatchingLifeStage) return;
			}

			if (searchTerm) {
				const searchLower = searchTerm.toLowerCase();
				const groupName = group.name?.toLowerCase() || "";
				if (!groupName.includes(searchLower)) return;
			}

			if (
				filters.availability &&
				foster_visibility !== filters.availability
			)
				return;

			items.push({
				type: "group",
				data: group,
				priority: group.priority || false,
				created_at: group.created_at,
				foster_visibility,
			});
		});
	}

	items.sort((a, b) => {
		if (a.priority !== b.priority) {
			return a.priority ? -1 : 1;
		}
		const aTime = new Date(a.created_at).getTime();
		const bTime = new Date(b.created_at).getTime();
		if (filters.sortByCreatedAt === "newest") {
			return bTime - aTime;
		}
		return aTime - bTime;
	});

	return items;
}
