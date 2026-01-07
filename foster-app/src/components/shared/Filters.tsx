import { useState, useEffect } from "react";
import {
	ChevronDownIcon,
	ChevronUpIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import Toggle from "../ui/Toggle";
import Select from "../ui/Select";

// PriorityFilter - Toggle for high priority
interface PriorityFilterProps {
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
}

export function PriorityFilter({
	value,
	onChange,
	disabled = false,
}: PriorityFilterProps) {
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
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	disabled?: boolean;
	placeholder?: string;
}

export function SelectFilter({
	label,
	value,
	onChange,
	options,
	disabled = false,
	placeholder = "All",
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
		/>
	);
}

// ToggleFilter - Generic toggle/checkbox filter
interface ToggleFilterProps {
	label: string;
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
}

export function ToggleFilter({
	label,
	value,
	onChange,
	disabled = false,
}: ToggleFilterProps) {
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
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	disabled?: boolean;
}

export function SortFilter({
	label,
	value,
	onChange,
	options,
	disabled = false,
}: SortFilterProps) {
	return (
		<Select
			label={label}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			options={options}
			disabled={disabled}
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
		<div className="border border-gray-200 rounded-lg bg-white shadow-sm">
			{/* Header with toggle button */}
			<button
				type="button"
				onClick={toggleOpen}
				className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 rounded-t-lg hover:bg-gray-50 transition-colors"
				aria-expanded={isOpen}
				aria-controls={`filter-section-${title
					.toLowerCase()
					.replace(/\s+/g, "-")}`}
			>
				<span className="text-sm font-medium text-gray-900">
					{title}
				</span>
				{isOpen ? (
					<ChevronUpIcon className="h-5 w-5 text-gray-500" />
				) : (
					<ChevronDownIcon className="h-5 w-5 text-gray-500" />
				)}
			</button>

			{/* Collapsible content */}
			{isOpen && (
				<div
					id={`filter-section-${title
						.toLowerCase()
						.replace(/\s+/g, "-")}`}
					className="px-4 pb-4 pt-2 space-y-4"
				>
					{children}
				</div>
			)}
		</div>
	);
}
