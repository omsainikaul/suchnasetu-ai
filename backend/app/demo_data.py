"""
Realistic Demonstration Notices for SuchnaSetu AI
Properly labelled as synthetic examples for Hacktoberfest HackDay 2026.
"""

from typing import List
from app.schemas.models import DemoNotice

DEMO_NOTICES: List[DemoNotice] = [
    DemoNotice(
        id="demo-scholarship-2026",
        title="State Post-Matric Merit Scholarship Scheme 2026-27",
        title_hi="राज्य पोस्ट-मैट्रिक मेरिट छात्रवृत्ति योजना 2026-27",
        category="Educational Scholarship",
        description="Official notification inviting applications from undergraduate & postgraduate students. Demonstrates an explicit missing income limit requirement and ambiguous submission deadline.",
        description_hi="स्नातक एवं स्नातकोत्तर छात्रों हेतु छात्रवृत्ति आमंत्रण सूचना। इसमें आय सीमा का उल्लेख नहीं है और समय सीमा की समीक्षा आवश्यक है।",
        sample_text="""GOVERNMENT OF UTTAR PRADESH
DIRECTORATE OF HIGHER EDUCATION, LUCKNOW
NOTIFICATION NO: DHE/SCHOL/2026/894

SUBJECT: INVITATION OF APPLICATIONS FOR STATE POST-MATRIC MERIT SCHOLARSHIP (ACADEMIC YEAR 2026-27)

1. PURPOSE:
Applications are hereby invited from eligible meritorious students currently enrolled in recognized Undergraduate (UG) and Postgraduate (PG) degree courses in universities and affiliated colleges for the grant of financial assistance under the State Merit Scholarship Scheme.

2. ELIGIBILITY CRITERIA:
- Candidate must be a bonafide resident of Uttar Pradesh.
- Candidate must have secured at least 65% aggregate marks (or 6.5 CGPA) in the previous qualifying annual examination.
- Candidate must be enrolled full-time in an accredited college for the session 2026-27.

3. REQUIRED DOCUMENTS:
Applicants must attach self-attested photocopies of the following:
a) Previous year examination marksheet
b) College Bonafide Student Identity Card
c) Aadhaar Card copy (UIDAI verified)
d) Active bank passbook first page showing IFSC & Account No.

4. SUBMISSION DEADLINE:
Duly signed application forms along with verified enclosures must reach the scholarship cell before sunset on 15/11/2026. Late forms will be rejected.

5. HOW TO APPLY & REQUIRED ACTION:
Download the standard Form-A from the university portal (www.uphe-scholarship.gov.in), obtain verification seal from College Dean, and submit the physical dossier in duplicate to Room 104, Administrative Block.

6. CONTACT & HELPDESK:
State Scholarship Cell Helpline: 0522-2239401 / 0522-2239402
Official Email: helpdesk.scholarship@uphe.gov.in
Timings: 10:00 AM to 5:00 PM (Monday to Friday)

[Note: Family annual income certificate requirement and maximum ceiling are intentionally omitted from this initial circular.]""",
        has_missing_field=True,
        missing_field_name="Family Income Certificate / Ceiling",
        has_uncertain_field=True,
        uncertain_field_name="Deadline time ('before sunset on 15/11/2026')"
    ),
    DemoNotice(
        id="demo-campus-placement-2026",
        title="Campus Recruitment Drive - Apex Software Solutions Ltd.",
        title_hi="परिसर भर्ती अभियान - एपेक्स सॉफ्टवेयर सॉल्यूशंस",
        category="Campus Recruitment",
        description="Notice regarding annual on-campus technical placement drive. Demonstrates a missing submission deadline (dates to be announced later).",
        description_hi="वार्षिक कैंपस प्लेसमेंट ड्राइव की सूचना। इसमें आवेदन की अंतिम तिथि का उल्लेख नहीं है।",
        sample_text="""TRAINING & PLACEMENT CELL
IIMT UNIVERSITY, MEERUT
CIRCULAR: TPC/2026/OCT/04

ATTENTION: FINAL YEAR B.TECH (CSE/IT/ECE) & MCA STUDENTS (BATCH OF 2027)

SUBJECT: ON-CAMPUS RECRUITMENT DRIVE BY APEX SOFTWARE SOLUTIONS LTD.

1. PURPOSE:
Apex Software Solutions Ltd. will conduct an on-campus placement drive for the role of Associate AI/Cloud Software Engineer (Package: 7.5 LPA).

2. ELIGIBILITY:
- Minimum 60% aggregate in 10th, 12th and current B.Tech/MCA coursework.
- Maximum 1 active backlog permitted at the time of online assessment.

3. REQUIRED DOCUMENTS FOR INTERVIEW:
- Updated resume (2 hard copies)
- College photo identity card
- Government photo ID (Aadhaar or Driving License)
- Passport size formal photographs (4 copies)

4. APPLICATION DEADLINE:
Not stated in notice. Precise registration dates and online assessment slot will be notified via official WhatsApp announcement group.

5. ACTION REQUIRED:
Register your nomination with your departmental T&P student coordinator by signing Sheet No. 3 in the T&P office.

6. CONTACT PERSON:
Prof. Rajesh Sharma, Placement Coordinator
Email: tpo@iimtindia.net | Tel: +91 9876543210""",
        has_missing_field=True,
        missing_field_name="Registration Deadline",
        has_uncertain_field=False
    ),
    DemoNotice(
        id="demo-municipal-water-notice",
        title="Emergency Water Supply Disruption & Pipeline Repair Notice",
        title_hi="आपातकालीन जल आपूर्ति व्यवधान एवं पाइपलाइन मरम्मत सूचना",
        category="Public Utility Service",
        description="City municipal corporation advisory regarding scheduled maintenance. Demonstrates missing eligibility/exemption criteria.",
        description_hi="जल आपूर्ति मरम्मत के संबंध में नगर निगम सूचना। इसमें कोई पात्रता शर्त लागू नहीं है।",
        sample_text="""MEERUT MUNICIPAL CORPORATION (JAL SANSTHAN)
PUBLIC NOTICE: MMC/WATER/2026/09

SUBJECT: TEMPORARY WATER SUPPLY DISRUPTION DUE TO MAIN TRUNK PIPELINE REHABILITATION

1. PURPOSE:
Notice is hereby given to the general public that urgent structural rehabilitation and replacement of the 800mm diameter trunk water pipeline will be undertaken near Delhi Road Junction.

2. AFFECTED AREAS & SCHEDULE:
Water supply will remain suspended in Sector 2, Shastri Nagar, Saket, and University Road from 6:00 AM on 28th October 2026 to 10:00 PM on 29th October 2026.

3. REQUIRED ACTION BY RESIDENTS:
All residents and commercial establishments in the affected sectors are advised to store sufficient potable water in advance for essential requirements. Emergency water tankers can be requested free of charge.

4. ELIGIBILITY / EXEMPTIONS:
Not stated in notice. The shutdown applies uniformly to all domestic and commercial connections in the notified sectors.

5. DEADLINE:
Advance water storage should be completed prior to 6:00 AM on 28/10/2026.

6. EMERGENCY HELPLINE & TANKER REQUISITION:
Jal Sansthan Control Room Toll-Free: 1800-180-2026
WhatsApp Helpline for Tanker Booking: +91 9412000000
Address: Jal Sansthan Head Office, Town Hall, Meerut.""",
        has_missing_field=True,
        missing_field_name="Eligibility / Exemption Criteria",
        has_uncertain_field=False
    )
]
