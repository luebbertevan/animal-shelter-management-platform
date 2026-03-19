import { useState, useEffect } from "react";
import Button from "../ui/Button";
import Textarea from "../ui/Textarea";
import Toggle from "../ui/Toggle";
import Select from "../ui/Select";
import type { AnimalStatus, FosterVisibility } from "../../types";
import { getFosterVisibilityFromStatus } from "../../lib/metadataUtils";
import { animalStatusDropdownOptionsStandard } from "../../lib/animalStatusOptions";

interface AssignmentConfirmationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (
		message: string,
		includeTag: boolean,
		notifyFoster: boolean,
		newStatus?: AnimalStatus,
		newVisibility?: FosterVisibility
	) => void;
	fosterName: string;
	animalOrGroupName: string;
	isGroup?: boolean;
	animalCount?: number;
	/** Optional list of animal names for nicer messaging when multiple animals (non-group) are assigned. */
	animalNames?: string[];
	/** Optional list of animal names when assigning a group (animals in the group). */
	groupAnimalNames?: string[];
	/** When true, hide status/visibility (e.g. from group form); use defaultStatus/defaultVisibility on confirm. */
	hideStatusVisibility?: boolean;
	defaultStatus?: AnimalStatus;
	defaultVisibility?: FosterVisibility;
}

const STATUS_OPTIONS = animalStatusDropdownOptionsStandard();

const VISIBILITY_OPTIONS: { value: FosterVisibility; label: string }[] = [
	{ value: "available_now", label: "Available Now" },
	{ value: "available_future", label: "Available Future" },
	{ value: "foster_pending", label: "Foster Pending" },
	{ value: "not_visible", label: "Not Visible" },
];

export default function AssignmentConfirmationDialog({
	isOpen,
	onClose,
	onConfirm,
	fosterName,
	animalOrGroupName,
	isGroup = false,
	animalCount,
	animalNames,
	groupAnimalNames,
	hideStatusVisibility = false,
	defaultStatus = "in_foster",
	defaultVisibility = "not_visible",
}: AssignmentConfirmationDialogProps) {
	const [message, setMessage] = useState("");
	const [includeTag, setIncludeTag] = useState(true);
	const [notifyFoster, setNotifyFoster] = useState(true);
	const [newStatus, setNewStatus] = useState<AnimalStatus>("in_foster");
	const [newVisibility, setNewVisibility] =
		useState<FosterVisibility>("not_visible");

	const formatNamesList = (names: string[]): string => {
		if (names.length === 0) return "";
		if (names.length === 1) return names[0];
		if (names.length === 2) return `${names[0]} and ${names[1]}`;
		const allButLast = names.slice(0, -1).join(", ");
		const last = names[names.length - 1];
		return `${allButLast}, and ${last}`;
	};

	const multipleAnimalNames =
		!isGroup &&
		animalCount !== undefined &&
		animalCount > 1 &&
		animalNames &&
		animalNames.length > 0
			? formatNamesList(animalNames)
			: "";

	const groupAnimalsList =
		isGroup &&
		animalCount !== undefined &&
		animalCount > 0 &&
		groupAnimalNames &&
		groupAnimalNames.length > 0
			? formatNamesList(groupAnimalNames)
			: "";

	// Default message (reverted to simple original wording)
	const defaultMessage = `Hi ${fosterName}, ${animalOrGroupName} has been assigned to you.`;

	// Reset to defaults when dialog closes so the next open shows defaults.
	// We do not reset on confirm so the UI doesn’t flash (notify section popping open) before close.
	useEffect(() => {
		if (!isOpen) {
			// Reset form state when dialog closes so it’s fresh on next open (not on confirm, to avoid flashing notify section open)
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setMessage("");
			setIncludeTag(true);
			setNotifyFoster(true);
			setNewStatus("in_foster");
			setNewVisibility("not_visible");
		}
	}, [isOpen]);

	const handleConfirm = () => {
		const finalMessage = message.trim() || defaultMessage;
		const status = hideStatusVisibility ? defaultStatus : newStatus;
		const visibility = hideStatusVisibility ? defaultVisibility : newVisibility;
		onConfirm(finalMessage, includeTag, notifyFoster, status, visibility);
	};

	const handleCancel = () => {
		onClose();
	};

	if (!isOpen) return null;

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
									{!isGroup &&
									animalCount !== undefined &&
									animalCount > 1 &&
									multipleAnimalNames
										? `${animalCount} animals: ${multipleAnimalNames}`
										: animalOrGroupName}
								</span>
							</div>
							{isGroup && animalCount !== undefined && (
								<div>
									<span className="text-sm text-gray-500">
										{animalCount} {animalCount === 1 ? "animal" : "animals"} in group:
									</span>
									<span className="ml-2 font-medium text-gray-900">
										{groupAnimalsList || ""}
									</span>
								</div>
							)}
						</div>

						{/* Set status and visibility (hidden when from group form; defaults: In foster, Not visible) */}
						{!hideStatusVisibility && (
							<>
								<Select
									label="Set status"
									value={newStatus}
									onChange={(e) => {
										const value = e.target.value as AnimalStatus;
										setNewStatus(value);
										setNewVisibility(
											getFosterVisibilityFromStatus(value)
										);
									}}
									options={STATUS_OPTIONS}
								/>
								<Select
									label="Set visibility on Fosters Needed page"
									value={newVisibility}
									onChange={(e) =>
										setNewVisibility(
											e.target.value as FosterVisibility
										)
									}
									options={VISIBILITY_OPTIONS}
								/>
							</>
						)}

						{/* Notify foster toggle – right above message input */}
						<Toggle
							label="Notify foster"
							checked={notifyFoster}
							onChange={setNotifyFoster}
						/>

						{notifyFoster && (
							<>
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
										Add any additional context or next steps for the foster (optional).
									</p>
									<p className="mt-1 text-xs text-gray-500">
										If no message is provided, the default message will be sent.
									</p>
								</div>

								{/* Include Tag Toggle */}
								<Toggle
									label={`Include ${isGroup ? "link to group" : (animalCount !== undefined && animalCount > 1 ? "links to animals" : "link to animal")} in message`}
									checked={includeTag}
									onChange={setIncludeTag}
								/>
							</>
						)}
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

