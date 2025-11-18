# Minimal Error Handling Tests

Quick tests to verify error handling works correctly across the app.

## Setup

1. Open browser DevTools (F12) → Network tab
2. Keep DevTools open to see network requests

---

## Test 1: Network Error (Offline) - Login

**Steps:**
1. Go to `/login`
2. In DevTools → Network tab → Check "Offline" checkbox (or use browser's offline mode)
3. Enter any email/password and click "Log in"

**Expected:**
- Shows: "Unable to connect to the server. Please check your internet connection and try again."
- Not a generic "Failed to fetch" message

---

## Test 2: Network Error (Offline) - Sign Up

**Steps:**
1. Go to `/signup`
2. In DevTools → Network tab → Check "Offline" checkbox
3. Fill out form and click "Sign up"

**Expected:**
- Shows: "Unable to connect to the server. Please check your internet connection and try again."

---

## Test 3: Invalid Credentials - Login

**Steps:**
1. Go to `/login`
2. Make sure you're **online** (uncheck "Offline" in DevTools)
3. Enter wrong email or password
4. Click "Log in"

**Expected:**
- Shows Supabase's error message (e.g., "Invalid login credentials")
- Not a generic error

---

## Test 4: Network Error (Offline) - Create Animal

**Steps:**
1. Log in successfully
2. Go to `/animals/new`
3. In DevTools → Network tab → Check "Offline" checkbox
4. Fill out form and click "Create Animal"

**Expected:**
- Shows: "Unable to connect to the server. Please check your internet connection and try again."

---

## Test 5: Network Error (Offline) - Animals List

**Steps:**
1. Log in successfully
2. In DevTools → Network tab → Check "Offline" checkbox
3. Go to `/animals`

**Expected:**
- Shows error message with "Try Again" button
- Message: "Unable to connect to the server. Please check your internet connection and try again."

---

## Test 6: Network Error (Offline) - Animal Detail

**Steps:**
1. Log in successfully
2. Go to `/animals` (while online) to see an animal ID
3. In DevTools → Network tab → Check "Offline" checkbox
4. Click on an animal card or go directly to `/animals/{id}/some-name`

**Expected:**
- Shows error message with "Back to Animals" button
- Message: "Unable to connect to the server. Please check your internet connection and try again."

---

## Test 7: Invalid Animal ID - Animal Detail

**Steps:**
1. Log in successfully
2. Make sure you're **online**
3. Go to `/animals/00000000-0000-0000-0000-000000000000/invalid-animal`

**Expected:**
- Shows: "Animal not found" or similar error message
- Has "Back to Animals" button

---

## Test 8: Dashboard Loading State

**Steps:**
1. Clear browser cache/localStorage (or use incognito)
2. Go to `/dashboard`

**Expected:**
- Shows "Loading dashboard..." spinner (not blank white screen)
- Then shows dashboard content

---

## Quick Checklist

- [ ] Login offline → shows network error message
- [ ] SignUp offline → shows network error message
- [ ] Create Animal offline → shows network error message
- [ ] Animals List offline → shows network error message with retry
- [ ] Animal Detail offline → shows network error message
- [ ] Invalid credentials → shows Supabase error message
- [ ] Invalid animal ID → shows "not found" message
- [ ] Dashboard loading → shows spinner (not blank)

---

## Notes

- **Offline mode:** Use DevTools Network tab → "Offline" checkbox (easiest)
- **Alternative:** Disconnect WiFi, but DevTools is faster
- **All tests should show user-friendly messages**, not technical errors like "Failed to fetch" or "TypeError"

