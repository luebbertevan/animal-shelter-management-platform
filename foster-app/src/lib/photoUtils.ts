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
				error.message.includes("quota") ||
				error.message.includes("storage")
			) {
				throw new Error(
					"Storage quota exceeded. Please contact support."
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
