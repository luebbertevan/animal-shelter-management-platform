import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface FosterRequestDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (message: string) => Promise<void>;
	animalOrGroupName: string;
	isGroup: boolean;
	animalCount?: number;
	/** If requesting an animal that's in a group, show a confirmation about the group */
	groupConfirmation?: {
		groupId: string;
		groupName: string;
	};
}

export default function FosterRequestDialog({
	isOpen,
	onClose,
	onConfirm,
	animalOrGroupName,
	isGroup,
	animalCount,
	groupConfirmation,
}: FosterRequestDialogProps) {
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!isOpen) return null;

	const handleSubmit = async () => {
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
					: "Failed to submit request. Please try again."
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

	const placeholderMessage = `Hi, I'm interested in fostering ${animalOrGroupName}.`;

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
							Request to Foster
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
						{/* Group confirmation message */}
						{groupConfirmation && (
							<div className="mb-4 rounded-md bg-blue-50 p-3 border border-blue-200">
								<p className="text-sm text-blue-800">
									This animal is part of a group. You'll be
									requesting the entire group:{" "}
									<span className="font-medium">
										{groupConfirmation.groupName}
									</span>
								</p>
							</div>
						)}

						{/* Info */}
						<div className="mb-4">
							<p className="text-gray-700">
								{isGroup ? (
									<>
										You're requesting to foster{" "}
										<span className="font-semibold">
											{animalOrGroupName}
										</span>
										{animalCount && animalCount > 0 && (
											<span className="text-gray-500">
												{" "}
												({animalCount}{" "}
												{animalCount === 1
													? "animal"
													: "animals"}
												)
											</span>
										)}
									</>
								) : (
									<>
										You're requesting to foster{" "}
										<span className="font-semibold">
											{animalOrGroupName}
										</span>
									</>
								)}
							</p>
						</div>

						{/* Message input */}
						<div className="mb-4">
							<label
								htmlFor="request-message"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Message (optional)
							</label>
							<textarea
								id="request-message"
								rows={3}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
								placeholder={placeholderMessage}
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								disabled={isSubmitting}
							/>
							<p className="mt-1 text-xs text-gray-500">
								Add any additional information about your
								interest or availability.
							</p>
							<p className="mt-1 text-xs text-gray-500">
								If no message is provided, the default message will be sent.
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
						<button
							type="button"
							onClick={handleClose}
							disabled={isSubmitting}
							className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={isSubmitting}
							className="rounded-md bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
						>
							{isSubmitting ? "Submitting..." : "Submit Request"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

