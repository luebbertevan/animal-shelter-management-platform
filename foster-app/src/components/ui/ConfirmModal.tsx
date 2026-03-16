import Button from "./Button";

interface ConfirmModalProps {
	isOpen: boolean;
	title: string;
	message: React.ReactNode; // Allow ReactNode for links and formatting
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
	variant?: "danger" | "default";
	/** When "column", buttons stack vertically (one per row) for easier reading of long labels. */
	buttonsLayout?: "row" | "column";
}

/**
 * Reusable confirmation modal component
 * Used for confirmations that require user action (delete, move, etc.)
 */
export default function ConfirmModal({
	isOpen,
	title,
	message,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onConfirm,
	onCancel,
	variant = "default",
	buttonsLayout = "row",
}: ConfirmModalProps) {
	if (!isOpen) return null;

	const confirmButtonVariant = variant === "danger" ? "danger" : "primary";
	const buttonsClass =
		buttonsLayout === "column"
			? "flex flex-col gap-3"
			: "flex gap-3 justify-end";

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 z-40"
				style={{
					backgroundColor: "rgba(0, 0, 0, 0.65)",
					backdropFilter: "blur(4px)",
					WebkitBackdropFilter: "blur(4px)",
				}}
				onClick={onCancel}
			/>

			{/* Modal */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div
					className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
					onClick={(e) => e.stopPropagation()}
				>
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						{title}
					</h3>

					<div className="text-gray-700 mb-6">{message}</div>

					<div className={buttonsClass}>
						<Button variant="outline" onClick={onCancel}>
							{cancelLabel}
						</Button>
						<Button
							variant={confirmButtonVariant}
							onClick={onConfirm}
						>
							{confirmLabel}
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}
