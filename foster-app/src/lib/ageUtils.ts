/**
 * Age calculation utility functions
 *
 * These functions handle age calculations, rollover logic, and conversions
 * between date of birth and age estimates.
 */

export type AgeUnit = "days" | "weeks" | "months" | "years";

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
 *
 * This is a display-only "normalization" function for UI purposes.
 * It does NOT use precise calendar math - it uses simple thresholds and multipliers.
 *
 * Rollover rules (checked in order):
 * - 24+ months → years
 * - 365+ days → years
 * - 16+ weeks → months
 * - 7+ days → weeks
 *
 * Returns integer values for cleaner display.
 *
 * @param value - The numeric age value
 * @param unit - The current unit (days, weeks, months, or years)
 * @returns AgeValue with rolled over value (integer) and unit
 */
export function rolloverAge(value: number, unit: AgeUnit): AgeValue {
	if (value <= 0) {
		return { value, unit };
	}

	// Convert everything to a common unit (days) for easier comparison
	const daysPerUnit = {
		days: 1,
		weeks: DAYS_PER_WEEK,
		months: DAYS_PER_MONTH,
		years: DAYS_PER_YEAR,
	};

	const totalDays = value * daysPerUnit[unit];

	// Apply rollover rules - check in order from largest to smallest
	// 24+ months → years
	if (unit === "months" && value >= 24) {
		const years = Math.round(totalDays / DAYS_PER_YEAR);
		return { value: years, unit: "years" };
	}

	// 365+ days → years
	if (totalDays >= 365) {
		const years = Math.round(totalDays / DAYS_PER_YEAR);
		return { value: years, unit: "years" };
	}

	// 16+ weeks (112+ days) → months
	// But never return 12 months - convert to 1 year instead
	const weeksThresholdDays = WEEKS_TO_MONTHS_THRESHOLD * DAYS_PER_WEEK; // 16 * 7 = 112 days
	if (totalDays >= weeksThresholdDays) {
		const months = Math.round(totalDays / DAYS_PER_MONTH);
		// If it would be 12 months, convert to 1 year
		if (months >= 12) {
			const years = Math.round(totalDays / DAYS_PER_YEAR);
			return { value: years, unit: "years" };
		}
		return { value: months, unit: "months" };
	}

	// 7+ days (but < 112 days) → weeks
	// Use Math.floor to avoid rounding up (e.g., 11 days = 1 week, not 2)
	if (totalDays >= DAYS_PER_WEEK) {
		const weeks = Math.floor(totalDays / DAYS_PER_WEEK);
		return { value: weeks, unit: "weeks" };
	}

	// Less than 7 days, keep as days (round to integer)
	return { value: Math.round(value), unit: "days" };
}

/**
 * Calculates age from date of birth to today using actual calendar date math.
 *
 * This is the REAL age calculation - it uses actual date differences, not multipliers.
 * It correctly handles leap years, varying month lengths, and actual calendar differences.
 *
 * This is what populates the age fields when a DOB is given.
 *
 * Determines the most appropriate unit based on age:
 * - < 7 days → days
 * - < 16 weeks → weeks
 * - < 1 year → months
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

	// Parse date string and create date in local timezone to avoid timezone shift issues
	// Date strings like "2024-12-12" are parsed as UTC, which causes problems when normalizing
	const [year, month, day] = dob.split("-").map(Number);
	const birthDate = new Date(year, month - 1, day);
	const today = new Date();

	// Normalize both dates to midnight for accurate day calculations
	today.setHours(0, 0, 0, 0);
	// birthDate is already at midnight since we constructed it that way

	// Check if date is valid
	if (isNaN(birthDate.getTime())) {
		return null;
	}

	// Check if date is in the future
	if (birthDate > today) {
		return null;
	}

	// Calculate actual days difference using date math (needed for all thresholds)
	const ageMs = today.getTime() - birthDate.getTime();
	const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

	// Calculate actual years difference using calendar date math
	const yearDiff = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();
	const dayDiff = today.getDate() - birthDate.getDate();

	// Check if birthday hasn't occurred this year yet
	const hasBirthdayOccurred =
		monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0);
	const years = hasBirthdayOccurred ? yearDiff : yearDiff - 1;

	// Only return years if:
	// 1. Calendar year calculation says >= 1 year (birthday has occurred)
	// 2. AND at least 365 days have passed
	// This ensures we only show "1 year" when the birthday has actually occurred,
	// not just when 365+ days have passed but birthday is still in the future
	if (years >= 1 && ageDays >= 365) {
		return { value: years, unit: "years" };
	}

	// If < 7 days, return days
	if (ageDays < DAYS_PER_WEEK) {
		return { value: ageDays, unit: "days" };
	}

	// If < 16 weeks (112 days), return weeks
	const weeksThresholdDays = WEEKS_TO_MONTHS_THRESHOLD * DAYS_PER_WEEK; // 16 * 7 = 112 days
	if (ageDays < weeksThresholdDays) {
		const weeks = Math.floor(ageDays / DAYS_PER_WEEK);
		return { value: weeks, unit: "weeks" };
	}

	// >= 16 weeks and < 1 year, calculate actual months difference using calendar math
	// Start with year difference in months, then add/subtract month difference
	let months = yearDiff * 12 + monthDiff;
	if (!hasBirthdayOccurred) {
		months--;
	}

	// Never return 12 months - if it's 12 months, it should be 1 year
	// But only if we've actually reached the birthday (years >= 1)
	if (months >= 12 && years >= 1) {
		return { value: years, unit: "years" };
	}

	// Return months (we know it's >= 16 weeks and < 1 year, and < 12 months)
	return { value: months, unit: "months" };
}

/**
 * Calculates estimated date of birth from age using estimation multipliers.
 *
 * This is used ONLY when a user enters an estimated age (reverse direction from calculateAgeFromDOB).
 * It uses estimation multipliers because the input is approximate:
 * - weeks = 7 days
 * - months = 30.44 days (average)
 * - years = 365.25 days (accounts for leap years, average)
 *
 * DOB computed this way should not be used to compute calendar-age - it's only to set DOB
 * so the real calculation (calculateAgeFromDOB) can run afterward.
 *
 * @param value - The numeric age value
 * @param unit - The age unit (days, weeks, months, or years)
 * @returns ISO date string for the estimated date of birth, or empty string if invalid
 */
export function calculateDOBFromAge(value: number, unit: AgeUnit): string {
	if (value <= 0 || isNaN(value)) {
		return "";
	}

	const daysPerUnit = {
		days: 1,
		weeks: DAYS_PER_WEEK,
		months: DAYS_PER_MONTH,
		years: DAYS_PER_YEAR,
	};

	const totalDays = value * daysPerUnit[unit];
	const today = new Date();
	// Normalize to noon to avoid timezone issues when crossing day boundaries
	today.setHours(12, 0, 0, 0);
	// Use setDate to avoid timezone/daylight saving issues
	// Round to integer since setDate doesn't handle fractional days correctly
	const dobDate = new Date(today);
	dobDate.setDate(dobDate.getDate() - Math.round(totalDays));

	// Return ISO date string (YYYY-MM-DD format for date input)
	// Format manually to avoid timezone conversion issues
	const year = dobDate.getFullYear();
	const month = String(dobDate.getMonth() + 1).padStart(2, "0");
	const day = String(dobDate.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Calculates life stage from date of birth.
 * Uses age calculation to determine life stage.
 *
 * Life stage thresholds:
 * - < 1 year: "kitten"
 * - >= 1 year and < 11 years: "adult"
 * - >= 11 years: "senior"
 * - If age cannot be determined: "unknown"
 *
 * @param dob - Date of birth as ISO date string
 * @returns Life stage string, or "unknown" if age cannot be determined
 */
export function calculateLifeStageFromDOB(
	dob: string
): "kitten" | "adult" | "senior" | "unknown" {
	if (!dob) {
		return "unknown";
	}

	const ageResult = calculateAgeFromDOB(dob);
	if (!ageResult) {
		return "unknown";
	}

	return calculateLifeStageFromAge(ageResult.value, ageResult.unit);
}

/**
 * Calculates life stage from age value and unit.
 *
 * Life stage thresholds:
 * - < 1 year: "kitten"
 * - >= 1 year and < 11 years: "adult"
 * - >= 11 years: "senior"
 *
 * @param value - The numeric age value
 * @param unit - The age unit (days, weeks, months, or years)
 * @returns Life stage string
 */
export function calculateLifeStageFromAge(
	value: number,
	unit: AgeUnit
): "kitten" | "adult" | "senior" | "unknown" {
	if (value <= 0 || isNaN(value)) {
		return "unknown";
	}

	// Convert age to years for comparison
	const daysPerUnit = {
		days: 1,
		weeks: DAYS_PER_WEEK,
		months: DAYS_PER_MONTH,
		years: DAYS_PER_YEAR,
	};

	const totalDays = value * daysPerUnit[unit];
	const years = totalDays / DAYS_PER_YEAR;

	// >= 11 years: senior
	if (years >= 11) {
		return "senior";
	}

	// >= 1 year and < 11 years: adult
	if (years >= 1) {
		return "adult";
	}

	// < 1 year: kitten
	return "kitten";
}
