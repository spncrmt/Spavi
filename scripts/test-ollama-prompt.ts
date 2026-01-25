/**
 * Test script to iterate on Ollama prompt with difficult fax input
 * Usage: npx ts-node scripts/test-ollama-prompt.ts
 */

function getLocalModelPrompt(clinicalText: string, selectedSections: string[]): string {
  const sectionKeys = selectedSections.join('", "');
  const sourceKeys = selectedSections.map(s => `${s}_sources`).join('", "');

  return `You are a medical scribe creating professional Epic SmartPhrase documentation.

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

// 50th percentile - test line-separated list format
const TEST_FAX = `FAMILY MEDICINE CLINIC
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
Family Medicine`;

// What we WANT to see (LINE-SEPARATED LISTS)
const EXPECTED_OUTPUT = `
EXPECTED OUTPUT (LINE-SEPARATED LISTS):

Assessment should be (with \\n between items):
"1. Type 2 diabetes mellitus, suboptimally controlled.
2. Hypertension, well controlled at goal.
3. Hyperlipidemia, on statin therapy.
4. Obesity."

Plan should be (with \\n between items):
"1. Increase metformin if tolerated.
2. Referral to nutrition for dietary counseling.
3. Encourage exercise, goal 150 minutes per week.
4. Recheck hemoglobin A1c in 3 months.
5. Annual diabetic eye exam ordered.
6. Return to clinic in 3 months."
`;

async function testOllamaPrompt() {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1';
  
  const sections = ['ChiefComplaint', 'HPI', 'ReviewOfSystems', 'PhysicalExam', 'Assessment', 'Plan', 'Disposition'];
  const prompt = getLocalModelPrompt(TEST_FAX, sections);
  
  console.log('='.repeat(80));
  console.log('TESTING OLLAMA PROMPT');
  console.log('='.repeat(80));
  console.log('\n📄 INPUT FAX (difficult quality):');
  console.log('-'.repeat(40));
  console.log(TEST_FAX);
  console.log('-'.repeat(40));
  
  console.log('\n🎯 EXPECTED OUTPUT (what we want):');
  console.log(EXPECTED_OUTPUT);
  
  console.log('\n⏳ Calling Ollama...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
          num_predict: 4096,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Response received in ${elapsed}s\n`);
    console.log('='.repeat(80));
    console.log('🤖 ACTUAL OLLAMA OUTPUT:');
    console.log('='.repeat(80));
    
    // Parse and pretty-print the JSON
    try {
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Print each section for easy review
        console.log('\n📋 METADATA:');
        console.log(JSON.stringify(parsed.metadata, null, 2));
        
        for (const section of sections) {
          console.log(`\n📌 ${section}:`);
          console.log(parsed[section] || 'Not returned');
          
          const sources = parsed[`${section}_sources`];
          if (sources && sources.length > 0) {
            console.log(`   Sources: ${JSON.stringify(sources)}`);
          }
        }
        
        // Check for potential hallucinations
        console.log('\n' + '='.repeat(80));
        console.log('🔍 HALLUCINATION CHECK:');
        console.log('='.repeat(80));
        
        const hallucinations: string[] = [];
        const assessmentText = Array.isArray(parsed.Assessment) ? parsed.Assessment.join(' ') : (parsed.Assessment || '');
        const planText = Array.isArray(parsed.Plan) ? parsed.Plan.join(' ') : (parsed.Plan || '');
        
        // Check for CRITICAL hallucinations (invented diagnoses/treatments)
        const criticalHallucinations = [
          { pattern: /myocardial infarction|heart attack|MI\b/i, desc: '❌ HALLUCINATED: "myocardial infarction" (not in input!)' },
          { pattern: /angina/i, desc: '❌ HALLUCINATED: "angina" (not in input!)' },
          { pattern: /cardiology|cardiologist/i, desc: '❌ HALLUCINATED: "cardiology referral" (not in input!)' },
          { pattern: /EKG|ECG|electrocardiogram/i, desc: '❌ HALLUCINATED: "EKG/ECG" (not in input!)' },
          { pattern: /troponin/i, desc: '❌ HALLUCINATED: "troponin" (not in input!)' },
          { pattern: /aspirin|nitroglycerin/i, desc: '❌ HALLUCINATED: medication (not in input!)' },
          { pattern: /emergency|urgent/i, desc: '❌ HALLUCINATED: urgency level (not in input!)' },
        ];
        
        for (const { pattern, desc } of criticalHallucinations) {
          if (pattern.test(assessmentText) || pattern.test(planText)) {
            hallucinations.push(desc);
          }
        }
        
        // Check for common hallucination patterns
        const hallucinationPatterns = [
          { pattern: /to evaluate for/i, desc: 'Added "to evaluate for..."' },
          { pattern: /to rule out/i, desc: 'Added "to rule out..."' },
          { pattern: /concerning for/i, desc: 'Added "concerning for..."' },
          { pattern: /to maintain/i, desc: 'Added "to maintain..."' },
          { pattern: /to prevent/i, desc: 'Added "to prevent..."' },
        ];
        
        const fullText = JSON.stringify(parsed);
        for (const { pattern, desc } of hallucinationPatterns) {
          if (pattern.test(fullText)) {
            hallucinations.push(desc);
          }
        }
        
        if (hallucinations.length === 0) {
          console.log('✅ No obvious hallucination patterns detected!');
        } else {
          console.log('⚠️  Potential hallucinations found:');
          hallucinations.forEach(h => console.log(`   - ${h}`));
        }
        
        // Get only section content (not sources) for abbreviation checking
        const sectionContent = [
          parsed.ChiefComplaint,
          parsed.HPI,
          parsed.ReviewOfSystems,
          parsed.PhysicalExam,
          parsed.Assessment,
          parsed.Plan,
          parsed.Disposition
        ].filter(s => s).map(s => Array.isArray(s) ? s.join(' ') : s).join(' ');
        
        // Check for remaining abbreviations that should have been expanded
        console.log('\n⚠️ ABBREVIATION CHECK IN SECTIONS (should NOT appear):');
        const badAbbreviations = [
          { check: /\bDM2\b/i, desc: 'DM2 (should be "Type 2 diabetes mellitus")' },
          { check: /\bHTN\b/i, desc: 'HTN (should be "Hypertension")' },
          { check: /\bHLD\b/i, desc: 'HLD (should be "Hyperlipidemia")' },
          { check: /\bTID\b/i, desc: 'TID (should be "three times daily")' },
          { check: /\bBID\b/i, desc: 'BID (should be "twice daily")' },
          { check: /\bRTC\b/i, desc: 'RTC (should be "Return to clinic")' },
          { check: /\bSOB\b/i, desc: 'SOB (should be "shortness of breath")' },
          { check: /\bNAD\b/i, desc: 'NAD (should be "no acute distress")' },
        ];
        
        let badFound = 0;
        for (const { check, desc } of badAbbreviations) {
          const found = check.test(sectionContent);
          if (found) {
            console.log(`   ❌ Found: ${desc}`);
            badFound++;
          }
        }
        if (badFound === 0) {
          console.log('   ✅ All abbreviations properly expanded in sections!');
        }
        
        // Check for good expansions
        console.log('\n📊 EXPANSION SUCCESS CHECK:');
        const expectedInfo = [
          { check: /type\s*2\s*diabetes|diabetes\s*mellitus/i, desc: 'DM2 → "Type 2 diabetes mellitus"' },
          { check: /hypertension/i, desc: 'HTN → "Hypertension"' },
          { check: /hyperlipidemia/i, desc: 'HLD → "Hyperlipidemia"' },
          { check: /three\s*times\s*daily/i, desc: 'TID → "three times daily"' },
          { check: /hemoglobin\s*A1c|A1c/i, desc: 'A1c properly referenced' },
          { check: /nutrition|diet/i, desc: 'Nutrition referral' },
          { check: /150\s*min|exercise/i, desc: 'Exercise recommendation' },
          { check: /three\s*month|3\s*month/i, desc: 'Follow-up timing' },
          { check: /eye\s*exam/i, desc: 'Diabetic eye exam' },
        ];
        
        let captured = 0;
        for (const { check, desc } of expectedInfo) {
          const found = check.test(fullText);
          console.log(`   ${found ? '✅' : '❌'} ${desc}`);
          if (found) captured++;
        }
        console.log(`\n   Score: ${captured}/${expectedInfo.length} key items captured`);
        
      } else {
        console.log('❌ Could not parse JSON from response');
        console.log('Raw response:', data.response);
      }
    } catch (parseError) {
      console.log('❌ JSON parse error:', parseError);
      console.log('Raw response:', data.response);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testOllamaPrompt();

