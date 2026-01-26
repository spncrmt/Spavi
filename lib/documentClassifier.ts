/**
 * Document Classification Module
 * 
 * Automatically detects the type of medical document from extracted text.
 * Uses keyword patterns, structural analysis, and AI classification.
 */

// ============================================================================
// Types
// ============================================================================

export type DocumentType = 
  | 'pathology'      // Anatomic, surgical, cytology, cancer staging
  | 'radiology'      // Imaging studies, X-rays, CT, MRI, ultrasound
  | 'consultation'   // Specialist referral/consultation reports
  | 'lab_results'    // Laboratory test results
  | 'toxicology'     // Drug screens, substance testing
  | 'discharge'      // Hospital discharge summaries
  | 'operative'      // Surgical/procedure reports
  | 'ed_note'        // Emergency department notes
  | 'progress_note'  // Daily progress notes
  | 'h_and_p'        // History and Physical
  | 'clinical_note'; // General clinical notes (default)

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;        // 0-1 score
  subtype?: string;          // More specific classification
  detectedKeywords: string[]; // Keywords that triggered classification
  suggestedSections: string[]; // Recommended sections to extract
}

// ============================================================================
// Classification Patterns
// ============================================================================

interface DocumentPattern {
  type: DocumentType;
  subtype?: string;
  // Keywords that strongly indicate this document type
  strongKeywords: string[];
  // Keywords that somewhat indicate this document type
  weakKeywords: string[];
  // Structural patterns (regex) that indicate this document type
  structuralPatterns: RegExp[];
  // Sections typically found in this document type
  expectedSections: string[];
  // Weight multiplier for this pattern
  weight: number;
}

const DOCUMENT_PATTERNS: DocumentPattern[] = [
  // -------------------------------------------------------------------------
  // Pathology Reports
  // -------------------------------------------------------------------------
  {
    type: 'pathology',
    subtype: 'surgical_pathology',
    strongKeywords: [
      'pathology report', 'surgical pathology', 'anatomic pathology',
      'gross description', 'microscopic description', 'microscopic examination',
      'specimen received', 'specimen submitted', 'histologic',
      'biopsy', 'excision', 'resection', 'tissue diagnosis',
      'frozen section', 'permanent section', 'immunohistochemistry',
      'tumor staging', 'tnm staging', 'cancer staging',
      'malignant', 'benign', 'carcinoma', 'adenocarcinoma', 'melanoma',
      'lymphoma', 'sarcoma', 'neoplasm', 'dysplasia', 'metastatic',
      'margins positive', 'margins negative', 'surgical margins',
      'lymph node', 'sentinel node', 'accession number',
    ],
    weakKeywords: [
      'specimen', 'tissue', 'cells', 'pathologist', 'diagnosis',
      'grade', 'stage', 'differentiated', 'invasive',
    ],
    structuralPatterns: [
      /gross\s*(?:description|examination)/i,
      /microscopic\s*(?:description|examination|findings)/i,
      /final\s*(?:diagnosis|pathologic\s*diagnosis)/i,
      /specimen\s*(?:a|b|c|1|2|3)[:\s]/i,
      /accession\s*(?:#|number|no)/i,
      /tnm[:\s]*t\d/i,
    ],
    expectedSections: [
      'SpecimenInfo', 'GrossDescription', 'MicroscopicDescription',
      'Diagnosis', 'TNMStaging', 'SynopticReport', 'Comments'
    ],
    weight: 1.2,
  },
  {
    type: 'pathology',
    subtype: 'cytology',
    strongKeywords: [
      'cytology', 'cytopathology', 'pap smear', 'fine needle aspiration',
      'fna', 'cervical cytology', 'bethesda', 'atypical cells',
      'ascus', 'lsil', 'hsil', 'agc', 'asc-h',
    ],
    weakKeywords: [
      'smear', 'aspirate', 'cells', 'cytologic',
    ],
    structuralPatterns: [
      /cytology\s*report/i,
      /bethesda\s*(?:classification|category)/i,
      /adequacy[:\s]/i,
    ],
    expectedSections: [
      'SpecimenInfo', 'Adequacy', 'Interpretation', 'Diagnosis', 'Recommendations'
    ],
    weight: 1.1,
  },

  // -------------------------------------------------------------------------
  // Radiology Reports
  // -------------------------------------------------------------------------
  {
    type: 'radiology',
    subtype: 'imaging',
    strongKeywords: [
      'radiology report', 'imaging report', 'radiologist',
      'x-ray', 'xray', 'radiograph', 'ct scan', 'ct examination',
      'mri', 'magnetic resonance', 'ultrasound', 'sonography',
      'pet scan', 'nuclear medicine', 'mammogram', 'mammography',
      'fluoroscopy', 'angiography', 'arteriography',
      'impression:', 'findings:', 'technique:', 'comparison:',
      'no acute', 'unremarkable', 'within normal limits',
      'contrast', 'iv contrast', 'oral contrast',
      'hounsfield', 'attenuation', 'signal intensity',
      'enhancement', 'lesion', 'mass', 'nodule', 'opacity',
      'consolidation', 'effusion', 'pneumothorax',
    ],
    weakKeywords: [
      'scan', 'imaging', 'study', 'examination', 'views',
      'films', 'images', 'slices', 'sequences',
    ],
    structuralPatterns: [
      /(?:clinical\s*)?(?:history|indication)[:\s]/i,
      /comparison[:\s]/i,
      /technique[:\s]/i,
      /findings[:\s]/i,
      /impression[:\s]/i,
      /recommendation[s]?[:\s]/i,
      /(?:ct|mri|x-?ray|us|ultrasound)\s+(?:of\s+)?(?:the\s+)?(?:chest|abdomen|head|brain|spine|pelvis|extremity)/i,
    ],
    expectedSections: [
      'ExamType', 'ClinicalHistory', 'Comparison', 'Technique',
      'Findings', 'Impression', 'Recommendations'
    ],
    weight: 1.2,
  },

  // -------------------------------------------------------------------------
  // Consultation Reports
  // -------------------------------------------------------------------------
  {
    type: 'consultation',
    strongKeywords: [
      'consultation', 'consult report', 'consultation note',
      'reason for consultation', 'consult request',
      'thank you for this consultation', 'thank you for referring',
      'consulted for', 'asked to see', 'requested to evaluate',
      'recommendations:', 'my recommendations',
      'i had the pleasure', 'we had the pleasure',
      'please feel free to contact', 'happy to discuss',
    ],
    weakKeywords: [
      'referral', 'referred by', 'referring physician',
      'opinion', 'evaluation', 'assessment',
    ],
    structuralPatterns: [
      /reason\s*for\s*consult(?:ation)?[:\s]/i,
      /consult(?:ation)?\s*(?:request|note|report)/i,
      /thank\s*you\s*for\s*(?:this\s*)?(?:consult|referr)/i,
      /recommendations?\s*(?:to\s*(?:referring|primary))?[:\s]/i,
    ],
    expectedSections: [
      'ReasonForConsult', 'HPI', 'ReviewOfSystems', 'PhysicalExam',
      'Assessment', 'Recommendations'
    ],
    weight: 1.1,
  },

  // -------------------------------------------------------------------------
  // Laboratory Results
  // -------------------------------------------------------------------------
  {
    type: 'lab_results',
    strongKeywords: [
      'laboratory report', 'lab results', 'lab report',
      'reference range', 'ref range', 'normal range',
      'specimen type', 'collection date', 'received date',
      'cbc', 'complete blood count', 'bmp', 'cmp',
      'hemoglobin', 'hematocrit', 'wbc', 'platelet',
      'glucose', 'creatinine', 'bun', 'sodium', 'potassium',
      'alt', 'ast', 'alkaline phosphatase', 'bilirubin',
      'tsh', 'hba1c', 'lipid panel', 'cholesterol',
      'urinalysis', 'culture', 'sensitivity',
      'high', 'low', 'critical', 'abnormal', 'flag',
    ],
    weakKeywords: [
      'result', 'value', 'units', 'range', 'test',
    ],
    structuralPatterns: [
      /(?:reference|ref|normal)\s*range/i,
      /\d+\.?\d*\s*(?:mg\/dl|g\/dl|mmol\/l|u\/l|ng\/ml|%|cells\/mcl)/i,
      /(?:h|l|high|low|critical)\s*$/im,
      /collection\s*(?:date|time)/i,
      /specimen\s*(?:type|source)/i,
    ],
    expectedSections: [
      'TestName', 'Results', 'ReferenceRange', 'Flags', 'Comments'
    ],
    weight: 1.0,
  },

  // -------------------------------------------------------------------------
  // Toxicology Reports
  // -------------------------------------------------------------------------
  {
    type: 'toxicology',
    strongKeywords: [
      'toxicology', 'drug screen', 'urine drug screen', 'uds',
      'substance abuse', 'drug panel', 'drug test',
      'amphetamine', 'benzodiazepine', 'cocaine', 'marijuana',
      'thc', 'opioid', 'opiate', 'methadone', 'fentanyl',
      'barbiturate', 'pcp', 'phencyclidine',
      'positive', 'negative', 'presumptive positive',
      'confirmation', 'gc/ms', 'lc/ms', 'immunoassay',
      'cutoff', 'ng/ml', 'chain of custody',
    ],
    weakKeywords: [
      'screen', 'panel', 'detected', 'not detected',
    ],
    structuralPatterns: [
      /drug\s*screen/i,
      /toxicology\s*(?:report|panel|screen)/i,
      /(?:positive|negative)\s*for/i,
      /cutoff[:\s]*\d+\s*ng\/ml/i,
      /chain\s*of\s*custody/i,
    ],
    expectedSections: [
      'SpecimenInfo', 'DrugPanel', 'Results', 'Confirmation', 'Comments'
    ],
    weight: 1.1,
  },

  // -------------------------------------------------------------------------
  // Discharge Summary
  // -------------------------------------------------------------------------
  {
    type: 'discharge',
    strongKeywords: [
      'discharge summary', 'hospital discharge', 'discharge instructions',
      'admission date', 'discharge date', 'length of stay',
      'hospital course', 'inpatient course',
      'discharge diagnosis', 'discharge medications',
      'discharge disposition', 'discharged to', 'discharged home',
      'follow up appointments', 'follow-up instructions',
      'activity restrictions', 'diet instructions',
      'return precautions', 'warning signs',
    ],
    weakKeywords: [
      'admitted', 'discharged', 'hospitalized', 'inpatient',
    ],
    structuralPatterns: [
      /discharge\s*summary/i,
      /admission\s*date[:\s]/i,
      /discharge\s*date[:\s]/i,
      /hospital\s*course[:\s]/i,
      /discharge\s*(?:diagnosis|diagnoses|medications|instructions)/i,
      /discharged\s*(?:to|home|in)/i,
    ],
    expectedSections: [
      'AdmissionDate', 'DischargeDate', 'AdmittingDiagnosis',
      'DischargeDiagnosis', 'HospitalCourse', 'DischargeMedications',
      'DischargeInstructions', 'FollowUp'
    ],
    weight: 1.2,
  },

  // -------------------------------------------------------------------------
  // Operative Report
  // -------------------------------------------------------------------------
  {
    type: 'operative',
    strongKeywords: [
      'operative report', 'operation report', 'surgical report',
      'procedure performed', 'operation performed',
      'preoperative diagnosis', 'postoperative diagnosis',
      'surgeon', 'assistant surgeon', 'anesthesia', 'anesthesiologist',
      'procedure in detail', 'operative findings',
      'estimated blood loss', 'ebl', 'specimens',
      'complications', 'none', 'sponge count', 'instrument count',
      'patient tolerated', 'stable condition',
      'incision', 'dissection', 'retraction', 'hemostasis',
      'closure', 'sutures', 'staples', 'dressing',
    ],
    weakKeywords: [
      'surgery', 'procedure', 'operating room', 'or',
    ],
    structuralPatterns: [
      /operative\s*report/i,
      /pre-?operative\s*diagnosis/i,
      /post-?operative\s*diagnosis/i,
      /procedure(?:\s*performed)?[:\s]/i,
      /surgeon[:\s]/i,
      /anesthesia[:\s]/i,
      /operative\s*findings[:\s]/i,
      /estimated\s*blood\s*loss/i,
    ],
    expectedSections: [
      'PreoperativeDiagnosis', 'PostoperativeDiagnosis', 'Procedure',
      'Surgeon', 'Anesthesia', 'Findings', 'Technique',
      'EstimatedBloodLoss', 'Complications', 'Disposition'
    ],
    weight: 1.2,
  },

  // -------------------------------------------------------------------------
  // Emergency Department Note
  // -------------------------------------------------------------------------
  {
    type: 'ed_note',
    strongKeywords: [
      'emergency department', 'emergency room', 'ed note', 'er note',
      'chief complaint', 'triage', 'esi level', 'acuity',
      'mode of arrival', 'ambulance', 'ems', 'walk-in',
      'medical decision making', 'mdm',
      'disposition', 'admitted', 'discharged',
      'return precautions', 'ed course',
    ],
    weakKeywords: [
      'emergency', 'acute', 'urgent', 'presenting',
    ],
    structuralPatterns: [
      /emergency\s*(?:department|room)/i,
      /(?:ed|er)\s*(?:note|visit|course)/i,
      /chief\s*complaint[:\s]/i,
      /(?:esi|acuity)\s*(?:level)?[:\s]*\d/i,
      /medical\s*decision\s*making/i,
      /disposition[:\s]/i,
    ],
    expectedSections: [
      'ChiefComplaint', 'HPI', 'ReviewOfSystems', 'PhysicalExam',
      'MDM', 'Assessment', 'Plan', 'Disposition'
    ],
    weight: 1.1,
  },

  // -------------------------------------------------------------------------
  // Progress Note
  // -------------------------------------------------------------------------
  {
    type: 'progress_note',
    strongKeywords: [
      'progress note', 'daily note', 'inpatient note',
      'hospital day', 'pod', 'post-op day',
      'overnight events', 'interval history',
      'current medications', 'current labs',
      'plan for today', 'goals for today',
    ],
    weakKeywords: [
      'continues', 'stable', 'improving', 'unchanged',
    ],
    structuralPatterns: [
      /progress\s*note/i,
      /hospital\s*day\s*#?\d+/i,
      /(?:pod|post-?op(?:erative)?\s*day)\s*#?\d+/i,
      /overnight\s*(?:events|course)/i,
      /interval\s*(?:history|events)/i,
    ],
    expectedSections: [
      'IntervalHistory', 'CurrentMedications', 'Labs', 'Vitals',
      'PhysicalExam', 'Assessment', 'Plan'
    ],
    weight: 1.0,
  },

  // -------------------------------------------------------------------------
  // History and Physical
  // -------------------------------------------------------------------------
  {
    type: 'h_and_p',
    strongKeywords: [
      'history and physical', 'h&p', 'h and p', 'admission h&p',
      'past medical history', 'pmh', 'past surgical history', 'psh',
      'family history', 'social history',
      'medications', 'allergies', 'nkda',
      'review of systems', 'ros', 'physical examination',
      'general appearance', 'heent', 'cardiovascular', 'pulmonary',
      'assessment and plan', 'impression and plan',
    ],
    weakKeywords: [
      'history', 'physical', 'exam', 'examination',
    ],
    structuralPatterns: [
      /history\s*(?:and|&)\s*physical/i,
      /(?:h\s*&\s*p|h\s*and\s*p)/i,
      /past\s*medical\s*history/i,
      /past\s*surgical\s*history/i,
      /family\s*history/i,
      /social\s*history/i,
      /review\s*of\s*systems/i,
      /physical\s*exam(?:ination)?/i,
    ],
    expectedSections: [
      'ChiefComplaint', 'HPI', 'PMH', 'PSH', 'FamilyHistory',
      'SocialHistory', 'Medications', 'Allergies', 'ReviewOfSystems',
      'PhysicalExam', 'Assessment', 'Plan'
    ],
    weight: 1.0,
  },

  // -------------------------------------------------------------------------
  // General Clinical Note (default/fallback)
  // -------------------------------------------------------------------------
  {
    type: 'clinical_note',
    strongKeywords: [
      'chief complaint', 'hpi', 'history of present illness',
      'assessment', 'plan', 'physical exam',
      'patient presents', 'denies', 'lungs clear',
      'vital signs', 'temp', 'bp ', 'hr ', 'rr ',
      'acute bronchitis', 'viral', 'bacterial',
      'return if', 'follow up', 'increase fluids',
    ],
    weakKeywords: [
      'patient', 'presents', 'reports', 'examination',
      'unremarkable', 'otherwise', 'cough', 'fever',
    ],
    structuralPatterns: [
      /chief\s*complaint/i,
      /(?:hpi|history\s*of\s*present\s*illness)/i,
      /assessment\s*(?:and|&)?\s*plan/i,
      /patient\s+presents\s+with/i,
      /return\s+if\s+(?:symptoms|fever|wors)/i,
    ],
    expectedSections: [
      'ChiefComplaint', 'HPI', 'ReviewOfSystems', 'PhysicalExam',
      'Assessment', 'Plan', 'Disposition'
    ],
    weight: 1.0, // Same weight as others
  },
];

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classify a document based on its text content
 */
export function classifyDocument(text: string): ClassificationResult {
  if (!text || text.trim().length === 0) {
    return {
      type: 'clinical_note',
      confidence: 0,
      detectedKeywords: [],
      suggestedSections: ['ChiefComplaint', 'HPI', 'Assessment', 'Plan'],
    };
  }

  const normalizedText = text.toLowerCase();
  const scores: Map<string, { score: number; keywords: string[]; pattern: DocumentPattern }> = new Map();

  // Score each pattern
  for (const pattern of DOCUMENT_PATTERNS) {
    const key = pattern.subtype ? `${pattern.type}:${pattern.subtype}` : pattern.type;
    let score = 0;
    const matchedKeywords: string[] = [];

    // Check strong keywords (3 points each)
    for (const keyword of pattern.strongKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score += 3;
        matchedKeywords.push(keyword);
      }
    }

    // Check weak keywords (1 point each)
    for (const keyword of pattern.weakKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }

    // Check structural patterns (5 points each)
    for (const regex of pattern.structuralPatterns) {
      if (regex.test(text)) {
        score += 5;
        // Extract the matched text for context
        const match = text.match(regex);
        if (match) {
          matchedKeywords.push(`[pattern: ${match[0].substring(0, 30)}...]`);
        }
      }
    }

    // Apply weight multiplier
    score *= pattern.weight;

    if (score > 0) {
      scores.set(key, { score, keywords: matchedKeywords, pattern });
    }
  }

  // Convert map to array and find highest scoring
  const scoreEntries: Array<[string, { score: number; keywords: string[]; pattern: DocumentPattern }]> = [];
  scores.forEach((value, key) => {
    scoreEntries.push([key, value]);
  });

  // Sort by score descending
  scoreEntries.sort((a, b) => b[1].score - a[1].score);

  // If no match, default to clinical_note
  if (scoreEntries.length === 0) {
    return {
      type: 'clinical_note',
      confidence: 0.3,
      detectedKeywords: [],
      suggestedSections: ['ChiefComplaint', 'HPI', 'ReviewOfSystems', 'PhysicalExam', 'Assessment', 'Plan', 'Disposition'],
    };
  }

  const [bestKey, bestMatch] = scoreEntries[0];

  // Calculate confidence (normalize score)
  // Max theoretical score would be all strong keywords + all structural patterns
  const maxPossibleScore = (bestMatch.pattern.strongKeywords.length * 3 + 
                           bestMatch.pattern.weakKeywords.length * 1 + 
                           bestMatch.pattern.structuralPatterns.length * 5) * bestMatch.pattern.weight;
  
  const confidence = Math.min(bestMatch.score / (maxPossibleScore * 0.3), 1); // 30% of max = full confidence

  // Extract subtype if present
  const [type, subtype] = bestKey.split(':') as [DocumentType, string | undefined];

  return {
    type,
    confidence: Math.round(confidence * 100) / 100,
    subtype,
    detectedKeywords: bestMatch.keywords.slice(0, 10), // Limit to top 10
    suggestedSections: bestMatch.pattern.expectedSections,
  };
}

/**
 * Get human-readable label for document type
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    pathology: 'Pathology Report',
    radiology: 'Radiology Report',
    consultation: 'Consultation',
    lab_results: 'Lab Results',
    toxicology: 'Toxicology Report',
    discharge: 'Discharge Summary',
    operative: 'Operative Report',
    ed_note: 'ED Note',
    progress_note: 'Progress Note',
    h_and_p: 'History & Physical',
    clinical_note: 'Clinical Note',
  };
  return labels[type] || 'Unknown';
}

/**
 * Get icon/emoji for document type
 */
export function getDocumentTypeIcon(type: DocumentType): string {
  const icons: Record<DocumentType, string> = {
    pathology: '🔬',
    radiology: '📷',
    consultation: '👨‍⚕️',
    lab_results: '🧪',
    toxicology: '💊',
    discharge: '🏥',
    operative: '🔪',
    ed_note: '🚑',
    progress_note: '📝',
    h_and_p: '📋',
    clinical_note: '📄',
  };
  return icons[type] || '📄';
}

/**
 * Get suggested SmartSections based on document type
 */
export function getSuggestedSections(type: DocumentType): string[] {
  const pattern = DOCUMENT_PATTERNS.find(p => p.type === type);
  return pattern?.expectedSections || ['ChiefComplaint', 'HPI', 'Assessment', 'Plan'];
}

/**
 * Get color class for document type badge
 */
export function getDocumentTypeColor(type: DocumentType): string {
  const colors: Record<DocumentType, string> = {
    pathology: 'bg-purple-100 text-purple-800 border-purple-300',
    radiology: 'bg-blue-100 text-blue-800 border-blue-300',
    consultation: 'bg-teal-100 text-teal-800 border-teal-300',
    lab_results: 'bg-amber-100 text-amber-800 border-amber-300',
    toxicology: 'bg-red-100 text-red-800 border-red-300',
    discharge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    operative: 'bg-rose-100 text-rose-800 border-rose-300',
    ed_note: 'bg-orange-100 text-orange-800 border-orange-300',
    progress_note: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    h_and_p: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    clinical_note: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
}
