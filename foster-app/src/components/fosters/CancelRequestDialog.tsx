import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface CancelRequestDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (message: string) => Promise<void>;
	animalOrGroupName: string;
}

export default function CancelRequestDialog({
	isOpen,
	onClose,
	onConfirm,
	animalOrGroupName,
}: CancelRequestDialogProps) {
	const [isCancelling, setIsCancelling] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState("");

	if (!isOpen) return null;

	const defaultCancelMessage = `I have cancelled my request to foster ${animalOrGroupName}.`;

	const handleCancel = async () => {
		setIsCancelling(true);
		setError(null);

		try {
			await onConfirm(message);
			onClose();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to cancel request. Please try again."
			);
		} finally {
			setIsCancelling(false);
		}
	};

	const handleClose = () => {
		if (!isCancelling) {
			setError(null);
			setMessage("");
			onClose();
		}
	};

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 transition-opacity"
				onClick={handleClose}
				aria-hidden="true"
			/>

			{/* Dialog */}
			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative w-full max-w-sm transform rounded-lg bg-white shadow-xl transition-all">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
						<h3 className="text-lg font-semibold text-gray-900">
							Cancel Request
						</h3>
						<button
							type="button"
							onClick={handleClose}
							disabled={isCancelling}
							className="rounded-md p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
						>
							<XMarkIcon className="h-5 w-5" />
						</button>
					</div>

					{/* Content */}
					<div className="px-4 py-4">
						<p className="text-gray-700">
							Are you sure you want to cancel your request for{" "}
							<span className="font-semibold">
								{animalOrGroupName}
							</span>
							?
						</p>

						<div className="mt-4">
							<label
								htmlFor="cancel-request-message"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Message (optional)
							</label>
							<textarea
								id="cancel-request-message"
								rows={3}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
								placeholder={defaultCancelMessage}
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								disabled={isCancelling}
							/>
							<p className="mt-1 text-xs text-gray-500">
								Add any information about why you’re cancelling (optional).
							</p>
							<p className="mt-1 text-xs text-gray-500">
								If no message is provided, the default message will be sent.
							</p>
						</div>

						{/* Error message */}
						{error && (
							<div className="mt-4 rounded-md bg-red-50 p-3 border border-red-200">
								<p className="text-sm text-red-700">{error}</p>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="flex justify-end gap-3 border-t border-gray-200 px-4 py-3">
						<button
							type="button"
							onClick={handleClose}
							disabled={isCancelling}
							className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
						>
							Keep Request
						</button>
						<button
							type="button"
							onClick={handleCancel}
							disabled={isCancelling}
							className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
						>
							{isCancelling ? "Cancelling..." : "Cancel Request"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

