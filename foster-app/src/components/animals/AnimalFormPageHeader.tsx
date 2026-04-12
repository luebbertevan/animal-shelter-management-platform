import Button from "../ui/Button";

export interface AnimalFormPageHeaderProps {
	title: string;
	onCancel: () => void;
	onFillClick: () => void;
	fillDisabled?: boolean;
}

export default function AnimalFormPageHeader({
	title,
	onCancel,
	onFillClick,
	fillDisabled = false,
}: AnimalFormPageHeaderProps) {
	return (
		<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="outline"
					fullWidth={false}
					onClick={onFillClick}
					disabled={fillDisabled}
					className="justify-center rounded-full !border-pink-500 px-2 py-0.5 !text-sm !font-medium !leading-normal !text-gray-700 hover:!border-pink-600 hover:!bg-pink-50 hover:!text-gray-700 focus:!ring-pink-500 whitespace-normal sm:whitespace-nowrap"
				>
					Fill from existing animal
				</Button>
				<Button
					type="button"
					variant="outline"
					fullWidth={false}
					onClick={onCancel}
					className="py-1 px-2 text-sm whitespace-nowrap"
				>
					Cancel
				</Button>
			</div>
		</div>
	);
}
