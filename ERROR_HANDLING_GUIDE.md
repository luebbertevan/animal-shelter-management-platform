# Error Handling Guide

This guide explains all error handling patterns used in the project.

## Overview

We have **three main error handling patterns** depending on the component type:

1. **Form Components** (Login, SignUp, NewAnimal) - Manual error state
2. **Data Fetching Components** (AnimalsList, AnimalDetail) - React Query error handling
3. **Shared Utilities** - `errorUtils.ts` for consistent error messages

---

## 1. Error Utility Functions (`errorUtils.ts`)

Located in `foster-app/src/lib/errorUtils.ts`

### `isNetworkError(error: unknown): boolean`

Checks if an error is network-related (offline, server down, etc.)

**Detects:**

-   `TypeError` with "Failed to fetch" message
-   Error messages containing "Failed to fetch", "NetworkError", or "Network request failed"

### `getNetworkErrorMessage(): string`

Returns a consistent user-friendly message for network errors:

```
"Unable to connect to the server. Please check your internet connection and try again."
```

### `getErrorMessage(error: unknown, defaultMessage: string): string`

**Main function** - Extracts user-friendly error message from any error type.

**How it works:**

1. If it's a network error → returns network error message
2. If it's an Error object → returns `error.message` or `defaultMessage`
3. Otherwise → returns `defaultMessage`

**Example:**

```typescript
getErrorMessage(someError, "Something went wrong");
// Returns: "Unable to connect..." if network error
// Returns: someError.message if it's an Error
// Returns: "Something went wrong" otherwise
```

---

## 2. Form Components (Manual Error State)

**Used in:** `Login.tsx`, `SignUp.tsx`, `NewAnimal.tsx`

### Pattern:

```typescript
const [error, setError] = useState<string | null>(null);

try {
	const { data, error: supabaseError } = await supabase.someAction();

	if (supabaseError) {
		// Handle Supabase-specific error
		setError(supabaseError.message);
	} else {
		// Success!
	}
} catch (err) {
	// Handle unexpected errors (network, etc.)
	setError(getErrorMessage(err, "An unexpected error occurred..."));
}
```

### Examples:

#### Login.tsx

```typescript
try {
  const { data, error: signInError } = await supabase.auth.signInWithPassword(...);

  if (signInError) {
    setError(signInError.message);  // Supabase auth error
  } else if (data.session) {
    navigate("/dashboard");  // Success
  } else {
    setError("Login failed. Please try again.");  // No session
  }
} catch {
  setError("An unexpected error occurred. Please try again.");  // Network/other
}
```

#### NewAnimal.tsx (More Complex)

```typescript
// Two types of errors:
const [errors, setErrors] = useState<Record<string, string>>({});  // Field validation errors
const [submitError, setSubmitError] = useState<string | null>(null);  // Submission errors

try {
  const { error: insertError } = await supabase.from("animals").insert(...);

  if (insertError) {
    // Supabase error (database, RLS, validation)
    setSubmitError(getErrorMessage(insertError, "Failed to create animal..."));
  } else {
    // Success!
  }
} catch (err) {
  // Network error or other unexpected error
  setSubmitError(getErrorMessage(err, "An unexpected error occurred..."));
}
```

**Key Points:**

-   Uses `useState` to store error messages
-   Displays errors with `<ErrorMessage>` component
-   Two error checks: `if (supabaseError)` and `catch (err)`

---

## 3. Data Fetching Components (React Query)

**Used in:** `AnimalsList.tsx`, `AnimalDetail.tsx`

### Pattern:

```typescript
// In the query function:
async function fetchData() {
	const { data, error } = await supabase.from("table").select();

	if (error) {
		throw new Error(getErrorMessage(error, "Failed to fetch..."));
	}

	if (!data) {
		throw new Error("No data returned");
	}

	return data;
}

// In the component:
const { data, isLoading, isError, error } = useQuery({
	queryKey: ["key"],
	queryFn: fetchData,
});

// Render states:
{
	isLoading && <LoadingSpinner />;
}
{
	isError && <ErrorDisplay error={error} />;
}
{
	data && <DataDisplay data={data} />;
}
```

### Examples:

#### AnimalsList.tsx

```typescript
async function fetchAnimals() {
  const { data, error } = await supabase.from("animals").select(...);

  if (error) {
    // Convert Supabase error to user-friendly message
    throw new Error(getErrorMessage(error, "Failed to fetch animals..."));
  }

  if (!data) {
    throw new Error("Failed to fetch animals. Please try again.");
  }

  return data;
}

// Component uses React Query states:
const { data = [], isLoading, isError, error } = useQuery({
  queryKey: ["animals"],
  queryFn: fetchAnimals,
});

// Render:
{isLoading && <LoadingSpinner message="Loading animals..." />}
{isError && (
  <div>
    <p>Unable to load animals right now.</p>
    <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    <button onClick={() => refetch()}>Try Again</button>
  </div>
)}
{!isLoading && !isError && animals.length === 0 && (
  <p>No animals found yet.</p>
)}
```

#### AnimalDetail.tsx

```typescript
const {
	data: animal,
	isLoading,
	isError,
	error,
} = useQuery({
	queryKey: ["animals", id],
	queryFn: async () => {
		const { data, error: fetchError } = await supabase
			.from("animals")
			.select("*")
			.eq("id", id)
			.single();

		if (fetchError) {
			throw new Error(getErrorMessage(fetchError, "Failed to load..."));
		}

		if (!data) {
			throw new Error("Animal not found");
		}

		return data;
	},
});

// Similar render pattern with isLoading, isError states
```

**Key Points:**

-   Errors are **thrown** in the query function
-   React Query catches them and sets `isError = true`
-   Component checks `isError` and displays error UI
-   Can use `refetch()` to retry

---

## 4. Error Flow Diagram

### Form Submission (NewAnimal):

```
User submits form
    ↓
try {
    Supabase call
        ↓
    if (insertError) {
        → setSubmitError(getErrorMessage(...))
        → Display error in form
    } else {
        → Success!
    }
} catch (err) {
    → setSubmitError(getErrorMessage(...))
    → Display error in form
}
```

### Data Fetching (AnimalsList):

```
Component mounts
    ↓
React Query calls fetchAnimals()
    ↓
fetchAnimals() {
    Supabase call
        ↓
    if (error) {
        → throw new Error(getErrorMessage(...))
    }
        ↓
    React Query catches error
        ↓
    Sets isError = true
        ↓
    Component renders error UI
}
```

---

## 5. Why Two Error Checks?

### In Form Components (NewAnimal):

**`if (insertError)`** - Handles Supabase errors:

-   Database constraint violations
-   RLS policy violations
-   Validation errors
-   Network errors that Supabase wraps

**`catch (err)`** - Handles errors outside Supabase:

-   Network errors before request completes (`TypeError: Failed to fetch`)
-   Errors in your code before calling Supabase
-   Other unexpected errors

**They're NOT redundant** - they catch different error paths!

---

## 6. Error Message Flow

```
Any Error
    ↓
getErrorMessage(error, defaultMessage)
    ↓
Is it a network error? (isNetworkError)
    ↓ YES → "Unable to connect to the server..."
    ↓ NO
Is it an Error object?
    ↓ YES → error.message || defaultMessage
    ↓ NO
Return defaultMessage
```

---

## 7. Current Error Handling by Component

### Login.tsx / SignUp.tsx

-   ✅ Manual error state (`useState`)
-   ✅ Checks `signInError` / `signUpError`
-   ✅ Generic `catch` block
-   ❌ Not using `errorUtils` (could be improved)

### NewAnimal.tsx

-   ✅ Manual error state (`submitError`)
-   ✅ Uses `getErrorMessage()` for both error paths
-   ✅ Field validation errors (`errors` object)
-   ✅ Two error checks: `insertError` and `catch`

### AnimalsList.tsx

-   ✅ React Query error handling
-   ✅ Uses `getErrorMessage()` in fetch function
-   ✅ Displays error with retry button
-   ✅ Handles empty state separately

### AnimalDetail.tsx

-   ✅ React Query error handling
-   ✅ Uses `getErrorMessage()` in query function
-   ✅ Displays error with navigation button
-   ✅ Handles "not found" case

### Dashboard.tsx

-   ⚠️ Minimal error handling (just logs signOut errors)
-   ✅ Always redirects (local session cleared regardless)

---

## 8. Best Practices

1. **Always use `getErrorMessage()`** for user-facing errors
2. **Check both Supabase error AND catch block** in form submissions
3. **Throw errors in query functions** for React Query to catch
4. **Display loading states** before showing errors
5. **Provide retry mechanisms** where appropriate
6. **Log errors to console** for debugging: `console.error("Error:", error)`

---

## 9. Common Error Scenarios

| Scenario            | Error Type                   | Where Caught            | Message                              |
| ------------------- | ---------------------------- | ----------------------- | ------------------------------------ |
| Offline             | `TypeError: Failed to fetch` | `catch` block           | "Unable to connect to the server..." |
| Invalid credentials | Supabase auth error          | `if (signInError)`      | Supabase's message                   |
| RLS violation       | Supabase error               | `if (insertError)`      | Supabase's message                   |
| Animal not found    | Custom error                 | Query function          | "Animal not found"                   |
| Network timeout     | Network error                | `catch` or `if (error)` | "Unable to connect..."               |

---

## Summary

-   **`errorUtils.ts`** = Centralized error message handling (DRY)
-   **Form components** = Manual state + two error checks
-   **Data fetching** = React Query + throw errors in query functions
-   **Always use `getErrorMessage()`** for consistent user-friendly messages
