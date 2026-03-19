import { useState, useMemo } from "react";
import type { BulkAddAnimalRow } from "../../hooks/useBulkAddRows";
import type { AnimalStatus } from "../../types";
import { animalStatusDropdownOptionsStandard } from "../../lib/animalStatusOptions";
import { getFosterVisibilityFromStatus } from "../../lib/metadataUtils";
import { XMarkIcon, PlusIcon, MinusIcon } from "@heroicons/react/24/outline";

const SEX_OPTIONS = [
	{ value: "", label: "Select..." },
	{ value: "male", label: "Male" },
	{ value: "female", label: "Female" },
	{ value: "spayed_female", label: "Spayed Female" },
	{ value: "neutered_male", label: "Neutered Male" },
];

const LIFE_STAGE_OPTIONS = [
	{ value: "", label: "Select..." },
	{ value: "kitten", label: "Kitten" },
	{ value: "adult", label: "Adult" },
	{ value: "senior", label: "Senior" },
];

const STATUS_OPTIONS = animalStatusDropdownOptionsStandard();

const VISIBILITY_OPTIONS = [
	{ value: "available_now", label: "Available Now" },
	{ value: "available_future", label: "Available Future" },
	{ value: "foster_pending", label: "Foster Pending" },
	{ value: "not_visible", label: "Not Visible" },
];

interface BulkAddAnimalRowsProps {
	rows: BulkAddAnimalRow[];
	onAddRow: () => void;
	onRemoveRow: (id: string) => void;
	onUpdateRow: (
		id: string,
		field: keyof BulkAddAnimalRow,
		value: string
	) => void;
	onSetRowCount: (count: number) => void;
	canAddMore: boolean;
	maxRows: number;
	disabled?: boolean;
	showPerRowStatusVisibility?: boolean;
}

export default function BulkAddAnimalRows({
	rows,
	onAddRow,
	onRemoveRow,
	onUpdateRow,
	onSetRowCount,
	canAddMore,
	maxRows,
	disabled = false,
	showPerRowStatusVisibility = false,
}: BulkAddAnimalRowsProps) {
	const [inputValue, setInputValue] = useState(String(rows.length));
	const [isEditing, setIsEditing] = useState(false);

	// Track which rows had visibility set manually; don't overwrite with status→visibility sync (precedent: group form)
	const [visibilityManuallySetRowIds, setVisibilityManuallySetRowIds] =
		useState<Set<string>>(new Set());

	// Derive pruned set (only ids that still exist in rows) so we don't rely on stale ids
	const rowIdSet = useMemo(
		() => new Set(rows.map((r) => r.id)),
		[rows]
	);
	const prunedManuallySetIds = useMemo(() => {
		const next = new Set<string>();
		visibilityManuallySetRowIds.forEach((id) => {
			if (rowIdSet.has(id)) next.add(id);
		});
		return next;
	}, [visibilityManuallySetRowIds, rowIdSet]);

	// Derive display value when not editing so we don't need an effect to sync from rows.length
	const displayValue = isEditing ? inputValue : String(rows.length);

	const commitInputValue = () => {
		setIsEditing(false);
		const parsed = parseInt(inputValue, 10);
		if (isNaN(parsed) || inputValue.trim() === "") {
			setInputValue(String(rows.length));
		} else {
			onSetRowCount(parsed);
			// Use parsed, not rows.length: parent hasn't re-rendered yet, so rows.length is stale.
			// Prevents Enter-then-blur from committing the old count again.
			setInputValue(String(parsed));
		}
	};

	const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
		setIsEditing(true);
		setInputValue(String(rows.length));
		// Skip select() on touch devices to avoid mobile Chrome showing the context menu on the selection
		if (typeof window !== "undefined" && !("ontouchstart" in window)) {
			e.target.select();
		}
	};

	// One-directional sync: changing status auto-updates visibility unless user set visibility manually (same as group form)
	const handleStatusChange = (rowId: string, value: string) => {
		onUpdateRow(rowId, "status", value);
		if (
			showPerRowStatusVisibility &&
			value &&
			!prunedManuallySetIds.has(rowId)
		) {
			const visibility = getFosterVisibilityFromStatus(
				value as AnimalStatus
			);
			onUpdateRow(rowId, "fosterVisibility", visibility);
		}
	};

	const handleVisibilityChange = (rowId: string, value: string) => {
		setVisibilityManuallySetRowIds((prev) => new Set(prev).add(rowId));
		onUpdateRow(rowId, "fosterVisibility", value);
	};

	return (
		<div>
			<label className="block text-sm font-medium text-gray-700 mb-2">
				Bulk Add Animals
			</label>

			{/* Number stepper */}
			<div className="mb-3 flex flex-wrap items-center gap-2">
				<span className="text-sm text-gray-600">Animals:</span>
				<div className="inline-flex items-center border border-gray-300 rounded-md">
					<button
						type="button"
						onClick={() => onSetRowCount(rows.length - 1)}
						disabled={disabled || rows.length === 0}
						className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-l-md transition-colors"
						aria-label="Decrease count"
					>
						<MinusIcon className="h-4 w-4" />
					</button>
					<input
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						value={displayValue}
						onChange={(e) => {
							const raw = e.target.value.replace(/[^0-9]/g, "");
							setInputValue(raw);
						}}
						onBlur={commitInputValue}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								commitInputValue();
								// Blur so we leave "editing" mode; otherwise focus stays and
								// displayValue stays rows.length, so keystrokes update inputValue
								// but the input still shows the old count until next commit.
								(e.target as HTMLInputElement).blur();
							}
						}}
						onFocus={handleFocus}
						disabled={disabled}
						className="w-12 text-center text-sm py-1 border-x border-gray-300 focus:outline-none focus:ring-1 focus:ring-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
					/>
					<button
						type="button"
						onClick={() => onSetRowCount(rows.length + 1)}
						disabled={disabled || !canAddMore}
						className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-r-md transition-colors"
						aria-label="Increase count"
					>
						<PlusIcon className="h-4 w-4" />
					</button>
				</div>
			</div>

			{rows.length > 0 && (
				<div className="space-y-3 sm:space-y-0">
					{/* Desktop table header */}
					{!showPerRowStatusVisibility ? (
						<div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] sm:gap-2 sm:mb-2 sm:px-1">
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
								Name
							</span>
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
								Sex
							</span>
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
								Life Stage
							</span>
							<span className="w-8" />
						</div>
					) : (
						<div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] sm:gap-2 sm:mb-2 sm:px-1">
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
								Name
							</span>
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
								Sex
							</span>
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
								Life Stage
							</span>
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</span>
							<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
								Visibility
							</span>
							<span className="w-8" />
						</div>
					)}

					{rows.map((row) => (
						<div key={row.id}>
							{/* Mobile card layout */}
							<div className="sm:hidden bg-gray-50 rounded-lg p-3 border border-gray-200">
								<div className="flex items-start justify-between mb-2">
									<div className="flex-1 space-y-2">
										<input
											type="text"
											value={row.name}
											onChange={(e) =>
												onUpdateRow(
													row.id,
													"name",
													e.target.value
												)
											}
											placeholder="Name (optional)"
											disabled={disabled}
											className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
										/>
										<div className="grid grid-cols-2 gap-2">
											<select
												value={row.sex}
												onChange={(e) =>
													onUpdateRow(
														row.id,
														"sex",
														e.target.value
													)
												}
												disabled={disabled}
												className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
											>
												{SEX_OPTIONS.map((opt) => (
													<option
														key={opt.value}
														value={opt.value}
													>
														{opt.label}
													</option>
												))}
											</select>
											<select
												value={row.lifeStage}
												onChange={(e) =>
													onUpdateRow(
														row.id,
														"lifeStage",
														e.target.value
													)
												}
												disabled={disabled}
												className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
											>
												{LIFE_STAGE_OPTIONS.map(
													(opt) => (
														<option
															key={opt.value}
															value={opt.value}
														>
															{opt.label}
														</option>
													)
												)}
											</select>
										</div>
										{showPerRowStatusVisibility && (
											<div className="grid grid-cols-2 gap-2">
												<select
													value={row.status}
													onChange={(e) =>
														handleStatusChange(
															row.id,
															e.target.value
														)
													}
													disabled={disabled}
													className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
												>
													{STATUS_OPTIONS.map(
														(opt) => (
															<option
																key={opt.value}
																value={
																	opt.value
																}
															>
																{opt.label}
															</option>
														)
													)}
												</select>
												<select
													value={
														row.fosterVisibility
													}
													onChange={(e) =>
														handleVisibilityChange(
															row.id,
															e.target.value
														)
													}
													disabled={disabled}
													className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
												>
													{VISIBILITY_OPTIONS.map(
														(opt) => (
															<option
																key={opt.value}
																value={
																	opt.value
																}
															>
																{opt.label}
															</option>
														)
													)}
												</select>
											</div>
										)}
									</div>
									<button
										type="button"
										onClick={() => onRemoveRow(row.id)}
										disabled={disabled}
										className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
										aria-label="Remove animal"
									>
										<XMarkIcon className="h-5 w-5" />
									</button>
								</div>
							</div>

							{/* Desktop row layout */}
							{!showPerRowStatusVisibility ? (
								<div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] sm:gap-2 sm:items-center">
									<input
										type="text"
										value={row.name}
										onChange={(e) =>
											onUpdateRow(
												row.id,
												"name",
												e.target.value
											)
										}
										placeholder="Name (optional)"
										disabled={disabled}
										className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
									/>
									<select
										value={row.sex}
										onChange={(e) =>
											onUpdateRow(
												row.id,
												"sex",
												e.target.value
											)
										}
										disabled={disabled}
										className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
									>
										{SEX_OPTIONS.map((opt) => (
											<option
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</option>
										))}
									</select>
									<select
										value={row.lifeStage}
										onChange={(e) =>
											onUpdateRow(
												row.id,
												"lifeStage",
												e.target.value
											)
										}
										disabled={disabled}
										className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
									>
										{LIFE_STAGE_OPTIONS.map((opt) => (
											<option
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={() => onRemoveRow(row.id)}
										disabled={disabled}
										className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
										aria-label="Remove animal"
									>
										<XMarkIcon className="h-4 w-4" />
									</button>
								</div>
							) : (
								<div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] sm:gap-2 sm:items-center">
									<input
										type="text"
										value={row.name}
										onChange={(e) =>
											onUpdateRow(
												row.id,
												"name",
												e.target.value
											)
										}
										placeholder="Name (optional)"
										disabled={disabled}
										className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
									/>
									<select
										value={row.sex}
										onChange={(e) =>
											onUpdateRow(
												row.id,
												"sex",
												e.target.value
											)
										}
										disabled={disabled}
										className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
									>
										{SEX_OPTIONS.map((opt) => (
											<option
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</option>
										))}
									</select>
									<select
										value={row.lifeStage}
										onChange={(e) =>
											onUpdateRow(
												row.id,
												"lifeStage",
												e.target.value
											)
										}
										disabled={disabled}
										className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
									>
										{LIFE_STAGE_OPTIONS.map((opt) => (
											<option
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</option>
										))}
									</select>
									<select
										value={row.status}
										onChange={(e) =>
											handleStatusChange(
												row.id,
												e.target.value
											)
										}
										disabled={disabled}
										className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
									>
										{STATUS_OPTIONS.map((opt) => (
											<option
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</option>
										))}
									</select>
									<select
										value={row.fosterVisibility}
										onChange={(e) =>
											handleVisibilityChange(
												row.id,
												e.target.value
											)
										}
										disabled={disabled}
										className="w-full px-2.5 py-1.5 text-sm border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
									>
										{VISIBILITY_OPTIONS.map((opt) => (
											<option
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={() => onRemoveRow(row.id)}
										disabled={disabled}
										className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
										aria-label="Remove animal"
									>
										<XMarkIcon className="h-4 w-4" />
									</button>
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* Add another (after all rows, only when at least one row exists) */}
			{rows.length > 0 && (
				<div className="mt-3">
					{canAddMore ? (
						<button
							type="button"
							onClick={onAddRow}
							disabled={disabled}
							className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<PlusIcon className="h-4 w-4" />
							Add another
						</button>
					) : (
						<p className="text-sm text-gray-500">
							Maximum {maxRows} animals per bulk add.
						</p>
					)}
				</div>
			)}
		</div>
	);
}
