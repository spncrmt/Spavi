/**
 * Submit sample documents through the manual upload API
 * Tests the full pipeline: OCR → Classification → AI Processing
 * 
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/submit-sample-documents.ts
 */

const SAMPLE_DOCUMENTS = [
  {
    name: 'Discharge Summary',
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
    name: 'Laboratory Results',
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
    name: 'Pathology Report',
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
    name: 'Radiology Report',
    text: `SAMPLE / FAKE
Radiology Report (SAMPLE)
Exam: CT Abdomen/Pelvis with contrast
Indication: Abdominal pain (test data)
Findings: Liver, spleen, pancreas unremarkable. No free air or fluid. Appendix normal.
Impression: No acute intra-abdominal process identified.
NOTE: This document is fictional and for software testing only.`,
  },
  {
    name: 'Toxicology Report',
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

const API_BASE = 'http://localhost:3000';

async function submitDocument(doc: { name: string; text: string }) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 Submitting: ${doc.name}`);
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${API_BASE}/api/faxes/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: doc.text,
        fromNumber: '+1-555-TEST-' + doc.name.replace(/\s/g, '').substring(0, 4).toUpperCase(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`❌ Error: ${data.error || response.statusText}`);
      return null;
    }

    console.log(`✅ Created fax ID: ${data.id}`);
    console.log(`   Status: ${data.status}`);
    if (data.documentType) {
      console.log(`   Document Type: ${data.documentType}`);
    }
    
    // Poll for completion
    console.log(`   Waiting for processing...`);
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts += 2;
      
      const statusResponse = await fetch(`${API_BASE}/api/faxes/${data.id}`);
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed') {
        console.log(`\n   ✅ Processing complete!`);
        console.log(`   📋 Document Type: ${statusData.documentType || 'unknown'}`);
        console.log(`   🎯 Confidence: ${statusData.confidence ? (statusData.confidence * 100).toFixed(0) + '%' : 'N/A'}`);
        
        if (statusData.sections) {
          console.log(`\n   Generated Sections:`);
          const sections = typeof statusData.sections === 'string' 
            ? JSON.parse(statusData.sections) 
            : statusData.sections;
          
          for (const [key, value] of Object.entries(sections)) {
            if (value) {
              const preview = String(value).substring(0, 80).replace(/\n/g, ' ');
              console.log(`   • ${key}: ${preview}${String(value).length > 80 ? '...' : ''}`);
            }
          }
        }
        return statusData;
      } else if (statusData.status === 'failed') {
        console.log(`   ❌ Processing failed: ${statusData.errorMessage || 'Unknown error'}`);
        return statusData;
      } else {
        process.stdout.write('.');
      }
    }
    
    console.log(`\n   ⏱️ Timed out waiting for processing`);
    return null;
    
  } catch (error) {
    console.log(`❌ Network error: ${error}`);
    return null;
  }
}

async function main() {
  console.log('🏥 SPAVI - Sample Document Submission Test');
  console.log('==========================================');
  console.log(`Server: ${API_BASE}`);
  console.log(`Documents to submit: ${SAMPLE_DOCUMENTS.length}`);
  
  // Check server is running
  try {
    const healthCheck = await fetch(`${API_BASE}/api/faxes`);
    if (!healthCheck.ok) {
      console.log('\n❌ Server not responding. Make sure the dev server is running.');
      process.exit(1);
    }
  } catch (e) {
    console.log('\n❌ Cannot connect to server. Run: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  const results = [];
  for (const doc of SAMPLE_DOCUMENTS) {
    const result = await submitDocument(doc);
    results.push({ name: doc.name, result });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  for (const { name, result } of results) {
    if (result?.status === 'completed') {
      console.log(`✅ ${name}: ${result.documentType} (${result.confidence ? (result.confidence * 100).toFixed(0) + '%' : 'N/A'})`);
    } else if (result?.status === 'failed') {
      console.log(`❌ ${name}: Failed - ${result.errorMessage}`);
    } else {
      console.log(`⚠️ ${name}: Unknown status`);
    }
  }
  
  console.log('\n🔗 View results at: http://localhost:3000/dashboard');
}

main().catch(console.error);
