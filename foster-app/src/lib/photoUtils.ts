import { supabase } from "./supabase";
import { getErrorMessage } from "./errorUtils";

// Maximum file size: 8MB (8 * 1024 * 1024 bytes)
const MAX_FILE_SIZE = 8 * 1024 * 1024;

// Allowed MIME types for photos
const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
];

/**
 * Validates a file before upload
 * @param file - The file to validate
 * @throws Error if file is invalid
 */
function validateFile(file: File): void {
	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
		throw new Error(
			`File size (${sizeMB}MB) exceeds maximum allowed size of 8MB`
		);
	}

	// Check file type
	if (!ALLOWED_MIME_TYPES.includes(file.type)) {
		throw new Error(
			`File type "${file.type}" is not allowed. Allowed types: jpeg, jpg, png, webp`
		);
	}
}

/**
 * Generates a unique filename using UUID and original filename
 * @param originalFilename - The original filename from the file
 * @returns Unique filename in format: {uuid}_{originalFilename}
 */
function generateUniqueFilename(originalFilename: string): string {
	// Generate UUID (using crypto.randomUUID if available, fallback to timestamp)
	const uuid =
		crypto.randomUUID?.() ||
		`${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

	// Preserve file extension
	const extension = originalFilename.split(".").pop() || "";
	const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, "");

	// Clean filename (remove special characters that might cause issues)
	const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "_");

	return `${uuid}_${cleanName}.${extension}`;
}

/**
 * Uploads a photo to Supabase Storage
 * @param file - The file to upload
 * @param organizationId - The organization ID (UUID string)
 * @param conversationId - The conversation ID (UUID string)
 * @returns Promise resolving to the public URL of the uploaded photo
 * @throws Error if upload fails or file is invalid
 */
export async function uploadPhoto(
	file: File,
	organizationId: string,
	conversationId: string
): Promise<string> {
	// Validate file before attempting upload
	validateFile(file);

	// Generate unique filename
	const uniqueFilename = generateUniqueFilename(file.name);

	// Construct storage path: {organization_id}/messages/{conversation_id}/{uuid}_{filename}
	const storagePath = `${organizationId}/messages/${conversationId}/${uniqueFilename}`;

	try {
		// Upload file to Supabase Storage
		const { data, error } = await supabase.storage
			.from("photos")
			.upload(storagePath, file, {
				cacheControl: "3600", // Cache for 1 hour
				upsert: false, // Don't overwrite existing files
			});

		if (error) {
			// Handle specific error types
			if (error.message.includes("File size exceeds")) {
				throw new Error(
					"File size exceeds the maximum allowed size of 8MB"
				);
			}
			if (
				error.message.includes("permission") ||
				error.message.includes("policy")
			) {
				throw new Error(
					"Permission denied. You don't have access to upload photos to this location."
				);
			}
			if (
				error.message.includes("network") ||
				error.message.includes("fetch")
			) {
				throw new Error(
					"Network error. Please check your connection and try again."
				);
			}

			// Generic error
			throw new Error(
				getErrorMessage(
					error,
					"Failed to upload photo. Please try again."
				)
			);
		}

		if (!data) {
			throw new Error("Upload succeeded but no data returned");
		}

		// Get public URL for the uploaded file
		const {
			data: { publicUrl },
		} = supabase.storage.from("photos").getPublicUrl(storagePath);

		if (!publicUrl) {
			throw new Error("Failed to get public URL for uploaded photo");
		}

		return publicUrl;
	} catch (error) {
		// Re-throw validation errors as-is (from validateFile function)
		if (
			error instanceof Error &&
			(error.message.includes("exceeds") ||
				error.message.includes("not allowed"))
		) {
			throw error;
		}

		// Re-throw other Error instances as-is
		if (error instanceof Error) {
			throw error;
		}

		// Unknown error type - wrap in Error
		throw new Error(
			"An unexpected error occurred during photo upload. Please try again."
		);
	}
}

/**
 * Uploads a photo for an animal to Supabase Storage
 * @param file - The file to upload
 * @param organizationId - The organization ID (UUID string)
 * @param animalId - The animal ID (UUID string)
 * @returns Promise resolving to the public URL of the uploaded photo
 * @throws Error if upload fails or file is invalid
 */
export async function uploadAnimalPhoto(
	file: File,
	organizationId: string,
	animalId: string
): Promise<string> {
	// Validate file before attempting upload
	validateFile(file);

	// Generate unique filename with timestamp
	const timestamp = Date.now();
	const uniqueFilename = generateUniqueFilename(file.name);
	const filenameWithTimestamp = `${timestamp}_${uniqueFilename}`;

	// Construct storage path: {organization_id}/animals/{animal_id}/{timestamp}_{uuid}_{filename}
	const storagePath = `${organizationId}/animals/${animalId}/${filenameWithTimestamp}`;

	try {
		// Upload file to Supabase Storage
		const { data, error } = await supabase.storage
			.from("photos")
			.upload(storagePath, file, {
				cacheControl: "3600", // Cache for 1 hour
				upsert: false, // Don't overwrite existing files
			});

		if (error) {
			// Handle specific error types
			if (error.message.includes("File size exceeds")) {
				throw new Error(
					"File size exceeds the maximum allowed size of 8MB"
				);
			}
			if (
				error.message.includes("permission") ||
				error.message.includes("policy")
			) {
				throw new Error(
					"Permission denied. You don't have access to upload photos to this location."
				);
			}
			if (
				error.message.includes("network") ||
				error.message.includes("fetch")
			) {
				throw new Error(
					"Network error. Please check your connection and try again."
				);
			}

			// Generic error
			throw new Error(
				getErrorMessage(
					error,
					"Failed to upload photo. Please try again."
				)
			);
		}

		if (!data) {
			throw new Error("Upload succeeded but no data returned");
		}

		// Get public URL for the uploaded file
		const {
			data: { publicUrl },
		} = supabase.storage.from("photos").getPublicUrl(storagePath);

		if (!publicUrl) {
			throw new Error("Failed to get public URL for uploaded photo");
		}

		return publicUrl;
	} catch (error) {
		// Re-throw validation errors as-is (from validateFile function)
		if (
			error instanceof Error &&
			(error.message.includes("exceeds") ||
				error.message.includes("not allowed"))
		) {
			throw error;
		}

		// Re-throw other Error instances as-is
		if (error instanceof Error) {
			throw error;
		}

		// Unknown error type - wrap in Error
		throw new Error(
			"An unexpected error occurred during photo upload. Please try again."
		);
	}
}

/**
 * Deletes all photos in an animal's folder from Supabase Storage
 * This ensures the entire folder is cleaned up, including any orphaned files
 * @param animalId - The animal ID (UUID string)
 * @param organizationId - The organization ID (UUID string)
 * @returns Promise that resolves when deletion is complete
 * @throws Error if deletion fails
 */
export async function deleteAnimalFolder(
	animalId: string,
	organizationId: string
): Promise<void> {
	try {
		const folderPath = `${organizationId}/animals/${animalId}`;

		// List all files in the folder
		const { data: files, error: listError } = await supabase.storage
			.from("photos")
			.list(folderPath, {
				limit: 1000,
				offset: 0,
				sortBy: { column: "name", order: "asc" },
			});

		if (listError) {
			// If folder doesn't exist or we can't list it, that's okay
			if (
				listError.message.includes("not found") ||
				listError.message.includes("does not exist")
			) {
				return;
			}
			throw new Error(
				`Failed to list files in animal folder: ${listError.message}`
			);
		}

		if (!files || files.length === 0) {
			// Folder is already empty, nothing to delete
			return;
		}

		// Build full paths for all files
		const filePaths = files.map((file) => `${folderPath}/${file.name}`);

		// Delete all files at once
		const { data: deletedFiles, error: deleteError } =
			await supabase.storage.from("photos").remove(filePaths);

		if (deleteError) {
			throw new Error(
				`Failed to delete files from animal folder: ${deleteError.message}`
			);
		}

		// Verify deletion succeeded
		if (!deletedFiles || deletedFiles.length === 0) {
			throw new Error(
				`Failed to delete animal folder - no files were deleted. ` +
					`This might be due to RLS policies. Folder: ${folderPath}`
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(
			"An unexpected error occurred while deleting the animal folder."
		);
	}
}

/**
 * Deletes a photo from Supabase Storage
 * @param photoUrl - The public URL of the photo to delete
 * @param organizationId - The organization ID (UUID string)
 * @returns Promise that resolves when deletion is complete
 * @throws Error if deletion fails
 */
export async function deleteAnimalPhoto(
	photoUrl: string,
	organizationId: string
): Promise<void> {
	try {
		// Extract the storage path from the public URL
		// Public URLs are in format: https://[project].supabase.co/storage/v1/object/public/photos/{path}
		// We need to extract the path part after /photos/
		const urlParts = photoUrl.split("/photos/");
		if (urlParts.length !== 2) {
			throw new Error(`Invalid photo URL format: ${photoUrl}`);
		}

		// Extract path and remove any query parameters (e.g., ?t=timestamp)
		// Also decode URL encoding if present
		let storagePath = urlParts[1].split("?")[0];
		try {
			storagePath = decodeURIComponent(storagePath);
		} catch {
			// If decoding fails, use original path
		}

		// Verify the path belongs to the organization's animals folder
		if (!storagePath.startsWith(`${organizationId}/animals/`)) {
			throw new Error(
				`Photo does not belong to this organization's animals. Path: ${storagePath}, Expected org: ${organizationId}, Full URL: ${photoUrl}`
			);
		}

		// Delete the file from Supabase Storage
		const { data, error } = await supabase.storage
			.from("photos")
			.remove([storagePath]);

		if (error) {
			// Handle specific error types
			if (
				error.message.includes("permission") ||
				error.message.includes("policy") ||
				error.message.includes("row-level security") ||
				error.message.includes("RLS")
			) {
				throw new Error(
					`Permission denied. You don't have access to delete this photo. Error: ${error.message}. ` +
						`This might be due to RLS policies. Path: ${storagePath}, Organization: ${organizationId}`
				);
			}
			if (
				error.message.includes("network") ||
				error.message.includes("fetch")
			) {
				throw new Error(
					"Network error. Please check your connection and try again."
				);
			}

			// If file doesn't exist, that's okay (already deleted)
			if (
				error.message.includes("not found") ||
				error.message.includes("does not exist")
			) {
				// Silently succeed - file is already gone
				return;
			}

			// Generic error
			throw new Error(
				getErrorMessage(
					error,
					`Failed to delete photo. Error: ${error.message}`
				)
			);
		}

		// Verify deletion succeeded
		// Supabase returns an array of deleted file names in the data field
		// If data is empty, the deletion likely failed
		if (!data || !Array.isArray(data) || data.length === 0) {
			throw new Error(
				`Photo deletion failed - no files were deleted. ` +
					`This might be due to RLS policies blocking the deletion. ` +
					`Path: ${storagePath}`
			);
		}

		// Verify our file is in the deleted list
		const fileName = storagePath.split("/").pop();
		const deletedFileNames = data.map((item) => {
			// Supabase returns FileObject with 'name' property, or sometimes just the name string
			return typeof item === "string" ? item : item.name || item;
		});

		if (
			!deletedFileNames.some(
				(name) => name === fileName || name === storagePath
			)
		) {
			throw new Error(
				`Photo deletion failed - file was not deleted. ` +
					`This might be due to RLS policies blocking the deletion. ` +
					`Path: ${storagePath}`
			);
		}
	} catch (error) {
		// Re-throw Error instances as-is
		if (error instanceof Error) {
			throw error;
		}

		// Unknown error type - wrap in Error
		throw new Error(
			"An unexpected error occurred during photo deletion. Please try again."
		);
	}
}

/**
 * Uploads a photo for a group to Supabase Storage
 * @param file - The file to upload
 * @param organizationId - The organization ID (UUID string)
 * @param groupId - The group ID (UUID string)
 * @returns Promise resolving to the public URL of the uploaded photo
 * @throws Error if upload fails or file is invalid
 */
export async function uploadGroupPhoto(
	file: File,
	organizationId: string,
	groupId: string
): Promise<string> {
	// Validate file before attempting upload
	validateFile(file);

	// Generate unique filename with timestamp
	const timestamp = Date.now();
	const uniqueFilename = generateUniqueFilename(file.name);
	const filenameWithTimestamp = `${timestamp}_${uniqueFilename}`;

	// Construct storage path: {organization_id}/groups/{group_id}/{timestamp}_{uuid}_{filename}
	const storagePath = `${organizationId}/groups/${groupId}/${filenameWithTimestamp}`;

	try {
		// Upload file to Supabase Storage
		const { data, error } = await supabase.storage
			.from("photos")
			.upload(storagePath, file, {
				cacheControl: "3600", // Cache for 1 hour
				upsert: false, // Don't overwrite existing files
			});

		if (error) {
			// Handle specific error types
			if (error.message.includes("File size exceeds")) {
				throw new Error(
					"File size exceeds the maximum allowed size of 8MB"
				);
			}
			if (
				error.message.includes("permission") ||
				error.message.includes("policy")
			) {
				throw new Error(
					"Permission denied. You don't have access to upload photos to this location."
				);
			}
			if (
				error.message.includes("network") ||
				error.message.includes("fetch")
			) {
				throw new Error(
					"Network error. Please check your connection and try again."
				);
			}

			// Generic error
			throw new Error(
				getErrorMessage(
					error,
					"Failed to upload photo. Please try again."
				)
			);
		}

		if (!data) {
			throw new Error("Upload succeeded but no data returned");
		}

		// Get public URL for the uploaded file
		const {
			data: { publicUrl },
		} = supabase.storage.from("photos").getPublicUrl(storagePath);

		if (!publicUrl) {
			throw new Error("Failed to get public URL for uploaded photo");
		}

		return publicUrl;
	} catch (error) {
		// Re-throw validation errors as-is (from validateFile function)
		if (
			error instanceof Error &&
			(error.message.includes("exceeds") ||
				error.message.includes("not allowed"))
		) {
			throw error;
		}

		// Re-throw other Error instances as-is
		if (error instanceof Error) {
			throw error;
		}

		// Unknown error type - wrap in Error
		throw new Error(
			"An unexpected error occurred during photo upload. Please try again."
		);
	}
}

/**
 * Deletes a group photo from Supabase Storage
 * @param photoUrl - The public URL of the photo to delete
 * @param organizationId - The organization ID (UUID string)
 * @returns Promise that resolves when deletion is complete
 * @throws Error if deletion fails
 */
export async function deleteGroupPhoto(
	photoUrl: string,
	organizationId: string
): Promise<void> {
	try {
		// Extract the storage path from the public URL
		// Public URLs are in format: https://[project].supabase.co/storage/v1/object/public/photos/{path}
		// We need to extract the path part after /photos/
		const urlParts = photoUrl.split("/photos/");
		if (urlParts.length !== 2) {
			throw new Error(`Invalid photo URL format: ${photoUrl}`);
		}

		// Extract path and remove any query parameters (e.g., ?t=timestamp)
		// Also decode URL encoding if present
		let storagePath = urlParts[1].split("?")[0];
		try {
			storagePath = decodeURIComponent(storagePath);
		} catch {
			// If decoding fails, use original path
		}

		// Verify the path belongs to the organization's groups folder
		if (!storagePath.startsWith(`${organizationId}/groups/`)) {
			throw new Error(
				`Photo does not belong to this organization's groups. Path: ${storagePath}, Expected org: ${organizationId}, Full URL: ${photoUrl}`
			);
		}

		// Delete the file from Supabase Storage
		const { data, error } = await supabase.storage
			.from("photos")
			.remove([storagePath]);

		if (error) {
			// Handle specific error types
			if (
				error.message.includes("permission") ||
				error.message.includes("policy") ||
				error.message.includes("row-level security") ||
				error.message.includes("RLS")
			) {
				throw new Error(
					`Permission denied. You don't have access to delete this photo. Error: ${error.message}. ` +
						`This might be due to RLS policies. Path: ${storagePath}, Organization: ${organizationId}`
				);
			}
			if (
				error.message.includes("network") ||
				error.message.includes("fetch")
			) {
				throw new Error(
					"Network error. Please check your connection and try again."
				);
			}

			// If file doesn't exist, that's okay (already deleted)
			if (
				error.message.includes("not found") ||
				error.message.includes("does not exist")
			) {
				// Silently succeed - file is already gone
				return;
			}

			// Generic error
			throw new Error(
				getErrorMessage(
					error,
					`Failed to delete photo. Error: ${error.message}`
				)
			);
		}

		// Verify deletion succeeded
		// Supabase returns an array of deleted file names in the data field
		// If data is empty, the deletion likely failed
		if (!data || !Array.isArray(data) || data.length === 0) {
			throw new Error(
				`Photo deletion failed - no files were deleted. ` +
					`This might be due to RLS policies blocking the deletion. ` +
					`Path: ${storagePath}`
			);
		}

		// Verify our file is in the deleted list
		const fileName = storagePath.split("/").pop();
		const deletedFileNames = data.map((item) => {
			// Supabase returns FileObject with 'name' property, or sometimes just the name string
			return typeof item === "string" ? item : item.name || item;
		});

		if (
			!deletedFileNames.some(
				(name) => name === fileName || name === storagePath
			)
		) {
			throw new Error(
				`Photo deletion failed - file was not deleted. ` +
					`This might be due to RLS policies blocking the deletion. ` +
					`Path: ${storagePath}`
			);
		}
	} catch (error) {
		// Re-throw Error instances as-is
		if (error instanceof Error) {
			throw error;
		}

		// Unknown error type - wrap in Error
		throw new Error(
			"An unexpected error occurred during photo deletion. Please try again."
		);
	}
}
