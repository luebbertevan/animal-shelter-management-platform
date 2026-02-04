import { supabase } from "./supabase";
import { getErrorMessage } from "./errorUtils";

// Maximum file size: 8MB (8 * 1024 * 1024 bytes)
const MAX_FILE_SIZE = 8 * 1024 * 1024;

// Cache control: 1 year (immutable content-addressed files)
const CACHE_CONTROL_MAX_AGE = "31536000";

// Image compression settings
const DEFAULT_MAX_WIDTH = 1920; // Max width for uploaded images
const DEFAULT_COMPRESSION_QUALITY = 0.85; // JPEG quality (0-1)

// Allowed MIME types for photos
const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
];

// ============================================================================
// IMAGE OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Generates an optimized image URL with Supabase Storage transformations
 * Uses Supabase's built-in image transformation to resize and convert formats
 * @param originalUrl - The original public URL from Supabase Storage
 * @param width - Optional width to resize to (maintains aspect ratio)
 * @param quality - Image quality (1-100), default 80
 * @param format - Output format (webp recommended for best compression)
 * @returns Optimized URL with transformation parameters
 */
export function getOptimizedImageUrl(
	originalUrl: string,
	width?: number,
	quality: number = 80,
	format: "webp" | "origin" = "webp"
): string {
	if (!originalUrl) return originalUrl;

	try {
		const url = new URL(originalUrl);

		// Add transformation parameters
		if (width) {
			url.searchParams.set("width", width.toString());
		}
		url.searchParams.set("quality", quality.toString());
		if (format !== "origin") {
			url.searchParams.set("format", format);
		}

		return url.toString();
	} catch {
		// If URL parsing fails, return original
		return originalUrl;
	}
}

/**
 * Generates a thumbnail URL for card/list displays
 * @param originalUrl - The original public URL
 * @returns Optimized URL for thumbnail display (400px width, 75 quality, webp)
 */
export function getThumbnailUrl(originalUrl: string): string {
	return getOptimizedImageUrl(originalUrl, 400, 75, "webp");
}

/**
 * Generates a medium-sized URL for detail views
 * @param originalUrl - The original public URL
 * @returns Optimized URL for medium display (800px width, 80 quality, webp)
 */
export function getMediumImageUrl(originalUrl: string): string {
	return getOptimizedImageUrl(originalUrl, 800, 80, "webp");
}

/**
 * Generates a full-size optimized URL for lightbox/full display
 * @param originalUrl - The original public URL
 * @returns Optimized URL for full display (1600px width, 85 quality, webp)
 */
export function getFullImageUrl(originalUrl: string): string {
	return getOptimizedImageUrl(originalUrl, 1600, 85, "webp");
}

// ============================================================================
// CLIENT-SIDE IMAGE COMPRESSION
// ============================================================================

/**
 * Compresses an image file before upload to reduce file size
 * Resizes images larger than maxWidth and applies JPEG compression
 * @param file - The original file to compress
 * @param maxWidth - Maximum width (default 1920px)
 * @param quality - JPEG quality 0-1 (default 0.85)
 * @returns Promise resolving to compressed file
 */
export async function compressImage(
	file: File,
	maxWidth: number = DEFAULT_MAX_WIDTH,
	quality: number = DEFAULT_COMPRESSION_QUALITY
): Promise<File> {
	// Skip compression for small files (< 500KB) and WebP (already compressed)
	if (file.size < 500 * 1024 || file.type === "image/webp") {
		return file;
	}

	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);

		reader.onload = (e) => {
			const img = new Image();
			img.src = e.target?.result as string;

			img.onload = () => {
				// Calculate new dimensions
				let width = img.width;
				let height = img.height;

				if (width > maxWidth) {
					height = Math.round((height * maxWidth) / width);
					width = maxWidth;
				}

				// Create canvas and draw resized image
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve(file); // Fallback to original
					return;
				}

				// Use high-quality image smoothing
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = "high";
				ctx.drawImage(img, 0, 0, width, height);

				// Convert to blob
				canvas.toBlob(
					(blob) => {
						if (blob && blob.size < file.size) {
							// Only use compressed version if smaller
							const compressedFile = new File(
								[blob],
								file.name.replace(/\.[^/.]+$/, ".jpg"),
								{
									type: "image/jpeg",
									lastModified: Date.now(),
								}
							);
							resolve(compressedFile);
						} else {
							resolve(file); // Keep original if compression didn't help
						}
					},
					"image/jpeg",
					quality
				);
			};

			img.onerror = () => {
				resolve(file); // Fallback to original on error
			};
		};

		reader.onerror = () => {
			resolve(file); // Fallback to original on error
		};
	});
}

// ============================================================================
// FILE VALIDATION
// ============================================================================

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

	// Compress image before upload to reduce file size
	const compressedFile = await compressImage(file);

	// Generate unique filename
	const uniqueFilename = generateUniqueFilename(compressedFile.name);

	// Construct storage path: {organization_id}/messages/{conversation_id}/{uuid}_{filename}
	const storagePath = `${organizationId}/messages/${conversationId}/${uniqueFilename}`;

	try {
		// Upload compressed file to Supabase Storage
		const { data, error } = await supabase.storage
			.from("photos")
			.upload(storagePath, compressedFile, {
				cacheControl: CACHE_CONTROL_MAX_AGE, // Cache for 1 year (immutable)
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

	// Compress image before upload to reduce file size
	const compressedFile = await compressImage(file);

	// Generate unique filename with timestamp
	const timestamp = Date.now();
	const uniqueFilename = generateUniqueFilename(compressedFile.name);
	const filenameWithTimestamp = `${timestamp}_${uniqueFilename}`;

	// Construct storage path: {organization_id}/animals/{animal_id}/{timestamp}_{uuid}_{filename}
	const storagePath = `${organizationId}/animals/${animalId}/${filenameWithTimestamp}`;

	try {
		// Upload compressed file to Supabase Storage
		const { data, error } = await supabase.storage
			.from("photos")
			.upload(storagePath, compressedFile, {
				cacheControl: CACHE_CONTROL_MAX_AGE, // Cache for 1 year (immutable)
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

	// Compress image before upload to reduce file size
	const compressedFile = await compressImage(file);

	// Generate unique filename with timestamp
	const timestamp = Date.now();
	const uniqueFilename = generateUniqueFilename(compressedFile.name);
	const filenameWithTimestamp = `${timestamp}_${uniqueFilename}`;

	// Construct storage path: {organization_id}/groups/{group_id}/{timestamp}_{uuid}_{filename}
	const storagePath = `${organizationId}/groups/${groupId}/${filenameWithTimestamp}`;

	try {
		// Upload compressed file to Supabase Storage
		const { data, error } = await supabase.storage
			.from("photos")
			.upload(storagePath, compressedFile, {
				cacheControl: CACHE_CONTROL_MAX_AGE, // Cache for 1 year (immutable)
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
 * Deletes all photos in a group's folder from Supabase Storage
 * This ensures the entire folder is cleaned up, including any orphaned files
 * @param groupId - The group ID (UUID string)
 * @param organizationId - The organization ID (UUID string)
 * @returns Promise that resolves when deletion is complete
 * @throws Error if deletion fails
 */
export async function deleteGroupFolder(
	groupId: string,
	organizationId: string
): Promise<void> {
	try {
		const folderPath = `${organizationId}/groups/${groupId}`;

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
				`Failed to list files in group folder: ${listError.message}`
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
				`Failed to delete files from group folder: ${deleteError.message}`
			);
		}

		// Verify deletion succeeded
		if (!deletedFiles || deletedFiles.length === 0) {
			throw new Error(
				`Failed to delete group folder - no files were deleted. ` +
					`This might be due to RLS policies. Folder: ${folderPath}`
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(
			"An unexpected error occurred while deleting the group folder."
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
