import { Link } from "react-router-dom";
import type { Animal, SexSpayNeuterStatus } from "../../types";

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

interface AnimalCardProps {
	animal: Pick<
		Animal,
		"id" | "name" | "status" | "sex_spay_neuter_status" | "priority"
	>;
}

/**
 * Reusable card component for displaying an animal in a list
 * Links to the animal detail page when clicked
 */
export default function AnimalCard({ animal }: AnimalCardProps) {
	const slug = createSlug(animal.name);

	return (
		<Link
			to={`/animals/${animal.id}/${slug}`}
			className="bg-white rounded-lg shadow-sm p-5 border border-pink-100 hover:shadow-md transition-shadow cursor-pointer block"
		>
			<h2 className="text-lg font-semibold text-gray-900 mb-3">
				{animal.name?.trim() || "Unnamed Animal"}
			</h2>

			<div className="space-y-2 text-sm">
				{animal.status && (
					<p>
						<span className="text-gray-500">Status:</span>{" "}
						<span className="font-medium capitalize">
							{animal.status.replace("_", " ")}
						</span>
					</p>
				)}
				{animal.sex_spay_neuter_status && (
					<p>
						<span className="text-gray-500">Sex:</span>{" "}
						<span className="font-medium">
							{formatSexSpayNeuterStatus(
								animal.sex_spay_neuter_status
							)}
						</span>
					</p>
				)}
				{animal.priority && (
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
