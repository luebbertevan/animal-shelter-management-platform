import { useState, useEffect } from "react";
import Button from "../ui/Button";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import Toggle from "../ui/Toggle";
import type { AnimalStatus, FosterVisibility } from "../../types";
import { getFosterVisibilityFromStatus } from "../../lib/metadataUtils";
import { animalStatusDropdownOptionsStandard } from "../../lib/animalStatusOptions";

interface UnassignmentDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (
		newStatus: AnimalStatus,
		newVisibility: FosterVisibility,
		message: string,
		includeTag: boolean,
		notifyFoster: boolean
	) => void;
	fosterName: string;
	animalOrGroupName: string;
	isGroup?: boolean;
	animalCount?: number;
	/** Optional list of animal names for nicer messaging when multiple animals are affected. */
	animalNames?: string[];
	/** Optional list of animal names when unassigning a group (animals in the group). */
	groupAnimalNames?: string[];
	hasPendingRequests?: boolean;
	/** When true, hide status/visibility (used when unassigning before assigning group to new foster; group form sets those). */
	reassignMode?: boolean;
	/** When true, hide status/visibility and use fixedVisibility on confirm (e.g. from group form; visibility must match group). */
	hideStatusVisibility?: boolean;
	fixedVisibility?: FosterVisibility;
}

const STATUS_OPTIONS = animalStatusDropdownOptionsStandard();

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
	animalNames,
	groupAnimalNames,
	hasPendingRequests = false,
	reassignMode = false,
	hideStatusVisibility = false,
	fixedVisibility = "available_now",
}: UnassignmentDialogProps) {
	const [newStatus, setNewStatus] = useState<AnimalStatus>("in_shelter");
	const [newVisibility, setNewVisibility] =
		useState<FosterVisibility>("available_now");
	const [message, setMessage] = useState("");
	const [includeTag, setIncludeTag] = useState(true);
	const [notifyFoster, setNotifyFoster] = useState(true);

	const formatNamesList = (names: string[]): string => {
		if (names.length === 0) return "";
		if (names.length === 1) return names[0];
		if (names.length === 2) return `${names[0]} and ${names[1]}`;
		const allButLast = names.slice(0, -1).join(", ");
		const last = names[names.length - 1];
		return `${allButLast}, and ${last}`;
	};

	const multipleAnimalNames =
		!isGroup && animalCount !== undefined && animalCount > 1 && animalNames && animalNames.length > 0
			? formatNamesList(animalNames)
			: "";

	const groupAnimalsList =
		isGroup && animalCount !== undefined && animalCount > 0 && groupAnimalNames && groupAnimalNames.length > 0
			? formatNamesList(groupAnimalNames)
			: "";

	// Generate default message template (grammatically correct, including names when available)
	let defaultMessage: string;
	if (animalCount !== undefined && animalCount > 1) {
		if (!isGroup && multipleAnimalNames) {
			defaultMessage = `Hi ${fosterName}, ${animalCount} animals, ${multipleAnimalNames}, are no longer assigned to you.`;
		} else if (isGroup && groupAnimalsList) {
			defaultMessage = `Hi ${fosterName}, ${animalCount} animals in this group, ${groupAnimalsList}, are no longer assigned to you.`;
		} else {
			defaultMessage = `Hi ${fosterName}, ${animalCount} animals are no longer assigned to you.`;
		}
	} else {
		// Single animal or generic name
		defaultMessage = `Hi ${fosterName}, ${animalOrGroupName} is no longer assigned to you.`;
	}

	// Reset to defaults when dialog closes so the next open shows defaults.
	// We do not reset on confirm so the UI doesn’t flash (notify section popping open) before close.
	useEffect(() => {
		if (!isOpen) {
			// Reset form state when dialog closes so it’s fresh on next open (not on confirm, to avoid flashing notify section open)
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setNewStatus("in_shelter");
			setNewVisibility("available_now");
			setMessage("");
			setIncludeTag(true);
			setNotifyFoster(true);
		}
	}, [isOpen]);

	const handleConfirm = () => {
		const userMessage = message.trim();
		const status = hideStatusVisibility ? "in_shelter" : newStatus;
		const visibility = hideStatusVisibility ? fixedVisibility : newVisibility;
		// Pass only the user-entered message (or empty) so the shared utilities
		// can apply their own default message logic for DRY behavior.
		onConfirm(status, visibility, userMessage, includeTag, notifyFoster);
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
							{reassignMode
								? "Unassign from current foster first"
								: "Confirm Unassignment"}
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
									{isGroup
										? "Group:"
										: animalCount !== undefined && animalCount > 1
										? `${animalCount} animals:`
										: "Animal:"}
								</span>
								<span className="ml-2 font-medium text-gray-900">
									{!isGroup &&
									animalCount !== undefined &&
									animalCount > 1 &&
									multipleAnimalNames
										? multipleAnimalNames
										: animalOrGroupName}
								</span>
							</div>
							{isGroup && animalCount !== undefined && (
								<div>
									<span className="text-sm text-gray-500">
										Animals in group:
									</span>
									<span className="ml-2 font-medium text-gray-900">
										{groupAnimalsList
											? `${animalCount} animals: ${groupAnimalsList}`
											: animalCount}
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

						{reassignMode && (
							<p className="text-sm text-gray-600">
								Then you’ll assign the group to the new foster (status and visibility are set there).
							</p>
						)}

						{/* Status and visibility (hidden in reassign mode or when hideStatusVisibility; group form sets them) */}
						{!reassignMode && !hideStatusVisibility && (
							<>
								<Select
									label="Set status"
									value={newStatus}
									onChange={(e) => {
										const newStatusValue = e.target.value as AnimalStatus;
										setNewStatus(newStatusValue);
										const newVisibilityValue =
											getFosterVisibilityFromStatus(newStatusValue);
										setNewVisibility(newVisibilityValue);
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

