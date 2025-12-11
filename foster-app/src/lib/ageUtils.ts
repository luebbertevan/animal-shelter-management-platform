/**
 * Age calculation utility functions
 *
 * These functions handle age calculations, rollover logic, and conversions
 * between date of birth and age estimates.
 */

export type AgeUnit = "weeks" | "months" | "years";

export interface AgeValue {
	value: number;
	unit: AgeUnit;
}

// Unit conversion constants (for estimate calculations only)
// Note: These are averages used for user input estimates, not precise calendar calculations
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30.44; // Average month length
const DAYS_PER_YEAR = 365.25; // Accounts for leap years (average)

// Rollover thresholds
const WEEKS_TO_MONTHS_THRESHOLD = 16; // weeks

/**
 * Converts age to the most appropriate unit based on rollover rules.
 * Rollover rules:
 * - 16+ weeks → months
 * - 12+ months → years
 * - 52+ weeks → years (if already in weeks and >= 52)
 *
 * Returns integer values for cleaner display.
 *
 * @param value - The numeric age value
 * @param unit - The current unit (weeks, months, or years)
 * @returns AgeValue with rolled over value (integer) and unit
 */
export function rolloverAge(value: number, unit: AgeUnit): AgeValue {
	if (value <= 0) {
		return { value, unit };
	}

	// Convert everything to a common unit (days) for easier comparison
	const daysPerUnit = {
		weeks: DAYS_PER_WEEK,
		months: DAYS_PER_MONTH,
		years: DAYS_PER_YEAR,
	};

	const totalDays = value * daysPerUnit[unit];

	// Apply rollover rules
	// 52+ weeks or 12+ months → years (use 365 as threshold for cleaner rollover)
	if (totalDays >= 365) {
		const years = Math.round(totalDays / DAYS_PER_YEAR);
		return { value: years, unit: "years" };
	}

	// 16+ weeks → months
	if (totalDays >= WEEKS_TO_MONTHS_THRESHOLD * DAYS_PER_WEEK) {
		const months = Math.round(totalDays / DAYS_PER_MONTH);
		return { value: months, unit: "months" };
	}

	// Less than 16 weeks, keep as weeks (round to integer)
	return { value: Math.round(value), unit: "weeks" };
}

/**
 * Calculates age from date of birth to today using actual calendar date math.
 * Uses Date methods for accurate calculations that account for leap years,
 * varying month lengths, and actual calendar differences.
 *
 * Determines the most appropriate unit based on age:
 * - < 16 weeks → weeks
 * - >= 16 weeks and < 1 year → months
 * - >= 1 year → years
 *
 * Returns integer values for display.
 *
 * @param dob - Date of birth as ISO date string
 * @returns AgeValue with calculated age (integer) and appropriate unit, or null if invalid
 */
export function calculateAgeFromDOB(dob: string): AgeValue | null {
	if (!dob) {
		return null;
	}

	const birthDate = new Date(dob);
	const today = new Date();

	// Check if date is valid
	if (isNaN(birthDate.getTime())) {
		return null;
	}

	// Check if date is in the future
	if (birthDate > today) {
		return null;
	}

	// Calculate actual years difference using Date methods
	const yearDiff = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();
	const dayDiff = today.getDate() - birthDate.getDate();

	// Check if birthday hasn't occurred this year yet
	const hasBirthdayOccurred =
		monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0);
	const years = hasBirthdayOccurred ? yearDiff : yearDiff - 1;

	// If >= 1 year, return years
	if (years >= 1) {
		return { value: years, unit: "years" };
	}

	// Calculate actual months difference
	// Start with year difference in months, then add/subtract month difference
	let months = yearDiff * 12 + monthDiff;
	if (!hasBirthdayOccurred) {
		months--;
	}

	// If >= 16 weeks (approximately 4 months), return months
	if (months >= 4) {
		return { value: months, unit: "months" };
	}

	// Calculate actual weeks difference using date math
	const ageMs = today.getTime() - birthDate.getTime();
	const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
	const weeks = Math.round(ageDays / DAYS_PER_WEEK);

	return { value: weeks, unit: "weeks" };
}

/**
 * Calculates estimated date of birth from age using day multipliers.
 * This is used for form input when user enters age estimate.
 * Uses average multipliers (not precise calendar math) since this is an estimate.
 *
 * @param value - The numeric age value
 * @param unit - The age unit (weeks, months, or years)
 * @returns ISO date string for the estimated date of birth, or empty string if invalid
 */
export function calculateDOBFromAge(value: number, unit: AgeUnit): string {
	if (value <= 0 || isNaN(value)) {
		return "";
	}

	const daysPerUnit = {
		weeks: DAYS_PER_WEEK,
		months: DAYS_PER_MONTH,
		years: DAYS_PER_YEAR,
	};

	const totalDays = value * daysPerUnit[unit];
	const today = new Date();
	const dobDate = new Date(today.getTime() - totalDays * 24 * 60 * 60 * 1000);

	// Return ISO date string (YYYY-MM-DD format for date input)
	return dobDate.toISOString().split("T")[0];
}
