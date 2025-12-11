import { Link } from "react-router-dom";
import type { AnimalGroup } from "../../types";

interface GroupCardProps {
	group: Pick<
		AnimalGroup,
		"id" | "name" | "description" | "animal_ids" | "priority"
	>;
	/**
	 * Optional array of animal names to display.
	 * If provided, these will be shown instead of just the count.
	 * If not provided and animal_ids exists, will show count.
	 */
	animalNames?: string[];
}

/**
 * Reusable card component for displaying a group in a list
 * Links to the group detail page when clicked
 */
export default function GroupCard({ group, animalNames }: GroupCardProps) {
	const animalCount = group.animal_ids?.length || 0;
	const hasAnimalNames = animalNames && animalNames.length > 0;

	return (
		<Link
			to={`/groups/${group.id}`}
			className="bg-white rounded-lg shadow-sm p-5 border border-pink-100 hover:shadow-md transition-shadow cursor-pointer block"
		>
			<h2 className="text-lg font-semibold text-gray-900 mb-3">
				{group.name?.trim() || "Unnamed Group"}
			</h2>

			<div className="space-y-2 text-sm">
				{group.description && (
					<p className="text-gray-600 line-clamp-2">
						{group.description}
					</p>
				)}
				{hasAnimalNames ? (
					<p>
						<span className="font-medium">
							{animalNames.join(", ")}
						</span>
					</p>
				) : animalCount > 0 ? (
					<p className="text-gray-500">
						{animalCount} {animalCount === 1 ? "animal" : "animals"}
					</p>
				) : (
					<p className="text-gray-500 italic">No animals in group</p>
				)}
				{group.priority && (
					<p>
						<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
							High Priority
						</span>
					</p>
				)}
			</div>
		</Link>
	);
}

