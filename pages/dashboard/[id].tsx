import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import SectionCard from '@/components/SectionCard';

type ViewMode = 'side-by-side' | 'sections-only';

interface SelectedSection {
  key: string;
  title: string;
  sources: string[];
}

interface FaxMetadata {
  patientName?: string;
  dateOfBirth?: string;
  mrn?: string;
  referringProvider?: string;
  referringPractice?: string;
  dateOfService?: string;
  faxDate?: string;
  phoneNumber?: string;
}

interface FaxDetail {
  id: number;
  externalId: string | null;
  fromNumber: string;
  receivedAt: string;
  status: string;
  documentType: string | null;
  documentSubtype: string | null;
  confidence: number | null;
  rawText: string | null;
  metadata: FaxMetadata | null;
  sections: Record<string, string> | null;
  pdfPath: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// Document type display helpers
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
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

const DOCUMENT_TYPE_ICONS: Record<string, string> = {
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

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
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

function DocumentTypeBadge({ type, subtype, confidence }: { type: string | null; subtype?: string | null; confidence: number | null }) {
  if (!type) return null;
  
  const label = DOCUMENT_TYPE_LABELS[type] || type;
  const icon = DOCUMENT_TYPE_ICONS[type] || '📄';
  const colorClass = DOCUMENT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  const confidencePercent = confidence ? Math.round(confidence * 100) : null;
  
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full border inline-flex items-center gap-1.5 ${colorClass}`}>
      <span>{icon}</span>
      <span>{label}</span>
      {subtype && <span className="opacity-70">({subtype})</span>}
      {confidencePercent !== null && (
        <span className="text-xs opacity-70 ml-1">{confidencePercent}%</span>
      )}
    </span>
  );
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'reviewed':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadgeClass(status)}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Inline collapsible component for viewing original fax text (attached to Fax Info)
function OriginalTextInline({ rawText }: { rawText: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors bg-gray-50/50"
      >
        <div className="flex items-center gap-2">
          <span>📄</span>
          <span className="text-sm font-medium text-gray-700">Original Document Text</span>
          <span className="text-xs text-gray-400">({rawText.length} characters)</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-6 pb-4 bg-gray-50/50">
          <pre className="p-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto max-h-72 overflow-y-auto">
            {rawText}
          </pre>
        </div>
      )}
    </div>
  );
}

function HighlightedSourcePanel({ 
  rawText, 
  selectedSection, 
  onClearSelection,
  faxId 
}: { 
  rawText: string; 
  selectedSection: SelectedSection | null;
  onClearSelection: () => void;
  faxId: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstHighlightRef = useRef<HTMLElement | null>(null);

  const highlightedContent = useMemo(() => {
    if (!selectedSection || !selectedSection.sources.length) {
      return null;
    }

    interface Match {
      start: number;
      end: number;
    }

    const matches: Match[] = [];
    const lowerText = rawText.toLowerCase();

    for (const source of selectedSection.sources) {
      if (!source || source.trim().length === 0) continue;
      const lowerSource = source.toLowerCase().trim();
      let startIndex = 0;

      while (true) {
        const index = lowerText.indexOf(lowerSource, startIndex);
        if (index === -1) break;
        matches.push({ start: index, end: index + source.trim().length });
        startIndex = index + 1;
      }
    }

    if (matches.length === 0) return null;

    matches.sort((a, b) => a.start - b.start);

    const merged: Match[] = [];
    for (const match of matches) {
      if (merged.length === 0) {
        merged.push({ ...match });
      } else {
        const last = merged[merged.length - 1];
        if (match.start <= last.end + 1) {
          last.end = Math.max(last.end, match.end);
        } else {
          merged.push({ ...match });
        }
      }
    }

    const result: React.ReactNode[] = [];
    let lastEnd = 0;
    let isFirst = true;

    for (let i = 0; i < merged.length; i++) {
      const match = merged[i];
      if (match.start > lastEnd) {
        result.push(
          <span key={`text-${i}`} className="text-gray-500">
            {rawText.substring(lastEnd, match.start)}
          </span>
        );
      }
      result.push(
        <mark 
          key={`hl-${i}`} 
          ref={isFirst ? (el) => { firstHighlightRef.current = el; } : undefined}
          className="bg-yellow-300 text-gray-900 px-0.5 rounded font-medium"
        >
          {rawText.substring(match.start, match.end)}
        </mark>
      );
      isFirst = false;
      lastEnd = match.end;
    }

    if (lastEnd < rawText.length) {
      result.push(
        <span key="text-end" className="text-gray-500">
          {rawText.substring(lastEnd)}
        </span>
      );
    }

    return result;
  }, [rawText, selectedSection]);

  useEffect(() => {
    if (firstHighlightRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const highlight = firstHighlightRef.current;
      const containerRect = container.getBoundingClientRect();
      const highlightRect = highlight.getBoundingClientRect();
      const scrollTop = highlightRect.top - containerRect.top + container.scrollTop - 80;
      container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
    }
  }, [selectedSection]);

  const showingHighlights = selectedSection && highlightedContent;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        {showingHighlights ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              <span className="text-sm font-medium text-gray-800">
                Sources for: {selectedSection.title}
              </span>
              <span className="text-xs text-gray-400">
                ({selectedSection.sources.length} source{selectedSection.sources.length !== 1 ? 's' : ''})
              </span>
            </div>
            <button
              onClick={onClearSelection}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-gray-700">Original Document</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Click a section to highlight sources</span>
              {faxId && (
                <a
                  href={`/api/faxes/${faxId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="View PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
          {showingHighlights ? highlightedContent : (
            <span className="text-gray-700">{rawText}</span>
          )}
        </pre>
      </div>
    </div>
  );
}

const sectionLabels: Record<string, string> = {
  // Common sections
  ChiefComplaint: 'Chief Complaint',
  HPI: 'HPI (History of Present Illness)',
  ReviewOfSystems: 'Review of Systems',
  PhysicalExam: 'Physical Exam',
  Assessment: 'Assessment',
  Plan: 'Plan',
  Disposition: 'Disposition/Follow-up',
  // Pathology sections
  SpecimenInfo: 'Specimen Information',
  GrossDescription: 'Gross Description',
  MicroscopicDescription: 'Microscopic Description',
  Diagnosis: 'Diagnosis',
  TNMStaging: 'TNM Staging',
  SynopticReport: 'Synoptic Report',
  // Radiology sections
  ExamType: 'Exam Type',
  ClinicalHistory: 'Clinical History',
  Comparison: 'Comparison Studies',
  Technique: 'Technique',
  Findings: 'Findings',
  Impression: 'Impression',
  Recommendations: 'Recommendations',
  // Consultation sections
  ReasonForConsult: 'Reason for Consultation',
  // Lab sections
  TestName: 'Test Name',
  Results: 'Results',
  ReferenceRange: 'Reference Range',
  Flags: 'Abnormal Flags',
  // Operative sections
  PreoperativeDiagnosis: 'Preoperative Diagnosis',
  PostoperativeDiagnosis: 'Postoperative Diagnosis',
  Procedure: 'Procedure',
  Surgeon: 'Surgeon',
  Anesthesia: 'Anesthesia',
  EstimatedBloodLoss: 'Estimated Blood Loss',
  Complications: 'Complications',
  // Discharge sections
  AdmissionDate: 'Admission Date',
  DischargeDate: 'Discharge Date',
  AdmittingDiagnosis: 'Admitting Diagnosis',
  DischargeDiagnosis: 'Discharge Diagnosis',
  HospitalCourse: 'Hospital Course',
  DischargeMedications: 'Discharge Medications',
  DischargeInstructions: 'Discharge Instructions',
  FollowUp: 'Follow-up',
  // H&P sections
  PMH: 'Past Medical History',
  PSH: 'Past Surgical History',
  FamilyHistory: 'Family History',
  SocialHistory: 'Social History',
  Medications: 'Medications',
  Allergies: 'Allergies',
  // Progress note sections
  IntervalHistory: 'Interval History',
  Labs: 'Laboratory Results',
  Vitals: 'Vital Signs',
  CurrentMedications: 'Current Medications',
  // ED sections
  MDM: 'Medical Decision Making',
  // Generic
  Comments: 'Comments',
};

export default function FaxDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [fax, setFax] = useState<FaxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadataCopied, setMetadataCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [selectedSection, setSelectedSection] = useState<SelectedSection | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchFax = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/faxes/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch fax');
        }

        setFax(data.fax);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch fax');
      } finally {
        setLoading(false);
      }
    };

    fetchFax();

    // Poll for updates if pending or processing
    const interval = setInterval(async () => {
      if (fax?.status === 'pending' || fax?.status === 'processing') {
        try {
          const response = await fetch(`/api/faxes/${id}`);
          const data = await response.json();
          if (response.ok) {
            setFax(data.fax);
          }
        } catch (err) {
          console.error('Error polling fax status:', err);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, fax?.status]);

  const handleCopyMetadata = async () => {
    if (!fax?.metadata) return;

    const lines: string[] = [];
    if (fax.metadata.patientName) lines.push(`Patient: ${fax.metadata.patientName}`);
    if (fax.metadata.dateOfBirth) lines.push(`DOB: ${fax.metadata.dateOfBirth}`);
    if (fax.metadata.mrn) lines.push(`MRN: ${fax.metadata.mrn}`);
    if (fax.metadata.referringProvider) lines.push(`Referring Provider: ${fax.metadata.referringProvider}`);
    if (fax.metadata.referringPractice) lines.push(`Practice: ${fax.metadata.referringPractice}`);
    if (fax.metadata.dateOfService) lines.push(`Date of Service: ${fax.metadata.dateOfService}`);
    if (fax.metadata.faxDate) lines.push(`Fax Date: ${fax.metadata.faxDate}`);
    if (fax.metadata.phoneNumber) lines.push(`Phone: ${fax.metadata.phoneNumber}`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setMetadataCopied(true);
      setTimeout(() => setMetadataCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy metadata:', err);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600">Loading fax details...</p>
        </div>
      </main>
    );
  }

  if (error || !fax) {
    return (
      <main className="min-h-screen bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-xl">Error</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">
                  {error || 'Fax not found'}
                </p>
                <Link
                  href="/dashboard"
                  className="text-sm text-red-600 underline hover:text-red-800 mt-2 inline-block"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Fax #{fax.id} - Spavi Dashboard</title>
        <meta name="description" content={`Fax details for fax #${fax.id}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Fax #{fax.id}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <StatusBadge status={fax.status} />
                {fax.documentType && (
                  <DocumentTypeBadge 
                    type={fax.documentType} 
                    subtype={fax.documentSubtype}
                    confidence={fax.confidence} 
                  />
                )}
                <span className="text-gray-600">
                  Received: {new Date(fax.receivedAt).toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* View Mode Toggle - show if raw text available */}
            {fax.rawText && fax.status === 'completed' && (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'side-by-side'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    Side by Side
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('sections-only')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'sections-only'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Sections Only
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Processing Status */}
          {(fax.status === 'pending' || fax.status === 'processing') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-3">
                <svg
                  className="animate-spin h-6 w-6 text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <div>
                  <p className="font-medium text-blue-900">
                    {fax.status === 'pending' ? 'Waiting to process...' : 'Processing fax...'}
                  </p>
                  <p className="text-sm text-blue-700">This page will update automatically</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {fax.status === 'failed' && fax.errorMessage && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-xl">Error</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{fax.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Fax Info - hide in side-by-side mode since raw text is shown in left panel */}
          {!(fax.rawText && viewMode === 'side-by-side' && fax.status === 'completed') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Fax Information</h2>
                  {fax.pdfPath && (
                    <a
                      href={`/api/faxes/${fax.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Original PDF
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">From Number: </span>
                    <span className="font-medium">{fax.fromNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Received: </span>
                    <span className="font-medium">{new Date(fax.receivedAt).toLocaleString()}</span>
                  </div>
                  {fax.externalId && (
                    <div>
                      <span className="text-gray-500">External ID: </span>
                      <span className="font-medium">{fax.externalId}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Original Document Text - Collapsible */}
              {fax.rawText && (
                <OriginalTextInline rawText={fax.rawText} />
              )}
            </div>
          )}

          {/* Fax Metadata - hide in side-by-side mode */}
          {fax.metadata && Object.keys(fax.metadata).length > 0 && !(fax.rawText && viewMode === 'side-by-side' && fax.status === 'completed') && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  Patient Information
                </h2>
                <button
                  onClick={handleCopyMetadata}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    metadataCopied
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  {metadataCopied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {fax.metadata.patientName && (
                  <div>
                    <span className="text-sm text-gray-500 font-medium">Patient:</span>
                    <span className="ml-2 text-gray-900">{fax.metadata.patientName}</span>
                  </div>
                )}
                {fax.metadata.dateOfBirth && (
                  <div>
                    <span className="text-sm text-gray-500 font-medium">DOB:</span>
                    <span className="ml-2 text-gray-900">{fax.metadata.dateOfBirth}</span>
                  </div>
                )}
                {fax.metadata.mrn && (
                  <div>
                    <span className="text-sm text-gray-500 font-medium">MRN:</span>
                    <span className="ml-2 text-gray-900">{fax.metadata.mrn}</span>
                  </div>
                )}
                {fax.metadata.referringProvider && (
                  <div>
                    <span className="text-sm text-gray-500 font-medium">Referring Provider:</span>
                    <span className="ml-2 text-gray-900">{fax.metadata.referringProvider}</span>
                  </div>
                )}
                {fax.metadata.referringPractice && (
                  <div>
                    <span className="text-sm text-gray-500 font-medium">Practice:</span>
                    <span className="ml-2 text-gray-900">{fax.metadata.referringPractice}</span>
                  </div>
                )}
                {fax.metadata.dateOfService && (
                  <div>
                    <span className="text-sm text-gray-500 font-medium">Date of Service:</span>
                    <span className="ml-2 text-gray-900">{fax.metadata.dateOfService}</span>
                  </div>
                )}
                {fax.metadata.faxDate && (
                  <div>
                    <span className="text-sm text-gray-500 font-medium">Fax Date:</span>
                    <span className="ml-2 text-gray-900">{fax.metadata.faxDate}</span>
                  </div>
                )}
                {fax.metadata.phoneNumber && (
                  <div>
                    <span className="text-sm text-gray-500 font-medium">Phone:</span>
                    <span className="ml-2 text-gray-900">{fax.metadata.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Side-by-Side View */}
          {fax.rawText && viewMode === 'side-by-side' && fax.status === 'completed' && fax.sections && (
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Source Text Viewer - Left Side (sticky so it stays visible while scrolling sections) */}
              <div className="self-start sticky top-4" style={{ height: 'calc(100vh - 2rem)' }}>
                <HighlightedSourcePanel
                  rawText={fax.rawText}
                  selectedSection={selectedSection}
                  onClearSelection={() => setSelectedSection(null)}
                  faxId={fax.id}
                />
              </div>
              
              {/* Sections - Right Side */}
              <div>
                {/* Patient Info Card */}
                {fax.metadata && Object.keys(fax.metadata).length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-sm font-semibold text-gray-800">Patient Information</h3>
                      <button
                        onClick={handleCopyMetadata}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          metadataCopied
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {metadataCopied ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {fax.metadata.patientName && (
                        <div><span className="text-gray-500">Patient:</span> <span className="font-medium">{fax.metadata.patientName}</span></div>
                      )}
                      {fax.metadata.dateOfBirth && (
                        <div><span className="text-gray-500">DOB:</span> <span className="font-medium">{fax.metadata.dateOfBirth}</span></div>
                      )}
                      {fax.metadata.mrn && (
                        <div><span className="text-gray-500">MRN:</span> <span className="font-medium">{fax.metadata.mrn}</span></div>
                      )}
                      {fax.metadata.referringProvider && (
                        <div><span className="text-gray-500">Provider:</span> <span className="font-medium">{fax.metadata.referringProvider}</span></div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* SmartSections */}
                <div className="space-y-3">
                  {Object.entries(fax.sections).map(([key, value]) => {
                    if (key.endsWith('_sources')) return null;
                    if (!value || value === 'Not documented') return null;
                    const sources = fax.sections?.[`${key}_sources`] as string[] | undefined;
                    const sectionTitle = sectionLabels[key] || key;
                    return (
                      <SectionCard
                        key={key}
                        title={sectionTitle}
                        content={value}
                        sources={sources}
                        originalText={fax.rawText || undefined}
                        isSelected={selectedSection?.key === key}
                        onSelect={() => {
                          if (selectedSection?.key === key) {
                            setSelectedSection(null);
                          } else {
                            setSelectedSection({
                              key,
                              title: sectionTitle,
                              sources: (sources as string[]) || [],
                            });
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Standard Sections View (no raw text or sections-only mode) */}
          {fax.sections && Object.keys(fax.sections).length > 0 && (!fax.rawText || viewMode === 'sections-only' || fax.status !== 'completed') && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Epic SmartSections</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(fax.sections).map(([key, value]) => {
                  if (key.endsWith('_sources')) return null;
                  if (!value || value === 'Not documented') return null;

                  const sources = fax.sections?.[`${key}_sources`] as string[] | undefined;

                  return (
                    <SectionCard
                      key={key}
                      title={sectionLabels[key] || key}
                      content={value}
                      sources={sources}
                      originalText={fax.rawText || undefined}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
