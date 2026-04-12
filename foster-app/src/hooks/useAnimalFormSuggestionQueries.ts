import { useQuery } from "@tanstack/react-query";
import {
	fetchBreedSuggestions,
	fetchPhysicalCharacteristicsSuggestions,
} from "../lib/animalQueries";

const SUGGESTIONS_STALE_TIME_MS = 5 * 60 * 1000;

export function useAnimalFormSuggestionQueries(
	organizationId: string | undefined
) {
	const breedQuery = useQuery({
		queryKey: ["breedSuggestions", organizationId],
		queryFn: async () => {
			if (!organizationId) {
				return [];
			}
			return fetchBreedSuggestions(organizationId);
		},
		staleTime: SUGGESTIONS_STALE_TIME_MS,
		enabled: !!organizationId,
	});

	const physicalCharacteristicsQuery = useQuery({
		queryKey: [
			"physicalCharacteristicsSuggestions",
			organizationId,
		],
		queryFn: async () => {
			if (!organizationId) {
				return [];
			}
			return fetchPhysicalCharacteristicsSuggestions(organizationId);
		},
		staleTime: SUGGESTIONS_STALE_TIME_MS,
		enabled: !!organizationId,
	});

	return {
		breedSuggestions: breedQuery.data ?? [],
		isLoadingBreeds: breedQuery.isLoading,
		physicalCharacteristicsSuggestions:
			physicalCharacteristicsQuery.data ?? [],
		isLoadingPhysicalCharacteristics:
			physicalCharacteristicsQuery.isLoading,
	};
}
