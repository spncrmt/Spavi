/**
 * Seed script to create test fax records in the database
 *
 * Usage: npm run seed
 *
 * Creates 10 realistic sample fax records with various imperfections
 * for testing the dashboard and processing pipeline.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Realistic test faxes with various imperfections
const testFaxes = [
  // FAX 1: Clean, well-formatted fax - completed
  {
    fromNumber: '+15551234567',
    receivedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    status: 'completed',
    rawText: `REFERRAL FAX
      
Patient Name: Margaret Thompson
DOB: 04/18/1958 (Age 66)
MRN: 00234891
Date of Service: 12/20/2024
Referring Provider: Dr. James Wilson, MD
Practice: Sunrise Family Medicine
Phone: (555) 234-5678

Chief Complaint: Persistent cough and fatigue x 3 weeks

History of Present Illness:
Mrs. Thompson is a 66 year old female with PMH of COPD, HTN, and T2DM who presents with 3 weeks of productive cough with yellow-green sputum. She reports increasing fatigue and mild dyspnea on exertion. Denies fever, chest pain, or hemoptysis. She has been using her albuterol inhaler more frequently. No recent travel or sick contacts.

Review of Systems:
Constitutional: Fatigue, no fever, no weight loss
Respiratory: Productive cough, mild DOE, denies hemoptysis  
Cardiovascular: Denies chest pain, palpitations
GI: No nausea, vomiting, or diarrhea

Physical Examination:
Vitals: BP 138/84, HR 78, RR 18, Temp 98.9F, SpO2 94% on RA
General: Alert, no acute distress, appears tired
HEENT: Oropharynx clear, no lymphadenopathy
Lungs: Scattered rhonchi bilaterally, no wheezes, decreased breath sounds at bases
Heart: RRR, no murmurs
Extremities: No edema, no clubbing

Assessment:
1. Acute exacerbation of COPD
2. Possible lower respiratory tract infection
3. Chronic fatigue - likely related to above

Plan:
1. Chest X-ray to rule out pneumonia
2. Prednisone 40mg daily x 5 days
3. Azithromycin 500mg day 1, then 250mg days 2-5
4. Continue albuterol PRN
5. Follow up in 1 week or sooner if worsening
6. Return precautions given for fever >101, worsening SOB, chest pain`,
    metadata: JSON.stringify({
      patientName: 'Margaret Thompson',
      dateOfBirth: '04/18/1958',
      mrn: '00234891',
      dateOfService: '12/20/2024',
      referringProvider: 'Dr. James Wilson, MD',
      referringPractice: 'Sunrise Family Medicine',
      phoneNumber: '(555) 234-5678',
    }),
    sections: JSON.stringify({
      ChiefComplaint: 'Persistent cough and fatigue for 3 weeks',
      ChiefComplaint_sources: ['Persistent cough and fatigue x 3 weeks'],
      HPI: '66-year-old female with history of COPD, hypertension, and type 2 diabetes presents with 3 weeks of productive cough with yellow-green sputum. Reports increasing fatigue and mild dyspnea on exertion. Denies fever, chest pain, or hemoptysis. Has been using albuterol inhaler more frequently. No recent travel or sick contacts.',
      HPI_sources: ['66 year old female', 'PMH of COPD, HTN, and T2DM', '3 weeks of productive cough with yellow-green sputum', 'increasing fatigue', 'mild dyspnea on exertion', 'Denies fever, chest pain, or hemoptysis', 'using her albuterol inhaler more frequently', 'No recent travel or sick contacts'],
      ReviewOfSystems: 'Constitutional: Fatigue present, denies fever and weight loss. Respiratory: Productive cough and mild dyspnea on exertion, denies hemoptysis. Cardiovascular: Denies chest pain and palpitations. GI: No nausea, vomiting, or diarrhea.',
      ReviewOfSystems_sources: ['Fatigue, no fever, no weight loss', 'Productive cough, mild DOE, denies hemoptysis', 'Denies chest pain, palpitations', 'No nausea, vomiting, or diarrhea'],
      PhysicalExam: 'Vitals: BP 138/84, HR 78, RR 18, Temp 98.9°F, SpO2 94% on room air. General: Alert, no acute distress, appears tired. HEENT: Oropharynx clear, no lymphadenopathy. Lungs: Scattered rhonchi bilaterally, no wheezes, decreased breath sounds at bases. Heart: Regular rate and rhythm, no murmurs. Extremities: No edema, no clubbing.',
      PhysicalExam_sources: ['BP 138/84', 'HR 78', 'RR 18', 'Temp 98.9F', 'SpO2 94% on RA', 'Alert, no acute distress, appears tired', 'Oropharynx clear, no lymphadenopathy', 'Scattered rhonchi bilaterally, no wheezes, decreased breath sounds at bases', 'RRR, no murmurs', 'No edema, no clubbing'],
      Assessment: '1. Acute exacerbation of COPD. 2. Possible lower respiratory tract infection. 3. Chronic fatigue, likely related to above conditions.',
      Assessment_sources: ['Acute exacerbation of COPD', 'Possible lower respiratory tract infection', 'Chronic fatigue - likely related to above'],
      Plan: '1. Chest X-ray to rule out pneumonia. 2. Prednisone 40mg daily for 5 days. 3. Azithromycin 500mg day 1, then 250mg days 2-5. 4. Continue albuterol PRN. 5. Follow up in 1 week or sooner if worsening. 6. Return precautions given for fever >101°F, worsening shortness of breath, or chest pain.',
      Plan_sources: ['Chest X-ray to rule out pneumonia', 'Prednisone 40mg daily x 5 days', 'Azithromycin 500mg day 1, then 250mg days 2-5', 'Continue albuterol PRN', 'Follow up in 1 week or sooner if worsening', 'Return precautions given for fever >101, worsening SOB, chest pain'],
      Disposition: 'Discharged home with return precautions. Follow-up in 1 week.',
      Disposition_sources: ['Follow up in 1 week or sooner if worsening', 'Return precautions given'],
    }),
    externalId: 'FAX-2024-001',
  },

  // FAX 2: OCR errors, poor scan quality - completed
  {
    fromNumber: '+15559876543',
    receivedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    status: 'completed',
    rawText: `EMERGENCY DEPT DISCHARGE SUMMARY

Pt: RlCHARD KOWALSKI  D0B: 11/03/1971
MRN# 00891234  Encounter: 12/22/2024
Attending: A. Patel MD

CC: Chest paln / heartbum

HPl: 53 y/o M w/ hx HTN, HLD, tobacco use (1ppd x 30yrs) presents w/ 2 days buming 
chest pain. Worse after eatlng and lying flat. Pt states paln feels "different" from prior 
cardlac-related pain but does radiate to L shoulder. + nausea, - vomltlng, - SOB.
Reports being off BP meds x 3 months "ran out". Pt appeared anxlous, pacing during eval.

ROS: 
Const: - fever/chills
CV: + chest paln, - syncope
Resp: - SOB, - cough  
GI: + epigastrlc pain, + nausea, - vomiting, - hematemesls, - melena
Neuro: - focal deficits

PE:
Gen: Anxious appearlng male
HEENT: Throat clear
Chest/Lungs: Poss mild wheezlng, no rales appreciated
CV: Tachycardlc, no murmur appreclated. Exam limited d/t pt talklng
Abd: Eplgastric TTP, no rebound/guarding  
Ext: No LE edema, pulses lntact

Vitals: BP 178/102  HR 104  RR 18  T 98.7  02 96% RA

Studies:
ECG - uncIear, poss nl, ?borderline ST elevation V2-V3
CXR - pending

A/P:
1. Chest pain - poss GERD vs ACS, glve GI cocktall, ASA, serial trops
2. Uncontrolled HTN - 2/2 med nonadherence, consider restartlng anti-HTN
3. Anxiety
Dlsp: Pending labs, poss cardiology c/s

Dlctated by: A Patel MD
Transcrlbed: 12/22/24 1847`,
    metadata: JSON.stringify({
      patientName: 'Richard Kowalski',
      dateOfBirth: '11/03/1971',
      mrn: '00891234',
      dateOfService: '12/22/2024',
      referringProvider: 'A. Patel MD',
      referringPractice: 'Emergency Department',
    }),
    sections: JSON.stringify({
      ChiefComplaint: 'Chest pain and heartburn',
      ChiefComplaint_sources: ['Chest paln / heartbum'],
      HPI: '53-year-old male with history of hypertension, hyperlipidemia, and tobacco use (1 pack per day for 30 years) presents with 2 days of burning chest pain. Worse after eating and lying flat. Patient states pain feels different from prior cardiac-related pain but does radiate to left shoulder. Positive for nausea, denies vomiting and shortness of breath. Reports being off blood pressure medications for 3 months. Patient appeared anxious and pacing during evaluation.',
      HPI_sources: ['53 y/o M', 'hx HTN, HLD, tobacco use (1ppd x 30yrs)', '2 days buming chest pain', 'Worse after eatlng and lying flat', 'paln feels "different" from prior cardlac-related pain', 'does radiate to L shoulder', '+ nausea, - vomltlng, - SOB', 'being off BP meds x 3 months "ran out"', 'Pt appeared anxlous, pacing during eval'],
      ReviewOfSystems: 'Constitutional: Denies fever and chills. Cardiovascular: Positive for chest pain, denies syncope. Respiratory: Denies shortness of breath and cough. GI: Positive for epigastric pain and nausea, denies vomiting, hematemesis, and melena. Neurological: Denies focal deficits.',
      ReviewOfSystems_sources: ['- fever/chills', '+ chest paln, - syncope', '- SOB, - cough', '+ epigastrlc pain, + nausea, - vomiting, - hematemesls, - melena', '- focal deficits'],
      PhysicalExam: 'Vitals: BP 178/102, HR 104, RR 18, Temp 98.7°F, O2 96% on room air. General: Anxious appearing male. HEENT: Throat clear. Lungs: Possible mild wheezing, no rales appreciated. Cardiovascular: Tachycardic, no murmur appreciated, exam limited due to patient talking. Abdomen: Epigastric tenderness to palpation, no rebound or guarding. Extremities: No lower extremity edema, pulses intact.',
      PhysicalExam_sources: ['BP 178/102', 'HR 104', 'RR 18', 'T 98.7', '02 96% RA', 'Anxious appearlng male', 'Throat clear', 'Poss mild wheezlng, no rales appreciated', 'Tachycardlc, no murmur appreclated', 'Exam limited d/t pt talklng', 'Eplgastric TTP, no rebound/guarding', 'No LE edema, pulses lntact'],
      Assessment: '1. Chest pain - possible GERD versus acute coronary syndrome. 2. Uncontrolled hypertension secondary to medication nonadherence. 3. Anxiety.',
      Assessment_sources: ['Chest pain - poss GERD vs ACS', 'Uncontrolled HTN - 2/2 med nonadherence', 'Anxiety'],
      Plan: '1. GI cocktail for symptomatic relief. 2. Aspirin administered. 3. Serial troponins to rule out ACS. 4. Consider restarting antihypertensive medications. 5. Possible cardiology consultation pending labs.',
      Plan_sources: ['glve GI cocktall', 'ASA', 'serial trops', 'consider restartlng anti-HTN', 'poss cardiology c/s'],
      Disposition: 'Disposition pending lab results. Possible cardiology consultation.',
      Disposition_sources: ['Dlsp: Pending labs, poss cardiology c/s'],
    }),
    externalId: 'FAX-2024-002',
  },

  // FAX 3: Pediatric case, handwritten notes transcribed poorly - completed
  {
    fromNumber: '+15552223333',
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'completed',
    rawText: `PEDS URGENT CARE NOTE

Patient: SOFIA NGUYEN
dob 06/15/2019 (5yo)
MRN 00456123
DOS 12/21/24
Provider: Dr K Martinez

mom reports fever x 2 days, max temp 103.4 at home
also c/o R ear pain since yesterday - pulling at ear
decreased appetite, fussy
? rash on trunk - mom unsure when started
no cough, no rhinorrhea, no vomiting, no diarrhea
no sick contacts at daycare per mom
UTD on vaccines

allergies: PCN - hives

EXAM:
wt 18.2 kg (42nd %ile)
T 101.8 (tympanic) HR 118 RR 22
Gen - fussy but consolable, no toxic appearance
HEENT - R TM erythematous bulging, L TM clear, 
        throat - mild erythema no exudate
        neck supple no LAD
Lungs - CTA b/l
skin - faint maculopapular rash trunk, non-blanching... 
       wait no - blanching on pressure. my bad.
       no petechiae

Dx:
1. Acute otitis media R ear
2. Viral exanthem
3. Fever - likely 2/2 above

Rx:
-Amoxicillin 400mg/5mL - 9mL PO BID x 10 days
 (90mg/kg/day divided BID = 819mg BID, round to 9mL)
-Tylenol 240mg (15mg/kg) q4-6h PRN fever/pain
-warm compress to ear PRN
-f/u 2-3 days if not improving or sooner if worse
-return if: high fever persists >3days, rash worsens/spreads,
 lethargy, poor oral intake, difficulty breathing`,
    metadata: JSON.stringify({
      patientName: 'Sofia Nguyen',
      dateOfBirth: '06/15/2019',
      mrn: '00456123',
      dateOfService: '12/21/2024',
      referringProvider: 'Dr. K Martinez',
      referringPractice: 'Peds Urgent Care',
    }),
    sections: JSON.stringify({
      ChiefComplaint: 'Fever for 2 days and right ear pain',
      ChiefComplaint_sources: ['fever x 2 days', 'R ear pain since yesterday'],
      HPI: '5-year-old female presents with fever for 2 days with maximum temperature of 103.4°F at home. Also complaining of right ear pain since yesterday, pulling at ear. Decreased appetite and fussy. Possible rash on trunk, mother unsure when it started. No cough, rhinorrhea, vomiting, or diarrhea. No sick contacts at daycare. Up to date on vaccines. Allergies: Penicillin (hives).',
      HPI_sources: ['5yo', 'fever x 2 days, max temp 103.4 at home', 'R ear pain since yesterday - pulling at ear', 'decreased appetite, fussy', '? rash on trunk - mom unsure when started', 'no cough, no rhinorrhea, no vomiting, no diarrhea', 'no sick contacts at daycare per mom', 'UTD on vaccines', 'PCN - hives'],
      PhysicalExam: 'Weight: 18.2 kg (42nd percentile). Vitals: Temp 101.8°F (tympanic), HR 118, RR 22. General: Fussy but consolable, no toxic appearance. HEENT: Right tympanic membrane erythematous and bulging, left TM clear. Throat with mild erythema, no exudate. Neck supple, no lymphadenopathy. Lungs: Clear to auscultation bilaterally. Skin: Faint maculopapular rash on trunk, blanching on pressure, no petechiae.',
      PhysicalExam_sources: ['wt 18.2 kg (42nd %ile)', 'T 101.8 (tympanic)', 'HR 118', 'RR 22', 'fussy but consolable, no toxic appearance', 'R TM erythematous bulging', 'L TM clear', 'throat - mild erythema no exudate', 'neck supple no LAD', 'CTA b/l', 'faint maculopapular rash trunk', 'blanching on pressure', 'no petechiae'],
      Assessment: '1. Acute otitis media, right ear. 2. Viral exanthem. 3. Fever, likely secondary to above.',
      Assessment_sources: ['Acute otitis media R ear', 'Viral exanthem', 'Fever - likely 2/2 above'],
      Plan: '1. Amoxicillin 400mg/5mL - 9mL PO twice daily for 10 days. 2. Tylenol 240mg every 4-6 hours as needed for fever and pain. 3. Warm compress to ear as needed. 4. Follow-up in 2-3 days if not improving or sooner if worsening.',
      Plan_sources: ['Amoxicillin 400mg/5mL - 9mL PO BID x 10 days', 'Tylenol 240mg (15mg/kg) q4-6h PRN fever/pain', 'warm compress to ear PRN', 'f/u 2-3 days if not improving or sooner if worse'],
      Disposition: 'Discharged home. Return precautions given: high fever persisting more than 3 days, rash worsening or spreading, lethargy, poor oral intake, difficulty breathing.',
      Disposition_sources: ['return if: high fever persists >3days, rash worsens/spreads, lethargy, poor oral intake, difficulty breathing'],
    }),
    externalId: 'FAX-2024-003',
  },

  // FAX 4: Information in weird order, inconsistent formatting - completed
  {
    fromNumber: '+15554445555',
    receivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    status: 'completed',
    rawText: `BP 142/88 HR 72 RR 16 T 98.2 O2sat 99%

William Chen
MRN: 00778899
Dr. Lisa Park - Orthopedic Surgery Associates
(555) 888-9999

SUBJECTIVE:
45 year old male here for 6 week post-op follow up after R knee 
arthroscopic meniscectomy. Reports doing well with PT. Pain well 
controlled with Tylenol only now. Some residual stiffness in AM 
that improves with movement. Able to walk without assistive device.
ROM improving per PT notes.

No fever, no increasing swelling, no drainage from incision sites

DOB 08/29/1979
Date seen: 12/19/2024

OBJECTIVE:
R knee: Well-healed portal sites, no erythema/warmth/effusion
ROM: 0-125 degrees (improved from 0-95 at 2wk visit)
Strength: 4+/5 quad, 5/5 ham
Gait: Normal, no antalgic component
Neg anterior drawer, neg Lachman

ASSESSMENT:
S/P R knee arthroscopic partial medial meniscectomy - progressing well

PLAN:
- Continue PT 2x/week x 4 more weeks
- May begin light jogging at 8 weeks if ROM full and pain-free  
- Gradual return to recreational activities
- RTC 6 weeks for final post-op check
- Call if: increased pain, swelling, fever, drainage`,
    metadata: JSON.stringify({
      patientName: 'William Chen',
      dateOfBirth: '08/29/1979',
      mrn: '00778899',
      dateOfService: '12/19/2024',
      referringProvider: 'Dr. Lisa Park',
      referringPractice: 'Orthopedic Surgery Associates',
      phoneNumber: '(555) 888-9999',
    }),
    sections: JSON.stringify({
      ChiefComplaint: '6 week post-operative follow-up after right knee arthroscopic meniscectomy',
      ChiefComplaint_sources: ['6 week post-op follow up after R knee arthroscopic meniscectomy'],
      HPI: '45-year-old male presents for 6 week post-operative follow-up after right knee arthroscopic meniscectomy. Reports doing well with physical therapy. Pain well controlled with Tylenol only. Some residual morning stiffness that improves with movement. Able to walk without assistive device. Range of motion improving per PT notes. Denies fever, increasing swelling, or drainage from incision sites.',
      HPI_sources: ['45 year old male', '6 week post-op follow up', 'R knee arthroscopic meniscectomy', 'doing well with PT', 'Pain well controlled with Tylenol only now', 'Some residual stiffness in AM that improves with movement', 'Able to walk without assistive device', 'ROM improving per PT notes', 'No fever, no increasing swelling, no drainage from incision sites'],
      PhysicalExam: 'Vitals: BP 142/88, HR 72, RR 16, Temp 98.2°F, O2 sat 99%. Right knee: Well-healed portal sites, no erythema, warmth, or effusion. ROM: 0-125 degrees (improved from 0-95 at 2 week visit). Strength: 4+/5 quadriceps, 5/5 hamstrings. Gait: Normal, no antalgic component. Negative anterior drawer, negative Lachman.',
      PhysicalExam_sources: ['BP 142/88', 'HR 72', 'RR 16', 'T 98.2', 'O2sat 99%', 'Well-healed portal sites, no erythema/warmth/effusion', 'ROM: 0-125 degrees', 'improved from 0-95 at 2wk visit', 'Strength: 4+/5 quad, 5/5 ham', 'Gait: Normal, no antalgic component', 'Neg anterior drawer, neg Lachman'],
      Assessment: 'Status post right knee arthroscopic partial medial meniscectomy - progressing well.',
      Assessment_sources: ['S/P R knee arthroscopic partial medial meniscectomy - progressing well'],
      Plan: '1. Continue physical therapy twice weekly for 4 more weeks. 2. May begin light jogging at 8 weeks if range of motion full and pain-free. 3. Gradual return to recreational activities. 4. Return to clinic in 6 weeks for final post-operative check.',
      Plan_sources: ['Continue PT 2x/week x 4 more weeks', 'May begin light jogging at 8 weeks if ROM full and pain-free', 'Gradual return to recreational activities', 'RTC 6 weeks for final post-op check'],
      Disposition: 'Follow-up in 6 weeks. Call if increased pain, swelling, fever, or drainage.',
      Disposition_sources: ['RTC 6 weeks', 'Call if: increased pain, swelling, fever, drainage'],
    }),
    externalId: 'FAX-2024-004',
  },

  // FAX 5: Very messy, lots of abbreviations, incomplete info - completed
  {
    fromNumber: '+15556667777',
    receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    status: 'completed',
    rawText: `** URGENT CONSULT REQUEST **

TO: Cardiology on call
FROM: ED - Dr. R. Thompson
RE: JAMES MORRISON DOB 02/14/1952

72M hx CAD s/p CABG x3 2018, CHF (EF 35%), Afib on coumadin, 
CKD3, DM2 - p/w acute SOB x 6hrs

STORY: was in usoh until this AM, woke up cant breathe, 
progressive, worse lying flat, + PND, +2 pillow orthopnea
+ b/l LE swelling x few days, + wt gain 8lbs/1wk per pt
no CP, no palp, no syncope
med compliant except "ran out of lasix 4-5 days ago"

VS: 92/58 (baseline ~110s) 98 irreg irreg 28 89% 2L
dry wt supposedly 185, today 198

EX: JVD to angle of jaw
     crackles to mid lung fields b/l
     S3 gallop, irreg rhythm, 3/6 SEM apex
     2+ pitting edema to knees b/l
     cool extremities

LABS: 
BNP 2847 (baseline ~400)
Cr 2.1 (baseline 1.6)
K 5.2
trop <0.01

CXR: cardiomeg, b/l pleural eff, pulm edema

ECG: afib rvr 110s, LBBB (old), no acute ischemic chg

IMPRESSION: Acute on chronic systolic HF exacerbation, likely
2/2 diuretic nonadherence, r/o ischemic trigger

NEED: Cards input on diuresis strategy, ?need for swan, 
      admission to CCU vs tele

Pls call ED at x4455. Thanks!!`,
    metadata: JSON.stringify({
      patientName: 'James Morrison',
      dateOfBirth: '02/14/1952',
      referringProvider: 'Dr. R. Thompson',
      referringPractice: 'Emergency Department',
    }),
    sections: JSON.stringify({
      ChiefComplaint: 'Acute shortness of breath for 6 hours',
      ChiefComplaint_sources: ['acute SOB x 6hrs'],
      HPI: '72-year-old male with history of coronary artery disease status post CABG x3 in 2018, congestive heart failure (EF 35%), atrial fibrillation on Coumadin, CKD stage 3, and type 2 diabetes presents with acute shortness of breath for 6 hours. Was in usual state of health until this morning, woke up unable to breathe, progressive, worse lying flat. Positive for paroxysmal nocturnal dyspnea and 2-pillow orthopnea. Bilateral lower extremity swelling for a few days. Weight gain of 8 pounds in 1 week per patient. Denies chest pain, palpitations, or syncope. Medication compliant except ran out of Lasix 4-5 days ago.',
      HPI_sources: ['72M', 'hx CAD s/p CABG x3 2018', 'CHF (EF 35%)', 'Afib on coumadin', 'CKD3', 'DM2', 'acute SOB x 6hrs', 'was in usoh until this AM', 'woke up cant breathe', 'progressive, worse lying flat', '+ PND', '+2 pillow orthopnea', '+ b/l LE swelling x few days', '+ wt gain 8lbs/1wk per pt', 'no CP, no palp, no syncope', 'med compliant except "ran out of lasix 4-5 days ago"'],
      PhysicalExam: 'Vitals: BP 92/58 (baseline ~110s), HR 98 irregular, RR 28, O2 89% on 2L. Dry weight supposedly 185 lbs, today 198 lbs. JVD to angle of jaw. Lungs: Crackles to mid lung fields bilaterally. Heart: S3 gallop, irregular rhythm, 3/6 systolic ejection murmur at apex. Extremities: 2+ pitting edema to knees bilaterally, cool extremities.',
      PhysicalExam_sources: ['92/58 (baseline ~110s)', '98 irreg irreg', '28', '89% 2L', 'dry wt supposedly 185, today 198', 'JVD to angle of jaw', 'crackles to mid lung fields b/l', 'S3 gallop', 'irreg rhythm', '3/6 SEM apex', '2+ pitting edema to knees b/l', 'cool extremities'],
      Assessment: 'Acute on chronic systolic heart failure exacerbation, likely secondary to diuretic nonadherence. Rule out ischemic trigger.',
      Assessment_sources: ['Acute on chronic systolic HF exacerbation', 'likely 2/2 diuretic nonadherence', 'r/o ischemic trigger'],
      Plan: 'Cardiology consult for diuresis strategy. Question need for Swan-Ganz catheter. Admission to CCU versus telemetry pending cardiology input.',
      Plan_sources: ['Cards input on diuresis strategy', '?need for swan', 'admission to CCU vs tele'],
    }),
    externalId: 'FAX-2024-005',
  },

  // FAX 6: Still processing
  {
    fromNumber: '+15557778888',
    receivedAt: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
    status: 'processing',
    rawText: `Dermatology Consultation

Patient: ANGELA BROOKS
DOB: 09/22/1985
MRN: 00334455
DOS: 12/23/2024
Referring: Dr. M. Sullivan, Internal Medicine

CC: Multiple skin lesions x 3 months

HPI: 39 yo F presents with multiple new skin lesions that appeared 
over past 3 months. Started on trunk, now spreading to arms. 
Denies itching initially but now some lesions are pruritic. 
No new medications, detergents, or exposures. No fever, weight loss,
joint pain, or fatigue.

PMH: Hypothyroidism (on levothyroxine), anxiety
PSH: C-section x2
FH: Mother with psoriasis
SH: Works as teacher, no tobacco, social alcohol

EXAM:
Multiple erythematous, scaly plaques on trunk and extensor surfaces
of arms. Largest lesion 4cm on R flank. Some lesions have silvery
scale. Nail pitting noted on several fingernails. No mucosal involvement.
Auspitz sign positive on scraping of trunk lesion.

IMPRESSION:
Plaque psoriasis - new diagnosis, moderate severity given BSA ~8%

PLAN:
1. Triamcinolone 0.1% cream BID to body lesions
2. Calcipotriene cream daily (not to face/groin)  
3. Discussed nature of condition - chronic, waxing/waning
4. Lifestyle mods: moisturize, avoid triggers
5. F/u 4-6 weeks to assess response
6. If inadequate response, discuss phototherapy or systemic options`,
    metadata: null,
    sections: null,
    externalId: 'FAX-2024-006',
  },

  // FAX 7: Pending
  {
    fromNumber: '+15558889999',
    receivedAt: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
    status: 'pending',
    rawText: null,
    metadata: null,
    sections: null,
    externalId: 'FAX-2024-007',
  },

  // FAX 8: Failed - corrupted
  {
    fromNumber: '+15551112222',
    receivedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    status: 'failed',
    rawText: `%PDF-1.4
%âãÏÓ
1 0 obj
<<
/Type /CatalogERROR: STREAM CORRUPTED
...binary garbage...
%%EOF UNEXPECTED`,
    metadata: null,
    sections: null,
    externalId: 'FAX-2024-008',
    errorMessage: 'Failed to extract text from PDF: Document appears to be corrupted or encrypted. OCR also failed - image quality too poor.',
  },

  // FAX 9: Completed but with missing metadata, psychiatric note - completed
  {
    fromNumber: '+15553334444',
    receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    status: 'completed',
    rawText: `OUTPATIENT PSYCHIATRY NOTE

[Header illegible/cut off in fax]

Date: 12/18/2024

S: 28 yo F with MDD, GAD, remote hx ETOH use disorder (sober 3yrs)
presents for med management f/u. Reports mood "up and down" past 
month - attributes to work stress and holiday season. Sleep fair, 
~6hrs/night with some early AM awakening. Appetite decreased, lost
5lbs unintentionally. Energy low. Concentration "scattered." 
Denies SI/HI, no psychotic sx, no manic sx. No relapse or cravings.

Current meds: Sertraline 100mg daily, trazodone 50mg qhs prn

Last labs (3mo ago): TSH, CBC, CMP all WNL

O: 
Appearance: Casually dressed, fair grooming
Behavior: Cooperative, fair eye contact
Speech: Normal rate/rhythm/volume
Mood: "stressed"
Affect: Anxious, constricted range
Thought process: Linear, goal-directed
Thought content: No SI/HI, no delusions, no obsessions
Perception: No hallucinations
Cognition: Alert, oriented x4
Insight/Judgment: Fair/Fair

A: 
1. MDD, recurrent, moderate - currently with worsening depressive sx
   likely stress-related exacerbation
2. GAD - anxiety elevated
3. ETOH use disorder, in sustained remission

P:
1. Increase sertraline to 150mg daily
2. Continue trazodone 50mg qhs prn for sleep
3. Discussed importance of sleep hygiene, stress management
4. Encouraged continued AA attendance, therapy engagement  
5. RTC 4 weeks to reassess
6. Safety plan reviewed - pt to call or go to ED if SI develops
7. Labs: Repeat TSH, CMP in 6 weeks after dose change`,
    metadata: JSON.stringify({
      dateOfService: '12/18/2024',
    }),
    sections: JSON.stringify({
      ChiefComplaint: 'Medication management follow-up for depression and anxiety',
      ChiefComplaint_sources: ['med management f/u'],
      HPI: '28-year-old female with major depressive disorder, generalized anxiety disorder, and remote history of alcohol use disorder (sober 3 years) presents for medication management follow-up. Reports mood "up and down" over past month, attributes to work stress and holiday season. Sleep fair, approximately 6 hours per night with some early morning awakening. Appetite decreased, lost 5 pounds unintentionally. Energy low, concentration "scattered." Denies suicidal ideation, homicidal ideation, psychotic symptoms, and manic symptoms. No relapse or cravings.',
      HPI_sources: ['28 yo F', 'MDD, GAD, remote hx ETOH use disorder (sober 3yrs)', 'med management f/u', 'mood "up and down" past month', 'attributes to work stress and holiday season', 'Sleep fair, ~6hrs/night with some early AM awakening', 'Appetite decreased, lost 5lbs unintentionally', 'Energy low', 'Concentration "scattered"', 'Denies SI/HI, no psychotic sx, no manic sx', 'No relapse or cravings'],
      ReviewOfSystems: 'Psychiatric: Depressed mood, anxiety, decreased concentration, low energy, sleep disturbance with early morning awakening, decreased appetite with unintentional weight loss. Denies suicidal ideation, homicidal ideation, hallucinations, and manic symptoms.',
      ReviewOfSystems_sources: ['mood "up and down"', 'Appetite decreased', 'Energy low', 'Concentration "scattered"', 'Sleep fair', 'early AM awakening', 'Denies SI/HI', 'no psychotic sx', 'no manic sx'],
      PhysicalExam: 'Mental Status Exam: Appearance casually dressed with fair grooming. Behavior cooperative with fair eye contact. Speech with normal rate, rhythm, and volume. Mood reported as "stressed." Affect anxious with constricted range. Thought process linear and goal-directed. Thought content without suicidal ideation, homicidal ideation, delusions, or obsessions. Perception without hallucinations. Cognition alert and oriented x4. Insight and judgment both fair.',
      PhysicalExam_sources: ['Casually dressed, fair grooming', 'Cooperative, fair eye contact', 'Normal rate/rhythm/volume', 'Mood: "stressed"', 'Affect: Anxious, constricted range', 'Thought process: Linear, goal-directed', 'No SI/HI, no delusions, no obsessions', 'No hallucinations', 'Alert, oriented x4', 'Insight/Judgment: Fair/Fair'],
      Assessment: '1. Major depressive disorder, recurrent, moderate - currently with worsening depressive symptoms, likely stress-related exacerbation. 2. Generalized anxiety disorder - anxiety elevated. 3. Alcohol use disorder, in sustained remission.',
      Assessment_sources: ['MDD, recurrent, moderate - currently with worsening depressive sx', 'likely stress-related exacerbation', 'GAD - anxiety elevated', 'ETOH use disorder, in sustained remission'],
      Plan: '1. Increase sertraline to 150mg daily. 2. Continue trazodone 50mg at bedtime as needed for sleep. 3. Discussed importance of sleep hygiene and stress management. 4. Encouraged continued AA attendance and therapy engagement. 5. Return to clinic in 4 weeks to reassess. 6. Safety plan reviewed - patient to call or go to ED if suicidal ideation develops. 7. Labs: Repeat TSH and CMP in 6 weeks after dose change.',
      Plan_sources: ['Increase sertraline to 150mg daily', 'Continue trazodone 50mg qhs prn for sleep', 'Discussed importance of sleep hygiene, stress management', 'Encouraged continued AA attendance, therapy engagement', 'RTC 4 weeks to reassess', 'Safety plan reviewed - pt to call or go to ED if SI develops', 'Repeat TSH, CMP in 6 weeks after dose change'],
    }),
    externalId: 'FAX-2024-009',
  },

  // FAX 10: Completed, GI case with lots of detail - completed
  {
    fromNumber: '+15559990000',
    receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    status: 'completed',
    rawText: `GASTROENTEROLOGY PROCEDURE NOTE

PATIENT: DAVID FITZGERALD
DATE OF BIRTH: 12/05/1968  
MRN: 00667788
DATE OF PROCEDURE: 12/22/2024
PROCEDURE: EGD with biopsy
INDICATION: Dysphagia, GERD refractory to PPI

REFERRING PHYSICIAN: Dr. S. Kumar, Primary Care

PRE-PROCEDURE DIAGNOSIS: 
Dyspepsia, GERD, rule out Barrett's esophagus, rule out stricture

SEDATION: 
Propofol 200mg IV administered by anesthesia (Dr. Wong)
Pt tolerated sedation well, no complications

FINDINGS:

Esophagus: 
- Erythema and friability of distal esophagus (5cm above GEJ)
- Irregular Z-line, salmon-colored mucosa extending 3cm 
  above GEJ - suspicious for Barrett's
- No stricture or mass
- Schatzki ring at GEJ

Stomach:
- Mild erythema in antrum
- No ulcers, masses, or polyps
- Pylorus patent

Duodenum:
- Normal D1 and D2, no ulcers

BIOPSIES TAKEN:
- Distal esophagus x 4 quadrant biopsies (Barrett's protocol)
- Gastric antrum x 2 (H. pylori evaluation)

PROCEDURE COMPLICATIONS: None

POST-PROCEDURE DIAGNOSIS:
1. Likely Barrett's esophagus (pending pathology)
2. Schatzki ring
3. Mild gastritis

RECOMMENDATIONS:
1. Await pathology results - will call patient in 5-7 days
2. Continue PPI twice daily (increase from daily)
3. If Barrett's confirmed - will need surveillance EGD per guidelines
4. Consider dilation of Schatzki ring if symptoms persist
5. Diet modifications: avoid eating before lying down, 
   elevate HOB, avoid trigger foods
6. f/u office visit 2 weeks to discuss path results and plan

Dr. Jennifer Walsh, MD
Gastroenterology Associates
Phone: (555) 444-3333
Fax: (555) 444-3334`,
    metadata: JSON.stringify({
      patientName: 'David Fitzgerald',
      dateOfBirth: '12/05/1968',
      mrn: '00667788',
      dateOfService: '12/22/2024',
      referringProvider: 'Dr. S. Kumar',
      referringPractice: 'Primary Care',
      phoneNumber: '(555) 444-3333',
    }),
    sections: JSON.stringify({
      ChiefComplaint: 'Dysphagia and GERD refractory to PPI',
      ChiefComplaint_sources: ['Dysphagia, GERD refractory to PPI'],
      HPI: '56-year-old male undergoing EGD with biopsy for evaluation of dysphagia and GERD refractory to PPI therapy. Pre-procedure diagnosis: dyspepsia, GERD, rule out Barrett\'s esophagus, rule out stricture.',
      HPI_sources: ['EGD with biopsy', 'Dysphagia, GERD refractory to PPI', 'Dyspepsia, GERD, rule out Barrett\'s esophagus, rule out stricture'],
      PhysicalExam: 'Procedure Findings - Esophagus: Erythema and friability of distal esophagus 5cm above GE junction. Irregular Z-line with salmon-colored mucosa extending 3cm above GE junction, suspicious for Barrett\'s esophagus. No stricture or mass. Schatzki ring at GE junction. Stomach: Mild erythema in antrum, no ulcers, masses, or polyps, pylorus patent. Duodenum: Normal D1 and D2, no ulcers. Biopsies taken: Distal esophagus x4 quadrant biopsies (Barrett\'s protocol), gastric antrum x2 (H. pylori evaluation).',
      PhysicalExam_sources: ['Erythema and friability of distal esophagus (5cm above GEJ)', 'Irregular Z-line, salmon-colored mucosa extending 3cm above GEJ - suspicious for Barrett\'s', 'No stricture or mass', 'Schatzki ring at GEJ', 'Mild erythema in antrum', 'No ulcers, masses, or polyps', 'Pylorus patent', 'Normal D1 and D2, no ulcers', 'Distal esophagus x 4 quadrant biopsies (Barrett\'s protocol)', 'Gastric antrum x 2 (H. pylori evaluation)'],
      Assessment: '1. Likely Barrett\'s esophagus (pending pathology). 2. Schatzki ring. 3. Mild gastritis.',
      Assessment_sources: ['Likely Barrett\'s esophagus (pending pathology)', 'Schatzki ring', 'Mild gastritis'],
      Plan: '1. Await pathology results - will call patient in 5-7 days. 2. Continue PPI twice daily (increased from daily dosing). 3. If Barrett\'s confirmed, will need surveillance EGD per guidelines. 4. Consider dilation of Schatzki ring if symptoms persist. 5. Diet modifications: avoid eating before lying down, elevate head of bed, avoid trigger foods. 6. Follow-up office visit in 2 weeks to discuss pathology results and plan.',
      Plan_sources: ['Await pathology results - will call patient in 5-7 days', 'Continue PPI twice daily (increase from daily)', 'If Barrett\'s confirmed - will need surveillance EGD per guidelines', 'Consider dilation of Schatzki ring if symptoms persist', 'avoid eating before lying down, elevate HOB, avoid trigger foods', 'f/u office visit 2 weeks to discuss path results and plan'],
      Disposition: 'Procedure completed without complications. Sedation tolerated well. Follow-up in 2 weeks.',
      Disposition_sources: ['Procedure Complications: None', 'Pt tolerated sedation well', 'f/u office visit 2 weeks'],
    }),
    externalId: 'FAX-2024-010',
  },
];

async function seedTestFaxes() {
  console.log('🗑️  Deleting all existing faxes...\n');
  
  const deleteResult = await prisma.fax.deleteMany({});
  console.log(`   Deleted ${deleteResult.count} existing fax(es)\n`);

  console.log('📠 Creating 10 new test faxes...\n');

  for (const faxData of testFaxes) {
    const fax = await prisma.fax.create({
      data: faxData,
    });
    
    const statusEmoji = {
      completed: '✅',
      processing: '🔄',
      pending: '⏳',
      failed: '❌',
    }[fax.status] || '❓';
    
    console.log(`   ${statusEmoji} Fax #${fax.id} - ${fax.status.padEnd(10)} | From: ${fax.fromNumber} | ${fax.externalId}`);
  }

  console.log('\n✨ Done! Created 10 test faxes with various scenarios:');
  console.log('   - 6 completed (various specialties, some OCR errors)');
  console.log('   - 1 processing');
  console.log('   - 1 pending');
  console.log('   - 1 failed');
  console.log('   - 1 completed but missing metadata');
  console.log('\n🌐 View them at: http://localhost:3001/dashboard');
}

seedTestFaxes()
  .catch((error) => {
    console.error('Error seeding faxes:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
