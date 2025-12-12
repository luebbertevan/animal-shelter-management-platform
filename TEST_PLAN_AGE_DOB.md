# Age/DOB Bidirectional Sync Test Plan

**Test Date:** December 12, 2025 (10:00 AM)

## Test Setup

-   Today: 12/12/2025
-   Form starts with empty DOB and age fields

---

## 1. DOB → Age Sync (Date Input)

### Basic Tests

-   [ ] **Enter 12/11/2025** → Should show: `1 day`
-   [ ] **Enter 12/05/2025** → Should show: `7 days` (1 week)
-   [ ] **Enter 11/28/2025** → Should show: `14 days` (2 weeks)
-   [ ] **Enter 08/29/2025** → Should show: `105 days` (15 weeks → 3 months)
-   [ ] **Enter 12/12/2024** → Should show: `12 months` (NOT 1 year, birthday hasn't occurred)
-   [ ] **Enter 12/11/2024** → Should show: `12 months` (NOT 1 year)
-   [ ] **Enter 12/12/2023** → Should show: `2 years` (exactly 2 years)
-   [ ] **Enter 12/11/2023** → Should show: `1 year` (11 months, but shows 1 year - verify this is correct)

### Unit Conversion Tests

-   [ ] **Enter 12/05/2025** → Should show: `1 week` (7 days)
-   [ ] **Enter 11/28/2025** → Should show: `2 weeks` (14 days)
-   [ ] **Enter 08/29/2025** → Should show: `3 months` (15 weeks = ~105 days)
-   [ ] **Enter 06/01/2025** → Should show: `6 months` (should NOT show weeks)

### Edge Cases - Boundaries

-   [ ] **Enter 12/06/2025** → Should show: `6 days` (NOT 1 week, < 7 days)
-   [ ] **Enter 08/27/2025** → Should show: `14 weeks` (NOT months, < 16 weeks)
-   [ ] **Enter 08/28/2025** → Should show: `3 months` (16 weeks = 112 days threshold)
-   [ ] **Enter 12/13/2024** → Should show: `11 months` (NOT 12 months, birthday hasn't occurred)

### Leap Year Tests

-   [ ] **Enter 12/12/2024** → Should show: `12 months` (2024 was leap year, 366 days)
-   [ ] **Enter 12/12/2023** → Should show: `2 years` (2024 was leap year)

---

## 2. Age → DOB Sync (Age Input)

### Basic Tests

-   [ ] **Enter `1`, select `days`** → DOB should be: `12/11/2025`
-   [ ] **Enter `7`, select `days`** → DOB should be: `12/05/2025`, age shows: `1 week`
-   [ ] **Enter `14`, select `days`** → DOB should be: `11/28/2025`, age shows: `2 weeks`
-   [ ] **Enter `52`, select `weeks`** → DOB should be: `12/12/2024`, age shows: `11 months` (NOT 1 year)
-   [ ] **Enter `1`, select `years`** → DOB should be: `12/12/2024`, age shows: `1 year`
-   [ ] **Enter `2`, select `years`** → DOB should be: `12/12/2023`, age shows: `2 years`

### Unit Rollover Tests

-   [ ] **Enter `8`, select `days`** → DOB calculated from 8 days, age shows: `1 week` (rollover)
-   [ ] **Enter `16`, select `weeks`** → DOB calculated from 16 weeks, age shows: `4 months` (rollover)
-   [ ] **Enter `12`, select `months`** → DOB calculated from 12 months, age shows: `1 year` (rollover)
-   [ ] **Enter `24`, select `months`** → DOB calculated from 24 months, age shows: `2 years` (rollover)

### Edge Cases

-   [ ] **Enter `365`, select `days`** → DOB should be: `12/12/2024`, age shows: `12 months` (NOT 1 year, birthday hasn't occurred)
-   [ ] **Enter `364`, select `days`** → DOB should be: `12/13/2024`, age shows: `12 months` (NOT 1 year)

---

## 3. Date Clearing Scenarios

### Basic Clearing

-   [ ] **Enter DOB (12/12/2024)** → Age shows: `1 year`
-   [ ] **Clear DOB field** → Age value should clear, unit should reset to "Select unit"
-   [ ] **Verify** → Unit dropdown shows "Select unit" option

### Clearing After Age Entry

-   [ ] **Enter age (`1 year`)** → DOB populates: `12/12/2024`
-   [ ] **Clear DOB field** → Age should clear, unit resets to "Select unit"
-   [ ] **Enter age again (`2 years`)** → DOB should populate: `12/12/2023`

### Future Date Validation

-   [ ] **Try to enter `12/13/2025` (future date)** → Should show error, DOB and age clear, unit resets

---

## 4. Age Estimate Clearing Scenarios

### Clear Age Value

-   [ ] **Enter DOB** → Age auto-fills
-   [ ] **Clear age number field** → Should clear age value but keep unit
-   [ ] **Blur field** → DOB should remain (it's the source of truth)

### Clear Age Unit

-   [ ] **Enter DOB** → Age auto-fills with value and unit
-   [ ] **Change unit to "Select unit"** → Age value should clear, DOB should clear

### Clear Both Age Fields

-   [ ] **Enter age (`1 year`)** → DOB populates
-   [ ] **Change unit to "Select unit"** → DOB should clear

---

## 5. Bidirectional Sync Tests

### Change DOB After Age Entry

-   [ ] **Enter age (`2 years`)** → DOB shows: `12/12/2023`
-   [ ] **Change DOB to `12/12/2024`** → Age should update to: `1 year`

### Change Age After DOB Entry

-   [ ] **Enter DOB (`12/12/2023`)** → Age shows: `2 years`
-   [ ] **Change age to `1` year** → DOB should update to: `12/12/2024`

### Modify Age Value

-   [ ] **Enter DOB (`12/12/2024`)** → Age shows: `1 year`
-   [ ] **Change age value to `2`, unit stays `years`** → DOB should update to: `12/12/2023`, age recalculates from DOB

### Modify Age Unit

-   [ ] **Enter DOB (`12/12/2024`)** → Age shows: `1 year`
-   [ ] **Change unit to `months`** → Age should recalculate: `12 months`, DOB stays the same

---

## 6. Manual Clearing → Re-entry Tests

### Scenario: Clear DOB, Re-enter Age

-   [ ] **Enter DOB (`12/12/2024`)** → Age shows: `1 year`
-   [ ] **Clear DOB** → Age clears, unit resets to "Select unit"
-   [ ] **Enter age `1`, select unit `years`** → DOB should populate: `12/12/2024`
-   [ ] **Blur age field** → DOB should remain, age recalculates from DOB

### Scenario: Clear DOB, Enter Age with Existing Unit

-   [ ] **Enter DOB (`12/12/2024`)** → Age shows: `1 year`
-   [ ] **Clear DOB** → Age clears, unit resets to "Select unit"
-   [ ] **Select unit `years` first**
-   [ ] **Enter age `2`** → DOB should NOT populate yet
-   [ ] **Blur age field** → DOB should populate: `12/12/2023`

### Scenario: Clear DOB, Unit Already Selected

-   [ ] **Enter DOB (`12/12/2024`)** → Age shows: `1 year`, unit is `years`
-   [ ] **Clear DOB** → Age clears, unit resets to "Select unit" ✓
-   [ ] **Select unit `years`**
-   [ ] **Enter age `3`**
-   [ ] **Blur age field** → DOB should populate: `12/12/2022`

---

## 7. Edge Cases - Boundaries

### Day Boundaries

-   [ ] **Enter `6`, select `days`** → Should show: `6 days` (NOT 1 week)
-   [ ] **Enter `7`, select `days`** → Should show: `1 week` (exactly 7 days)

### Week Boundaries

-   [ ] **Enter `15`, select `weeks`** → Should show: `15 weeks` (NOT months, < 16 weeks)
-   [ ] **Enter `16`, select `weeks`** → Should show: `4 months` (exactly 16 weeks)

### Month Boundaries

-   [ ] **Enter `11`, select `months`** → Should show: `11 months` (NOT 1 year)
-   [ ] **Enter `12`, select `months`** → Should show: `1 year` (NOT 12 months)

### Year Boundaries (Birthday Check)

-   [ ] **DOB: `12/13/2024`** (364 days ago) → Should show: `12 months` (NOT 1 year, birthday tomorrow)
-   [ ] **DOB: `12/12/2024`** (365 days ago) → Should show: `12 months` (NOT 1 year, birthday today but hasn't occurred yet since it's 10 AM)
-   [ ] **DOB: `12/11/2024`** (366 days ago) → Should show: `1 year` (birthday occurred yesterday)

---

## 8. Round-Trip Tests

### Age → DOB → Age

-   [ ] **Enter `2 years`** → DOB: `12/12/2023`
-   [ ] **Verify age still shows `2 years`** (or recalculated value if different)

### DOB → Age → DOB

-   [ ] **Enter DOB `12/12/2023`** → Age: `2 years`
-   [ ] **Change age to `1 year`** → DOB should update to: `12/12/2024`

---

## 9. Validation Tests

### Invalid Inputs

-   [ ] **Enter negative age** → Should prevent or show error
-   [ ] **Enter future DOB** → Should show error: "Date of birth cannot be in the future"
-   [ ] **Enter invalid date format** → Should handle gracefully
-   [ ] **Enter `0` for age** → Should clear DOB

### Empty States

-   [ ] **Clear DOB** → Age should clear, unit resets
-   [ ] **Clear age value** → DOB should remain (source of truth)
-   [ ] **Clear age unit** → Age value and DOB should clear

---

## 10. UI/UX Tests

### Visual Feedback

-   [ ] **Age auto-updates when DOB changes** → Should update smoothly
-   [ ] **DOB auto-updates when age changes** → Should update smoothly
-   [ ] **Unit dropdown resets correctly** → "Select unit" option visible when cleared

### Form Submission

-   [ ] **Submit form with DOB only** → Should save DOB
-   [ ] **Submit form with age only** → Should calculate and save DOB
-   [ ] **Submit form with both** → Should use DOB (source of truth)

---

## Expected Behaviors Summary

✅ **DOB is source of truth** - Age is always calculated from DOB  
✅ **Never show "12 months"** - Always show "1 year" instead  
✅ **Birthday must occur** - Don't show "1 year" until birthday has actually passed  
✅ **Unit resets on DOB clear** - Unit goes back to "Select unit"  
✅ **Age updates on blur** - Not while typing (better UX)  
✅ **Rollover is display-only** - Doesn't affect stored DOB
