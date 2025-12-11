import { useState } from "react";
import {
	Combobox as HeadlessCombobox,
	ComboboxButton,
	ComboboxInput,
	ComboboxOptions,
	ComboboxOption,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";

interface ComboboxProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	suggestions: string[];
	placeholder?: string;
	disabled?: boolean;
	error?: string;
	id?: string;
}

export default function Combobox({
	label,
	value,
	onChange,
	suggestions,
	placeholder = "",
	disabled = false,
	error,
	id,
}: ComboboxProps) {
	const [query, setQuery] = useState("");

	const comboboxId =
		id || `combobox-${label.toLowerCase().replace(/\s+/g, "-")}`;

	// Filter suggestions based on query (case-insensitive)
	const filteredSuggestions =
		query === ""
			? suggestions
			: suggestions.filter((suggestion) =>
					suggestion.toLowerCase().includes(query.toLowerCase())
			  );

	return (
		<div>
			<label
				htmlFor={comboboxId}
				className="block text-sm font-medium text-gray-700 mb-1"
			>
				{label}
			</label>
			<HeadlessCombobox
				value={value}
				onChange={(newValue) => onChange(newValue ?? "")}
				disabled={disabled}
				immediate
			>
				<div className="relative">
					<ComboboxInput
						id={comboboxId}
						className={`w-full px-3 py-2 border ${
							error
								? "border-red-300 focus:border-red-500 focus:ring-red-500"
								: "border-pink-300 focus:border-pink-500 focus:ring-pink-500"
						} rounded-md shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white pr-10`}
						displayValue={(selectedValue: string) =>
							selectedValue || ""
						}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={placeholder}
						disabled={disabled}
					/>
					<ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
						<ChevronUpDownIcon
							className="h-5 w-5 text-gray-400"
							aria-hidden="true"
						/>
					</ComboboxButton>

					<ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
						{filteredSuggestions.length === 0 && query !== "" ? (
							<div className="relative cursor-default select-none px-4 py-2 text-gray-700">
								No suggestions found. You can type a custom
								value.
							</div>
						) : filteredSuggestions.length === 0 &&
						  suggestions.length === 0 ? (
							<div className="relative cursor-default select-none px-4 py-2 text-gray-700">
								No suggestions available. You can type a custom
								value.
							</div>
						) : (
							filteredSuggestions.map((suggestion) => (
								<ComboboxOption
									key={suggestion}
									value={suggestion}
									className={({ active }) =>
										`relative cursor-default select-none py-2 pl-10 pr-4 ${
											active
												? "bg-pink-100 text-pink-900"
												: "text-gray-900"
										}`
									}
								>
									{({ selected }) => (
										<>
											<span
												className={`block truncate ${
													selected
														? "font-medium"
														: "font-normal"
												}`}
											>
												{suggestion}
											</span>
											{selected ? (
												<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-pink-600">
													<CheckIcon
														className="h-5 w-5"
														aria-hidden="true"
													/>
												</span>
											) : null}
										</>
									)}
								</ComboboxOption>
							))
						)}
					</ComboboxOptions>
				</div>
			</HeadlessCombobox>
			{error && <p className="mt-1 text-sm text-red-600">{error}</p>}
		</div>
	);
}
