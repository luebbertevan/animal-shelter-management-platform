import { supabase } from "./supabase";
import type { BulkAddAnimalRow } from "../hooks/useBulkAddRows";
import type { GroupFormMessageState } from "./groupUtils";

export interface BulkCreateOptions {
	organizationId: string;
	createdBy: string;
	groupStatus?: string;
	groupFosterVisibility?: string;
}

export interface BulkCreateResult {
	createdIds: string[];
	failedCount: number;
}

/**
 * Default status/visibility for bulk-create when adding to a group.
 * Single source of truth for NewGroup and EditGroup bulk-create options.
 */
export function getBulkCreateGroupDefaults(
	onlyBulkAdd: boolean,
	stagedStatusForAll: string,
	stagedFosterVisibilityForAll: string,
	messageState: GroupFormMessageState
): { groupStatus?: string; groupFosterVisibility?: string } {
	return {
		groupStatus:
			stagedStatusForAll ||
			(onlyBulkAdd ? "in_shelter" : messageState.sharedStatusFromSelected) ||
			undefined,
		groupFosterVisibility:
			stagedFosterVisibilityForAll ||
			(onlyBulkAdd
				? "available_now"
				: messageState.sharedFosterVisibilityFromSelected ?? undefined) ||
			undefined,
	};
}

/**
 * Create multiple animals from bulk-add rows.
 *
 * For "group" mode: status/visibility come from groupStatus/groupFosterVisibility
 * (falls back to per-row values, then to defaults).
 * For "standalone" mode: each row carries its own status/visibility.
 */
export async function bulkCreateAnimals(
	rows: BulkAddAnimalRow[],
	options: BulkCreateOptions
): Promise<BulkCreateResult> {
	if (rows.length === 0) {
		return { createdIds: [], failedCount: 0 };
	}

	const inserts = rows.map((row) => ({
		name: row.name.trim() || null,
		species: "cat" as const,
		sex_spay_neuter_status: row.sex || null,
		life_stage: row.lifeStage || null,
		status: options.groupStatus || row.status || "in_shelter",
		foster_visibility:
			options.groupFosterVisibility ||
			row.fosterVisibility ||
			"available_now",
		organization_id: options.organizationId,
		created_by: options.createdBy,
	}));

	const { data, error } = await supabase
		.from("animals")
		.insert(inserts)
		.select("id");

	if (error) {
		throw error;
	}

	const createdIds = (data || []).map((d) => d.id);
	return {
		createdIds,
		failedCount: rows.length - createdIds.length,
	};
}
