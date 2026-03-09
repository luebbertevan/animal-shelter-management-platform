import { useState, useRef, useEffect, useLayoutEffect } from "react";

interface InfoTooltipProps {
	/** Content shown on hover (desktop) or click (mobile). */
	content: string;
	/** Optional aria-label for the icon button. */
	ariaLabel?: string;
}

export default function InfoTooltip({ content, ariaLabel = "More information" }: InfoTooltipProps) {
	const [open, setOpen] = useState(false);
	const [tooltipTop, setTooltipTop] = useState(0);
	const containerRef = useRef<HTMLSpanElement>(null);

	useLayoutEffect(() => {
		if (open && containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			setTooltipTop(rect.bottom + 8);
		}
	}, [open]); // Fallback for hover open (desktop)

	useEffect(() => {
		if (!open) return;
		const handleOutside = (e: MouseEvent | TouchEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutside);
		document.addEventListener("touchstart", handleOutside);
		return () => {
			document.removeEventListener("mousedown", handleOutside);
			document.removeEventListener("touchstart", handleOutside);
		};
	}, [open]);

	return (
		<span ref={containerRef} className="relative inline-flex">
			<button
				type="button"
				className="inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1"
				onPointerDown={(e) => {
					e.preventDefault();
					if (containerRef.current) {
						const rect = containerRef.current.getBoundingClientRect();
						setTooltipTop(rect.bottom + 8);
					}
					setOpen((prev) => !prev);
				}}
				onMouseEnter={() => setOpen(true)}
				onMouseLeave={() => setOpen(false)}
				aria-label={ariaLabel}
				aria-expanded={open}
			>
				<svg
					className="h-4 w-4 shrink-0"
					fill="currentColor"
					viewBox="0 0 20 20"
					aria-hidden
				>
					<path
						fillRule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clipRule="evenodd"
					/>
				</svg>
			</button>
			{open && (
				<span
					className="fixed left-1/2 z-50 -translate-x-1/2 min-w-[300px] w-[380px] max-w-[90vw] max-h-[85vh] overflow-y-auto px-3 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded shadow-md whitespace-normal"
					role="tooltip"
					style={{ top: tooltipTop }}
				>
					{content}
				</span>
			)}
		</span>
	);
}
