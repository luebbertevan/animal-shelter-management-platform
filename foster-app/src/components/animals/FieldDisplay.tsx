interface FieldDisplayProps {
	label: string;
	value: string | null | undefined;
	className?: string;
}

export default function FieldDisplay({
	label,
	value,
	className = "",
}: FieldDisplayProps) {
	const displayValue = value?.trim() || null;
	const hasValue = displayValue !== null && displayValue !== "";

	return (
		<div className={className}>
			<label className="block text-sm font-medium text-gray-500 mb-1">
				{label}
			</label>
			{hasValue ? (
				<p className="text-lg font-medium text-gray-900">
					{displayValue}
				</p>
			) : (
				<p className="text-lg font-medium text-gray-400 italic">
					Not provided
				</p>
			)}
		</div>
	);
}
