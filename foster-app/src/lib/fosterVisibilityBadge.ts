import type { FosterVisibility } from "../types";
import { formatFosterVisibility } from "./metadataUtils";

const FOSTER_VISIBILITY_BADGE_COLORS: Record<
	Exclude<FosterVisibility, "not_visible">,
	string
> = {
	available_now: "bg-green-100 text-green-800",
	available_future: "bg-blue-100 text-blue-800",
	foster_pending: "bg-yellow-100 text-yellow-800",
};

export interface FosterVisibilityBadge {
	text: string;
	className: string;
}

export function getFosterVisibilityBadge(
	visibility: FosterVisibility | undefined
): FosterVisibilityBadge | null {
	if (!visibility || visibility === "not_visible") {
		return null;
	}

	return {
		text: formatFosterVisibility(visibility),
		className: FOSTER_VISIBILITY_BADGE_COLORS[visibility],
	};
}
