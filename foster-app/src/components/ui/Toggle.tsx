interface ToggleProps {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	/** When true, render the switch on the left and the label on the right */
	switchOnLeft?: boolean;
}

const switchButtonClasses = (
	checked: boolean,
	disabled: boolean
) =>
	`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
		checked ? "bg-pink-500" : "bg-gray-300"
	} ${
		disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
	}`;

const switchThumbClasses = (checked: boolean) =>
	`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
		checked ? "translate-x-6" : "translate-x-1"
	}`;

export default function Toggle({
	label,
	checked,
	onChange,
	disabled = false,
	switchOnLeft = false,
}: ToggleProps) {
	if (!label) {
		return (
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				disabled={disabled}
				onClick={() => onChange(!checked)}
				className={switchButtonClasses(checked, disabled)}
			>
				<span className={switchThumbClasses(checked)} />
			</button>
		);
	}

	const switchButton = (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={switchButtonClasses(checked, disabled)}
		>
			<span className={switchThumbClasses(checked)} />
		</button>
	);

	const labelEl = (
		<label
			className={`text-sm font-medium text-gray-700 ${
				switchOnLeft ? "text-left" : "block"
			}`}
		>
			{label}
		</label>
	);

	return (
		<div
			className={`flex items-center gap-2 ${
				switchOnLeft ? "justify-start" : "justify-between"
			}`}
		>
			{switchOnLeft ? (
				<>
					{switchButton}
					{labelEl}
				</>
			) : (
				<>
					{labelEl}
					{switchButton}
				</>
			)}
		</div>
	);
}
