/**
 * Test the document classifier with the fake clinical documents samples
 * 
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-sample-documents.ts
 */

import { classifyDocument, getDocumentTypeLabel, getDocumentTypeIcon, DocumentType } from '../lib/documentClassifier';
import { getSectionsForDocumentType } from '../lib/prompt';

// Sample documents from fake_clinical_documents_SAMPLE folder
const SAMPLE_DOCUMENTS = [
  {
    name: 'Discharge_Summary_SAMPLE.pdf',
    expectedType: 'discharge' as DocumentType,
    text: `SAMPLE / FAKE
Hospital Discharge Summary (SAMPLE)
Admission Date: 2026-01-01 Discharge Date: 2026-01-02
Primary Diagnosis: Observation, no acute findings (test)
Hospital Course: Patient observed overnight. No complications.
Discharge Medications: None.
Follow-Up: Primary care in 1–2 weeks (test).
NOTE: This document is fictional and for software testing only.`,
  },
  {
    name: 'Laboratory_Results_SAMPLE.pdf',
    expectedType: 'lab_results' as DocumentType,
    text: `SAMPLE / FAKE
Laboratory Results (SAMPLE)
Complete Blood Count
WBC: 6.1 x10^3/uL (Ref 4.0–11.0)
Hemoglobin: 14.2 g/dL (Ref 13.5–17.5)
Platelets: 245 x10^3/uL (Ref 150–450)
Basic Metabolic Panel
Sodium: 140 mmol/L (Ref 135–145)
Creatinine: 0.9 mg/dL (Ref 0.6–1.3)
NOTE: This document is fictional and for software testing only.`,
  },
  {
    name: 'Pathology_Report_SAMPLE.pdf',
    expectedType: 'pathology' as DocumentType,
    text: `SAMPLE / FAKE
Anatomic Pathology Report (SAMPLE)
Patient: Test, John (FAKE) DOB: 1970-01-01 MRN: 000000
Specimen: Colon, sigmoid biopsy Collected: 2026-01-25
Gross Description: Three tan-pink tissue fragments measuring up to 0.3 cm.
Microscopic Description: Colonic mucosa with mild chronic inflammation. No dysplasia identified.
Final Diagnosis: Benign colonic mucosa; negative for malignancy.
NOTE: This document is fictional and for software testing only.`,
  },
  {
    name: 'Radiology_Report_SAMPLE.pdf',
    expectedType: 'radiology' as DocumentType,
    text: `SAMPLE / FAKE
Radiology Report (SAMPLE)
Exam: CT Abdomen/Pelvis with contrast
Indication: Abdominal pain (test data)
Findings: Liver, spleen, pancreas unremarkable. No free air or fluid. Appendix normal.
Impression: No acute intra-abdominal process identified.
NOTE: This document is fictional and for software testing only.`,
  },
  {
    name: 'Toxicology_Report_SAMPLE.pdf',
    expectedType: 'toxicology' as DocumentType,
    text: `SAMPLE / FAKE
Toxicology Screen (SAMPLE)
Specimen: Urine
Results:
Amphetamines: Negative
Benzodiazepines: Negative
Opioids: Negative
THC: Negative
NOTE: This document is fictional and for software testing only.`,
  },
];

// Run classification tests
console.log('='.repeat(80));
console.log('SAMPLE DOCUMENT CLASSIFICATION TEST');
console.log('Testing documents from fake_clinical_documents_SAMPLE folder');
console.log('='.repeat(80));
console.log('');

let passed = 0;
let failed = 0;

for (const doc of SAMPLE_DOCUMENTS) {
  const result = classifyDocument(doc.text);
  const isCorrect = result.type === doc.expectedType;
  
  if (isCorrect) {
    passed++;
    console.log(`✅ PASS: ${doc.name}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${doc.name}`);
    console.log(`   Expected: ${doc.expectedType} (${getDocumentTypeLabel(doc.expectedType)})`);
    console.log(`   Got:      ${result.type} (${getDocumentTypeLabel(result.type)})`);
  }
  
  console.log(`   ${getDocumentTypeIcon(result.type)} ${getDocumentTypeLabel(result.type)}`);
  console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  if (result.subtype) {
    console.log(`   Subtype: ${result.subtype}`);
  }
  console.log(`   Keywords found: ${result.detectedKeywords.slice(0, 5).join(', ')}`);
  
  // Show what sections would be extracted
  const sections = getSectionsForDocumentType(result.type);
  console.log(`   Sections to extract: ${sections.join(', ')}`);
  console.log('');
}

console.log('='.repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${SAMPLE_DOCUMENTS.length} tests`);
console.log('='.repeat(80));

if (failed > 0) {
  process.exit(1);
}
