import {
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	totalItems: number;
	itemsPerPage: number;
}

export default function Pagination({
	currentPage,
	totalPages,
	onPageChange,
	totalItems,
	itemsPerPage,
}: PaginationProps) {
	// Calculate the range of items being displayed
	const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
	const endItem = Math.min(currentPage * itemsPerPage, totalItems);

	// Generate page numbers to display
	const getPageNumbers = () => {
		const pages: (number | string)[] = [];
		const maxVisible = 5; // Maximum number of page buttons to show

		if (totalPages <= maxVisible) {
			// Show all pages if total is less than max
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Show first page
			pages.push(1);

			// Calculate start and end of middle pages
			let start = Math.max(2, currentPage - 1);
			let end = Math.min(totalPages - 1, currentPage + 1);

			// Adjust if we're near the beginning
			if (currentPage <= 3) {
				end = Math.min(4, totalPages - 1);
			}

			// Adjust if we're near the end
			if (currentPage >= totalPages - 2) {
				start = Math.max(2, totalPages - 3);
			}

			// Add ellipsis if needed
			if (start > 2) {
				pages.push("...");
			}

			// Add middle pages
			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			// Add ellipsis if needed
			if (end < totalPages - 1) {
				pages.push("...");
			}

			// Show last page
			pages.push(totalPages);
		}

		return pages;
	};

	const pageNumbers = getPageNumbers();

	if (totalPages <= 1) {
		// Don't show pagination if there's only one page or no items
		return null;
	}

	return (
		<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-white rounded-lg border border-gray-200">
			{/* Items count */}
			<div className="text-sm text-gray-700">
				Showing <span className="font-medium">{startItem}</span> to{" "}
				<span className="font-medium">{endItem}</span> of{" "}
				<span className="font-medium">{totalItems}</span> results
			</div>

			{/* Page controls */}
			<div className="flex items-center gap-2">
				{/* Previous button */}
				<button
					type="button"
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className="p-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					aria-label="Previous page"
				>
					<ChevronLeftIcon className="h-5 w-5" />
				</button>

				{/* Page numbers */}
				<div className="flex items-center gap-1">
					{pageNumbers.map((page, index) => {
						if (page === "...") {
							return (
								<span
									key={`ellipsis-${index}`}
									className="px-2 text-gray-500"
								>
									...
								</span>
							);
						}

						const pageNum = page as number;
						const isActive = pageNum === currentPage;

						return (
							<button
								key={pageNum}
								type="button"
								onClick={() => onPageChange(pageNum)}
								className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 transition-colors ${
									isActive
										? "bg-pink-500 text-white"
										: "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
								}`}
								aria-label={`Go to page ${pageNum}`}
								aria-current={isActive ? "page" : undefined}
							>
								{pageNum}
							</button>
						);
					})}
				</div>

				{/* Next button */}
				<button
					type="button"
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className="p-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					aria-label="Next page"
				>
					<ChevronRightIcon className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}

