/**
 * Test script for the de-identification module
 * 
 * Usage: npx ts-node scripts/test-deidentify.ts
 */

// Use dynamic import to handle TypeScript path resolution
const deidentifyModule = require('../lib/deidentify');
const { deidentify, deidentifySync, summarizeRedactions } = deidentifyModule;

const testCases = [
  {
    name: 'Basic patient info',
    input: `Patient Name: John Smith
DOB: 03/15/1985
MRN: 00012345
Phone: (555) 123-4567

Chief Complaint: Chest pain x 2 days`,
  },
  {
    name: 'Full clinical note',
    input: `Patient Metadata
Name: Jane Doe (fictional)
MRN: 00098765
DOB: 01/20/1971 (Age 54)
Sex: Female
Date of Encounter: 12/28/2025
Location: Emergency Department
Provider: Dr. Robert Johnson, MD

Chief Complaint: Shortness of breath

HPI: 54 yo female presents with 3 days of progressive dyspnea. 
She reports associated cough with yellow sputum. Denies chest pain.
Contact: jane.doe@email.com, Cell: 555-987-6543

Vitals: T 101.2, BP 140/90, HR 98, RR 22, SpO2 94% RA

Physical Exam:
Gen: Mild respiratory distress, no acute distress
Lungs: Crackles bilateral bases
Heart: RRR, no murmur

Assessment: Community-acquired pneumonia

Plan:
- Azithromycin 500mg x 5 days
- Return if worsening
- Follow up with PCP Dr. Sarah Williams in 5-7 days

Patient Address: 123 Main Street, Apt 4B, Boston, MA 02101`,
  },
  {
    name: 'SSN and account numbers',
    input: `Patient: Michael Brown
SSN: 123-45-6789
Insurance ID: ABC123456789
Account #: 9876543210

Reason for visit: Annual physical`,
  },
  {
    name: 'Age over 89 (HIPAA requirement)',
    input: `Patient is a 95 year old male with history of CHF.
Also treating his wife, 92 yo female.
Compared to 45 yo son who is healthy.`,
  },
  {
    name: 'Various date formats',
    input: `Date of Service: 12/28/2025
Admission Date: December 25, 2025
Last seen: Jan 15, 2024
Follow-up scheduled for 2025-01-15`,
  },
];

async function runTests() {
  console.log('='.repeat(80));
  console.log('DE-IDENTIFICATION TEST SUITE');
  console.log('='.repeat(80));
  console.log('');

  for (const testCase of testCases) {
    console.log('-'.repeat(80));
    console.log(`TEST: ${testCase.name}`);
    console.log('-'.repeat(80));
    console.log('');
    
    console.log('ORIGINAL TEXT:');
    console.log(testCase.input);
    console.log('');

    // Test sync version first (regex only)
    console.log('--- REGEX-ONLY (sync) ---');
    const syncResult = deidentifySync(testCase.input);
    console.log('De-identified:', summarizeRedactions(syncResult.redactions));
    console.log('');
    console.log('OUTPUT:');
    console.log(syncResult.text);
    console.log('');

    // Test async version (regex + NER)
    console.log('--- REGEX + NER (async) ---');
    try {
      const asyncResult = await deidentify(testCase.input);
      console.log('De-identified:', summarizeRedactions(asyncResult.redactions));
      console.log('');
      console.log('OUTPUT:');
      console.log(asyncResult.text);
      console.log('');
      
      // Show what was redacted
      if (asyncResult.redactions.length > 0) {
        console.log('REDACTIONS:');
        for (const r of asyncResult.redactions) {
          console.log(`  [${r.type}] "${r.original}" → "${r.replacement}"`);
        }
      }
    } catch (error) {
      console.error('NER failed:', error);
      console.log('Falling back to regex-only result');
    }
    
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

runTests().catch(console.error);

