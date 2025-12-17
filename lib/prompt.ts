/**
 * Prompt template for converting clinical text into Epic SmartSection format
 */

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
  ChiefComplaint: string;
  ChiefComplaint_sources?: string[];
  HPI: string;
  HPI_sources?: string[];
  ReviewOfSystems: string;
  ReviewOfSystems_sources?: string[];
  PhysicalExam: string;
  PhysicalExam_sources?: string[];
  Assessment: string;
  Assessment_sources?: string[];
  Plan: string;
  Plan_sources?: string[];
  Disposition: string;
  Disposition_sources?: string[];
}

/**
 * Generates the system prompt for the AI model
 */
export function getSystemPrompt(selectedSections?: string[]): string {
  const sections = selectedSections || ['HPI', 'PhysicalExam', 'Assessment', 'Plan'];

  const sectionDescriptions: Record<string, string> = {
    ChiefComplaint: "ChiefComplaint: The main reason for the patient's visit in one concise sentence",
    HPI: "HPI (History of Present Illness): Patient's symptoms, timeline, and relevant history as a single paragraph",
    ReviewOfSystems: "ReviewOfSystems: A systematic review of body systems - list each system reviewed with positive and pertinent negative findings (constitutional, HEENT, cardiovascular, respiratory, GI, GU, musculoskeletal, skin, neurological, psychiatric)",
    PhysicalExam: "PhysicalExam: Vital signs and physical examination findings as a single paragraph (combine all findings)",
    Assessment: "Assessment: Diagnosis or clinical impression as a single paragraph",
    Plan: "Plan: Treatment plan, prescriptions, follow-up instructions as a single paragraph",
    Disposition: "Disposition: Discharge status, follow-up instructions, and return precautions/warning signs"
  };

  const requestedGuidelines = sections
    .map(section => `- ${sectionDescriptions[section]}`)
    .join('\n');

  const exampleKeys = sections.join(', ');

  const sourceKeys = sections.map(s => `${s}_sources`).join(', ');

  return `You are a medical scribe assistant. Your task is to structure clinical notes into Epic SmartSections and extract fax/referral metadata.

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
