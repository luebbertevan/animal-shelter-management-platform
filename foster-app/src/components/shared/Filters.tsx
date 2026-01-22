import { useState, useEffect, useRef } from "react";
import {
	ChevronDownIcon,
	ChevronUpIcon,
	XMarkIcon,
	FunnelIcon,
} from "@heroicons/react/24/outline";
import Toggle from "../ui/Toggle";
import Select from "../ui/Select";

// PriorityFilter - Toggle for high priority
interface PriorityFilterProps {
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
	compact?: boolean;
}

export function PriorityFilter({
	value,
	onChange,
	disabled = false,
	compact = false,
}: PriorityFilterProps) {
	if (compact) {
		return (
			<div className="flex items-center gap-2">
				<label className="text-sm font-medium text-gray-700 whitespace-nowrap">
					High Priority:
				</label>
				<Toggle
					label=""
					checked={value}
					onChange={onChange}
					disabled={disabled}
				/>
			</div>
		);
	}
	return (
		<Toggle
			label="High Priority"
			checked={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}

// SelectFilter - Generic dropdown filter component
interface SelectFilterProps {
	label?: string; // Optional label - omitted for compact filter use
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	disabled?: boolean;
	placeholder?: string;
	compact?: boolean;
}

export function SelectFilter({
	label,
	value,
	onChange,
	options,
	disabled = false,
	placeholder = "All",
	compact = false,
}: SelectFilterProps) {
	// Add "All" option at the beginning
	const allOptions = [{ value: "", label: placeholder }, ...options];

	return (
		<Select
			label={label}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			options={allOptions}
			disabled={disabled}
			compact={compact}
		/>
	);
}

// ToggleFilter - Generic toggle/checkbox filter
interface ToggleFilterProps {
	label: string;
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
	compact?: boolean;
}

export function ToggleFilter({
	label,
	value,
	onChange,
	disabled = false,
	compact = false,
}: ToggleFilterProps) {
	if (compact) {
		return (
			<div className="flex items-center gap-2">
				<label className="text-sm font-medium text-gray-700 whitespace-nowrap">
					{label}:
				</label>
				<Toggle
					label=""
					checked={value}
					onChange={onChange}
					disabled={disabled}
				/>
			</div>
		);
	}
	return (
		<Toggle
			label={label}
			checked={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}

// SortFilter - Dropdown for sorting
interface SortFilterProps {
	label?: string; // Optional label - omitted for compact filter use
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	disabled?: boolean;
	compact?: boolean;
}

export function SortFilter({
	label,
	value,
	onChange,
	options,
	disabled = false,
	compact = false,
}: SortFilterProps) {
	return (
		<Select
			label={label}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			options={options}
			disabled={disabled}
			compact={compact}
		/>
	);
}

// FilterChip - Removable chip component for displaying active filters
interface FilterChipProps {
	label: string;
	onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
	return (
		<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-pink-100 text-pink-800 border border-pink-200">
			<span>{label}</span>
			<button
				type="button"
				onClick={onRemove}
				className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 transition-colors"
				aria-label={`Remove ${label} filter`}
			>
				<XMarkIcon className="h-3 w-3" />
			</button>
		</span>
	);
}

// FilterButton - Small button that expands to show filters below
interface FilterButtonProps {
	title: string;
	children: React.ReactNode;
	activeCount?: number;
	defaultOpen?: boolean;
	storageKey?: string;
	className?: string;
}

export function FilterButton({
	title,
	children,
	activeCount = 0,
	defaultOpen = false,
	storageKey,
	className = "",
}: FilterButtonProps) {
	const getInitialState = () => {
		if (storageKey) {
			const stored = localStorage.getItem(storageKey);
			if (stored !== null) {
				return stored === "true";
			}
		}
		return defaultOpen;
	};

	const [isOpen, setIsOpen] = useState(getInitialState);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Save state to localStorage when it changes
	useEffect(() => {
		if (storageKey) {
			localStorage.setItem(storageKey, String(isOpen));
		}
	}, [isOpen, storageKey]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const toggleOpen = () => {
		setIsOpen(!isOpen);
	};

	return (
		<div className={`relative ${className}`} ref={dropdownRef}>
			{/* Small button */}
			<button
				type="button"
				onClick={toggleOpen}
				className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium border border-pink-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 transition-colors ${
					activeCount > 0
						? "text-pink-700 bg-pink-50"
						: "text-gray-700"
				}`}
				aria-expanded={isOpen}
			>
				<FunnelIcon className="h-4 w-4" />
				<span>{title}</span>
				{activeCount > 0 && (
					<span className="px-1.5 py-0.5 text-xs font-semibold bg-pink-500 text-white rounded-full">
						{activeCount}
					</span>
				)}
				{isOpen ? (
					<ChevronUpIcon className="h-3 w-3" />
				) : (
					<ChevronDownIcon className="h-3 w-3" />
				)}
			</button>

			{/* Dropdown content */}
			{isOpen && (
				<div className="absolute top-full right-0 mt-1 w-fit max-w-[90vw] border border-pink-300 rounded-md bg-white shadow-lg z-50">
					<div className="px-3 pb-3 pt-2">{children}</div>
				</div>
			)}
		</div>
	);
}

// FilterSection - Collapsible wrapper component for filter groups
interface FilterSectionProps {
	title: string;
	children: React.ReactNode;
	defaultOpen?: boolean;
	storageKey?: string; // Optional localStorage key for remembering state
}

export function FilterSection({
	title,
	children,
	defaultOpen = false,
	storageKey,
}: FilterSectionProps) {
	// Get initial state from localStorage if storageKey provided, otherwise use defaultOpen
	const getInitialState = () => {
		if (storageKey) {
			const stored = localStorage.getItem(storageKey);
			if (stored !== null) {
				return stored === "true";
			}
		}
		return defaultOpen;
	};

	const [isOpen, setIsOpen] = useState(getInitialState);

	// Save state to localStorage when it changes
	useEffect(() => {
		if (storageKey) {
			localStorage.setItem(storageKey, String(isOpen));
		}
	}, [isOpen, storageKey]);

	const toggleOpen = () => {
		setIsOpen(!isOpen);
	};

	return (
		<div className="border border-pink-300 rounded-md bg-white shadow-sm">
			{/* Header with toggle button */}
			<button
				type="button"
				onClick={toggleOpen}
				className="w-full flex items-center justify-between px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 rounded-t-md hover:bg-gray-50 transition-colors"
				aria-expanded={isOpen}
				aria-controls={`filter-section-${title
					.toLowerCase()
					.replace(/\s+/g, "-")}`}
			>
				<span className="text-sm font-medium text-gray-900">
					{title}
				</span>
				{isOpen ? (
					<ChevronUpIcon className="h-4 w-4 text-gray-500" />
				) : (
					<ChevronDownIcon className="h-4 w-4 text-gray-500" />
				)}
			</button>

			{/* Collapsible content */}
			{isOpen && (
				<div
					id={`filter-section-${title
						.toLowerCase()
						.replace(/\s+/g, "-")}`}
					className="px-3 pb-3 pt-2"
				>
					{children}
				</div>
			)}
		</div>
	);
}
