import { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface SearchInputProps {
	value: string;
	onSearch: (searchTerm: string) => void;
	placeholder?: string;
	disabled?: boolean;
}

export default function SearchInput({
	value,
	onSearch,
	placeholder = "Search...",
	disabled = false,
}: SearchInputProps) {
	const [localValue, setLocalValue] = useState(value);
	const inputRef = useRef<HTMLInputElement>(null);

	// Sync local value with prop value
	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	const handleSearch = () => {
		onSearch(localValue.trim());
	};

	const handleClear = () => {
		setLocalValue("");
		onSearch("");
		// Focus back on input after clearing
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSearch();
		}
	};

	return (
		<div className="flex items-center gap-2 flex-1">
			{/* Search Input */}
			<div className="relative flex-1 flex items-center">
				{/* Search Icon */}
				<div className="absolute left-3 pointer-events-none">
					<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
				</div>

				{/* Input Field */}
				<input
					ref={inputRef}
					type="text"
					value={localValue}
					onChange={(e) => setLocalValue(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					className="w-full pl-10 pr-10 py-2 sm:py-2.5 text-sm sm:text-base border border-pink-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400"
				/>

				{/* Clear Button */}
				{localValue && (
					<button
						type="button"
						onClick={handleClear}
						disabled={disabled}
						className="absolute right-2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						aria-label="Clear search"
					>
						<XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
					</button>
				)}
			</div>

			{/* Search Button - Right Side */}
			<button
				type="button"
				onClick={handleSearch}
				disabled={disabled}
				className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium bg-pink-500 text-white rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:bg-pink-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
				aria-label="Search"
			>
				Search
			</button>
		</div>
	);
}
