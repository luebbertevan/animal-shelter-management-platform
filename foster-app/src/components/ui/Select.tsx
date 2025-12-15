import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	label: string;
	error?: string;
	options: { value: string; label: string }[];
}

export default function Select({
	label,
	error,
	id,
	options,
	className = "",
	...props
}: SelectProps) {
	const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, "-")}`;

	return (
		<div>
			<label
				htmlFor={selectId}
				className="block text-sm font-medium text-gray-700 mb-1"
			>
				{label}
			</label>
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
