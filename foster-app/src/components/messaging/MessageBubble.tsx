import { useState } from "react";
import PhotoLightbox from "./PhotoLightbox";
import AnimalCard from "../animals/AnimalCard";
import GroupCard from "../animals/GroupCard";
import type { LifeStage, MessageTagWithEntity, PhotoMetadata } from "../../types";
import { TAG_TYPES } from "../../types";
import { getMediumImageUrl } from "../../lib/photoUtils";

interface MessageBubbleProps {
	message: {
		id: string;
		content: string;
		created_at: string;
		sender_name: string;
		photo_urls?: string[] | null;
		tags?: Array<MessageTagWithEntity>;
	};
	isOwnMessage: boolean;
	/** Whether this is the first message in a group from the same sender */
	isFirstInGroup?: boolean;
	/** Whether this is the last message in a group from the same sender */
	isLastInGroup?: boolean;
	/**
	 * Optional map of animal data used by GroupCard to fall back to individual animal photos
	 * when a group has no group photos.
	 */
	animalDataMap?: Map<
		string,
		{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
	>;
}

/**
 * Format timestamp in a clean, readable way
 * - Today: "2:34 PM"
 * - This week: "Mon 2:34 PM"
 * - Older: "Jan 5, 2:34 PM"
 */
function formatTimestamp(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffDays = Math.floor(
		(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
	);

	const timeStr = date.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});

	if (diffDays === 0) {
		// Today - just show time
		return timeStr;
	} else if (diffDays < 7) {
		// This week - show day name
		const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
		return `${dayName} ${timeStr}`;
	} else {
		// Older - show month and day
		const dateStr = date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
		return `${dateStr}, ${timeStr}`;
	}
}

export default function MessageBubble({
	message,
	isOwnMessage,
	isFirstInGroup = true,
	isLastInGroup = true,
	animalDataMap,
}: MessageBubbleProps) {
	const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
	const [imageLoadStates, setImageLoadStates] = useState<
		Map<string, boolean>
	>(new Map());
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);

	const timestamp = formatTimestamp(message.created_at);

	const photoUrls = message.photo_urls || [];
	const hasPhotos = photoUrls.length > 0;
	const hasContent = message.content.trim().length > 0;
	const tags = message.tags || [];
	const hasTags = tags.length > 0;

	const handleImageLoad = (url: string) => {
		setImageLoadStates((prev: Map<string, boolean>) => {
			const updated = new Map(prev);
			updated.set(url, true);
			return updated;
		});
	};

	const handleImageError = (url: string) => {
		setImageErrors((prev: Set<string>) => new Set(prev).add(url));
	};

	const handlePhotoClick = (index: number) => {
		setLightboxIndex(index);
		setLightboxOpen(true);
	};

	return (
		<div
			className={`flex flex-col ${
				isOwnMessage ? "items-end" : "items-start"
			} ${isFirstInGroup ? "mt-3" : "mt-0.5"} w-full`}
		>
			{/* Sender name - only shown on first message in group, not for own messages */}
			{isFirstInGroup && !isOwnMessage && (
				<div className="text-xs font-medium mb-1 text-gray-600 ml-1">
					{message.sender_name}
				</div>
			)}

			{/* Message bubble */}
			{(hasContent || (!hasPhotos && !hasTags)) && (
				<div
					className={`rounded-2xl ${
						isOwnMessage
							? "bg-pink-100 text-gray-900"
							: "bg-white border border-gray-200 text-gray-900"
					} ${hasContent ? "px-3.5 py-2" : "px-3 py-1.5"} max-w-[85%] sm:max-w-[75%]`}
				>
					{/* Text content */}
					{hasContent && (
						<div className="break-words leading-relaxed">
							{message.content}
						</div>
					)}
				</div>
			)}

			{/* Photos - outside message bubble to avoid width constraints */}
			{hasPhotos && (
				<div
					className={`w-full mt-1 ${
						isOwnMessage ? "flex justify-end" : "flex justify-start"
					}`}
				>
					<div
						className={`flex flex-wrap ${
							isOwnMessage
								? "max-w-[85%] sm:max-w-[75%] justify-end"
								: "max-w-[85%] sm:max-w-[75%] justify-start"
						}`}
					>
						{photoUrls.length > 1 && (
							<div
								className={`w-full text-xs mb-1 ${
									isOwnMessage ? "text-right" : "text-left"
								} text-gray-500`}
							>
								{photoUrls.length} photos
							</div>
						)}
						<div
							className={`grid gap-1.5 ${
								photoUrls.length === 1
									? "grid-cols-1"
									: photoUrls.length === 2
									? "grid-cols-2"
									: photoUrls.length === 3
									? "grid-cols-2 sm:grid-cols-3"
									: photoUrls.length === 4
									? "grid-cols-2 sm:grid-cols-4"
									: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
							}`}
						>
							{photoUrls.map((url, index) => {
								const isLoading = !imageLoadStates.get(url);
								const hasError = imageErrors.has(url);

								return (
									<div
										key={`${url}-${index}`}
										className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 w-full max-w-[250px]"
									>
										{isLoading && !hasError && (
											<div className="absolute inset-0 flex items-center justify-center">
												<div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-pink-500"></div>
											</div>
										)}
										{hasError ? (
											<div className="absolute inset-0 flex items-center justify-center bg-gray-200">
												<svg
													className="h-8 w-8 text-gray-400"
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
											</div>
										) : (
											<img
												src={getMediumImageUrl(url)}
												alt={`Photo ${index + 1}`}
												loading="lazy"
												className={`w-full h-full object-cover cursor-pointer ${
													isLoading
														? "opacity-0"
														: "opacity-100"
												} transition-opacity duration-200 hover:opacity-90`}
												onLoad={() =>
													handleImageLoad(url)
												}
												onError={() =>
													handleImageError(url)
												}
												onClick={() =>
													handlePhotoClick(index)
												}
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* Tags - outside message bubble to avoid width constraints */}
			{hasTags && (
				<div
					className={`w-full mt-1.5 ${
						isOwnMessage ? "flex justify-end" : "flex justify-start"
					}`}
				>
					<div
						className={`flex flex-wrap gap-2 ${
							isOwnMessage
								? "max-w-[85%] sm:max-w-[75%] justify-end"
								: "max-w-[85%] sm:max-w-[75%] justify-start"
						}`}
					>
						{tags.map((tag, index) => {
							if (tag.type === TAG_TYPES.ANIMAL && tag.animal) {
								return (
									<div
										key={`${tag.type}-${tag.id}-${index}`}
										className="w-[140px] sm:w-[160px]"
									>
										<AnimalCard
											animal={tag.animal}
											hideGroupIndicator={true}
										/>
									</div>
								);
							} else if (
								tag.type === TAG_TYPES.GROUP &&
								tag.group
							) {
								return (
									<div
										key={`${tag.type}-${tag.id}-${index}`}
										className="w-[140px] sm:w-[160px]"
									>
										<GroupCard
											group={tag.group}
											animalData={animalDataMap}
										/>
									</div>
								);
							} else {
								// Fallback for fosters or if data is missing
								let linkTo = "";
								if (tag.type === TAG_TYPES.ANIMAL) {
									linkTo = `/animals/${tag.id}`;
								} else if (tag.type === TAG_TYPES.GROUP) {
									linkTo = `/groups/${tag.id}`;
								} else if (tag.type === TAG_TYPES.FOSTER) {
									linkTo = `/fosters/${tag.id}`;
								}

								return (
									<a
										key={`${tag.type}-${tag.id}-${index}`}
										href={linkTo}
										className="inline-flex items-center gap-1 px-3 py-1.5 bg-pink-100 text-pink-800 rounded-xl text-sm hover:bg-pink-200 transition-colors border border-pink-200"
									>
										<span className="font-medium">
											{tag.name}
										</span>
									</a>
								);
							}
						})}
					</div>
				</div>
			)}

			{/* Timestamp - only shown on last message in group */}
			{isLastInGroup && (
				<div
					className={`text-xs mt-1 ${
						isOwnMessage
							? "text-gray-400 mr-1"
							: "text-gray-400 ml-1"
					}`}
				>
					{timestamp}
				</div>
			)}

			{/* Photo Lightbox */}
			{hasPhotos && (
				<PhotoLightbox
					key={`${lightboxIndex}-${lightboxOpen}`}
					photos={photoUrls}
					initialIndex={lightboxIndex}
					isOpen={lightboxOpen}
					onClose={() => setLightboxOpen(false)}
				/>
			)}
		</div>
	);
}
