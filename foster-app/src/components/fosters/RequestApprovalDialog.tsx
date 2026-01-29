import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Button from "../ui/Button";
import Textarea from "../ui/Textarea";

interface RequestApprovalDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (message: string) => Promise<void>;
	fosterName: string;
	animalOrGroupName: string;
}

export default function RequestApprovalDialog({
	isOpen,
	onClose,
	onConfirm,
	fosterName,
	animalOrGroupName,
}: RequestApprovalDialogProps) {
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!isOpen) return null;

	// Generate default message template for placeholder
	const defaultMessage = `Hi ${fosterName}, ${animalOrGroupName} has been assigned to you.`;

	const handleConfirm = async () => {
		setIsSubmitting(true);
		setError(null);

		try {
			await onConfirm(message);
			setMessage("");
			onClose();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to approve request. Please try again."
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		if (!isSubmitting) {
			setMessage("");
			setError(null);
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
				<div className="relative w-full max-w-md transform rounded-lg bg-white shadow-xl transition-all">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
						<h3 className="text-lg font-semibold text-gray-900">
							Approve Request
						</h3>
						<button
							type="button"
							onClick={handleClose}
							disabled={isSubmitting}
							className="rounded-md p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
						>
							<XMarkIcon className="h-5 w-5" />
						</button>
					</div>

					{/* Content */}
					<div className="px-4 py-4">
						{/* Assignment Details */}
						<div className="mb-4 space-y-2">
							<div>
								<span className="text-sm text-gray-500">Foster:</span>
								<span className="ml-2 font-medium text-gray-900">
									{fosterName}
								</span>
							</div>
							<div>
								<span className="text-sm text-gray-500">Animal/Group:</span>
								<span className="ml-2 font-medium text-gray-900">
									{animalOrGroupName}
								</span>
							</div>
						</div>

						{/* Message Input */}
						<div className="mb-4">
							<Textarea
								id="approval-message"
								label="Message (optional)"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder={defaultMessage}
								rows={4}
								className="w-full"
								disabled={isSubmitting}
							/>
							<p className="mt-1 text-xs text-gray-500">
								Add any additional context or next steps for the foster
								(optional).
							</p>
							<p className="mt-1 text-xs text-gray-500">
								If no message is provided, the default message will be
								sent.
							</p>
						</div>

						{/* Error message */}
						{error && (
							<div className="mb-4 rounded-md bg-red-50 p-3 border border-red-200">
								<p className="text-sm text-red-700">{error}</p>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="flex justify-end gap-3 border-t border-gray-200 px-4 py-3">
						<Button
							type="button"
							variant="secondary"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleConfirm}
							disabled={isSubmitting}
						>
							{isSubmitting ? "Approving..." : "Approve Request"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

