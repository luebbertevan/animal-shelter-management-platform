/**
 * Checks if an error is a network/connection error
 *
 * Why multiple checks?
 * - Browsers throw different error types for network failures
 * - Supabase wraps errors in different object structures
 * - We need to catch all variations to show user-friendly messages
 */
export function isNetworkError(error: unknown): boolean {
	// Check 1: TypeError with "Failed to fetch"
	// Browser throws TypeError when fetch() fails (offline, CORS, DNS, etc.)
	// This is the most common network error type in browsers
	if (
		error instanceof TypeError &&
		error.message.includes("Failed to fetch")
	) {
		return true;
	}

	// Check 2: Error objects with network-related messages
	// Supabase or other libraries might wrap network errors in Error objects
	// We check the message content for network-related keywords
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes("failed to fetch") || // Standard fetch failure
			message.includes("networkerror") || // Firefox network error
			message.includes("network request failed") || // Generic network failure
			message.includes(
				"networkerror when attempting to fetch resource"
			) || // Firefox specific message
			message.includes("load failed") // Resource load failure
		);
	}

	// Check 3: Supabase PostgREST error objects (not Error instances)
	// Supabase sometimes returns error objects that aren't Error instances
	// but have a message property (e.g., { code: "...", message: "..." })
	if (error && typeof error === "object" && "message" in error) {
		const message = String(
			(error as { message: string }).message
		).toLowerCase();
		return (
			message.includes("failed to fetch") ||
			message.includes("networkerror") ||
			message.includes("network request failed")
		);
	}

	return false;
}

/**
 * Gets a user-friendly error message for network errors
 */
export function getNetworkErrorMessage(): string {
	return "Unable to connect to the server. Please check your internet connection and try again.";
}

/**
 * Extracts a user-friendly error message from any error
 */
export function getErrorMessage(
	error: unknown,
	defaultMessage: string
): string {
	if (isNetworkError(error)) {
		return getNetworkErrorMessage();
	}
	if (error instanceof Error) {
		return error.message || defaultMessage;
	}
	return defaultMessage;
}

/**
 * Checks if we're currently offline
 */
export function isOffline(): boolean {
	return !navigator.onLine;
}

/**
 * Throws a network error if we're offline
 * Use this before making API calls to fail fast when offline
 */
export function checkOfflineAndThrow(): void {
	if (isOffline()) {
		throw new TypeError("Failed to fetch");
	}
}

/**
 * Handles Supabase "not found" errors, distinguishing between actual "not found"
 * and network errors when offline.
 *
 * @param error - The Supabase error object
 * @param data - The data returned from Supabase (null/undefined if not found)
 * @param resourceName - Name of the resource for error messages (e.g., "Animal")
 * @returns An Error object to throw
 */
export function handleSupabaseNotFound(
	error: unknown,
	data: unknown,
	resourceName: string
): Error {
	const offline = isOffline();

	// Check if it's a Supabase "not found" error
	const isNotFound =
		(error &&
			typeof error === "object" &&
			"code" in error &&
			(error as { code: string }).code === "PGRST116") ||
		(error &&
			typeof error === "object" &&
			"message" in error &&
			String((error as { message: string }).message).includes("No rows"));

	// If we have a "not found" error but we're offline, treat it as network error
	// (Supabase might return "not found" incorrectly when offline)
	if (isNotFound && offline) {
		return new TypeError("Failed to fetch");
	}

	// If we have a "not found" error and we're online, it's a real "not found"
	if (isNotFound && !offline) {
		return new Error(`${resourceName} not found`);
	}

	// If no data and we're offline, treat as network error
	if (!data && offline) {
		return new TypeError("Failed to fetch");
	}

	// If no data and we're online, it's a real "not found"
	if (!data && !offline) {
		return new Error(`${resourceName} not found`);
	}

	// Fallback: if we have an error but it's not "not found", return it as-is
	// (getErrorMessage will handle it)
	if (error instanceof Error) {
		return error;
	}

	// Should not reach here, but provide fallback
	return new Error(`${resourceName} not found`);
}
