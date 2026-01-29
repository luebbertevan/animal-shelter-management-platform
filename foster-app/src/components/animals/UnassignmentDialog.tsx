import { useState } from "react";
import Button from "../ui/Button";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import type { AnimalStatus, FosterVisibility } from "../../types";
import { getFosterVisibilityFromStatus } from "../../lib/metadataUtils";

interface UnassignmentDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (
		newStatus: AnimalStatus,
		newVisibility: FosterVisibility,
		message: string
	) => void;
	fosterName: string;
	animalOrGroupName: string;
	isGroup?: boolean;
	animalCount?: number;
	hasPendingRequests?: boolean;
}

const STATUS_OPTIONS: { value: AnimalStatus; label: string }[] = [
	{ value: "in_shelter", label: "In Shelter" },
	{ value: "in_foster", label: "In Foster" },
	{ value: "adopted", label: "Adopted" },
	{ value: "medical_hold", label: "Medical Hold" },
	{ value: "transferring", label: "Transferring" },
];

const VISIBILITY_OPTIONS: { value: FosterVisibility; label: string }[] = [
	{ value: "available_now", label: "Available Now" },
	{ value: "available_future", label: "Available Future" },
	{ value: "foster_pending", label: "Foster Pending" },
	{ value: "not_visible", label: "Not Visible" },
];

export default function UnassignmentDialog({
	isOpen,
	onClose,
	onConfirm,
	fosterName,
	animalOrGroupName,
	isGroup = false,
	animalCount,
	hasPendingRequests = false,
}: UnassignmentDialogProps) {
	const [newStatus, setNewStatus] = useState<AnimalStatus>("in_shelter");
	const [newVisibility, setNewVisibility] =
		useState<FosterVisibility>("available_now");
	const [message, setMessage] = useState("");

	// Generate default message template
	const defaultMessage = `Hi ${fosterName}, ${animalOrGroupName} is no longer assigned to you.`;

	if (!isOpen) return null;

	const handleConfirm = () => {
		const finalMessage = message.trim() || defaultMessage;
		onConfirm(newStatus, newVisibility, finalMessage);
		// Reset state
		setNewStatus("in_shelter");
		setNewVisibility("available_now");
		setMessage("");
	};

	const handleCancel = () => {
		// Reset state
		setNewStatus("in_shelter");
		setNewVisibility("available_now");
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
							Confirm Unassignment
						</h3>
					</div>

					{/* Content */}
					<div className="p-6 space-y-4">
						{/* Assignment Details */}
						<div className="space-y-2">
							<div>
								<span className="text-sm text-gray-500">
									Foster:
								</span>
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

						{/* Warning for pending requests */}
						{hasPendingRequests && (
							<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
								<p className="text-sm text-yellow-800">
									Note: There are pending foster requests for
									this {isGroup ? "group" : "animal"}.
									Unassignment will not automatically cancel
									these requests.
								</p>
							</div>
						)}

						{/* Status Dropdown */}
						<Select
							label="New Status"
							value={newStatus}
							onChange={(e) => {
								const newStatusValue = e.target.value as AnimalStatus;
								setNewStatus(newStatusValue);
								// One-directional sync: automatically update visibility when status changes
								const newVisibilityValue =
									getFosterVisibilityFromStatus(newStatusValue);
								setNewVisibility(newVisibilityValue);
							}}
							options={STATUS_OPTIONS}
						/>

						{/* Visibility Dropdown */}
						<Select
							label="Visibility on Fosters Needed page"
							value={newVisibility}
							onChange={(e) =>
								setNewVisibility(
									e.target.value as FosterVisibility
								)
							}
							options={VISIBILITY_OPTIONS}
						/>

						{/* Message Input */}
						<div>
							<Textarea
								id="unassignment-message"
								label="Message (optional)"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder={defaultMessage}
								rows={4}
								className="w-full"
							/>
							<p className="mt-1 text-xs text-gray-500">
								Add any additional context or information for
								the foster (optional).
							</p>
							<p className="mt-1 text-xs text-gray-500">
								If no message is provided, the default message
								will be sent.
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
							Confirm Unassignment
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}

