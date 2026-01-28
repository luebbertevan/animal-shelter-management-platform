import { Link } from "react-router-dom";
import type {
	AnimalGroup,
	LifeStage,
	PhotoMetadata,
	FosterVisibility,
} from "../../types";
import {
	formatLifeStageSummary,
	getGridLayoutClasses,
	getAnimalPhotosForGroup,
	getLifeStageCounts,
} from "../../lib/groupCardUtils";

interface GroupCardProps {
	group: Partial<
		Pick<
			AnimalGroup,
			| "id"
			| "name"
			| "description"
			| "animal_ids"
			| "priority"
			| "group_photos"
		>
	> & { id: string };
	/**
	 * Optional map of animal data (photos and life_stage) for animals in the group.
	 * Key: animal ID, Value: { photos?: PhotoMetadata[], life_stage?: LifeStage }
	 * If not provided, will show placeholder and basic count.
	 */
	animalData?: Map<
		string,
		{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
	>;
	foster_visibility?: FosterVisibility; // Optional visibility badge for Fosters Needed page
	/** If true, shows "Requested" badge instead of "Foster Pending" (for current user's pending request) */
	hasPendingRequest?: boolean;
	/** Request ID for cancellation (needed when hasPendingRequest is true) */
	requestId?: string;
	/** Callback when cancel request badge is clicked */
	onCancelRequest?: () => void;
}

// Helper function to get visibility badge text and styling (same as AnimalCard)
function getVisibilityBadge(
	visibility: FosterVisibility | undefined
): { text: string; className: string } | null {
	if (!visibility || visibility === "not_visible") {
		return null;
	}

	switch (visibility) {
		case "available_now":
			return {
				text: "Available Now",
				className: "bg-green-100 text-green-800",
			};
		case "available_future":
			return {
				text: "Available Future",
				className: "bg-blue-100 text-blue-800",
			};
		case "foster_pending":
			return {
				text: "Foster Pending",
				className: "bg-yellow-100 text-yellow-800",
			};
		default:
			return null;
	}
}

/**
 * Reusable card component for displaying a group in a list
 * Matches AnimalCard size and styling
 * Links to the group detail page when clicked
 */
export default function GroupCard({
	group,
	animalData,
	foster_visibility,
	hasPendingRequest = false,
	onCancelRequest,
}: GroupCardProps) {
	const animalCount = group.animal_ids?.length || 0;
	const isEmpty = animalCount === 0;
	// If user has a pending request, show "Requested" badge instead of visibility badge
	const visibilityBadge = hasPendingRequest
		? null
		: getVisibilityBadge(foster_visibility);

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
				{/* Badges overlay - priority, visibility, and request status (same position as AnimalCard) */}
				<div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
					{group.priority && (
						<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
							High Priority
						</span>
					)}
					{hasPendingRequest ? (
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onCancelRequest?.();
							}}
							className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors cursor-pointer"
						>
							Requested
						</button>
					) : (
						visibilityBadge && (
							<span
								className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${visibilityBadge.className}`}
							>
								{visibilityBadge.text}
							</span>
						)
					)}
				</div>
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
