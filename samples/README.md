# SuchnaSetu AI — Demonstration Notices & Scenarios
## PS 02 — Notice-to-Action Accessibility Assistant | Track 1: Best Use of Gemma 4
### Hacktoberfest 2026 — HackDay@Meerut × E-Cell IIMT University

This directory contains realistic, synthetic test notices designed to evaluate all 10 core requirements of Problem Statement 02.

---

### Sample 1: State Post-Matric Merit Scholarship 2026-27
- **Files:** `scholarship_notice_2026.png` and `scholarship_notice_2026.txt`
- **Category:** Educational & Higher Education Scholarship
- **Scenario Features:**
  - **All 6 Structured Fields Tested:** Purpose, Eligibility, Deadline, Required Documents, Contact Information, Required Action.
  - **Intentionally Missing Requirement (PS 02 R2 & R6):** Family Annual Income Limit and Income Certificate requirement are explicitly omitted from this circular.
  - **Test Question:** *"Is an income certificate required?"* or *"What is the parental income ceiling?"*
  - **Expected AI Response:** Strictly returns **"Not stated in notice"** / **"सूचना में उल्लेखित नहीं है।"** without fabricating standard government income rules.
  - **Uncertainty & User Confirmation (R7):** Non-standard deadline phrase (*"before sunset on 15/11/2026"*) triggers the **Needs Confirmation** badge, allowing user verification while preserving the original OCR extraction.

---

### Sample 2: Campus Recruitment Drive — Apex Software Solutions Ltd.
- **File:** `campus_recruitment_circular.txt`
- **Category:** University Campus Placement Notice
- **Scenario Features:**
  - **Missing Deadline (R2):** The circular states that precise registration and interview dates will be announced later.
  - **Expected Result:** The `Deadline` field displays: **"Not stated in notice."** with a neutral status badge.

---

### Sample 3: Municipal Water Pipeline Maintenance & Supply Disruption
- **File:** `municipal_water_advisory.txt`
- **Category:** Public Utility Advisory
- **Scenario Features:**
  - **Universal Applicability (Missing Exemption):** The notice applies to all domestic and commercial connections. Eligibility/exemptions are absent.
  - **Multi-lingual Test:** Switching to **हिंदी** translates the summary, structured fields, and step-by-step checklist into fluent, accessible Hindi.

---

*Note: All notices in this folder are synthetic demonstration models created specifically for testing and competition judging. They do not represent real personal data.*
