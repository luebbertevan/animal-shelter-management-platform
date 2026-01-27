import { useState } from "react";
import Button from "../ui/Button";
import Textarea from "../ui/Textarea";

interface AssignmentConfirmationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (message: string) => void;
	fosterName: string;
	animalOrGroupName: string;
	isGroup?: boolean;
	animalCount?: number;
}

export default function AssignmentConfirmationDialog({
	isOpen,
	onClose,
	onConfirm,
	fosterName,
	animalOrGroupName,
	isGroup = false,
	animalCount,
}: AssignmentConfirmationDialogProps) {
	const [message, setMessage] = useState("");

	// Generate default message template
	const defaultMessage = isGroup
		? `Hi ${fosterName}, ${animalOrGroupName} has been assigned to you.`
		: `Hi ${fosterName}, ${animalOrGroupName} has been assigned to you.`;

	if (!isOpen) return null;

	const handleConfirm = () => {
		const finalMessage = message.trim() || defaultMessage;
		onConfirm(finalMessage);
		setMessage("");
	};

	const handleCancel = () => {
		setMessage("");
		onClose();
	};

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 z-40 bg-black bg-opacity-50"
				onClick={handleCancel}
			/>

			{/* Dialog */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className="bg-white rounded-lg shadow-xl w-full max-w-md pointer-events-auto"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="p-6 border-b border-gray-200">
						<h3 className="text-lg font-semibold text-gray-900">
							Confirm Assignment
						</h3>
					</div>

					{/* Content */}
					<div className="p-6 space-y-4">
						{/* Assignment Details */}
						<div className="space-y-2">
							<div>
								<span className="text-sm text-gray-500">Foster:</span>
								<span className="ml-2 font-medium text-gray-900">
									{fosterName}
								</span>
							</div>
							<div>
								<span className="text-sm text-gray-500">
									{isGroup ? "Group:" : "Animal:"}
								</span>
								<span className="ml-2 font-medium text-gray-900">
									{animalOrGroupName}
								</span>
							</div>
							{isGroup && animalCount !== undefined && (
								<div>
									<span className="text-sm text-gray-500">
										Animals in group:
									</span>
									<span className="ml-2 font-medium text-gray-900">
										{animalCount}
									</span>
								</div>
							)}
						</div>

						{/* Message Input */}
						<div>
							<Textarea
								id="assignment-message"
								label="Message (optional)"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder={defaultMessage}
								rows={4}
								className="w-full"
							/>
							<p className="mt-1 text-xs text-gray-500">
								If no message is provided, the default message will be sent.
							</p>
						</div>
					</div>

					{/* Footer */}
					<div className="p-6 border-t border-gray-200 flex justify-end gap-3">
						<Button
							type="button"
							variant="secondary"
							onClick={handleCancel}
						>
							Cancel
						</Button>
						<Button type="button" onClick={handleConfirm}>
							Confirm
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}

