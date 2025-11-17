import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label: string;
	error?: string;
}

export default function Input({
	label,
	error,
	id,
	className = "",
	...props
}: InputProps) {
	const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

	return (
		<div>
			<label
				htmlFor={inputId}
				className="block text-sm font-medium text-gray-700 mb-1"
			>
				{label}
			</label>
			<input
				id={inputId}
				className={`w-full px-3 py-2 border ${
					error
						? "border-red-300 focus:border-red-500 focus:ring-red-500"
						: "border-pink-300 focus:border-pink-500 focus:ring-pink-500"
				} rounded-md shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
				{...props}
			/>
			{error && <p className="mt-1 text-sm text-red-600">{error}</p>}
		</div>
	);
}
