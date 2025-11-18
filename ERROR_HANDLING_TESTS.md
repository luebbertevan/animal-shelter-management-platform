# Error Handling Tests

Quick tests to verify all error handling in the app.

## Setup

Open DevTools (F12) → Network tab → Use "Offline" checkbox for network tests.

---

## Authentication Errors

### Login - Network Error

1. Go to `/login`
2. Set offline in DevTools
3. Enter credentials → Click "Log in"
   **Expected:** "Unable to connect to the server. Please check your internet connection and try again."

### Login - Invalid Credentials

1. Go to `/login` (online)
2. Enter wrong email/password → Click "Log in"
   **Expected:** Supabase error message (e.g., "Invalid login credentials")

### SignUp - Network Error

1. Go to `/signup`
2. Set offline in DevTools
3. Fill form → Click "Sign up"
   **Expected:** "Unable to connect to the server. Please check your internet connection and try again."

### SignUp - Validation Errors

1. Go to `/signup` (online)
2. Enter password < 6 chars → Click "Sign up"
   **Expected:** "Password must be at least 6 characters long."
3. Enter mismatched passwords → Click "Sign up"
   **Expected:** "Passwords do not match."

---

## Animal Management Errors

### Create Animal - Network Error

1. Log in → Go to `/animals/new`
2. Set offline in DevTools
3. Fill form → Click "Create Animal"
   **Expected:** "Unable to connect to the server. Please check your internet connection and try again."

### Animals List - Network Error

1. Log in → Set offline in DevTools
2. Go to `/animals`
   **Expected:** Error message with "Try Again" button: "Unable to connect to the server..."

### Animals List - Empty State (Online)

1. Log in → Go to `/animals` (with no animals in DB, online)
   **Expected:** "No animals found yet. Once you add animals, they will appear here."

### Animal Detail - Network Error

1. Log in → Go to `/animals` (online) → Note an animal ID
2. Set offline in DevTools
3. Navigate to `/animals/{id}/name`
   **Expected:** Error message with "Back to Animals" button: "Unable to connect to the server..."

### Animal Detail - Not Found

1. Log in (online)
2. Go to `/animals/00000000-0000-0000-0000-000000000000/invalid`
   **Expected:** "Animal not found" with "Back to Animals" button

---

## Loading States

### Dashboard Loading

1. Clear cache/localStorage (or incognito)
2. Go to `/dashboard`
   **Expected:** Shows "Loading..." spinner (not blank screen) → Then dashboard

---

## Quick Checklist

-   [ ] Login offline → network error
-   [ ] Login invalid credentials → Supabase error
-   [ ] SignUp offline → network error
-   [ ] SignUp validation → field errors
-   [ ] Create Animal offline → network error
-   [ ] Animals List offline → network error with retry
-   [ ] Animals List empty (online) → "No animals found"
-   [ ] Animal Detail offline → network error
-   [ ] Animal Detail not found → "Animal not found"
-   [ ] Dashboard loading → spinner (not blank)
