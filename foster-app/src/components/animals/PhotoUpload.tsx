import { useState, useRef, useEffect, useCallback } from "react";
import type { PhotoMetadata } from "../../types";
import { getThumbnailUrl } from "../../lib/photoUtils";

// Maximum file size: 8MB
const MAX_FILE_SIZE = 8 * 1024 * 1024;
// Allowed MIME types
const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
];

interface SelectedPhoto {
	file: File;
	preview: string; // Object URL for preview
	id: string; // Unique ID for React key
}

interface PhotoUploadProps {
	maxPhotos?: number;
	onPhotosChange: (photos: File[]) => void;
	existingPhotos?: PhotoMetadata[];
	onRemovePhoto?: (photoUrl: string) => void;
	disabled?: boolean;
	error?: string | null;
}

/**
 * Reusable photo upload component for animals (creation and edit forms)
 */
export default function PhotoUpload({
	maxPhotos = 10,
	onPhotosChange,
	existingPhotos = [],
	onRemovePhoto,
	disabled = false,
	error: externalError,
}: PhotoUploadProps) {
	const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const pasteZoneRef = useRef<HTMLDivElement>(null);
	const selectedPhotosRef = useRef<SelectedPhoto[]>([]);

	const totalPhotos = selectedPhotos.length + existingPhotos.length;
	const canAddMore = totalPhotos < maxPhotos;

	// Validate file before adding to selection
	const validateFile = (file: File): string | null => {
		// Check file size
		if (file.size > MAX_FILE_SIZE) {
			const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
			return `File "${file.name}" is too large (${sizeMB}MB). Maximum size is 8MB.`;
		}

		// Check file type
		if (!ALLOWED_MIME_TYPES.includes(file.type)) {
			return `File "${file.name}" is not a supported image type. Allowed types: jpeg, jpg, png, webp.`;
		}

		return null;
	};

	// Process files (shared between file input and paste)
	const processFiles = useCallback(
		(files: File[]) => {
			const currentTotal = selectedPhotos.length + existingPhotos.length;
			if (currentTotal + files.length > maxPhotos) {
				setError(`Maximum ${maxPhotos} photos allowed.`);
				return;
			}

			// Validate and add files
			const newPhotos: SelectedPhoto[] = [];
			const errors: string[] = [];

			files.forEach((file) => {
				const validationError = validateFile(file);
				if (validationError) {
					errors.push(validationError);
				} else {
					// Create preview URL
					const preview = URL.createObjectURL(file);
					newPhotos.push({
						file,
						preview,
						id: crypto.randomUUID(),
					});
				}
			});

			if (errors.length > 0) {
				setError(errors.join(" "));
			}

			if (newPhotos.length > 0) {
				setSelectedPhotos((prev) => {
					const updated = [...prev, ...newPhotos];
					selectedPhotosRef.current = updated;
					return updated;
				});
			}
		},
		[selectedPhotos.length, existingPhotos.length, maxPhotos]
	);

	// Handle file selection from input
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		setError(null);
		processFiles(Array.from(files));

		// Reset file input to allow selecting the same file again
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	// Handle paste event for photos (keyboard shortcut - works anywhere on page)
	useEffect(() => {
		const handlePaste = (e: ClipboardEvent) => {
			// Don't handle if disabled or at max
			if (disabled || !canAddMore) return;

			const items = e.clipboardData?.items;
			if (!items) return;

			const imageFiles: File[] = [];

			// Extract image files from clipboard
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item.type.indexOf("image") !== -1) {
					const file = item.getAsFile();
					if (file) {
						imageFiles.push(file);
					}
				}
			}

			if (imageFiles.length === 0) return;

			// Prevent default paste behavior for images
			e.preventDefault();
			setError(null);
			processFiles(imageFiles);
		};

		// Attach to window so paste works anywhere on the form
		window.addEventListener("paste", handlePaste);
		return () => {
			window.removeEventListener("paste", handlePaste);
		};
	}, [disabled, canAddMore, processFiles]);

	// Handle paste on the paste zone (for right-click paste support)
	const handlePasteZonePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
		// Always prevent default and stop propagation to avoid double handling
		e.preventDefault();
		e.stopPropagation();

		if (disabled || !canAddMore) return;

		const items = e.clipboardData?.items;
		if (!items) return;

		const imageFiles: File[] = [];

		// Extract image files from clipboard
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.type.indexOf("image") !== -1) {
				const file = item.getAsFile();
				if (file) {
					imageFiles.push(file);
				}
			}
		}

		if (imageFiles.length === 0) return;

		setError(null);
		processFiles(imageFiles);
	};

	// Block all keyboard input in the paste zone (except paste shortcuts)
	const handlePasteZoneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		// Allow Ctrl+V / Cmd+V for paste
		if ((e.ctrlKey || e.metaKey) && e.key === "v") {
			return;
		}
		// Block all other keyboard input
		e.preventDefault();
	};

	// Prevent any text changes in the paste zone
	const handlePasteZoneInput = () => {
		if (pasteZoneRef.current) {
			pasteZoneRef.current.textContent = "Paste";
		}
	};

	// Handle click-to-paste using Clipboard API
	const handlePasteZoneClick = async () => {
		if (disabled || !canAddMore) return;

		try {
			// Request clipboard read permission
			const clipboardItems = await navigator.clipboard.read();
			const imageFiles: File[] = [];

			for (const clipboardItem of clipboardItems) {
				for (const type of clipboardItem.types) {
					if (type.startsWith("image/")) {
						const blob = await clipboardItem.getType(type);
						// Determine file extension from MIME type
						const extension = type.split("/")[1] || "png";
						const file = new File(
							[blob],
							`pasted-image.${extension}`,
							{ type }
						);
						imageFiles.push(file);
					}
				}
			}

			if (imageFiles.length > 0) {
				setError(null);
				processFiles(imageFiles);
			}
		} catch {
			// User denied permission, clipboard empty, or no image in clipboard
			// Silently fail - user can still use right-click or Ctrl+V
		}
	};

	// Remove photo from selection (new photos only)
	const handleRemovePhoto = (photoId: string) => {
		setSelectedPhotos((prev) => {
			const photo = prev.find((p) => p.id === photoId);
			if (photo) {
				// Revoke object URL to free memory
				URL.revokeObjectURL(photo.preview);
			}
			const updated = prev.filter((p) => p.id !== photoId);
			selectedPhotosRef.current = updated;
			return updated;
		});
	};

	// Remove existing photo (for edit form)
	const handleRemoveExistingPhoto = (photoUrl: string) => {
		if (onRemovePhoto) {
			onRemovePhoto(photoUrl);
		}
	};

	// Notify parent when selectedPhotos changes (but not during render)
	useEffect(() => {
		onPhotosChange(selectedPhotos.map((p) => p.file));
	}, [selectedPhotos, onPhotosChange]);

	// Clean up object URLs when component unmounts
	useEffect(() => {
		return () => {
			// Clean up all object URLs on unmount using ref
			selectedPhotosRef.current.forEach((photo) => {
				URL.revokeObjectURL(photo.preview);
			});
		};
	}, []); // Only run on unmount

	const displayError = externalError || error;

	return (
		<div className="space-y-3">
			<label className="block text-sm font-medium text-gray-700">
				Photos {totalPhotos > 0 && `(${totalPhotos}/${maxPhotos})`}
			</label>

			{displayError && (
				<div className="p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
					{displayError}
				</div>
			)}

			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/jpg,image/png,image/webp"
				multiple
				onChange={handleFileSelect}
				disabled={disabled || !canAddMore}
				className="hidden"
			/>

			{/* Photo previews - unified grid for all photos */}
			{(selectedPhotos.length > 0 || existingPhotos.length > 0) && (
				<div className="flex flex-wrap gap-2">
					{/* Existing photos (from database) */}
					{existingPhotos.map((photo, index) => (
						<div
							key={`existing-${index}`}
							className="relative group"
						>
							<img
								src={getThumbnailUrl(photo.url)}
								alt={`Photo ${index + 1}`}
								loading="lazy"
								className="w-20 h-20 object-cover rounded border border-gray-300"
							/>
							{onRemovePhoto && (
								<button
									type="button"
									onClick={() =>
										handleRemoveExistingPhoto(photo.url)
									}
									disabled={disabled}
									className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									aria-label="Remove photo"
								>
									×
								</button>
							)}
						</div>
					))}

					{/* New photos (selected but not yet uploaded) */}
					{selectedPhotos.map((photo) => (
						<div key={photo.id} className="relative group">
							<img
								src={photo.preview}
								alt={photo.file.name}
								loading="lazy"
								className="w-20 h-20 object-cover rounded border border-gray-300"
							/>
							<button
								type="button"
								onClick={() => handleRemovePhoto(photo.id)}
								disabled={disabled}
								className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Remove photo"
							>
								×
							</button>
						</div>
					))}
				</div>
			)}

			{/* Upload button and paste zone */}
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={disabled || !canAddMore}
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
				>
					{canAddMore
						? "Upload"
						: `Maximum ${maxPhotos} photos reached`}
				</button>

				{/* Paste zone for click-to-paste and right-click paste support */}
				{canAddMore && !disabled && (
					<div
						ref={pasteZoneRef}
						contentEditable
						onClick={handlePasteZoneClick}
						onPaste={handlePasteZonePaste}
						onKeyDown={handlePasteZoneKeyDown}
						onInput={handlePasteZoneInput}
						className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-center select-none"
						style={{ caretColor: "transparent" }}
						aria-label="Click or right-click to paste photos"
						title="Click or right-click to paste photos"
						suppressContentEditableWarning
					>
						Paste
					</div>
				)}
			</div>
		</div>
	);
}
