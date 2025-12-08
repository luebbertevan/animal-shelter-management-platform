import { useEffect, useState, useCallback } from "react";

interface PhotoLightboxProps {
	photos: string[];
	initialIndex: number;
	isOpen: boolean;
	onClose: () => void;
}

export default function PhotoLightbox({
	photos,
	initialIndex,
	isOpen,
	onClose,
}: PhotoLightboxProps) {
	// Initialize state from props. When key prop changes in parent, component remounts with new initialIndex
	const [currentIndex, setCurrentIndex] = useState(initialIndex);
	const [imageLoading, setImageLoading] = useState(true);

	// Prevent body scroll when lightbox is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}

		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const handlePrevious = useCallback(() => {
		if (photos.length <= 1) return;
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
		setImageLoading(true);
	}, [photos.length]);

	const handleNext = useCallback(() => {
		if (photos.length <= 1) return;
		setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
		setImageLoading(true);
	}, [photos.length]);

	// Handle keyboard navigation
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			} else if (e.key === "ArrowLeft") {
				handlePrevious();
			} else if (e.key === "ArrowRight") {
				handleNext();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		isOpen,
		currentIndex,
		photos.length,
		onClose,
		handlePrevious,
		handleNext,
	]);

	if (!isOpen || photos.length === 0) return null;

	const currentPhoto = photos[currentIndex];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 transition-opacity duration-200">
			{/* Close button */}
			<button
				onClick={onClose}
				className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors p-2"
				aria-label="Close lightbox"
			>
				<svg
					className="w-6 h-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>

			{/* Photo container - full screen on mobile, centered with margins on desktop */}
			<div className="relative w-full h-full flex items-center justify-center">
				{imageLoading && (
					<div className="absolute inset-0 flex items-center justify-center z-10 bg-transparent">
						<div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
					</div>
				)}
				<img
					ref={(img) => {
						// Check if image is already loaded (cached) when element is created
						// This allows instant display for cached images without spinner
						if (img && img.complete && imageLoading) {
							setImageLoading(false);
						}
					}}
					src={currentPhoto}
					alt={`Photo ${currentIndex + 1} of ${photos.length}`}
					className={`w-full h-full sm:w-auto sm:h-auto sm:max-w-[90vw] sm:max-h-[90vh] object-contain ${
						imageLoading ? "opacity-0" : "opacity-100"
					} transition-opacity duration-200`}
					onLoad={() => {
						// onLoad fires when image finishes loading (for non-cached images)
						setImageLoading(false);
					}}
					onError={() => setImageLoading(false)}
				/>
			</div>

			{/* Bottom controls - navigation and photo count (only for multiple photos) */}
			{photos.length > 1 && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
					<button
						onClick={handlePrevious}
						className="text-white hover:text-gray-300 transition-colors p-2 bg-black bg-opacity-70 rounded-full"
						aria-label="Previous photo"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</button>
					<div className="text-white text-xs sm:text-sm bg-black bg-opacity-70 px-3 py-1.5 rounded whitespace-nowrap">
						{currentIndex + 1} of {photos.length}
					</div>
					<button
						onClick={handleNext}
						className="text-white hover:text-gray-300 transition-colors p-2 bg-black bg-opacity-70 rounded-full"
						aria-label="Next photo"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
				</div>
			)}
		</div>
	);
}
