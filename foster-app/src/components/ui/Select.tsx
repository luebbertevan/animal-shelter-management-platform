import type { SelectHTMLAttributes } from "react";

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
				<select
					id={selectId}
					className={`w-[140px] flex-shrink-0 px-2.5 py-1.5 text-sm border text-gray-900 ${
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
