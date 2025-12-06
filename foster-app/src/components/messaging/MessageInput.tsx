import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import { getErrorMessage } from "../../lib/errorUtils";
import { uploadPhoto } from "../../lib/photoUtils";
import Button from "../ui/Button";
import LoadingSpinner from "../ui/LoadingSpinner";

// Maximum number of photos per message
const MAX_PHOTOS = 10;
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

interface MessageInputProps {
	conversationId: string;
	onMessageSent: () => void;
}

type UploadResult =
	| { success: true; photo: SelectedPhoto; url: string }
	| { success: false; photo: SelectedPhoto; error: unknown };

async function sendMessage(
	conversationId: string,
	senderId: string,
	content: string,
	photoUrls: string[] | null = null
): Promise<void> {
	const { error } = await supabase.from("messages").insert({
		conversation_id: conversationId,
		sender_id: senderId,
		content: content.trim() || "", // Allow empty content if photos exist
		photo_urls: photoUrls && photoUrls.length > 0 ? photoUrls : null,
	});

	if (error) {
		throw new Error(
			getErrorMessage(error, "Failed to send message. Please try again.")
		);
	}
}

export default function MessageInput({
	conversationId,
	onMessageSent,
}: MessageInputProps) {
	const { user } = useAuth();
	const { profile } = useUserProfile();
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
	const [photoError, setPhotoError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const selectedPhotosRef = useRef<SelectedPhoto[]>([]);

	// Auto-resize textarea based on content
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	}, [message]);

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();

		// Validation: must have either message text or photos
		const trimmedMessage = message.trim();
		if (!trimmedMessage && selectedPhotos.length === 0) {
			return;
		}

		// Validation: user must be authenticated
		if (!user?.id) {
			setError("You must be signed in to send messages.");
			return;
		}

		// Validation: organization ID must be available for photo uploads
		if (!profile?.organization_id) {
			setError("Organization information not available.");
			return;
		}

		setSending(true);
		setError(null);
		setPhotoError(null);

		try {
			const photoUrls: string[] = [];
			const failedPhotos: SelectedPhoto[] = [];

			// Upload photos if any are selected
			if (selectedPhotos.length > 0) {
				setUploading(true);

				// Upload all photos in parallel
				const organizationId = profile.organization_id;
				if (!organizationId) {
					throw new Error("Organization ID not available");
				}
				const uploadPromises = selectedPhotos.map(
					async (photo): Promise<UploadResult> => {
						try {
							const url = await uploadPhoto(
								photo.file,
								organizationId,
								conversationId
							);
							return { success: true, photo, url };
						} catch (err) {
							return { success: false, photo, error: err };
						}
					}
				);

				const uploadResults = await Promise.all(uploadPromises);

				// Separate successful and failed uploads
				uploadResults.forEach((result) => {
					if (result.success) {
						photoUrls.push(result.url);
					} else {
						failedPhotos.push(result.photo);
					}
				});

				setUploading(false);

				// If all photos failed, don't send message
				if (failedPhotos.length === selectedPhotos.length) {
					setPhotoError(
						`${failedPhotos.length} photo${
							failedPhotos.length !== 1 ? "s" : ""
						} failed to upload. Please try again.`
					);
					setSending(false);
					return;
				}

				// If some photos failed, show error but continue
				if (failedPhotos.length > 0) {
					setPhotoError(
						`${failedPhotos.length} photo${
							failedPhotos.length !== 1 ? "s" : ""
						} failed to upload. Message sent with ${
							photoUrls.length
						} photo${photoUrls.length !== 1 ? "s" : ""}.`
					);
					// Remove failed photos from selection
					setSelectedPhotos((prev) => {
						const updated = prev.filter(
							(p) => !failedPhotos.some((fp) => fp.id === p.id)
						);
						selectedPhotosRef.current = updated;
						// Clean up failed photo preview URLs
						failedPhotos.forEach((photo) => {
							URL.revokeObjectURL(photo.preview);
						});
						return updated;
					});
				}
			}

			// Send message with successful photo URLs
			await sendMessage(
				conversationId,
				user.id,
				trimmedMessage,
				photoUrls.length > 0 ? photoUrls : null
			);

			// Clear input and photos on success
			setMessage("");
			// Clean up remaining photo preview URLs
			selectedPhotos.forEach((photo) => {
				URL.revokeObjectURL(photo.preview);
			});
			setSelectedPhotos([]);
			selectedPhotosRef.current = [];
			// Clear photo error if message was sent successfully
			if (failedPhotos.length === 0) {
				setPhotoError(null);
			}
			// Notify parent to refetch messages
			onMessageSent();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to send message. Please try again."
			);
		} finally {
			setSending(false);
			setUploading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Send on Enter (but allow Shift+Enter for new line)
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

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

		setPhotoError(null);

		// Check if adding these files would exceed the limit
		if (selectedPhotos.length + files.length > MAX_PHOTOS) {
			setPhotoError(
				`Maximum ${MAX_PHOTOS} photos per message. Please remove some photos first.`
			);
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
			setPhotoError(errors.join(" "));
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

	// Remove photo from selection
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

	// Clean up object URLs when component unmounts
	useEffect(() => {
		return () => {
			// Clean up all object URLs on unmount using ref
			selectedPhotosRef.current.forEach((photo) => {
				URL.revokeObjectURL(photo.preview);
			});
		};
	}, []); // Only run on unmount

	// Format file size for display
	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	};

	const isDisabled =
		sending ||
		uploading ||
		(!message.trim() && selectedPhotos.length === 0) ||
		!user?.id;

	const handlePhotoButtonClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="bg-white border-t border-gray-200 p-4">
			{error && (
				<div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
					{error}
				</div>
			)}
			{photoError && (
				<div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
					{photoError}
				</div>
			)}
			{uploading && (
				<div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-600 text-sm flex items-center gap-2">
					<LoadingSpinner />
					<span>Uploading photos...</span>
				</div>
			)}

			{/* Photo previews */}
			{selectedPhotos.length > 0 && (
				<div className="mb-3">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-gray-600">
							{selectedPhotos.length} photo
							{selectedPhotos.length !== 1 ? "s" : ""} selected
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{selectedPhotos.map((photo) => (
							<div key={photo.id} className="relative group">
								<img
									src={photo.preview}
									alt={photo.file.name}
									className="w-20 h-20 object-cover rounded border border-gray-300"
								/>
								<button
									type="button"
									onClick={() => handleRemovePhoto(photo.id)}
									className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors"
									aria-label="Remove photo"
								>
									×
								</button>
								<div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b">
									{formatFileSize(photo.file.size)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<form onSubmit={handleSubmit} className="flex gap-2 items-end">
				{/* Hidden file input */}
				<input
					ref={fileInputRef}
					type="file"
					accept="image/jpeg,image/jpg,image/png,image/webp"
					multiple
					onChange={handleFileSelect}
					className="hidden"
				/>

				{/* Photo button */}
				<button
					type="button"
					onClick={handlePhotoButtonClick}
					disabled={sending || selectedPhotos.length >= MAX_PHOTOS}
					className="shrink-0 p-2 text-gray-600 hover:text-pink-500 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
					aria-label="Add photos"
					title="Add photos"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				</button>

				<textarea
					ref={textareaRef}
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={sending}
					rows={1}
					className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none overflow-y-auto bg-white hide-scrollbar"
					style={{
						minHeight: "40px",
						maxHeight: "120px",
						scrollbarWidth: "none",
						msOverflowStyle: "none",
					}}
				/>
				<Button
					type="submit"
					disabled={isDisabled}
					className="w-auto! shrink-0 px-4 py-2"
				>
					{uploading
						? "Uploading..."
						: sending
						? "Sending..."
						: "Send"}
				</Button>
			</form>
		</div>
	);
}
