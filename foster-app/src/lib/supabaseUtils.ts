/**
 * Utility functions for working with Supabase JOIN results.
 *
 * Supabase JOINs return nested objects that TypeScript can't automatically infer,
 * so we need type guards to safely extract data from JOIN results.
 */

/**
 * Extracts a field value from a Supabase JOIN result.
 *
 * @param joined The joined data from Supabase (typically typed as `unknown`)
 * @param field The field name to extract (e.g., "full_name", "email")
 * @returns The field value if it exists, otherwise undefined
 *
 * Example:
 * const name = extractJoinedField<string>(conv.profiles, "full_name");
 * const email = extractJoinedField<string>(user.profile, "email");
 */
export function extractJoinedField<T>(
	joined: unknown,
	field: string
): T | undefined {
	if (
		joined &&
		typeof joined === "object" &&
		!Array.isArray(joined) &&
		field in joined
	) {
		return (joined as Record<string, T>)[field];
	}
	return undefined;
}

/**
 * Convenience function specifically for extracting full_name from profiles JOIN.
 * This is the most common JOIN pattern in our app.
 *
 * @param profiles The profiles JOIN result from Supabase
 * @returns The full_name string if it exists, otherwise undefined
 *
 * Example:
 * const fosterName = extractFullName(conv.profiles);
 * const senderName = extractFullName(msg.profiles);
 */
export function extractFullName(profiles: unknown): string | undefined {
	return extractJoinedField<string>(profiles, "full_name");
}
