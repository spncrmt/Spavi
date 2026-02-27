import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ManualUploadModal from '@/components/ManualUploadModal';
import ProviderToggle, { AIProvider } from '@/components/ProviderToggle';

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

interface FaxListItem {
  id: number;
  externalId: string | null;
  fromNumber: string;
  receivedAt: string;
  status: string;
  documentType: string | null;
  documentSubtype: string | null;
  confidence: number | null;
  metadata: FaxMetadata | null;
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

function DocumentTypeBadge({ type, confidence }: { type: string | null; confidence: number | null }) {
  if (!type) return null;
  
  const label = DOCUMENT_TYPE_LABELS[type] || type;
  const icon = DOCUMENT_TYPE_ICONS[type] || '📄';
  const colorClass = DOCUMENT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  const confidencePercent = confidence ? Math.round(confidence * 100) : null;
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border inline-flex items-center gap-1 ${colorClass}`}>
      <span>{icon}</span>
      <span>{label}</span>
      {confidencePercent !== null && confidencePercent < 70 && (
        <span className="text-xs opacity-70">({confidencePercent}%)</span>
      )}
    </span>
  );
}

type TabType = 'incoming' | 'pending_review' | 'review_complete';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
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

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Queued';
    case 'processing':
      return 'Processing...';
    case 'completed':
      return 'Ready for Review';
    case 'failed':
      return 'Failed';
    case 'reviewed':
      return 'Complete';
    default:
      return status;
  }
}

function StatusBadge({ status }: { status: string }) {
  const isProcessing = status === 'processing';
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border inline-flex items-center gap-1.5 ${getStatusBadgeClass(status)}`}>
      {isProcessing && (
        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {getStatusLabel(status)}
    </span>
  );
}

// Get patient identifier string for display
function getPatientIdentifier(fax: FaxListItem): string | null {
  if (!fax.metadata) return null;
  
  const parts: string[] = [];
  if (fax.metadata.patientName) {
    parts.push(fax.metadata.patientName);
  }
  if (fax.metadata.mrn) {
    parts.push(`MRN: ${fax.metadata.mrn}`);
  }
  if (parts.length === 0 && fax.metadata.dateOfBirth) {
    parts.push(`DOB: ${fax.metadata.dateOfBirth}`);
  }
  
  return parts.length > 0 ? parts.join(' • ') : null;
}

export default function Dashboard() {
  const router = useRouter();
  const [faxes, setFaxes] = useState<FaxListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>('claude');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const fetchFaxes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/faxes');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch faxes');
      }

      setFaxes(data.faxes || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch faxes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaxes();

    // Auto-refresh every 15 seconds for better UX when processing
    const interval = setInterval(fetchFaxes, 15000);
    return () => clearInterval(interval);
  }, [fetchFaxes]);

  // Filter faxes based on active tab
  const filteredFaxes = faxes.filter((fax) => {
    switch (activeTab) {
      case 'incoming':
        // Show pending, processing, and failed
        return ['pending', 'processing', 'failed'].includes(fax.status);
      case 'pending_review':
        // Show completed (ready for review)
        return fax.status === 'completed';
      case 'review_complete':
        // Show reviewed
        return fax.status === 'reviewed';
      default:
        return true;
    }
  });

  // Count for tab badges
  const counts = {
    incoming: faxes.filter(f => ['pending', 'processing', 'failed'].includes(f.status)).length,
    pending_review: faxes.filter(f => f.status === 'completed').length,
    review_complete: faxes.filter(f => f.status === 'reviewed').length,
  };

  const handleMarkReviewed = async (id: number) => {
    try {
      const response = await fetch(`/api/faxes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'reviewed' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update fax status');
      }

      fetchFaxes();
    } catch (err) {
      console.error('Error marking fax as reviewed:', err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this fax?')) {
      return;
    }

    try {
      const response = await fetch(`/api/faxes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete fax');
      }

      fetchFaxes();
    } catch (err) {
      console.error('Error deleting fax:', err);
    }
  };

  const handleRetry = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await fetch(`/api/faxes/${id}/reprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider: aiProvider }),
      });

      if (!response.ok) {
        throw new Error('Failed to reprocess fax');
      }

      fetchFaxes();
    } catch (err) {
      console.error('Error reprocessing fax:', err);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (file.type !== 'application/pdf') {
      setUploadError('Please drop a PDF file');
      setTimeout(() => setUploadError(null), 3000);
      return;
    }

    setUploadingPdf(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('provider', aiProvider);

      const response = await fetch('/api/faxes/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload PDF');
      }

      setActiveTab('incoming');
      fetchFaxes();
      
      if (data.faxId) {
        router.push(`/dashboard/${data.faxId}`);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setUploadingPdf(false);
    }
  };

  const getTabTitle = (): string => {
    switch (activeTab) {
      case 'incoming':
        return 'Incoming Faxes';
      case 'pending_review':
        return 'Pending Review';
      case 'review_complete':
        return 'Review Complete';
      default:
        return 'Faxes';
    }
  };

  const getEmptyMessage = (): { title: string; subtitle: string } => {
    switch (activeTab) {
      case 'incoming':
        return {
          title: 'No incoming faxes',
          subtitle: 'New faxes will appear here when received',
        };
      case 'pending_review':
        return {
          title: 'No faxes pending review',
          subtitle: 'Processed faxes ready for review will appear here',
        };
      case 'review_complete':
        return {
          title: 'No completed reviews',
          subtitle: 'Reviewed faxes will appear here',
        };
      default:
        return { title: 'No faxes', subtitle: '' };
    }
  };

  return (
    <>
      <Head>
        <title>{getTabTitle()} - Spavi Dashboard</title>
        <meta name="description" content="View and manage incoming faxes" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main 
        className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border-4 border-dashed border-blue-500">
              <svg className="w-20 h-20 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Drop PDF to Process</h3>
              <p className="text-gray-600">Release to upload and automatically process the fax</p>
            </div>
          </div>
        )}

        {/* Upload Progress Overlay */}
        {uploadingPdf && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
              <svg className="animate-spin w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Processing PDF...</h3>
              <p className="text-gray-600">Extracting text and creating fax record</p>
            </div>
          </div>
        )}

        {/* Upload Error Toast */}
        {uploadError && (
          <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{uploadError}</span>
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Fax Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage and review incoming fax documents
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* AI Provider Toggle */}
              <ProviderToggle 
                onProviderChange={setAiProvider}
                className="mr-2"
              />
              
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Manual Upload
              </button>
              <button
                onClick={fetchFaxes}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <svg
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex gap-6">
                <button
                  onClick={() => setActiveTab('incoming')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'incoming'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Incoming Faxes
                  {counts.incoming > 0 && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {counts.incoming}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('pending_review')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'pending_review'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Pending Review
                  {counts.pending_review > 0 && (
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {counts.pending_review}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('review_complete')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'review_complete'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Review Complete
                  {counts.review_complete > 0 && (
                    <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {counts.review_complete}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-xl">❌</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Fax List */}
          {loading && faxes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
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
              <p className="text-gray-600">Loading faxes...</p>
            </div>
          ) : filteredFaxes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{getEmptyMessage().title}</h3>
              <p className="text-gray-600">{getEmptyMessage().subtitle}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaxes.map((fax) => {
                const patientId = getPatientIdentifier(fax);
                
                return (
                  <div
                    key={fax.id}
                    className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${
                      fax.status === 'processing' ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {/* Patient Identifier - Prominent Display */}
                        {patientId ? (
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {patientId}
                          </h3>
                        ) : (
                          <h3 className="text-lg font-medium text-gray-500 mb-2 italic">
                            {fax.status === 'processing' || fax.status === 'pending' 
                              ? 'Processing...' 
                              : 'Unknown Patient'}
                          </h3>
                        )}

                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <StatusBadge status={fax.status} />
                          {fax.documentType && (
                            <DocumentTypeBadge type={fax.documentType} confidence={fax.confidence} />
                          )}
                          <span className="text-sm text-gray-500">
                            {formatRelativeTime(fax.receivedAt)}
                          </span>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-gray-500">
                            From: {fax.fromNumber}
                          </span>
                        </div>

                        {/* Additional metadata for completed faxes */}
                        {fax.status === 'completed' && fax.metadata && (
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                            {fax.metadata.dateOfBirth && (
                              <span>
                                <span className="text-gray-400">DOB:</span> {fax.metadata.dateOfBirth}
                              </span>
                            )}
                            {fax.metadata.referringProvider && (
                              <span>
                                <span className="text-gray-400">Provider:</span> {fax.metadata.referringProvider}
                              </span>
                            )}
                            {fax.metadata.dateOfService && (
                              <span>
                                <span className="text-gray-400">DOS:</span> {fax.metadata.dateOfService}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Error message for failed faxes */}
                        {fax.status === 'failed' && fax.errorMessage && (
                          <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                            ⚠️ {fax.errorMessage}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        {fax.status === 'failed' && (
                          <button
                            onClick={(e) => handleRetry(fax.id, e)}
                            className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-1"
                            title="Retry processing"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry
                          </button>
                        )}
                        <Link
                          href={`/dashboard/${fax.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          {fax.status === 'completed' ? 'Review' : 'View Details'}
                        </Link>
                        {fax.status === 'completed' && (
                          <button
                            onClick={() => handleMarkReviewed(fax.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                          >
                            Mark Complete
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(fax.id, e)}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                          title="Delete fax"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-12 text-gray-500 text-sm">
            <p>Auto-refreshes every 15 seconds</p>
          </div>
        </div>
      </main>

      {/* Manual Upload Modal */}
      <ManualUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          setActiveTab('incoming');
          fetchFaxes();
        }}
        provider={aiProvider}
      />
    </>
  );
}
