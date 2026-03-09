import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useBulkAddRows } from "../../hooks/useBulkAddRows";
import { bulkCreateAnimals } from "../../lib/bulkAnimalUtils";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import BulkAddAnimalRows from "../../components/animals/BulkAddAnimalRows";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";

export default function BulkAddAnimals() {
	const navigate = useNavigate();
	const { user, profile, isCoordinator } = useProtectedAuth();

	const {
		rows,
		addRow,
		removeRow,
		updateRow,
		setRowCount,
		canAddMore,
		maxRows,
	} = useBulkAddRows();

	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	if (!isCoordinator) {
		navigate("/animals", { replace: true });
		return null;
	}

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitError(null);

		if (rows.length === 0) {
			setSubmitError(
				"Add at least one animal before submitting."
			);
			return;
		}

		setLoading(true);

		try {
			checkOfflineAndThrow();

			const result = await bulkCreateAnimals(rows, {
				organizationId: profile.organization_id,
				createdBy: user.id,
			});

			if (result.failedCount > 0 && result.createdIds.length > 0) {
				setSubmitError(
					`${result.failedCount} animal(s) failed to create. ${result.createdIds.length} created successfully.`
				);
			} else if (
				result.failedCount > 0 &&
				result.createdIds.length === 0
			) {
				setSubmitError(
					"All animals failed to create. Please try again."
				);
			} else {
				setSuccessMessage(
					`${result.createdIds.length} animal${result.createdIds.length !== 1 ? "s" : ""} created successfully!`
				);
				setTimeout(() => {
					navigate("/animals", { replace: true });
				}, 1500);
			}
		} catch (err) {
			console.error("Error creating animals:", err);
			setSubmitError(
				getErrorMessage(
					err,
					"Failed to create animals. Please try again."
				)
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow-md p-6">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">
							Bulk Add Animals
						</h1>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate("/animals")}
								className="w-auto py-1 px-2 text-sm whitespace-nowrap"
							>
								Cancel
							</Button>
						</div>
					</div>

					<form onSubmit={handleSubmit} className="space-y-6">
						<BulkAddAnimalRows
							rows={rows}
							onAddRow={addRow}
							onRemoveRow={removeRow}
							onUpdateRow={updateRow}
							onSetRowCount={setRowCount}
							canAddMore={canAddMore}
							maxRows={maxRows}
							disabled={loading}
							showPerRowStatusVisibility
						/>

						{submitError && (
							<ErrorMessage>{submitError}</ErrorMessage>
						)}

						{successMessage && (
							<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
								{successMessage}
							</div>
						)}

						<div className="flex gap-4">
							<Button
								type="submit"
								disabled={loading || rows.length === 0}
								className="w-auto"
							>
								{loading
									? "Creating..."
									: `Create ${rows.length} Animal${rows.length !== 1 ? "s" : ""}`}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
