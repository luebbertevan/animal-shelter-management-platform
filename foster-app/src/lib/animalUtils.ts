import { supabase } from "./supabase";
import { getErrorMessage } from "./errorUtils";
import { deleteAnimalPhoto, deleteAnimalFolder } from "./photoUtils";

/**
 * Removes an animal ID from all groups that contain it
 * @param animalId - The animal ID to remove from groups
 * @param organizationId - The organization ID for security
 * @returns Promise that resolves when all groups are updated
 * @throws Error if update fails
 */
export async function removeAnimalFromGroups(
	animalId: string,
	organizationId: string
): Promise<void> {
	try {
		// Find all groups that contain this animal
		// Query all groups in the organization and filter in JavaScript
		// (Supabase .contains() may not work as expected for array contains)
		const { data: allGroups, error: fetchError } = await supabase
			.from("animal_groups")
			.select("id, animal_ids")
			.eq("organization_id", organizationId);

		if (fetchError) {
			throw new Error(
				getErrorMessage(
					fetchError,
					"Failed to find groups containing this animal."
				)
			);
		}

		// Filter groups that contain this animal ID
		const groups =
			allGroups?.filter(
				(group) =>
					group.animal_ids &&
					Array.isArray(group.animal_ids) &&
					group.animal_ids.includes(animalId)
			) || [];

		if (!groups || groups.length === 0) {
			// Animal is not in any groups, nothing to do
			return;
		}

		// Update each group to remove the animal ID
		const updatePromises = groups.map(async (group) => {
			const updatedAnimalIds = (group.animal_ids || []).filter(
				(id: string) => id !== animalId
			);

			const { error: updateError } = await supabase
				.from("animal_groups")
				.update({ animal_ids: updatedAnimalIds })
				.eq("id", group.id);

			if (updateError) {
				throw new Error(
					getErrorMessage(
						updateError,
						`Failed to remove animal from group ${group.id}.`
					)
				);
			}
		});

		await Promise.all(updatePromises);
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(
			"An unexpected error occurred while removing animal from groups."
		);
	}
}

/**
 * Deletes an animal and all associated data
 * - Removes animal from all groups
 * - Deletes all animal photos from storage
 * - Deletes the animal record
 * @param animalId - The animal ID to delete
 * @param organizationId - The organization ID for security
 * @param photos - Array of photo metadata to delete from storage
 * @returns Promise that resolves when deletion is complete
 * @throws Error if deletion fails
 */
export async function deleteAnimal(
	animalId: string,
	organizationId: string,
	photos?: Array<{ url: string }>
): Promise<void> {
	try {
		// Step 1: Remove animal from all groups
		await removeAnimalFromGroups(animalId, organizationId);

		// Step 2: Delete all photos from storage and clean up the animal folder
		// We delete the entire folder to ensure cleanup of any orphaned files
		try {
			await deleteAnimalFolder(animalId, organizationId);
		} catch {
			// If folder deletion fails, try deleting individual photos as fallback
			if (photos && photos.length > 0) {
				const deleteResults = await Promise.allSettled(
					photos.map((photo) =>
						deleteAnimalPhoto(photo.url, organizationId)
					)
				);

				const failures = deleteResults.filter(
					(result) => result.status === "rejected"
				);
				if (failures.length > 0) {
					console.error(
						`Failed to delete ${failures.length} of ${photos.length} photos after folder deletion failed`
					);
				}
			}
			// Note: We continue with animal deletion even if photo deletion fails
			// This is intentional - we don't want to leave orphaned animal records
		}

		// Step 3: Delete the animal record
		const { data, error: deleteError } = await supabase
			.from("animals")
			.delete()
			.eq("id", animalId)
			.eq("organization_id", organizationId)
			.select(); // Select to verify deletion

		if (deleteError) {
			throw new Error(
				getErrorMessage(
					deleteError,
					"Failed to delete animal. Please try again."
				)
			);
		}

		// Verify that a row was actually deleted
		if (!data || data.length === 0) {
			throw new Error(
				"Animal not found or you don't have permission to delete it."
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(
			"An unexpected error occurred while deleting the animal."
		);
	}
}
