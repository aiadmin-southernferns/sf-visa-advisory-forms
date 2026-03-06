# Student Visa Form (INZ 1012) - Development Progress

## Form: `forms/student-visa-form.html`
## Last Updated: Session 1

---

## STAGES OVERVIEW (11 Total)

| # | Stage Name | Status | Notes |
|---|-----------|--------|-------|
| 1 | Identity Details | ✅ DONE | 3 sub-sections, all conditional logic implemented |
| 2 | Address and contact information | ⬜ TODO | Placeholder only |
| 3 | Eligibility | ⬜ TODO | Placeholder only |
| 4 | Character | ⬜ TODO | Placeholder only |
| 5 | Health | ⬜ TODO | Placeholder only |
| 6 | Education | ⬜ TODO | Placeholder only |
| 7 | Employment | ⬜ TODO | Placeholder only |
| 8 | Financial | ⬜ TODO | Placeholder only |
| 9 | Supporting documents | ⬜ TODO | Placeholder only |
| 10 | Declaration | ⬜ TODO | Placeholder only |
| 11 | Review & Submit | ⬜ TODO | Placeholder only |

---

## STAGE 1: Identity Details - COMPLETED

### Sub-section 1.1: Identity Information
- [x] Mononym question (Yes/No radio)
  - Yes → Shows single "Name" field (50 char max)
  - No → Shows Given name (30), Middle names (30), Surname (50)
- [x] Other names question (Yes/No radio)
  - Yes → Shows repeatable name entry (given, middle, surname, name type dropdown)
  - Has "+ ADD ANOTHER NAME" button (repeater pattern)
  - Each added entry has a remove button

### Sub-section 1.2: NZ Immigration History
- [x] Country when submitting (autocomplete country search)
- [x] Previously applied for NZ visa (Yes/No)
  - Yes → Shows "Previous client number" (8 numeric chars)
- [x] Previously requested NZeTA (Yes/No)
  - Yes → Shows "Most recent NZeTA reference number" (starts with E)
- [x] Ever travelled to NZ (Yes/No)
  - Yes → Shows "When did you last leave NZ?" (mm/yyyy)
- [x] Total time 24 months or more (Yes/No)
  - No → Shows ALERT about police certificate
- [x] NZ Government Scholarship (Yes/No)
  - Yes → Shows NZSTTS/NZELTO sub-question (Yes/No)

### Sub-section 1.3: Passport and Birth Details
- [x] Passport number (text)
- [x] Nationality as shown in passport (autocomplete country)
- [x] Country or territory of issue (autocomplete country)
- [x] Passport issue date (dd/mm/yyyy split fields)
- [x] Passport expiry date (dd/mm/yyyy split fields)
- [x] Gender (select: Male/Female/Gender Diverse)
- [x] Date of birth (dd/mm/yyyy split fields)
- [x] Country or territory of birth (autocomplete country)
- [x] Town or city of birth (text)

---

## ARCHITECTURE NOTES

- Uses shared `css/forms.css` and `js/form-utils.js`
- Token-based security (same as INZ-1226)
- Stage navigation: horizontal scrollable tabs at top
- Sub-section navigation: tab-style nav within each stage
- Conditional logic: `setupRadioConditional()` utility function
- Country fields: autocomplete with full country list
- Date fields: split dd/mm/yyyy with auto-advance
- Repeater pattern: for "other names" with add/remove
- Bottom buttons: "SAVE AND EXIT" and "SAVE AND CONTINUE"
- Stages must be completed sequentially (stage N unlocks stage N+1)
- Once unlocked, users can navigate back to previous stages
- Additional form-specific CSS is inline in the HTML `<style>` tag

---

## HOW TO CONTINUE NEXT SESSION

1. Upload the project zip file
2. Tell Claude: "Continue building the student visa form"
3. Claude will read this PROGRESS.md to understand what's done
4. Upload screenshots of the next stage to implement
5. Claude will add to the existing student-visa-form.html
