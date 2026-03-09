import { useState, useCallback } from "react";

export interface BulkAddAnimalRow {
	id: string;
	name: string;
	sex: string;
	lifeStage: string;
	status: string;
	fosterVisibility: string;
}

const MAX_BULK_ADD_ROWS = 30;

function createEmptyRow(): BulkAddAnimalRow {
	return {
		id: crypto.randomUUID(),
		name: "",
		sex: "",
		lifeStage: "",
		status: "in_shelter",
		fosterVisibility: "available_now",
	};
}

export function useBulkAddRows() {
	const [rows, setRows] = useState<BulkAddAnimalRow[]>([]);

	const addRow = useCallback(() => {
		setRows((prev) => {
			if (prev.length >= MAX_BULK_ADD_ROWS) return prev;
			return [...prev, createEmptyRow()];
		});
	}, []);

	const removeRow = useCallback((rowId: string) => {
		setRows((prev) => prev.filter((r) => r.id !== rowId));
	}, []);

	const updateRow = useCallback(
		(rowId: string, field: keyof BulkAddAnimalRow, value: string) => {
			setRows((prev) =>
				prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
			);
		},
		[]
	);

	const setRowCount = useCallback((count: number) => {
		setRows((prev) => {
			const clamped = Math.max(0, Math.min(count, MAX_BULK_ADD_ROWS));
			if (clamped > prev.length) {
				const newRows = Array.from(
					{ length: clamped - prev.length },
					() => createEmptyRow()
				);
				return [...prev, ...newRows];
			}
			return prev.slice(0, clamped);
		});
	}, []);

	const clearRows = useCallback(() => {
		setRows([]);
	}, []);

	return {
		rows,
		addRow,
		removeRow,
		updateRow,
		setRowCount,
		clearRows,
		maxRows: MAX_BULK_ADD_ROWS,
		canAddMore: rows.length < MAX_BULK_ADD_ROWS,
	};
}
