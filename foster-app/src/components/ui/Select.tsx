import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	label?: string; // Optional label - can be omitted for compact filter use
	error?: string;
	options: { value: string; label: string }[];
	compact?: boolean; // Compact mode for inline/filter use
}

export default function Select({
	label,
	error,
	id,
	options,
	className = "",
	compact = false,
	...props
}: SelectProps) {
	const selectId = id || `select-${(label || "filter").toLowerCase().replace(/\s+/g, "-")}`;

	if (compact) {
		return (
			<div className={`flex items-center ${label ? "gap-2" : ""}`}>
				{label && (
					<label
						htmlFor={selectId}
						className="text-sm font-medium text-gray-700 whitespace-nowrap w-[130px] flex-shrink-0"
					>
						{label}:
					</label>
				)}
				<div className="relative w-[168px] flex-shrink-0">
					<select
						id={selectId}
						className={`w-full cursor-pointer appearance-none pl-3 pr-12 py-1.5 text-sm border text-gray-900 ${
							error
								? "border-red-300 focus:border-red-500 focus:ring-red-500"
								: "border-pink-300 focus:border-pink-500 focus:ring-pink-500"
						} rounded-[36px] shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white ${className}`}
						{...props}
					>
						{options.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<ChevronDownIcon
						className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700"
						aria-hidden
					/>
				</div>
				{error && <p className="mt-1 text-sm text-red-600">{error}</p>}
			</div>
		);
	}

	return (
		<div>
			{label && (
				<label
					htmlFor={selectId}
					className="block text-sm font-medium text-gray-700 mb-1"
				>
					{label}
				</label>
			)}
			<select
				id={selectId}
				className={`w-full px-3 py-2 border text-gray-900 ${
					error
						? "border-red-300 focus:border-red-500 focus:ring-red-500"
						: "border-pink-300 focus:border-pink-500 focus:ring-pink-500"
				} rounded-md shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white ${className}`}
				{...props}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			{error && <p className="mt-1 text-sm text-red-600">{error}</p>}
		</div>
	);
}
