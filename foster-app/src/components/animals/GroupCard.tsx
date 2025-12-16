import { Link } from "react-router-dom";
import type { AnimalGroup, LifeStage, PhotoMetadata } from "../../types";
import {
	formatLifeStageSummary,
	getGridLayoutClasses,
	getAnimalPhotosForGroup,
	getLifeStageCounts,
} from "../../lib/groupCardUtils";

interface GroupCardProps {
	group: Pick<
		AnimalGroup,
		| "id"
		| "name"
		| "description"
		| "animal_ids"
		| "priority"
		| "group_photos"
	>;
	/**
	 * Optional map of animal data (photos and life_stage) for animals in the group.
	 * Key: animal ID, Value: { photos?: PhotoMetadata[], life_stage?: LifeStage }
	 * If not provided, will show placeholder and basic count.
	 */
	animalData?: Map<
		string,
		{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
	>;
}

/**
 * Reusable card component for displaying a group in a list
 * Matches AnimalCard size and styling
 * Links to the group detail page when clicked
 */
export default function GroupCard({ group, animalData }: GroupCardProps) {
	const animalCount = group.animal_ids?.length || 0;
	const isEmpty = animalCount === 0;

	// Determine photo to display
	let displayPhotos: string[] = [];
	let hasGroupPhoto = false;

	if (group.group_photos && group.group_photos.length > 0) {
		// Priority 1: Group photos (show first one, full card)
		displayPhotos = [group.group_photos[0].url];
		hasGroupPhoto = true;
	} else if (animalData && group.animal_ids && group.animal_ids.length > 0) {
		// Priority 2: Animal photos (grid)
		displayPhotos = getAnimalPhotosForGroup(group.animal_ids, animalData);
	}

	const photoCount = displayPhotos.length;
	const gridClasses = hasGroupPhoto ? "" : getGridLayoutClasses(photoCount);
	const remainingCount =
		!hasGroupPhoto && animalData && group.animal_ids
			? group.animal_ids.length - photoCount
			: 0;

	// Get life stage summary
	let lifeStageSummary = "";
	if (isEmpty) {
		lifeStageSummary = "Empty group";
	} else if (animalData && group.animal_ids) {
		const lifeStageCounts = getLifeStageCounts(
			group.animal_ids,
			animalData
		);
		lifeStageSummary = formatLifeStageSummary(lifeStageCounts);
	} else {
		// Fallback if no animal data
		lifeStageSummary = `${animalCount} ${
			animalCount === 1 ? "animal" : "animals"
		}`;
	}

	return (
		<Link
			to={`/groups/${group.id}`}
			className="bg-white rounded-lg shadow-sm border border-pink-100 hover:shadow-md transition-shadow cursor-pointer block overflow-hidden relative"
		>
			{/* Photo area - matches AnimalCard aspect ratio */}
			<div className="w-full aspect-[4/5] bg-gray-100 flex items-center justify-center relative">
				{photoCount > 0 ? (
					<div className={`w-full h-full ${gridClasses}`}>
						{displayPhotos.map((photoUrl, index) => (
							<div
								key={index}
								className="relative w-full h-full overflow-hidden"
							>
								<img
									src={photoUrl}
									alt={`Group photo ${index + 1}`}
									className="w-full h-full object-cover"
								/>
								{/* "+X more" overlay on last cell if there are more photos */}
								{index === displayPhotos.length - 1 &&
									remainingCount > 0 && (
										<div className="absolute inset-0 bg-black/60 flex items-center justify-center">
											<span className="text-white font-semibold text-lg">
												+{remainingCount} more
											</span>
										</div>
									)}
							</div>
						))}
					</div>
				) : (
					// Placeholder icon (same as AnimalCard)
					<svg
						className="w-16 h-16 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				)}
				{/* Priority badge overlay (same position as AnimalCard) */}
				{group.priority && (
					<div className="absolute top-2 right-2">
						<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
							High Priority
						</span>
					</div>
				)}
			</div>

			{/* Bottom banner with name and life stage summary (matches AnimalCard) */}
			<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent pt-8 pb-3 px-3">
				<div className="text-white">
					<h2 className="text-lg font-semibold mb-1 truncate">
						{group.name?.trim() || "Unnamed Group"}
					</h2>
					<p className="text-base text-white/90">
						{lifeStageSummary}
					</p>
				</div>
			</div>
		</Link>
	);
}
