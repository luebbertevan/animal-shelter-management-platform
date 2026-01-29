import { Link, useNavigate } from "react-router-dom";
import type {
	Animal,
	SexSpayNeuterStatus,
	FosterVisibility,
} from "../../types";
import { calculateAgeFromDOB } from "../../lib/ageUtils";

// Helper function to create a URL-friendly slug from a name
function createSlug(name: string | undefined | null): string {
	if (!name || !name.trim()) {
		return "unnamed-animal";
	}
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
		.replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

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

// Helper function to format age for compact display (e.g., "12 week old", "3 year old")
function formatAgeForDisplay(
	dateOfBirth: string | undefined | null
): string | null {
	if (!dateOfBirth) {
		return null;
	}

	try {
		// Extract just the date part (YYYY-MM-DD) from ISO string if needed
		// Handles both "2025-10-17" and "2025-10-17T00:00:00+00:00" formats
		const dateOnly = dateOfBirth.split("T")[0];

		const age = calculateAgeFromDOB(dateOnly);
		if (!age) {
			return null;
		}

		// Use singular form for all units (e.g., "8 week old" not "8 weeks old")
		const unitLabel =
			age.unit === "years"
				? "year"
				: age.unit === "months"
				? "month"
				: age.unit === "weeks"
				? "week"
				: "day";

		return `${age.value} ${unitLabel} old`;
	} catch {
		return null;
	}
}

interface AnimalCardProps {
	animal: (Partial<
		Pick<
			Animal,
			| "id"
			| "name"
			| "status"
			| "sex_spay_neuter_status"
			| "priority"
			| "photos"
			| "date_of_birth"
			| "group_id"
		>
	> & { id: string }) & {
		group_name?: string; // Optional group name if animal is in a group
	};
	hideGroupIndicator?: boolean; // If true, hide the "In group" indicator
	foster_visibility?: FosterVisibility; // Optional visibility badge for Fosters Needed page
	/** If true, shows "Requested" badge instead of "Foster Pending" (for current user's pending request) */
	hasPendingRequest?: boolean;
	/** Request ID for cancellation (needed when hasPendingRequest is true) */
	requestId?: string;
	/** Callback when cancel request badge is clicked */
	onCancelRequest?: () => void;
	/** Optional coordinator badge text (e.g. "Requested by Jane" or "3 pending requests") */
	requestedByLabel?: string;
	/** If provided, clicking the requestedBy badge navigates to the foster profile */
	requestedByFosterId?: string;
}

// Helper function to get visibility badge text and styling
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
 * Reusable card component for displaying an animal in a list
 * Links to the animal detail page when clicked
 */
export default function AnimalCard({
	animal,
	hideGroupIndicator = false,
	foster_visibility,
	hasPendingRequest = false,
	onCancelRequest,
	requestedByLabel,
	requestedByFosterId,
}: AnimalCardProps) {
	const navigate = useNavigate();
	const slug = createSlug(animal.name);
	const firstPhoto =
		animal.photos && animal.photos.length > 0 ? animal.photos[0] : null;
	const ageDisplay = formatAgeForDisplay(animal.date_of_birth);
	const sexDisplay = animal.sex_spay_neuter_status
		? formatSexSpayNeuterStatus(animal.sex_spay_neuter_status)
		: null;
	// If user has a pending request, show "Requested" badge instead of visibility badge
	const visibilityBadge = hasPendingRequest
		? null
		: getVisibilityBadge(foster_visibility);

	// Build compact info string: "12 week old male" or just "male" if no age
	const infoParts: string[] = [];
	if (ageDisplay) {
		infoParts.push(ageDisplay);
	}
	if (sexDisplay) {
		infoParts.push(sexDisplay.toLowerCase());
	}
	const compactInfo = infoParts.length > 0 ? infoParts.join(" ") : null;

	// Handle group link click - navigate programmatically to avoid nested <a> tags
	const handleGroupClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (animal.group_id) {
			navigate(`/groups/${animal.group_id}`);
		}
	};

	// Handle requested-by badge click (avoid nested <a> tags)
	const handleRequestedByClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (requestedByFosterId) {
			navigate(`/fosters/${requestedByFosterId}`);
		}
	};

	return (
		<Link
			to={`/animals/${animal.id}/${slug}`}
			className="bg-white rounded-lg shadow-sm border border-pink-100 hover:shadow-md transition-shadow cursor-pointer block overflow-hidden relative"
		>
			{/* Photo - takes up most of the card */}
			<div className="w-full aspect-[4/5] bg-gray-100 flex items-center justify-center relative">
				{firstPhoto ? (
					<img
						src={firstPhoto.url}
						alt={animal.name || "Animal photo"}
						className="w-full h-full object-cover"
					/>
				) : (
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
				{/* Badges overlay - priority, visibility, and request status */}
				<div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
					{animal.priority && (
						<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
							High Priority
						</span>
					)}
					{!hasPendingRequest && requestedByLabel && (
						<button
							type="button"
							onClick={handleRequestedByClick}
							disabled={!requestedByFosterId}
							className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors disabled:opacity-100 disabled:cursor-default max-w-[11rem] sm:max-w-[13rem] truncate"
							title={requestedByLabel}
						>
							{requestedByLabel}
						</button>
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

			{/* Bottom banner with name, age, and sex */}
			<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent pt-8 pb-3 px-3">
				<div className="text-white">
					<h2 className="text-lg font-semibold mb-1 truncate">
						{animal.name?.trim() || "Unnamed Animal"}
					</h2>
					{compactInfo && (
						<p className="text-base text-white/90">{compactInfo}</p>
					)}
					{/* Group indicator */}
					{animal.group_id && !hideGroupIndicator && (
						<button
							type="button"
							onClick={handleGroupClick}
							className="text-sm text-pink-300 hover:text-pink-200 font-medium mt-1 inline-block text-left"
						>
							In group: {animal.group_name || "View group"}
						</button>
					)}
				</div>
			</div>
		</Link>
	);
}
