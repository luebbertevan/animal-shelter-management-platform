import { useState, useRef, useEffect } from "react";
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
	const selectedPhotosRef = useRef<SelectedPhoto[]>([]);

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

	// Handle file selection
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		setError(null);

		// Check if adding these files would exceed the limit
		const totalPhotos = selectedPhotos.length + existingPhotos.length;
		if (totalPhotos + files.length > maxPhotos) {
			setError(`Maximum ${maxPhotos} photos allowed.`);
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			return;
		}

		// Validate and add files
		const newPhotos: SelectedPhoto[] = [];
		const errors: string[] = [];

		Array.from(files).forEach((file) => {
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

		// Reset file input to allow selecting the same file again
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
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

	const totalPhotos = selectedPhotos.length + existingPhotos.length;
	const canAddMore = totalPhotos < maxPhotos;
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

			{/* Upload button */}
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				disabled={disabled || !canAddMore}
				className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
			>
				{canAddMore
					? "Add Photos"
					: `Maximum ${maxPhotos} photos reached`}
			</button>
		</div>
	);
}
