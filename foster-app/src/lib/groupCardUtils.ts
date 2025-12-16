import type { LifeStage, PhotoMetadata } from "../types";

/**
 * Format life stage counts into a readable string
 * Examples: "3 kittens", "1 adult and 2 kittens", "1 animal, 2 adults, and 5 kittens"
 */
export function formatLifeStageSummary(
	lifeStageCounts: Map<LifeStage, number>
): string {
	const parts: string[] = [];

	// Handle known life stages first
	const kittens = lifeStageCounts.get("kitten") || 0;
	const adults = lifeStageCounts.get("adult") || 0;
	const seniors = lifeStageCounts.get("senior") || 0;
	const unknowns = lifeStageCounts.get("unknown") || 0;

	if (kittens > 0) {
		parts.push(`${kittens} ${kittens === 1 ? "kitten" : "kittens"}`);
	}
	if (adults > 0) {
		parts.push(`${adults} ${adults === 1 ? "adult" : "adults"}`);
	}
	if (seniors > 0) {
		parts.push(`${seniors} ${seniors === 1 ? "senior" : "seniors"}`);
	}
	if (unknowns > 0) {
		parts.push(`${unknowns} ${unknowns === 1 ? "animal" : "animals"}`);
	}

	if (parts.length === 0) {
		return "No animals";
	}

	// Format with proper commas and "and"
	if (parts.length === 1) {
		return parts[0];
	} else if (parts.length === 2) {
		return `${parts[0]} and ${parts[1]}`;
	} else {
		// Last part gets "and", others get commas
		const lastPart = parts.pop()!;
		return `${parts.join(", ")}, and ${lastPart}`;
	}
}

/**
 * Determine grid layout classes based on photo count
 */
export function getGridLayoutClasses(photoCount: number): string {
	if (photoCount === 1) {
		return ""; // No grid, full card
	} else if (photoCount === 2) {
		return "grid grid-cols-2";
	} else if (photoCount >= 3 && photoCount <= 4) {
		return "grid grid-cols-2";
	} else if (photoCount >= 5 && photoCount <= 6) {
		return "grid grid-cols-3";
	} else {
		// 7+ photos
		return "grid grid-cols-3";
	}
}

/**
 * Get animal photos for a group
 * Returns array of photo URLs, one per animal (first photo from each animal)
 */
export function getAnimalPhotosForGroup(
	animalIds: string[],
	animalData: Map<
		string,
		{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
	>
): string[] {
	const photos: string[] = [];
	for (const animalId of animalIds) {
		const animal = animalData.get(animalId);
		if (animal?.photos && animal.photos.length > 0) {
			photos.push(animal.photos[0].url);
			// Limit to 9 photos for display
			if (photos.length >= 9) {
				break;
			}
		}
	}
	return photos;
}

/**
 * Get life stage counts for a group
 */
export function getLifeStageCounts(
	animalIds: string[],
	animalData: Map<
		string,
		{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
	>
): Map<LifeStage, number> {
	const counts = new Map<LifeStage, number>();
	for (const animalId of animalIds) {
		const animal = animalData.get(animalId);
		const lifeStage = animal?.life_stage || "unknown";
		counts.set(lifeStage, (counts.get(lifeStage) || 0) + 1);
	}
	return counts;
}
