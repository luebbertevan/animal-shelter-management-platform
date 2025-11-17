interface ToggleProps {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
}

export default function Toggle({
	label,
	checked,
	onChange,
	disabled = false,
}: ToggleProps) {
	return (
		<div className="flex items-center justify-between">
			<label className="block text-sm font-medium text-gray-700">
				{label}
			</label>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				disabled={disabled}
				onClick={() => onChange(!checked)}
				className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
					checked ? "bg-pink-500" : "bg-gray-300"
				} ${
					disabled
						? "opacity-50 cursor-not-allowed"
						: "cursor-pointer"
				}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
						checked ? "translate-x-6" : "translate-x-1"
					}`}
				/>
			</button>
		</div>
	);
}
