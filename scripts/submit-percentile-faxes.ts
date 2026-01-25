/**
 * Submit faxes at different quality percentiles to test the system
 * Usage: npx ts-node scripts/submit-percentile-faxes.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// 10th percentile - TERRIBLE quality (OCR disasters, missing pages, illegible)
const FAX_10TH = {
  label: '10th Percentile (Terrible)',
  text: `FAX TRANSMISS1ON R3PORT
pg 1 of ?

[HEADER CUT OFF]

pt: ______ SM1TH    d0b: ??/15/19__
mrn: 00____

CC: ch3st pa1n

S: [large black smudge]
   ........illegible........
   pt st4tes som3thing about
   [page torn]

O: vs - ?? / ??  HR ???
   [most of exam missing]
   
A: ???

P: [cannot read]
   
   _____, MD`
};

// 25th percentile - POOR quality (OCR errors, incomplete, heavy abbreviations)
const FAX_25TH = {
  label: '25th Percentile (Poor)',
  text: `URGENT CARE NOTE

Pt: MARIA GONZALEZ  DOB: 08/22/1978
MRN: 00445566

CC: HA x 3d

S: 45 y/o F c/o HA x 3 days. Desc as "pressure" bil temporal
   + photophob, + naus, - vom, - fever
   no vis chg, no weakness
   hx migraine - not on proph
   tried tylenol w/o relief
   stress at work lately
   
   meds: OCPs
   
O: vs - T 98.4 BP 128/82 HR 76 
   Gen: NAD, holding head
   HEENT: PERRLA, no papilled
   [rest of neuro exam not done?]

A: ?migraine vs tension HA

P: sumatriptan 50mg x1
   dark room
   f/u pcp 1wk`
};

// 50th percentile - AVERAGE quality (readable, abbreviations, some structure)
const FAX_50TH = {
  label: '50th Percentile (Average)',
  text: `FAMILY MEDICINE CLINIC
Date: 12/28/2024

Patient: ROBERT JOHNSON
DOB: 03/15/1962 (62 y/o male)
MRN: 00778899

Chief Complaint: Annual physical, diabetes follow-up

HPI: 
62 yo M here for annual exam and DM2 management. Last A1c 7.8% three months ago. 
Reports good compliance w/ metformin. Checking sugars 2-3x/week, mostly 120-160 fasting.
Occasional fatigue. Denies polyuria, polydipsia. No chest pain, SOB. 
Diet "could be better" - admits to fast food 2-3x/week.
Exercise: walks dog 20 min daily.

PMH: DM2 x 10 yrs, HTN, HLD, obesity
Meds: metformin 1000 BID, lisinopril 20 daily, atorvastatin 40 daily
Allergies: NKDA

Vitals: BP 138/86, HR 78, Wt 245 lbs (BMI 34)

Exam:
Gen: obese male, NAD
CV: RRR, no murmur
Lungs: CTA
Abd: obese, soft, NT
Ext: no edema, DP pulses 2+, monofilament intact

Labs ordered: A1c, CMP, lipid panel, urine microalbumin

Assessment:
1. DM2 - suboptimal control
2. HTN - at goal
3. HLD - on statin
4. Obesity

Plan:
1. Increase metformin to 1000 TID if tolerates
2. Nutrition referral
3. Encourage exercise - goal 150 min/week
4. Recheck A1c in 3 months
5. Annual diabetic eye exam - ordered
6. RTC 3 months

Dr. Sarah Chen, MD
Family Medicine`
};

// 75th percentile - GOOD quality (clear, organized, still uses some abbreviations)
const FAX_75TH = {
  label: '75th Percentile (Good)',
  text: `PULMONOLOGY CONSULTATION

Patient: WILLIAM TAYLOR
Date of Birth: 11/08/1955
MRN: 00112233
Date of Service: 12/27/2024
Referring Provider: Dr. Michael Brown, PCP
Reason for Referral: Chronic cough, abnormal chest CT

HISTORY OF PRESENT ILLNESS:
69-year-old male referred for evaluation of persistent cough x 4 months. Initially dry, now occasionally productive of white sputum. Denies hemoptysis. Associated with mild dyspnea on exertion - can walk 2 blocks before stopping. No orthopnea or PND. 
20 pack-year smoking history, quit 15 years ago.

Recent chest CT (12/15/2024): 1.2 cm spiculated nodule RUL, new compared to CT 2 years ago. No lymphadenopathy.

REVIEW OF SYSTEMS:
Constitutional: No fever, no weight loss, no night sweats
Respiratory: Cough as above, mild DOE, denies wheezing
Cardiovascular: No chest pain, no palpitations
GI: No dysphagia

PAST MEDICAL HISTORY:
- Hypertension
- Hyperlipidemia  
- GERD
- Former smoker (quit 2009)

MEDICATIONS:
1. Lisinopril 10mg daily
2. Atorvastatin 20mg daily
3. Omeprazole 20mg daily

ALLERGIES: Penicillin (rash)

PHYSICAL EXAMINATION:
Vitals: BP 132/78, HR 72, RR 16, SpO2 96% on room air
General: Well-appearing, no acute distress
HEENT: Oropharynx clear
Neck: No lymphadenopathy, no JVD
Lungs: Clear to auscultation bilaterally, no wheezes or crackles
Heart: Regular rate and rhythm, no murmurs
Extremities: No clubbing, no edema

ASSESSMENT:
1. Pulmonary nodule, RUL - concerning for malignancy given spiculated appearance and growth
2. Chronic cough - likely multifactorial (GERD, post-nasal drip, vs related to nodule)
3. Former smoker with significant pack-year history

PLAN:
1. PET-CT to evaluate nodule metabolic activity
2. Pulmonary function tests
3. If PET positive, will proceed with CT-guided biopsy vs bronchoscopy with navigational guidance
4. Continue omeprazole, add nasal steroid for potential post-nasal drip component
5. Discussed findings with patient, including possibility of lung cancer - patient understands
6. Follow-up in 2 weeks with PET results

Dr. Jennifer Walsh, MD
Pulmonology Associates
Phone: (555) 234-5678`
};

// 100th percentile - PERFECT quality (complete, well-formatted, professional)
const FAX_100TH = {
  label: '100th Percentile (Perfect)',
  text: `CARDIOLOGY CONSULTATION REPORT

PATIENT INFORMATION
Name: ELIZABETH ANDERSON
Date of Birth: April 22, 1958
Medical Record Number: 00998877
Date of Service: December 28, 2024
Referring Physician: Dr. James Wilson, Internal Medicine
Insurance: Blue Cross Blue Shield

REASON FOR CONSULTATION:
Evaluation of new-onset atrial fibrillation detected on routine ECG

HISTORY OF PRESENT ILLNESS:
Mrs. Anderson is a 66-year-old female with a history of hypertension and hypothyroidism who presents for cardiology evaluation after atrial fibrillation was incidentally discovered on a routine ECG performed at her primary care office last week. 

The patient denies any palpitations, chest pain, shortness of breath, lightheadedness, or syncope. She has not noticed any decrease in exercise tolerance and continues to walk 2 miles daily without difficulty. She denies any recent illness, excessive caffeine intake, or alcohol use. 

She has never been told she has an irregular heartbeat before. Her last ECG two years ago was normal per her report.

REVIEW OF SYSTEMS:
Constitutional: Denies fever, chills, fatigue, or unintentional weight changes
Cardiovascular: Denies chest pain, palpitations, orthopnea, PND, or lower extremity swelling
Respiratory: Denies shortness of breath, cough, or wheezing
Neurological: Denies dizziness, syncope, focal weakness, or speech changes
All other systems reviewed and negative

PAST MEDICAL HISTORY:
1. Hypertension - diagnosed 2015, well-controlled
2. Hypothyroidism - diagnosed 2018, on replacement therapy
3. Osteoporosis - diagnosed 2020

SURGICAL HISTORY:
1. Cholecystectomy (2010)
2. Right knee arthroscopy (2019)

MEDICATIONS:
1. Lisinopril 20mg once daily
2. Levothyroxine 75mcg once daily
3. Alendronate 70mg once weekly
4. Calcium with Vitamin D 600mg/400IU twice daily

ALLERGIES:
Sulfa antibiotics - causes rash

FAMILY HISTORY:
Father: Deceased at age 78 from myocardial infarction
Mother: Living, age 88, history of hypertension and atrial fibrillation
Siblings: One brother with hypertension

SOCIAL HISTORY:
Never smoker. Occasional glass of wine with dinner (1-2 per week). Retired elementary school teacher. Lives with husband. Independent in all activities of daily living. Regular exercise - walks 2 miles daily.

PHYSICAL EXAMINATION:
Vital Signs: 
  Blood Pressure: 128/76 mmHg
  Heart Rate: 82 beats per minute, irregularly irregular
  Respiratory Rate: 14 breaths per minute
  Oxygen Saturation: 98% on room air
  Weight: 145 pounds
  Height: 5 feet 4 inches
  BMI: 24.9 kg/m²

General: Well-appearing female in no acute distress, pleasant and cooperative
HEENT: Normocephalic, atraumatic. Pupils equal and reactive. Oropharynx clear.
Neck: Supple, no jugular venous distension, no carotid bruits, thyroid normal size without nodules
Cardiovascular: Irregularly irregular rhythm, normal S1 and S2, no murmurs, rubs, or gallops
Lungs: Clear to auscultation bilaterally, no wheezes, rales, or rhonchi
Abdomen: Soft, non-tender, non-distended, normal bowel sounds
Extremities: No peripheral edema, pulses 2+ bilaterally
Neurological: Alert and oriented, no focal deficits

DIAGNOSTIC STUDIES:
ECG (12/21/2024): Atrial fibrillation with controlled ventricular response, rate 78, normal axis, no ST-T wave changes, QTc 440ms

Echocardiogram (performed today):
- Left ventricular ejection fraction: 60%
- Normal left ventricular size and wall thickness
- Left atrial size: Mildly dilated at 4.2 cm
- No significant valvular abnormalities
- No pericardial effusion

Laboratory Results (12/21/2024):
- TSH: 2.1 mIU/L (normal)
- Complete Metabolic Panel: Within normal limits
- Complete Blood Count: Within normal limits

ASSESSMENT:
1. New-onset atrial fibrillation, paroxysmal vs persistent, asymptomatic
2. CHA₂DS₂-VASc score: 3 (female, age, hypertension) - anticoagulation recommended
3. Hypertension - well controlled
4. Hypothyroidism - well controlled, not contributing to atrial fibrillation

PLAN:
1. Initiate anticoagulation with apixaban 5mg twice daily for stroke prevention given CHA₂DS₂-VASc score of 3
2. Start metoprolol succinate 25mg daily for rate control
3. Order 14-day cardiac event monitor to assess atrial fibrillation burden and guide rhythm vs rate control strategy
4. Patient counseled extensively on atrial fibrillation, stroke risk, bleeding risk with anticoagulation, and signs/symptoms requiring immediate medical attention
5. Provided written educational materials on atrial fibrillation and anticoagulation
6. Follow-up appointment in 4 weeks to review event monitor results and assess medication tolerance
7. Will coordinate care with primary care physician

DISPOSITION:
Patient discharged home in stable condition. She verbalized understanding of her diagnosis and treatment plan. She will call the office if she experiences any palpitations, chest pain, shortness of breath, bleeding, or neurological symptoms.

Electronically signed by:
Margaret Thompson, MD, FACC
Board Certified Cardiovascular Disease
Heartcare Cardiology Associates
Phone: (555) 876-5432
Fax: (555) 876-5433`
};

const ALL_FAXES = [FAX_10TH, FAX_25TH, FAX_50TH, FAX_75TH, FAX_100TH];

async function submitFax(fax: { label: string; text: string }) {
  console.log(`\n📤 Submitting: ${fax.label}`);
  console.log(`   Text length: ${fax.text.length} chars`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/faxes/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: fax.text,
        fromNumber: fax.label,
        provider: 'ollama', // Use local Ollama
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Created fax #${data.faxId}`);
      return data.faxId;
    } else {
      console.log(`   ❌ Error: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error}`);
    return null;
  }
}

async function main() {
  console.log('=' .repeat(60));
  console.log('SUBMITTING FAXES AT DIFFERENT QUALITY PERCENTILES');
  console.log('=' .repeat(60));
  console.log(`\nUsing Ollama (local) for processing`);
  console.log(`Base URL: ${BASE_URL}`);
  
  const faxIds: number[] = [];
  
  for (const fax of ALL_FAXES) {
    const id = await submitFax(fax);
    if (id) faxIds.push(id);
    // Small delay between submissions
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('SUBMISSION COMPLETE');
  console.log('=' .repeat(60));
  console.log(`\n✅ Submitted ${faxIds.length}/5 faxes`);
  console.log(`\n🌐 View results at: ${BASE_URL}/dashboard`);
  console.log('\n⏳ Processing will take ~30-40 seconds per fax with Ollama');
  console.log('   Total estimated time: 2-3 minutes for all 5 faxes\n');
}

main();

