# Student Visa Form (INZ 1012) - Development Progress

## Form: `forms/student-visa-form.html`
## Last Updated: Session 5 - Stage 7 complete

---

## STAGES OVERVIEW (11 Total)

| # | Stage Name | Status | Notes |
|---|-----------|--------|-------|
| 1 | Identity Details | ✅ DONE | 3 sub-sections, full validation + conditional logic |
| 2 | Address and contact information | ✅ DONE | 2 sections, postal conditional, validation |
| 3 | Eligibility | ✅ DONE | 5 sections, complex conditionals, PhD details, situation & plans |
| 4 | Character | ✅ DONE | 4 sections, repeaters, file uploads, nested conditionals |
| 5 | Health | ✅ DONE | 5 sections, TB/medical care/length of stay/medical exams |
| 6 | Education history | ✅ DONE | Tertiary education repeater with country autocomplete |
| 7 | Employment history | ✅ DONE | 4 sections, current/previous work, unemployment repeaters |
| 8 | Financial | ⬜ TODO | Placeholder only |
| 9 | Supporting documents | ⬜ TODO | Placeholder only |
| 10 | Declaration | ⬜ TODO | Placeholder only |
| 11 | Review & Submit | ⬜ TODO | Placeholder only |

---

## STAGE 6: Education History - COMPLETED

### Education Details
- [x] Tertiary education? (Yes/No) MANDATORY
  - Yes → Repeater with: qualification, start date (month), end date (month), institution name, country (autocomplete), state/province, town/city, qualification awarded? (Yes/No)
  - + ADD MORE EDUCATION button

---

## STAGE 7: Employment History - COMPLETED

### Employment History
- [x] Government employed? (Yes/No) MANDATORY
- [x] Prison/detention guard? (Yes/No) MANDATORY

### Current Employment
- [x] Currently working? (Yes/No) MANDATORY
  - Yes → start date, role/job title, duties description, country (autocomplete) → state/province (shows on country select), supervisor, industry, org country, org name, org address, employer phone, employer email

### Previous Employment
- [x] Previous employment/self-employment? (Yes/No) MANDATORY
  - Yes → Repeater with: start/end dates, role, duties, country → state (shows on country select), supervisor, org name, industry, org country
  - + ADD MORE EMPLOYMENT button
  - State/province appears when country is populated (per entry)

### Unemployment or Unpaid Service
- [x] Time unemployed/not in education? (Yes/No) MANDATORY
  - Yes → Repeater with: start/end dates, what were you doing? (textarea), financial support details (textarea)
  - + ADD MORE UNPAID PERIOD button

---

## DEV MODE

`const DEV_MODE = true;` at top of script block.
- When true: all 11 stage tabs unlocked for click-navigation
- All validations still fire on Save and Continue
- Set to `false` before production deploy

---

## ARCHITECTURE NOTES

- Single HTML file with inline CSS + JS
- Uses shared `css/forms.css` and `js/form-utils.js`
- Token-based security, auto-save, sequential stage unlock
- Conditional logic: `setupRadioConditional()` + custom value listeners
- Country autocomplete with full country list + custom 'countrySelected' event
- Native date pickers, month pickers for start/end dates
- Repeater pattern: offences, refusals, citizenships, lived countries, education, prev employment, unemployment
- Police cert upload blocks generated dynamically
- Per-stage validation functions: validateSubSection, validateStage2/3/4/5/6/7
- State/province fields appear conditionally when country is populated (birth, current work, prev work)
- `setupPrevWorkCountryListener(idx)` handles dynamic state visibility for each prev work entry

---

## HOW TO CONTINUE NEXT SESSION

1. Upload the project zip file
2. Say: "Continue building the student visa form"
3. Claude reads this PROGRESS.md
4. Upload screenshots of next stage (Stage 8: Financial)
5. Claude adds to student-visa-form.html
