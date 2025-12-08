import { useState } from "react";

interface MessageBubbleProps {
	message: {
		id: string;
		content: string;
		created_at: string;
		sender_name: string;
		photo_urls?: string[] | null;
	};
	isOwnMessage: boolean;
}

export default function MessageBubble({
	message,
	isOwnMessage,
}: MessageBubbleProps) {
	const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
	const [imageLoadStates, setImageLoadStates] = useState<
		Map<string, boolean>
	>(new Map());

	const timestamp = new Date(message.created_at).toLocaleString(undefined, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const photoUrls = message.photo_urls || [];
	const hasPhotos = photoUrls.length > 0;
	const hasContent = message.content.trim().length > 0;

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

	return (
		<div
			className={`flex ${
				isOwnMessage ? "justify-end" : "justify-start"
			} mb-1`}
		>
			<div
				className={`rounded-lg p-3 max-w-[85%] sm:max-w-[80%] shadow-sm ${
					isOwnMessage
						? "bg-gray-700 text-white"
						: "bg-white border border-gray-200"
				}`}
			>
				<div
					className={`text-xs sm:text-sm mb-1.5 ${
						isOwnMessage ? "text-gray-300" : "text-gray-500"
					}`}
				>
					{isOwnMessage ? "You" : message.sender_name} • {timestamp}
				</div>

				{/* Text content */}
				{hasContent && (
					<div
						className={`break-words leading-relaxed mb-2 ${
							isOwnMessage ? "text-white" : "text-gray-900"
						}`}
					>
						{message.content}
					</div>
				)}

				{/* Photos grid */}
				{hasPhotos && (
					<div className="mt-2">
						{photoUrls.length > 1 && (
							<div
								className={`text-xs mb-2 ${
									isOwnMessage
										? "text-gray-300"
										: "text-gray-500"
								}`}
							>
								{photoUrls.length} photo
								{photoUrls.length !== 1 ? "s" : ""}
							</div>
						)}
						<div
							className={`grid gap-2 w-full ${
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
										className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 w-full max-w-[250px]"
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
												src={url}
												alt={`Photo ${index + 1}`}
												className={`w-full h-full object-cover ${
													isLoading
														? "opacity-0"
														: "opacity-100"
												} transition-opacity duration-200`}
												onLoad={() =>
													handleImageLoad(url)
												}
												onError={() =>
													handleImageError(url)
												}
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
