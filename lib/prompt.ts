/**
 * Prompt template for converting clinical text into Epic SmartSection format
 * Supports multiple document types with specialized prompts
 */

import { DocumentType } from './documentClassifier';

/**
 * Fax metadata extracted from the input document
 */
export interface FaxMetadata {
  patientName?: string;
  dateOfBirth?: string;
  referringProvider?: string;
  referringPractice?: string;
  dateOfService?: string;
  faxDate?: string;
  phoneNumber?: string;
  mrn?: string;  // Medical Record Number
}

export interface SmartSections {
  // Common sections
  ChiefComplaint?: string;
  ChiefComplaint_sources?: string[];
  HPI?: string;
  HPI_sources?: string[];
  ReviewOfSystems?: string;
  ReviewOfSystems_sources?: string[];
  PhysicalExam?: string;
  PhysicalExam_sources?: string[];
  Assessment?: string;
  Assessment_sources?: string[];
  Plan?: string;
  Plan_sources?: string[];
  Disposition?: string;
  Disposition_sources?: string[];
  
  // Pathology-specific sections
  SpecimenInfo?: string;
  SpecimenInfo_sources?: string[];
  GrossDescription?: string;
  GrossDescription_sources?: string[];
  MicroscopicDescription?: string;
  MicroscopicDescription_sources?: string[];
  Diagnosis?: string;
  Diagnosis_sources?: string[];
  TNMStaging?: string;
  TNMStaging_sources?: string[];
  SynopticReport?: string;
  SynopticReport_sources?: string[];
  
  // Radiology-specific sections
  ExamType?: string;
  ExamType_sources?: string[];
  ClinicalHistory?: string;
  ClinicalHistory_sources?: string[];
  Comparison?: string;
  Comparison_sources?: string[];
  Technique?: string;
  Technique_sources?: string[];
  Findings?: string;
  Findings_sources?: string[];
  Impression?: string;
  Impression_sources?: string[];
  Recommendations?: string;
  Recommendations_sources?: string[];
  
  // Consultation-specific sections
  ReasonForConsult?: string;
  ReasonForConsult_sources?: string[];
  
  // Lab-specific sections
  TestName?: string;
  TestName_sources?: string[];
  Results?: string;
  Results_sources?: string[];
  ReferenceRange?: string;
  ReferenceRange_sources?: string[];
  Flags?: string;
  Flags_sources?: string[];
  
  // Operative-specific sections
  PreoperativeDiagnosis?: string;
  PreoperativeDiagnosis_sources?: string[];
  PostoperativeDiagnosis?: string;
  PostoperativeDiagnosis_sources?: string[];
  Procedure?: string;
  Procedure_sources?: string[];
  Surgeon?: string;
  Surgeon_sources?: string[];
  Anesthesia?: string;
  Anesthesia_sources?: string[];
  EstimatedBloodLoss?: string;
  EstimatedBloodLoss_sources?: string[];
  Complications?: string;
  Complications_sources?: string[];
  
  // Discharge-specific sections
  AdmissionDate?: string;
  AdmissionDate_sources?: string[];
  DischargeDate?: string;
  DischargeDate_sources?: string[];
  AdmittingDiagnosis?: string;
  AdmittingDiagnosis_sources?: string[];
  DischargeDiagnosis?: string;
  DischargeDiagnosis_sources?: string[];
  HospitalCourse?: string;
  HospitalCourse_sources?: string[];
  DischargeMedications?: string;
  DischargeMedications_sources?: string[];
  DischargeInstructions?: string;
  DischargeInstructions_sources?: string[];
  FollowUp?: string;
  FollowUp_sources?: string[];
  
  // H&P-specific sections
  PMH?: string;
  PMH_sources?: string[];
  PSH?: string;
  PSH_sources?: string[];
  FamilyHistory?: string;
  FamilyHistory_sources?: string[];
  SocialHistory?: string;
  SocialHistory_sources?: string[];
  Medications?: string;
  Medications_sources?: string[];
  Allergies?: string;
  Allergies_sources?: string[];
  
  // Progress note sections
  IntervalHistory?: string;
  IntervalHistory_sources?: string[];
  Labs?: string;
  Labs_sources?: string[];
  Vitals?: string;
  Vitals_sources?: string[];
  CurrentMedications?: string;
  CurrentMedications_sources?: string[];
  
  // ED note sections
  MDM?: string;
  MDM_sources?: string[];
  
  // Generic comments
  Comments?: string;
  Comments_sources?: string[];
  
  // Allow dynamic keys
  [key: string]: string | string[] | undefined;
}

// ============================================================================
// Section definitions by document type
// ============================================================================

const SECTION_DEFINITIONS: Record<string, Record<string, string>> = {
  clinical_note: {
    ChiefComplaint: "The main reason for the patient's visit in one concise sentence",
    HPI: "Patient's symptoms, timeline, and relevant history as a single paragraph",
    ReviewOfSystems: "A systematic review of body systems with positive and pertinent negative findings",
    PhysicalExam: "Vital signs and physical examination findings as a single paragraph",
    Assessment: "Diagnosis or clinical impression as a single paragraph",
    Plan: "Treatment plan, prescriptions, follow-up instructions as a single paragraph",
    Disposition: "Discharge status, follow-up instructions, and return precautions",
  },
  
  pathology: {
    SpecimenInfo: "Specimen identification: accession number, collection date, specimen type/source, laterality if applicable",
    GrossDescription: "Macroscopic examination findings: size, color, consistency, notable features",
    MicroscopicDescription: "Histologic findings: cellular architecture, nuclear features, mitotic activity, special stains",
    Diagnosis: "Final pathologic diagnosis with any applicable grading or classification",
    TNMStaging: "TNM cancer staging if applicable: T (tumor), N (nodes), M (metastasis) with stage grouping",
    SynopticReport: "Structured synoptic elements if present (margins, lymphovascular invasion, etc.)",
    Comments: "Additional pathologist comments, recommendations, or correlations",
  },
  
  radiology: {
    ExamType: "Type of imaging study performed (CT, MRI, X-ray, Ultrasound, etc.) and body region",
    ClinicalHistory: "Reason for exam, relevant clinical history, and specific clinical question",
    Comparison: "Prior studies available for comparison with dates",
    Technique: "Imaging technique, contrast administration, sequences/protocols used",
    Findings: "Detailed observations organized by anatomic region or organ system",
    Impression: "Summary interpretation with differential diagnosis if applicable",
    Recommendations: "Suggested follow-up imaging, clinical correlation, or additional evaluation",
  },
  
  consultation: {
    ReasonForConsult: "The specific question or reason the consultation was requested",
    HPI: "History focused on the consultation question",
    ReviewOfSystems: "Pertinent positive and negative symptoms related to consultation",
    PhysicalExam: "Focused physical examination findings relevant to consultation",
    Assessment: "Consultant's clinical assessment and reasoning",
    Recommendations: "Specific recommendations to the referring provider with rationale",
  },
  
  lab_results: {
    TestName: "Name of laboratory test(s) performed",
    Results: "Test results with values and units",
    ReferenceRange: "Normal reference ranges for comparison",
    Flags: "Abnormal flags (High, Low, Critical) if present",
    Comments: "Laboratory comments or interpretive notes",
  },
  
  toxicology: {
    SpecimenInfo: "Specimen type, collection date/time, chain of custody information",
    Results: "Drug panel results: substances tested with positive/negative/detected status",
    Comments: "Confirmation testing, cutoff levels, or interpretive notes",
  },
  
  discharge: {
    AdmissionDate: "Date of hospital admission",
    DischargeDate: "Date of hospital discharge",
    AdmittingDiagnosis: "Diagnosis at time of admission",
    DischargeDiagnosis: "Final diagnoses at discharge",
    HospitalCourse: "Summary of hospital stay including key events, procedures, treatments",
    DischargeMedications: "Complete list of medications at discharge with dosing",
    DischargeInstructions: "Activity restrictions, diet, wound care, and other patient instructions",
    FollowUp: "Follow-up appointments and provider contact information",
  },
  
  operative: {
    PreoperativeDiagnosis: "Diagnosis before surgery",
    PostoperativeDiagnosis: "Diagnosis after surgery (may include operative findings)",
    Procedure: "Name of procedure(s) performed",
    Surgeon: "Operating surgeon and assistants",
    Anesthesia: "Type of anesthesia used",
    Findings: "Intraoperative findings",
    EstimatedBloodLoss: "Estimated blood loss during procedure",
    Complications: "Any intraoperative complications or 'None'",
    Disposition: "Patient condition and disposition after procedure",
  },
  
  ed_note: {
    ChiefComplaint: "Primary reason for ED visit",
    HPI: "History of present illness with timing, severity, associated symptoms",
    ReviewOfSystems: "Pertinent positives and negatives",
    PhysicalExam: "Physical examination findings including vitals",
    MDM: "Medical decision making: data reviewed, risk assessment, complexity",
    Assessment: "Diagnoses or differential diagnoses",
    Plan: "Treatment provided in ED, tests ordered, consultations",
    Disposition: "Discharge or admission status with instructions",
  },
  
  progress_note: {
    IntervalHistory: "Events since last note, overnight events, patient complaints",
    Vitals: "Current vital signs",
    Labs: "Relevant laboratory results",
    CurrentMedications: "Current medication list",
    PhysicalExam: "Focused physical examination findings",
    Assessment: "Current clinical assessment by problem",
    Plan: "Plan for each active problem",
  },
  
  h_and_p: {
    ChiefComplaint: "Primary reason for admission/visit",
    HPI: "Detailed history of present illness",
    PMH: "Past medical history",
    PSH: "Past surgical history",
    FamilyHistory: "Relevant family medical history",
    SocialHistory: "Social history including tobacco, alcohol, drugs, occupation",
    Medications: "Current medications with doses",
    Allergies: "Drug allergies and reactions",
    ReviewOfSystems: "Complete review of systems",
    PhysicalExam: "Complete physical examination",
    Assessment: "Clinical assessment and problem list",
    Plan: "Diagnostic and treatment plan",
  },
};

/**
 * Get sections appropriate for a document type
 */
export function getSectionsForDocumentType(documentType: DocumentType | string): string[] {
  const sections = SECTION_DEFINITIONS[documentType];
  if (sections) {
    return Object.keys(sections);
  }
  // Default to clinical note sections
  return Object.keys(SECTION_DEFINITIONS.clinical_note);
}

/**
 * Get all section descriptions combining base definitions with type-specific ones
 */
function getAllSectionDescriptions(documentType?: DocumentType | string): Record<string, string> {
  // Base clinical note descriptions
  const baseDescriptions: Record<string, string> = {
    ChiefComplaint: "ChiefComplaint: The main reason for the patient's visit in one concise sentence",
    HPI: "HPI (History of Present Illness): Patient's symptoms, timeline, and relevant history as a single paragraph",
    ReviewOfSystems: "ReviewOfSystems: A systematic review of body systems with positive and pertinent negative findings",
    PhysicalExam: "PhysicalExam: Vital signs and physical examination findings as a single paragraph",
    Assessment: "Assessment: Diagnosis or clinical impression as a single paragraph",
    Plan: "Plan: Treatment plan, prescriptions, follow-up instructions as a single paragraph",
    Disposition: "Disposition: Discharge status, follow-up instructions, and return precautions",
    // Pathology sections
    SpecimenInfo: "SpecimenInfo: Specimen ID, accession number, collection date, specimen type and source",
    GrossDescription: "GrossDescription: Macroscopic examination findings (size, color, consistency)",
    MicroscopicDescription: "MicroscopicDescription: Histologic findings and cellular characteristics",
    Diagnosis: "Diagnosis: Final pathologic diagnosis with grading/classification",
    TNMStaging: "TNMStaging: TNM cancer staging if applicable (T, N, M values and stage grouping)",
    SynopticReport: "SynopticReport: Structured synoptic elements (margins, invasion, etc.)",
    // Radiology sections
    ExamType: "ExamType: Type of imaging study and body region examined",
    ClinicalHistory: "ClinicalHistory: Reason for exam and relevant clinical history",
    Comparison: "Comparison: Prior studies available for comparison with dates",
    Technique: "Technique: Imaging technique, contrast, sequences/protocols used",
    Findings: "Findings: Detailed observations by anatomic region",
    Impression: "Impression: Summary interpretation with differential diagnosis",
    Recommendations: "Recommendations: Suggested follow-up or additional evaluation",
    // Consultation sections
    ReasonForConsult: "ReasonForConsult: The specific question or reason for consultation",
    // Lab sections
    TestName: "TestName: Name of laboratory test(s) performed",
    Results: "Results: Test results with values and units",
    ReferenceRange: "ReferenceRange: Normal reference ranges for comparison",
    Flags: "Flags: Abnormal flags (High, Low, Critical) if present",
    // Operative sections
    PreoperativeDiagnosis: "PreoperativeDiagnosis: Diagnosis before surgery",
    PostoperativeDiagnosis: "PostoperativeDiagnosis: Diagnosis after surgery",
    Procedure: "Procedure: Name of procedure(s) performed",
    Surgeon: "Surgeon: Operating surgeon and assistants",
    Anesthesia: "Anesthesia: Type of anesthesia used",
    EstimatedBloodLoss: "EstimatedBloodLoss: Estimated blood loss during procedure",
    Complications: "Complications: Any intraoperative complications or 'None'",
    // Discharge sections
    AdmissionDate: "AdmissionDate: Date of hospital admission",
    DischargeDate: "DischargeDate: Date of hospital discharge",
    AdmittingDiagnosis: "AdmittingDiagnosis: Diagnosis at time of admission",
    DischargeDiagnosis: "DischargeDiagnosis: Final diagnoses at discharge",
    HospitalCourse: "HospitalCourse: Summary of hospital stay, events, procedures, treatments",
    DischargeMedications: "DischargeMedications: Complete medication list at discharge with dosing",
    DischargeInstructions: "DischargeInstructions: Activity restrictions, diet, wound care instructions",
    FollowUp: "FollowUp: Follow-up appointments and provider contact information",
    // H&P sections
    PMH: "PMH (Past Medical History): Chronic conditions and prior diagnoses",
    PSH: "PSH (Past Surgical History): Prior surgeries with dates",
    FamilyHistory: "FamilyHistory: Relevant family medical history",
    SocialHistory: "SocialHistory: Tobacco, alcohol, drugs, occupation, living situation",
    Medications: "Medications: Current medications with doses",
    Allergies: "Allergies: Drug allergies and reactions",
    // Progress note sections
    IntervalHistory: "IntervalHistory: Events since last note, overnight events, patient complaints",
    Vitals: "Vitals: Current vital signs",
    Labs: "Labs: Relevant laboratory results",
    CurrentMedications: "CurrentMedications: Current medication list",
    // ED sections
    MDM: "MDM (Medical Decision Making): Data reviewed, risk assessment, complexity level",
    // Generic
    Comments: "Comments: Additional notes or observations",
  };
  
  return baseDescriptions;
}

/**
 * Get document type-specific preamble for the prompt
 */
function getDocumentTypePreamble(documentType?: DocumentType | string): string {
  const preambles: Record<string, string> = {
    pathology: `You are processing a PATHOLOGY REPORT. Focus on:
- Specimen information (accession number, collection date, source)
- Gross and microscopic descriptions
- Final pathologic diagnosis with any grading
- TNM staging if cancer-related
- Synoptic reporting elements if present`,
    
    radiology: `You are processing a RADIOLOGY REPORT. Focus on:
- Type of imaging study and body region
- Clinical indication for the exam
- Comparison with prior studies
- Detailed findings by anatomic region
- Impression (diagnosis/differential)
- Recommendations for follow-up`,
    
    consultation: `You are processing a CONSULTATION REPORT. Focus on:
- Reason for consultation
- Focused history related to the consultation question
- Assessment addressing the specific clinical question
- Clear recommendations to the referring provider`,
    
    lab_results: `You are processing LABORATORY RESULTS. Focus on:
- Test names and types
- Result values with units
- Reference ranges
- Abnormal flags (High, Low, Critical)
- Any interpretive comments`,
    
    toxicology: `You are processing a TOXICOLOGY REPORT. Focus on:
- Specimen type and collection information
- Substances tested
- Positive/Negative/Detected results
- Confirmation testing details
- Cutoff levels if provided`,
    
    discharge: `You are processing a DISCHARGE SUMMARY. Focus on:
- Admission and discharge dates
- Admitting and discharge diagnoses
- Hospital course summary
- Discharge medications with dosing
- Discharge instructions and follow-up`,
    
    operative: `You are processing an OPERATIVE REPORT. Focus on:
- Pre and post-operative diagnoses
- Procedure performed
- Surgeon and anesthesia information
- Operative findings
- Estimated blood loss and complications
- Patient disposition`,
    
    ed_note: `You are processing an EMERGENCY DEPARTMENT NOTE. Focus on:
- Chief complaint and HPI
- Medical decision making (MDM) complexity
- Assessment and differential diagnoses
- Treatment provided in ED
- Disposition and return precautions`,
    
    progress_note: `You are processing a PROGRESS NOTE. Focus on:
- Interval history since last note
- Current vitals and labs
- Focused physical exam
- Assessment by problem
- Plan for each active issue`,
    
    h_and_p: `You are processing a HISTORY AND PHYSICAL. Focus on:
- Complete HPI
- Past medical/surgical history
- Family and social history
- Medications and allergies
- Complete review of systems
- Full physical examination
- Assessment and plan`,
  };
  
  return preambles[documentType || ''] || '';
}

/**
 * Generates the system prompt for the AI model
 */
export function getSystemPrompt(selectedSections?: string[], documentType?: DocumentType | string): string {
  // Use document-type-specific sections if no sections specified
  const sections = selectedSections && selectedSections.length > 0
    ? selectedSections
    : getSectionsForDocumentType(documentType || 'clinical_note');

  const sectionDescriptions = getAllSectionDescriptions(documentType);
  const typePreamble = getDocumentTypePreamble(documentType);

  const requestedGuidelines = sections
    .map(section => {
      const desc = sectionDescriptions[section];
      return desc ? `- ${desc}` : `- ${section}: Extract and format this section`;
    })
    .join('\n');

  const exampleKeys = sections.join(', ');

  const sourceKeys = sections.map(s => `${s}_sources`).join(', ');

  // Build the prompt with optional document type preamble
  const documentTypeInstruction = typePreamble ? `\n\nDOCUMENT TYPE DETECTED:\n${typePreamble}\n` : '';

  return `You are a medical scribe assistant. Your task is to structure clinical notes into Epic SmartSections and extract fax/referral metadata.
${documentTypeInstruction}
Return ONLY a valid JSON object with these keys: "metadata", ${exampleKeys}, and for each section include a sources array: ${sourceKeys}.

METADATA EXTRACTION (do this FIRST - be thorough!):
Carefully scan the ENTIRE input, especially the FIRST FEW LINES, for patient/referral metadata.

PATIENT NAME - look for:
- "Name:" followed by a name (e.g., "Name: John Doe")
- "Patient:", "Pt:", "Patient Name:", "Pt Name:"
- "RE:", "Regarding:", "Subject:"
- If there's text like "(fictional)" after the name, extract just the name part

DATE OF BIRTH - look for:
- "DOB:" followed by a date (e.g., "DOB: 01/15/1971")
- "D.O.B.:", "Date of Birth:", "Birthdate:", "Birth Date:"
- If there's "(Age XX)" after the date, extract just the date part

MRN (Medical Record Number) - look for:
- "MRN:" followed by numbers (e.g., "MRN: 00012345")
- "MRN#:", "Medical Record #:", "Chart #:", "Account #:", "Patient ID:", "ID#:"
- ANY labeled number that looks like a patient identifier

REFERRING/TREATING PROVIDER - look for:
- "Provider:" followed by a name (e.g., "Provider: A. Provider, MD")
- "Referring Physician:", "Attending:", "Physician:", "MD:", "Dr."
- Names with "MD", "DO", "NP", "PA" credentials

PRACTICE/LOCATION - look for:
- "Location:" followed by a place (e.g., "Location: Emergency Department")
- "Practice:", "Clinic:", "Facility:", "Hospital:", "Department:"
- Place names like "Emergency Department", "Family Medicine", etc.

DATE OF SERVICE/ENCOUNTER - look for:
- "Date of Encounter:" followed by a date (e.g., "Date of Encounter: 03/12/2025")
- "DOS:", "Date of Service:", "Visit Date:", "Encounter Date:", "Service Date:"
- "Date:" near the top of the document

FAX DATE - look for:
- "Fax Date:", "Faxed:", "Sent:", "Date Sent:"
- Fax header timestamps

PHONE NUMBER - look for:
- "Phone:", "Tel:", "Fax:", "Contact:"
- Phone number formats: (xxx) xxx-xxxx, xxx-xxx-xxxx

EXAMPLE - If you see this at the top of the input:
"Patient Metadata Name: John Doe (fictional) MRN: 00012345 DOB: 01/15/1971 (Age 54) Sex: Male Date of Encounter: 03/12/2025 Location: Emergency Department Provider: A. Provider, MD"

You should extract:
{
  "metadata": {
    "patientName": "John Doe",
    "mrn": "00012345",
    "dateOfBirth": "01/15/1971",
    "dateOfService": "03/12/2025",
    "referringPractice": "Emergency Department",
    "referringProvider": "A. Provider, MD"
  }
}

BE AGGRESSIVE: Extract ALL metadata fields you can find! Don't miss any!

YOUR WORKFLOW:
1. FIRST: Read the input and identify ALL relevant quotes (numbers, symptoms, findings, etc.)
2. THEN: Summarize and organize those quotes into clean, professional medical documentation
3. FINALLY: List the original verbatim quotes as sources for each section

TWO DIFFERENT OUTPUTS PER SECTION:
- The SECTION (e.g., "HPI") = A clean, summarized, professionally written paragraph. You should reorganize, combine, and clean up the raw text into proper medical documentation format.
- The SOURCES (e.g., "HPI_sources") = The exact, verbatim quotes from the input that you used. These must be word-for-word copies from the input text.

CRITICAL RULES:
1. Sections should be SUMMARIZED and professionally formatted (not word-for-word copies)
2. Sources must be VERBATIM quotes (exact copies from the input)
3. You may ONLY include information in sections that comes from the input text
4. NEVER infer, assume, or add information not present in the input
5. If information for a section is not in the input, state "Not documented"

SOURCE CITATION RULES:
- Sources MUST be exact, verbatim quotes copied directly from the input text
- Copy the exact characters, spelling, punctuation, and capitalization
- Do NOT paraphrase or modify the source quotes - they must match the input exactly

BE EXTREMELY GENEROUS WITH CITATIONS (CRITICAL):
- Include EVERY phrase from the input that contributed to each section - more is better
- When in doubt, INCLUDE the source quote
- It is MUCH better to over-cite than under-cite
- If a phrase contributed ANY information to your output, cite it

SECTION-SPECIFIC CITATION GUIDANCE:

FOR CHIEF COMPLAINT - cite:
- The main symptom(s): "cough", "chest pain", "fever"
- Duration/timeline: "x 3 days", "for 1 week", "since yesterday"
- Severity descriptors: "severe", "mild", "worsening"

FOR HPI (History of Present Illness) - cite:
- Every symptom mentioned: "cough", "fever", "sputum"
- Every duration/timeline: "3 days", "x 1 week", "started Monday"
- Every descriptor: "productive", "yellow", "worsening", "intermittent"
- Every negative/denial: "denies CP", "no SOB", "without nausea"
- Every associated factor: "worse at night", "relieved by rest"
- Patient quotes or statements

FOR REVIEW OF SYSTEMS - cite:
- Every positive finding: "productive cough", "headache", "fatigue"
- Every negative/denial: "denies CP/SOB", "no fever", "no nausea"
- System-specific mentions: "no chest pain", "no dysuria"

FOR PHYSICAL EXAM - cite:
- Every vital sign individually: "T 100.2", "BP 120/80", "HR 88", "RR 16", "SpO2 98%"
- Every body system examined: "Lungs clear", "Heart RRR", "Abdomen soft"
- Every finding (positive or negative): "crackles RLL", "no murmur", "PERRLA"
- Every descriptor: "normal", "unremarkable", "no acute distress", "well-appearing"
- Every abbreviation: "NAD", "RRR", "CTA", "NT/ND", "EOMI"

FOR ASSESSMENT - cite:
- Key findings that support the diagnosis: "fever", "productive cough", "crackles"
- Any mentioned diagnosis or impression from the input
- Relevant history that informs assessment

FOR PLAN - cite:
- Every medication: "azithromycin", "ibuprofen", "albuterol"  
- Every dosage: "500mg", "BID", "PRN"
- Every instruction: "increase fluids", "rest", "return if worse"
- Follow-up timing: "5 days", "1 week", "as needed"
- Referrals or tests ordered: "CXR", "CBC", "refer to cardiology"

FOR DISPOSITION - cite:
- Discharge status: "discharged home", "admitted", "transferred"
- Follow-up instructions: "f/u 1 week", "PCP in 5 days"
- Return precautions: "return if fever >102", "if worsening SOB"
- Any warnings or red flags mentioned

Guidelines for section content:
${requestedGuidelines}

Example - Input: "pt has cough and fever x 3 days. productive cough w/ yellow sputum. Temp 100.2, BP 120/80"
Example - Output:
{
  "HPI": "Patient presents with a 3-day history of cough and fever. Reports productive cough with yellow sputum.",
  "HPI_sources": ["cough and fever x 3 days", "productive cough w/ yellow sputum"]
}

Notice: The HPI is clean and professional. The sources are the exact raw quotes.

Do not include any explanatory text outside the JSON object.`;
}

/**
 * Generates the user prompt with the clinical text
 */
export function getUserPrompt(clinicalText: string, selectedSections?: string[]): string {
  const sections = selectedSections || ['HPI', 'PhysicalExam', 'Assessment', 'Plan'];
  const sectionKeys = sections.join(', ');
  const sourceKeys = sections.map(s => `${s}_sources`).join(', ');

  return `Structure this clinical note into Epic SmartSections:

---INPUT TEXT START---
${clinicalText}
---INPUT TEXT END---

Return JSON with keys: "metadata", ${sectionKeys}, ${sourceKeys}.

WORKFLOW REMINDER:
1. FIRST: Look at the BEGINNING of the input for metadata fields like:
   - "Name:" → patientName (remove "(fictional)" if present)
   - "DOB:" → dateOfBirth (remove "(Age XX)" if present)  
   - "MRN:" → mrn
   - "Provider:" → referringProvider
   - "Location:" → referringPractice
   - "Date of Encounter:" → dateOfService
2. Find ALL relevant clinical quotes in the input (be thorough!)
3. Write clean, summarized, professional sections based on those quotes
4. List EVERY original verbatim quote as a source - be generous!

CRITICAL: The metadata is usually at the TOP of the document. Don't skip it!

CITATION RULES:
- Sections = summarized, clean, professional documentation
- Sources = exact verbatim quotes from the input (word-for-word)
- MORE CITATIONS IS BETTER - cite every phrase that contributed

FOR EVERY SECTION, CITE:
- Chief Complaint: symptoms + duration + severity
- HPI: every symptom, duration, descriptor, denial, associated factor
- ROS: every positive finding, every negative/denial
- Physical Exam: EACH vital, EACH system, EACH finding, EACH abbreviation
- Assessment: key findings supporting diagnosis
- Plan: every medication, dosage, instruction, follow-up, referral
- Disposition: discharge status, follow-up, return precautions

Include abbreviations exactly as written (e.g., "RRR", "PERRLA", "NAD", "BID", "PRN")`;
}

/**
 * Get document-type-specific guidance for local models
 */
function getDocumentTypeGuidanceForLocal(documentType?: DocumentType, sections?: string[]): string {
  const sectionDescriptions = sections?.map(s => {
    const desc = getAllSectionDescriptions(documentType)[s];
    return desc ? `- ${desc}` : `- ${s}: Extract relevant information for this field`;
  }).join('\n') || '';
  
  const examples: Record<string, string> = {
    pathology: `EXAMPLE OUTPUT for Pathology Report:
{
  "metadata": {"patientName": "Test Patient", "mrn": "12345"},
  "SpecimenInfo": "Colon, sigmoid; biopsy received 01/25/2026",
  "SpecimenInfo_sources": ["Colon, sigmoid biopsy", "Collected: 2026-01-25"],
  "GrossDescription": "Three tan-pink tissue fragments measuring up to 0.3 cm",
  "GrossDescription_sources": ["Three tan-pink tissue fragments measuring up to 0.3 cm"],
  "MicroscopicDescription": "Colonic mucosa with mild chronic inflammation. No dysplasia identified.",
  "MicroscopicDescription_sources": ["Colonic mucosa with mild chronic inflammation", "No dysplasia identified"],
  "Diagnosis": "Benign colonic mucosa; negative for malignancy",
  "Diagnosis_sources": ["Benign colonic mucosa", "negative for malignancy"]
}`,
    
    radiology: `EXAMPLE OUTPUT for Radiology Report:
{
  "metadata": {"patientName": "Test Patient"},
  "ExamType": "CT Abdomen/Pelvis with contrast",
  "ExamType_sources": ["CT Abdomen/Pelvis with contrast"],
  "ClinicalHistory": "Abdominal pain",
  "ClinicalHistory_sources": ["Abdominal pain"],
  "Findings": "Liver, spleen, and pancreas are unremarkable. No free air or fluid. Appendix appears normal.",
  "Findings_sources": ["Liver, spleen, pancreas unremarkable", "No free air or fluid", "Appendix normal"],
  "Impression": "No acute intra-abdominal process identified",
  "Impression_sources": ["No acute intra-abdominal process identified"]
}`,
    
    lab_results: `EXAMPLE OUTPUT for Lab Results:
{
  "metadata": {"patientName": "Test Patient"},
  "TestName": "Complete Blood Count, Basic Metabolic Panel",
  "TestName_sources": ["Complete Blood Count", "Basic Metabolic Panel"],
  "Results": "WBC: 6.1, Hemoglobin: 14.2, Platelets: 245, Sodium: 140, Creatinine: 0.9",
  "Results_sources": ["WBC: 6.1 x10^3/uL", "Hemoglobin: 14.2 g/dL", "Platelets: 245 x10^3/uL", "Sodium: 140 mmol/L", "Creatinine: 0.9 mg/dL"],
  "ReferenceRange": "WBC: 4.0-11.0, Hemoglobin: 13.5-17.5, Platelets: 150-450, Sodium: 135-145, Creatinine: 0.6-1.3",
  "ReferenceRange_sources": ["Ref 4.0–11.0", "Ref 13.5–17.5", "Ref 150–450", "Ref 135–145", "Ref 0.6–1.3"]
}`,
    
    toxicology: `EXAMPLE OUTPUT for Toxicology Report:
{
  "metadata": {"patientName": "Test Patient"},
  "SpecimenInfo": "Urine specimen",
  "SpecimenInfo_sources": ["Specimen: Urine"],
  "Results": "Amphetamines: Negative, Benzodiazepines: Negative, Opioids: Negative, THC: Negative",
  "Results_sources": ["Amphetamines: Negative", "Benzodiazepines: Negative", "Opioids: Negative", "THC: Negative"]
}`,
    
    discharge: `EXAMPLE OUTPUT for Discharge Summary:
{
  "metadata": {"patientName": "Test Patient"},
  "AdmissionDate": "2026-01-01",
  "AdmissionDate_sources": ["Admission Date: 2026-01-01"],
  "DischargeDate": "2026-01-02",
  "DischargeDate_sources": ["Discharge Date: 2026-01-02"],
  "DischargeDiagnosis": "Observation, no acute findings",
  "DischargeDiagnosis_sources": ["Primary Diagnosis: Observation, no acute findings"],
  "HospitalCourse": "Patient was observed overnight. No complications occurred during the hospital stay.",
  "HospitalCourse_sources": ["Patient observed overnight", "No complications"],
  "DischargeMedications": "None",
  "DischargeMedications_sources": ["Discharge Medications: None"],
  "FollowUp": "Primary care follow-up in 1-2 weeks",
  "FollowUp_sources": ["Follow-Up: Primary care in 1–2 weeks"]
}`,
  };
  
  const example = documentType && examples[documentType] ? examples[documentType] : examples.discharge;
  
  return `DOCUMENT TYPE: ${documentType?.toUpperCase() || 'CLINICAL DOCUMENT'}

SECTIONS TO EXTRACT:
${sectionDescriptions}

${example}`;
}

/**
 * Simplified prompt for local models (Ollama/Llama)
 * Local models work better with more concise, direct instructions
 * Now document-type aware for better section extraction
 */
export function getLocalModelPrompt(clinicalText: string, selectedSections?: string[], documentType?: DocumentType): string {
  const sections = selectedSections || ['HPI', 'PhysicalExam', 'Assessment', 'Plan'];
  const sectionKeys = sections.join('", "');
  const sourceKeys = sections.map(s => `${s}_sources`).join('", "');
  
  // Get document-type-specific guidance
  const typeGuidance = getDocumentTypeGuidanceForLocal(documentType, sections);

  return `You are a medical documentation assistant. Extract information from the document and format it as JSON.

${typeGuidance}

CRITICAL RULES:
1. Extract information EXACTLY as it appears in the document
2. Each section should have a "_sources" array with the exact text used
3. If information is not found for a section, use "Not found in document"
4. Return ONLY valid JSON - no other text
5. Include a "metadata" object with patient info if available

REQUIRED JSON STRUCTURE:
{
  "metadata": {"patientName": "...", "dateOfBirth": "...", "mrn": "..."},
  "${sectionKeys}": "extracted content here",
  "${sourceKeys}": ["source quote 1", "source quote 2"]
}

---DOCUMENT---
${clinicalText}
---END---

Return JSON only:`;

DOCUMENTATION STANDARDS:
1. Use COMPLETE SENTENCES (not fragments)
2. Spell out ALL medical abbreviations as full diagnoses
3. NEVER add clinical reasoning not stated in input
4. Include ALL details from input (vitals, meds, symptoms, findings)
5. Mark unclear/illegible items with [illegible] or [partial]

CRITICAL - HANDLING ILLEGIBLE/MISSING CONTENT:
- If input says "???", "[illegible]", "[cannot read]", or similar → Output "Not documented - illegible in source"
- If Assessment is missing/unreadable → DO NOT guess diagnoses, write "Not documented"
- If Plan is missing/unreadable → DO NOT invent treatments, write "Not documented"
- NEVER make up diagnoses like "myocardial infarction" or "appendicitis" unless EXPLICITLY stated
- NEVER add referrals or tests that aren't in the input

REQUIRED ABBREVIATION EXPANSIONS:
Diagnoses (ALWAYS spell out fully):
- DM2, DM → Type 2 diabetes mellitus
- HTN → Hypertension  
- HLD → Hyperlipidemia
- CHF → Congestive heart failure
- COPD → Chronic obstructive pulmonary disease
- CAD → Coronary artery disease
- CKD → Chronic kidney disease
- AFib → Atrial fibrillation
- GERD → Gastroesophageal reflux disease
- OSA → Obstructive sleep apnea

Clinical terms:
- pt → patient, y/o → year-old, hx → history
- c/o → complaining of, s/p → status post
- n/v → nausea and vomiting, SOB → shortness of breath
- abd → abdominal, bilat → bilateral
- prn → as needed, BID → twice daily, TID → three times daily

⚠️ CRITICAL FORMATTING FOR ASSESSMENT AND PLAN:
Each numbered item MUST be on its own line using the newline character (\\n).
DO NOT put all items on one line separated by spaces!

EXAMPLE - Assessment (EACH ITEM ON NEW LINE):
Input: "A: 1. DM2 - suboptimal control 2. HTN - at goal 3. HLD 4. obesity"
❌ WRONG: "1. Type 2 diabetes mellitus. 2. Hypertension at goal." (all on one line!)
✅ CORRECT: "1. Type 2 diabetes mellitus, suboptimally controlled.\\n2. Hypertension, well controlled at goal.\\n3. Hyperlipidemia, on statin therapy.\\n4. Obesity."

EXAMPLE - Plan (EACH ITEM ON NEW LINE):
Input: "P: increase metformin, nutrition referral, f/u 3mo"
❌ WRONG: "1. Increase metformin. 2. Nutrition referral." (all on one line!)
✅ CORRECT: "1. Increase metformin if tolerated.\\n2. Referral to nutrition.\\n3. Follow-up in 3 months."

Remember: Insert \\n (literal backslash-n) between numbered items in JSON strings!

EXAMPLE - Illegible content (DO NOT GUESS):
Input: "A: ??? P: [cannot read]"
WRONG: "Assessment: Chest pain, concerning for myocardial infarction. Plan: Referral to cardiology."
CORRECT: "Assessment: Not documented - illegible in source. Plan: Not documented - illegible in source."
NEVER invent diagnoses or treatments when the source is unreadable!

EXAMPLE OUTPUT FORMAT:
{
  "metadata": {"patientName": "John Doe", "dateOfBirth": "01/15/1970", "mrn": "12345"},
  "ChiefComplaint": "Abdominal pain for two days with nausea and vomiting.",
  "ChiefComplaint_sources": ["abd pain x 2d", "n/v"],
  "HPI": "58-year-old male presents with abdominal pain for two days. The pain started after eating and is associated with nausea and vomiting. He denies fever or chills. No blood in stool noted. Pain worsens with movement. Current medications include lisinopril 10mg and atorvastatin.",
  "HPI_sources": ["58 y/o M", "abd pain x 2d", "started after eating", "n/v", "denies f/c", "no bld in stool", "worse w/ mov", "lisinop___ 10mg", "ator____"],
  "Assessment": "1. Acute abdominal pain, rule out appendicitis versus gastroenteritis.\\n2. Hypertension, on lisinopril.",
  "Assessment_sources": ["r/o appy vs gastroenter____", "lisinop___"],
  "Plan": "1. CT scan of abdomen and pelvis with contrast.\\n2. Intravenous normal saline.\\n3. Nothing by mouth until further evaluation.\\n4. Surgical consultation as needed.",
  "Plan_sources": ["CT abd/pelv w/ contr", "IV NS", "NPO", "surg c/s prn"]
}

REQUIRED JSON KEYS:
- "metadata": object with patient info
- "${sectionKeys}": STRING values (complete sentences, spelled-out diagnoses)
- "${sourceKeys}": arrays of exact quotes from input

---INPUT---
${clinicalText}
---END---

Return professional documentation with full sentences and spelled-out diagnoses:`;
}

/**
 * Example of expected output format (for reference)
 */
/**
 * Example showing COMPREHENSIVE citations for ALL sections
 * Input: "45 yo M c/o cough and fever x 3 days, worsening. productive cough w/ yellow sputum. 
 *         denies CP/SOB. no nausea, no headache. T 100.2 BP 120/80 HR 88 RR 16 SpO2 98% RA. 
 *         Gen: NAD, well-appearing. Lungs: crackles RLL, otherwise clear. Heart: RRR, no murmur. 
 *         Abd: soft, NT, ND. Ext: no edema. Likely acute bronchitis. 
 *         Rx azithromycin 250mg x5 days. Push fluids, rest. F/u 1 week if not improving. 
 *         Return if fever >102 or worsening SOB."
 */
export const EXAMPLE_OUTPUT: SmartSections = {
  ChiefComplaint: "Cough and fever for 3 days, worsening.",
  ChiefComplaint_sources: ["cough and fever x 3 days", "worsening"],  // Symptom + duration + descriptor
  
  HPI: "45-year-old male presents with a 3-day history of worsening cough and fever with productive yellow sputum. Denies chest pain, shortness of breath, nausea, and headache.",
  HPI_sources: [
    "45 yo M",  // Demographics
    "cough and fever x 3 days",  // Symptoms + duration
    "worsening",  // Descriptor
    "productive cough w/ yellow sputum",  // Symptom details
    "denies CP/SOB",  // Negatives
    "no nausea",  // Negative
    "no headache"  // Negative
  ],
  
  ReviewOfSystems: "Respiratory: Positive for productive cough. Cardiovascular: Denies chest pain and shortness of breath. GI: No nausea. Neurological: No headache.",
  ReviewOfSystems_sources: [
    "productive cough",  // Positive
    "denies CP/SOB",  // Negative
    "no nausea",  // Negative
    "no headache"  // Negative
  ],
  
  PhysicalExam: "Vitals: Temperature 100.2°F, BP 120/80, HR 88, RR 16, SpO2 98% on room air. General: No acute distress, well-appearing. Lungs: Crackles in right lower lobe, otherwise clear. Heart: Regular rate and rhythm, no murmur. Abdomen: Soft, non-tender, non-distended. Extremities: No edema.",
  PhysicalExam_sources: [
    "T 100.2", "BP 120/80", "HR 88", "RR 16", "SpO2 98% RA",  // Each vital
    "Gen: NAD", "well-appearing",  // General
    "Lungs: crackles RLL", "otherwise clear",  // Lungs
    "Heart: RRR", "no murmur",  // Heart
    "Abd: soft", "NT", "ND",  // Abdomen
    "Ext: no edema"  // Extremities
  ],
  
  Assessment: "Acute bronchitis, likely bacterial given productive cough with yellow sputum and pulmonary crackles.",
  Assessment_sources: [
    "Likely acute bronchitis",  // Diagnosis from input
    "productive cough w/ yellow sputum",  // Supporting finding
    "crackles RLL"  // Supporting finding
  ],
  
  Plan: "Azithromycin 250mg for 5 days. Push fluids and rest. Follow-up in 1 week if not improving.",
  Plan_sources: [
    "Rx azithromycin 250mg",  // Medication
    "x5 days",  // Duration
    "Push fluids",  // Instruction
    "rest",  // Instruction
    "F/u 1 week",  // Follow-up
    "if not improving"  // Condition
  ],
  
  Disposition: "Return precautions given: return if fever greater than 102°F or worsening shortness of breath.",
  Disposition_sources: [
    "Return if fever >102",  // Return precaution
    "worsening SOB"  // Return precaution
  ]
};
