import { useState, useCallback, useRef } from "react";

/**
 * Empty-group confirmation for group create/edit forms.
 * Single source of truth for NewGroup and EditGroup.
 */
export function useEmptyGroupConfirm() {
	const [showEmptyGroupConfirm, setShowEmptyGroupConfirm] = useState(false);
	const pendingSubmitRef = useRef<(() => void | Promise<void>) | null>(null);

	const requestEmptyGroupConfirm = useCallback(
		(performSubmit: () => void | Promise<void>) => {
			pendingSubmitRef.current = performSubmit;
			setShowEmptyGroupConfirm(true);
		},
		[]
	);

	const handleConfirmEmptyGroup = useCallback(() => {
		setShowEmptyGroupConfirm(false);
		const fn = pendingSubmitRef.current;
		pendingSubmitRef.current = null;
		if (fn) fn();
	}, []);

	const handleCancelEmptyGroup = useCallback(() => {
		setShowEmptyGroupConfirm(false);
		pendingSubmitRef.current = null;
	}, []);

	return {
		showEmptyGroupConfirm,
		setShowEmptyGroupConfirm,
		requestEmptyGroupConfirm,
		handleConfirmEmptyGroup,
		handleCancelEmptyGroup,
	};
}
