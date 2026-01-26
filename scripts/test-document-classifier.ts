/**
 * Test script for document classification
 * 
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-document-classifier.ts
 */

import { classifyDocument, getDocumentTypeLabel, getDocumentTypeIcon, DocumentType } from '../lib/documentClassifier';

// ============================================================================
// Test Documents
// ============================================================================

const TEST_DOCUMENTS: Array<{ name: string; expectedType: DocumentType; text: string }> = [
  // Pathology Report
  {
    name: 'Surgical Pathology Report',
    expectedType: 'pathology',
    text: `
      PATHOLOGY REPORT
      Accession Number: SP-2025-12345
      
      SPECIMEN RECEIVED: Left breast tissue, excisional biopsy
      
      GROSS DESCRIPTION:
      Received in formalin labeled "left breast biopsy" is an ovoid piece of fibroadipose tissue 
      measuring 4.2 x 3.1 x 2.0 cm. Serial sectioning reveals a firm, white-tan, stellate mass 
      measuring 1.5 cm in greatest dimension.
      
      MICROSCOPIC DESCRIPTION:
      Sections show infiltrating ductal carcinoma, moderately differentiated (Grade 2). 
      The tumor forms irregular glands and nests with moderate nuclear pleomorphism. 
      Mitotic rate is 8/10 HPF. Lymphovascular invasion is present.
      
      FINAL DIAGNOSIS:
      LEFT BREAST, EXCISIONAL BIOPSY:
      - Invasive ductal carcinoma, Grade 2
      - Tumor size: 1.5 cm
      - Margins: Negative (closest margin 0.3 cm)
      - Lymphovascular invasion: Present
      
      TNM STAGING: pT1c pNX
      
      Pathologist: John Smith, MD
    `,
  },

  // Radiology Report
  {
    name: 'CT Abdomen Report',
    expectedType: 'radiology',
    text: `
      RADIOLOGY REPORT
      
      EXAM: CT Abdomen and Pelvis with IV Contrast
      
      CLINICAL HISTORY: 58-year-old male with abdominal pain, rule out appendicitis.
      
      COMPARISON: CT abdomen from 03/15/2024.
      
      TECHNIQUE: Helical CT of the abdomen and pelvis was performed following IV administration 
      of 100 mL of Omnipaque 350 contrast.
      
      FINDINGS:
      LIVER: No focal lesions. Normal size and attenuation.
      GALLBLADDER: No stones or wall thickening.
      PANCREAS: Normal.
      SPLEEN: Normal size.
      KIDNEYS: No hydronephrosis or stones bilaterally.
      APPENDIX: The appendix measures 8mm in diameter with periappendiceal fat stranding 
      and mild wall enhancement. Findings consistent with acute appendicitis.
      BOWEL: No obstruction or free air.
      
      IMPRESSION:
      1. Acute appendicitis without perforation.
      2. No other acute abdominal pathology.
      
      RECOMMENDATIONS:
      Surgical consultation recommended for appendectomy.
      
      Radiologist: Jane Doe, MD
    `,
  },

  // Consultation Report
  {
    name: 'Cardiology Consultation',
    expectedType: 'consultation',
    text: `
      CONSULTATION REPORT
      
      Thank you for this consultation on Mr. Johnson regarding his chest pain.
      
      REASON FOR CONSULTATION: Evaluation of chest pain and elevated troponin.
      
      HISTORY OF PRESENT ILLNESS:
      72-year-old male with history of hypertension and diabetes who presented with 
      substernal chest pressure for 2 hours. Pain radiates to left arm. Associated with 
      diaphoresis and nausea. Troponin elevated at 0.45 ng/mL.
      
      REVIEW OF SYSTEMS:
      Positive for chest pain, dyspnea on exertion. Negative for palpitations, syncope.
      
      PHYSICAL EXAMINATION:
      BP 145/90, HR 88, RR 18, SpO2 96% RA
      Cardiac: Regular rate, S4 gallop, no murmurs
      Lungs: Clear bilaterally
      
      ASSESSMENT:
      Non-ST elevation myocardial infarction (NSTEMI)
      
      RECOMMENDATIONS:
      1. Continue heparin drip per protocol
      2. Start aspirin and clopidogrel
      3. Cardiac catheterization recommended within 24-48 hours
      4. Serial troponins and EKGs
      5. Echocardiogram to assess LV function
      
      Please feel free to contact me with any questions.
      
      Cardiologist: Robert Brown, MD
    `,
  },

  // Lab Results
  {
    name: 'Complete Blood Count',
    expectedType: 'lab_results',
    text: `
      LABORATORY REPORT
      
      Patient: Smith, John
      DOB: 01/15/1965
      Collection Date: 01/25/2025 08:30
      
      COMPLETE BLOOD COUNT (CBC)
      
      Test                  Result      Reference Range     Flag
      ----------------------------------------------------------------
      WBC                   12.5        4.5-11.0 K/uL       HIGH
      RBC                   4.8         4.5-5.5 M/uL
      Hemoglobin            14.2        13.5-17.5 g/dL
      Hematocrit            42.5        38.8-50.0 %
      MCV                   88.5        80-100 fL
      MCH                   29.6        27-33 pg
      MCHC                  33.4        32-36 g/dL
      Platelet Count        245         150-400 K/uL
      RDW                   13.2        11.5-14.5 %
      
      DIFFERENTIAL:
      Neutrophils           78          40-70 %             HIGH
      Lymphocytes           15          20-40 %             LOW
      Monocytes             5           2-8 %
      Eosinophils           1.5         1-4 %
      Basophils             0.5         0-1 %
      
      Comments: Elevated WBC with neutrophilia. Clinical correlation recommended.
      
      Performed by: City Medical Laboratory
      Medical Director: Emily Chen, MD
    `,
  },

  // Toxicology Report
  {
    name: 'Urine Drug Screen',
    expectedType: 'toxicology',
    text: `
      TOXICOLOGY REPORT
      
      URINE DRUG SCREEN - 10 PANEL
      
      Patient: Doe, Jane
      Specimen Type: Urine
      Collection Date: 01/25/2025 14:30
      Chain of Custody: Maintained
      
      IMMUNOASSAY SCREENING RESULTS:
      
      Drug Class              Result      Cutoff (ng/mL)
      ----------------------------------------------------------------
      Amphetamines            NEGATIVE    1000
      Barbiturates            NEGATIVE    300
      Benzodiazepines         POSITIVE    300
      Cocaine Metabolites     NEGATIVE    300
      Marijuana (THC)         POSITIVE    50
      Methadone               NEGATIVE    300
      Opiates                 NEGATIVE    2000
      Phencyclidine (PCP)     NEGATIVE    25
      Propoxyphene            NEGATIVE    300
      Tricyclics              NEGATIVE    1000
      
      CONFIRMATION TESTING:
      Benzodiazepines confirmed positive by LC/MS
      THC confirmed positive by GC/MS - Level: 125 ng/mL
      
      Toxicologist: Michael Williams, PhD
    `,
  },

  // Discharge Summary
  {
    name: 'Hospital Discharge Summary',
    expectedType: 'discharge',
    text: `
      DISCHARGE SUMMARY
      
      Patient: Williams, Mary
      MRN: 123456789
      Admission Date: 01/20/2025
      Discharge Date: 01/25/2025
      Length of Stay: 5 days
      
      ADMITTING DIAGNOSIS:
      1. Community-acquired pneumonia
      2. Acute respiratory failure
      
      DISCHARGE DIAGNOSIS:
      1. Community-acquired pneumonia, resolving
      2. Acute respiratory failure, resolved
      3. Type 2 diabetes mellitus
      
      HOSPITAL COURSE:
      Patient was admitted with fever, productive cough, and hypoxia. Chest X-ray showed 
      right lower lobe infiltrate. Started on IV ceftriaxone and azithromycin. Required 
      supplemental oxygen for first 3 days. Cultures grew Streptococcus pneumoniae. 
      Transitioned to oral antibiotics on day 4. Blood sugars well controlled.
      
      DISCHARGE MEDICATIONS:
      1. Amoxicillin-clavulanate 875mg PO BID x 5 days
      2. Metformin 1000mg PO BID
      3. Lisinopril 10mg PO daily
      4. Albuterol inhaler PRN
      
      DISCHARGE INSTRUCTIONS:
      - Rest and increase fluid intake
      - Complete full course of antibiotics
      - No heavy lifting or strenuous activity for 1 week
      - Call if fever >101°F, worsening cough, or shortness of breath
      
      FOLLOW-UP:
      - PCP Dr. Thompson in 5-7 days
      - Repeat chest X-ray in 4-6 weeks
      
      Attending Physician: Sarah Johnson, MD
    `,
  },

  // Operative Report
  {
    name: 'Laparoscopic Appendectomy',
    expectedType: 'operative',
    text: `
      OPERATIVE REPORT
      
      Patient: Davis, Thomas
      Date of Surgery: 01/25/2025
      
      PREOPERATIVE DIAGNOSIS: Acute appendicitis
      
      POSTOPERATIVE DIAGNOSIS: Acute gangrenous appendicitis
      
      PROCEDURE PERFORMED: Laparoscopic appendectomy
      
      SURGEON: Dr. James Wilson
      ASSISTANT SURGEON: Dr. Amanda Lee
      ANESTHESIA: General endotracheal
      ANESTHESIOLOGIST: Dr. Mark Thompson
      
      INDICATIONS:
      32-year-old male with acute onset RLQ pain, elevated WBC, and CT findings 
      consistent with acute appendicitis.
      
      PROCEDURE IN DETAIL:
      Patient was placed supine under general anesthesia. Abdomen was prepped and draped 
      in sterile fashion. 12mm umbilical port placed using open technique. 
      Pneumoperitoneum established. Two additional 5mm ports placed in LLQ and suprapubic 
      positions. Appendix visualized with surrounding inflammation. Mesoappendix divided 
      using harmonic scalpel. Appendix transected at base using endoscopic stapler. 
      Specimen retrieved in endobag. Hemostasis confirmed. Ports removed and fascia closed.
      
      OPERATIVE FINDINGS:
      Gangrenous appendix without perforation. Minimal purulent fluid in RLQ.
      
      ESTIMATED BLOOD LOSS: 25 mL
      
      SPECIMENS: Appendix sent to pathology
      
      COMPLICATIONS: None
      
      DISPOSITION: Patient tolerated procedure well, transferred to PACU in stable condition.
      
      Surgeon: James Wilson, MD
    `,
  },

  // ED Note
  {
    name: 'Emergency Department Note',
    expectedType: 'ed_note',
    text: `
      EMERGENCY DEPARTMENT NOTE
      
      Patient: Anderson, Lisa
      Date of Visit: 01/25/2025
      Arrival Time: 22:45
      Mode of Arrival: Ambulance
      ESI Level: 2
      
      CHIEF COMPLAINT: Chest pain and shortness of breath
      
      HISTORY OF PRESENT ILLNESS:
      45-year-old female with sudden onset chest pain that started 1 hour ago while at rest. 
      Pain is substernal, 8/10, pressure-like, radiating to jaw. Associated with dyspnea 
      and diaphoresis. Denies recent illness or trauma. History of HTN.
      
      REVIEW OF SYSTEMS:
      Positive: Chest pain, dyspnea, diaphoresis
      Negative: Fever, cough, abdominal pain, extremity pain
      
      PHYSICAL EXAMINATION:
      Vitals: BP 168/95, HR 102, RR 22, SpO2 94% RA, Temp 98.6°F
      General: Anxious, diaphoretic, moderate distress
      Cardiac: Tachycardic, regular rhythm, no murmurs
      Lungs: Clear bilaterally
      Abdomen: Soft, non-tender
      Extremities: No edema
      
      ED COURSE:
      EKG: ST elevations in leads II, III, aVF
      Troponin: 2.5 ng/mL (critical)
      Aspirin and heparin given. Cardiology emergently consulted.
      
      MEDICAL DECISION MAKING:
      High complexity. Multiple acute problems requiring urgent intervention.
      Data reviewed: EKG, labs, imaging.
      Risk: High - STEMI with potential for hemodynamic instability.
      
      ASSESSMENT:
      1. ST-elevation myocardial infarction (inferior STEMI)
      2. Hypertensive urgency
      
      PLAN:
      1. Emergent cardiac catheterization
      2. Continue anticoagulation
      3. Admit to CCU
      
      DISPOSITION: Admitted to CCU for emergent PCI
      
      Return precautions given: Return immediately if chest pain worsens, 
      difficulty breathing, or loss of consciousness.
      
      Emergency Physician: Katherine Moore, MD
    `,
  },

  // Progress Note
  {
    name: 'Daily Progress Note',
    expectedType: 'progress_note',
    text: `
      PROGRESS NOTE
      
      Patient: Martinez, Carlos
      Date: 01/25/2025
      Hospital Day #3
      POD #1 from laparoscopic cholecystectomy
      
      INTERVAL HISTORY:
      Patient reports improved pain control overnight. Tolerating clear liquids.
      Ambulated to bathroom with assistance. Passed flatus this morning.
      No nausea or vomiting.
      
      VITALS:
      Tmax: 99.1°F, Current: 98.4°F
      BP: 128/78, HR: 72, RR: 16, SpO2: 98% RA
      
      CURRENT MEDICATIONS:
      - Hydromorphone 0.5mg IV q4h PRN
      - Ondansetron 4mg IV q8h PRN
      - Heparin 5000 units SC q12h
      - Acetaminophen 1000mg PO q6h
      
      LABS:
      WBC: 9.2 (down from 14.5)
      Hgb: 11.8
      BMP: Within normal limits
      LFTs: Mildly elevated, improving
      
      PHYSICAL EXAM:
      General: Alert, comfortable, no acute distress
      Cardiac: RRR, no murmurs
      Lungs: Clear to auscultation
      Abdomen: Soft, mildly tender at incision sites, no rebound/guarding
      Incisions: Clean, dry, intact, no erythema
      Extremities: No edema, calves soft and non-tender
      
      ASSESSMENT:
      1. s/p laparoscopic cholecystectomy - progressing well
      2. Acute cholecystitis - resolved
      3. Pain - well controlled
      
      PLAN:
      1. Advance diet to regular as tolerated
      2. Continue DVT prophylaxis
      3. Pain management with oral medications
      4. Physical therapy for ambulation
      5. Anticipated discharge tomorrow if tolerating regular diet
      
      Hospitalist: David Park, MD
    `,
  },

  // History and Physical
  {
    name: 'Admission H&P',
    expectedType: 'h_and_p',
    text: `
      HISTORY AND PHYSICAL
      
      Patient: Thompson, Robert
      Date of Admission: 01/25/2025
      Admitting Physician: Dr. Elizabeth Turner
      
      CHIEF COMPLAINT: Shortness of breath and leg swelling x 5 days
      
      HISTORY OF PRESENT ILLNESS:
      68-year-old male with history of CHF (EF 35%), CAD s/p CABG 2020, and AFib presents 
      with progressive dyspnea on exertion and bilateral lower extremity edema over past 
      5 days. Notes orthopnea requiring 3 pillows and PND. Weight gain of 8 lbs in 1 week. 
      Has been non-compliant with fluid restriction and missed furosemide doses.
      
      PAST MEDICAL HISTORY:
      1. CHF with reduced EF (35%)
      2. CAD s/p CABG x3 (2020)
      3. Atrial fibrillation
      4. Type 2 diabetes mellitus
      5. Hypertension
      6. Hyperlipidemia
      7. CKD stage III
      
      PAST SURGICAL HISTORY:
      1. CABG x3 (2020)
      2. Appendectomy (1985)
      3. Right knee arthroscopy (2010)
      
      FAMILY HISTORY:
      Father: MI at age 55, deceased at 62
      Mother: HTN, DM, alive age 88
      Brother: CAD, alive
      
      SOCIAL HISTORY:
      - Former smoker (40 pack-years, quit 2019)
      - Occasional alcohol (1-2 beers/week)
      - Retired electrician
      - Lives with wife
      - No illicit drugs
      
      MEDICATIONS:
      1. Furosemide 40mg PO BID
      2. Lisinopril 20mg PO daily
      3. Carvedilol 25mg PO BID
      4. Warfarin 5mg PO daily
      5. Metformin 1000mg PO BID
      6. Atorvastatin 80mg PO daily
      7. Digoxin 0.125mg PO daily
      
      ALLERGIES: PCN (rash), Sulfa (hives)
      
      REVIEW OF SYSTEMS:
      Constitutional: Weight gain, fatigue
      Cardiovascular: Dyspnea, orthopnea, PND, edema
      Respiratory: SOB, no cough
      GI: No nausea, vomiting, or abdominal pain
      GU: Decreased urine output
      Neuro: No headache, dizziness, or syncope
      All other systems negative
      
      PHYSICAL EXAMINATION:
      Vitals: BP 142/88, HR 88 irregular, RR 22, SpO2 92% RA, Temp 98.2°F, Wt 220 lbs
      General: Mildly dyspneic, speaking in short sentences
      HEENT: JVD to angle of jaw
      Cardiac: Irregularly irregular, S3 gallop, no murmurs
      Lungs: Bibasilar crackles
      Abdomen: Soft, hepatomegaly 3cm below costal margin
      Extremities: 3+ pitting edema bilateral lower extremities
      
      ASSESSMENT AND PLAN:
      1. Acute on chronic systolic heart failure exacerbation
         - IV furosemide 80mg BID
         - Daily weights, strict I/Os
         - Fluid restriction 1.5L
         - BNP, echo
      
      2. Atrial fibrillation with RVR
         - Continue carvedilol, increase if needed
         - Hold digoxin, check level
         - Continue warfarin, check INR
      
      3. CKD stage III - monitor creatinine with diuresis
      
      4. DM2 - hold metformin, sliding scale insulin
      
      Admitting Physician: Elizabeth Turner, MD
    `,
  },

  // General Clinical Note (default)
  {
    name: 'Office Visit Note',
    expectedType: 'clinical_note',
    text: `
      Patient presents with cough and fever for 3 days. Reports productive cough with 
      yellow sputum. Denies chest pain or shortness of breath. No recent travel.
      
      Temp 100.2°F, BP 120/80, HR 88, RR 16, SpO2 98%
      
      Lungs: mild crackles right lower lobe
      Heart: regular rate and rhythm
      Otherwise unremarkable exam.
      
      Assessment: Acute bronchitis, likely bacterial given productive cough and crackles.
      
      Plan:
      - Azithromycin 250mg x 5 days
      - Increase fluids
      - Rest
      - Return if symptoms worsen or fever persists >3 days
    `,
  },
];

// ============================================================================
// Test Runner
// ============================================================================

function runTests() {
  console.log('='.repeat(80));
  console.log('DOCUMENT CLASSIFIER TEST');
  console.log('='.repeat(80));
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const testDoc of TEST_DOCUMENTS) {
    const result = classifyDocument(testDoc.text);
    const isCorrect = result.type === testDoc.expectedType;
    
    if (isCorrect) {
      passed++;
      console.log(`✅ PASS: ${testDoc.name}`);
    } else {
      failed++;
      console.log(`❌ FAIL: ${testDoc.name}`);
      console.log(`   Expected: ${testDoc.expectedType}`);
      console.log(`   Got:      ${result.type}`);
    }
    
    console.log(`   ${getDocumentTypeIcon(result.type)} ${getDocumentTypeLabel(result.type)}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    if (result.subtype) {
      console.log(`   Subtype: ${result.subtype}`);
    }
    console.log(`   Keywords: ${result.detectedKeywords.slice(0, 5).join(', ')}`);
    console.log(`   Sections: ${result.suggestedSections.slice(0, 4).join(', ')}...`);
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${TEST_DOCUMENTS.length} tests`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();
