/**
 * Checks if an error is a network/connection error
 */
export function isNetworkError(error: unknown): boolean {
	if (
		error instanceof TypeError &&
		error.message.includes("Failed to fetch")
	) {
		return true;
	}
	if (error instanceof Error) {
		return (
			error.message.includes("Failed to fetch") ||
			error.message.includes("NetworkError") ||
			error.message.includes("Network request failed")
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
