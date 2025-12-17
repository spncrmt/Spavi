import { useState, useRef } from 'react';
import Head from 'next/head';
import SectionCard from '@/components/SectionCard';
import { SmartSections, FaxMetadata } from '@/lib/prompt';

type SectionType = 'ChiefComplaint' | 'HPI' | 'ReviewOfSystems' | 'PhysicalExam' | 'Assessment' | 'Plan' | 'Disposition';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [sections, setSections] = useState<SmartSections | null>(null);
  const [metadata, setMetadata] = useState<FaxMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showTextArea, setShowTextArea] = useState(false);
  const [metadataCopied, setMetadataCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedSections, setSelectedSections] = useState<SectionType[]>([
    'HPI',
    'PhysicalExam',
    'Assessment',
    'Plan',
  ]);

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Please enter clinical text');
      return;
    }

    if (selectedSections.length === 0) {
      setError('Please select at least one section');
      return;
    }

    setLoading(true);
    setError(null);
    setSections(null);
    setMetadata(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          selectedSections: selectedSections
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate sections');
      }

      setSections(data.sections);
      if (data.metadata) {
        setMetadata(data.metadata);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setSections(null);
    setMetadata(null);
    setError(null);
    setShowTextArea(false);
  };

  const handleCopyMetadata = async () => {
    if (!metadata) return;
    
    const lines: string[] = [];
    if (metadata.patientName) lines.push(`Patient: ${metadata.patientName}`);
    if (metadata.dateOfBirth) lines.push(`DOB: ${metadata.dateOfBirth}`);
    if (metadata.mrn) lines.push(`MRN: ${metadata.mrn}`);
    if (metadata.referringProvider) lines.push(`Referring Provider: ${metadata.referringProvider}`);
    if (metadata.referringPractice) lines.push(`Practice: ${metadata.referringPractice}`);
    if (metadata.dateOfService) lines.push(`Date of Service: ${metadata.dateOfService}`);
    if (metadata.faxDate) lines.push(`Fax Date: ${metadata.faxDate}`);
    if (metadata.phoneNumber) lines.push(`Phone: ${metadata.phoneNumber}`);
    
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setMetadataCopied(true);
      setTimeout(() => setMetadataCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy metadata:', err);
    }
  };

  const toggleSection = (section: SectionType) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress('Uploading PDF...');

    try {
      // Create FormData to send file to server
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress('Extracting text from PDF...');

      // Send to server-side API for processing
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text from PDF');
      }

      setInputText(data.text || '');
      setShowTextArea(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from PDF');
    } finally {
      setUploading(false);
      setUploadProgress('');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate image file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF, BMP, or TIFF)');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress('Uploading image...');

    try {
      // Create FormData to send file to server
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress('Extracting text from image with OCR...');

      // Send to server-side API for OCR processing
      const response = await fetch('/api/extract-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text from image');
      }

      setInputText(data.text || '');
      setShowTextArea(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from image');
    } finally {
      setUploading(false);
      setUploadProgress('');
      // Reset file input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handlePasteClick = () => {
    setShowTextArea(true);
  };

  const exampleText = `Patient presents with cough and fever for 3 days. Reports productive cough with yellow sputum. Denies chest pain or shortness of breath. No recent travel. Temp 100.2°F, BP 120/80, HR 88, RR 16. Lungs: mild crackles right lower lobe. Heart: regular rate and rhythm. Otherwise unremarkable exam.`;

  return (
    <>
      <Head>
        <title>Medical Documentation Automation - Spavi</title>
        <meta name="description" content="Convert clinical notes to Epic SmartSections" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Medical Documentation Automation
            </h1>
            <p className="text-lg text-gray-600">
              Convert clinical notes to Epic SmartSections
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">
                  Demo only. Do not upload real patient data. This tool is for demonstration purposes and should not be used with Protected Health Information (PHI).
                </p>
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <label className="block text-lg font-semibold text-gray-800 mb-4">
              Clinical Text Input
            </label>

            {/* Input Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* PDF Upload Box */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="pdf-upload"
                  disabled={loading || uploading}
                />
                <label
                  htmlFor="pdf-upload"
                  className={`flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                    loading || uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading && uploadProgress.includes('PDF') ? (
                    <>
                      <svg className="animate-spin h-12 w-12 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm font-medium text-blue-600 text-center px-4">
                        {uploadProgress}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-12 h-12 text-gray-400 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 text-center px-4">
                        Upload PDF
                      </span>
                      <span className="text-xs text-gray-500 mt-1 px-4">
                        (text or scanned)
                      </span>
                    </>
                  )}
                </label>
              </div>

              {/* Image Upload Box */}
              <div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp,image/tiff"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={loading || uploading}
                />
                <label
                  htmlFor="image-upload"
                  className={`flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors ${
                    loading || uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading && uploadProgress.includes('image') ? (
                    <>
                      <svg className="animate-spin h-12 w-12 text-green-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm font-medium text-green-600 text-center px-4">
                        {uploadProgress}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-12 h-12 text-gray-400 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 text-center px-4">
                        Upload Image
                      </span>
                      <span className="text-xs text-gray-500 mt-1 px-4">
                        (JPG, PNG, etc.)
                      </span>
                    </>
                  )}
                </label>
              </div>

              {/* Paste Text Box */}
              <button
                onClick={handlePasteClick}
                disabled={loading || uploading}
                className={`flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors ${
                  loading || uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 text-center px-4">
                  Paste Text
                </span>
              </button>
            </div>

            {/* Text Area - Shows when paste is clicked or PDF is uploaded */}
            {showTextArea && (
              <>
                <textarea
                  id="clinical-text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your clinical text here..."
                  className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
                  disabled={loading || uploading}
                  autoFocus
                />

                {/* Section Selection */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Sections to Generate:
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'ChiefComplaint', label: 'Chief Complaint' },
                      { key: 'HPI', label: 'HPI (History of Present Illness)' },
                      { key: 'ReviewOfSystems', label: 'Review of Systems' },
                      { key: 'PhysicalExam', label: 'Physical Exam' },
                      { key: 'Assessment', label: 'Assessment' },
                      { key: 'Plan', label: 'Plan' },
                      { key: 'Disposition', label: 'Disposition/Follow-up' },
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(key as SectionType)}
                          onChange={() => toggleSection(key as SectionType)}
                          disabled={loading}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 select-none">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !inputText.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </span>
                    ) : (
                      '🚀 Generate SmartSections'
                    )}
                  </button>

                  <button
                    onClick={handleClear}
                    disabled={loading}
                    className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>

                  <button
                    onClick={() => {
                      setInputText(exampleText);
                      setShowTextArea(true);
                    }}
                    disabled={loading}
                    className="bg-indigo-100 hover:bg-indigo-200 disabled:bg-gray-100 text-indigo-700 font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    Load Example
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded">
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

          {/* Fax Metadata Section */}
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <span>📋</span> Fax Information
                </h2>
                <button
                  onClick={handleCopyMetadata}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    metadataCopied
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-100'
                  }`}
                >
                  {metadataCopied ? '✓ Copied!' : '📋 Copy All'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {metadata.patientName && (
                  <div>
                    <span className="text-sm text-blue-600 font-medium">Patient:</span>
                    <span className="ml-2 text-gray-900">{metadata.patientName}</span>
                  </div>
                )}
                {metadata.dateOfBirth && (
                  <div>
                    <span className="text-sm text-blue-600 font-medium">DOB:</span>
                    <span className="ml-2 text-gray-900">{metadata.dateOfBirth}</span>
                  </div>
                )}
                {metadata.mrn && (
                  <div>
                    <span className="text-sm text-blue-600 font-medium">MRN:</span>
                    <span className="ml-2 text-gray-900">{metadata.mrn}</span>
                  </div>
                )}
                {metadata.referringProvider && (
                  <div>
                    <span className="text-sm text-blue-600 font-medium">Referring Provider:</span>
                    <span className="ml-2 text-gray-900">{metadata.referringProvider}</span>
                  </div>
                )}
                {metadata.referringPractice && (
                  <div>
                    <span className="text-sm text-blue-600 font-medium">Practice:</span>
                    <span className="ml-2 text-gray-900">{metadata.referringPractice}</span>
                  </div>
                )}
                {metadata.dateOfService && (
                  <div>
                    <span className="text-sm text-blue-600 font-medium">Date of Service:</span>
                    <span className="ml-2 text-gray-900">{metadata.dateOfService}</span>
                  </div>
                )}
                {metadata.faxDate && (
                  <div>
                    <span className="text-sm text-blue-600 font-medium">Fax Date:</span>
                    <span className="ml-2 text-gray-900">{metadata.faxDate}</span>
                  </div>
                )}
                {metadata.phoneNumber && (
                  <div>
                    <span className="text-sm text-blue-600 font-medium">Phone:</span>
                    <span className="ml-2 text-gray-900">{metadata.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Section */}
          {sections && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Epic SmartSections
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sections.ChiefComplaint && (
                  <SectionCard
                    title="Chief Complaint"
                    content={sections.ChiefComplaint}
                    sources={sections.ChiefComplaint_sources}
                    originalText={inputText}
                  />
                )}
                {sections.HPI && (
                  <SectionCard
                    title="HPI (History of Present Illness)"
                    content={sections.HPI}
                    sources={sections.HPI_sources}
                    originalText={inputText}
                  />
                )}
                {sections.ReviewOfSystems && (
                  <SectionCard
                    title="Review of Systems"
                    content={sections.ReviewOfSystems}
                    sources={sections.ReviewOfSystems_sources}
                    originalText={inputText}
                  />
                )}
                {sections.PhysicalExam && (
                  <SectionCard
                    title="Physical Exam"
                    content={sections.PhysicalExam}
                    sources={sections.PhysicalExam_sources}
                    originalText={inputText}
                  />
                )}
                {sections.Assessment && (
                  <SectionCard
                    title="Assessment"
                    content={sections.Assessment}
                    sources={sections.Assessment_sources}
                    originalText={inputText}
                  />
                )}
                {sections.Plan && (
                  <SectionCard
                    title="Plan"
                    content={sections.Plan}
                    sources={sections.Plan_sources}
                    originalText={inputText}
                  />
                )}
                {sections.Disposition && (
                  <SectionCard
                    title="Disposition/Follow-up"
                    content={sections.Disposition}
                    sources={sections.Disposition_sources}
                    originalText={inputText}
                  />
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-12 text-gray-600 text-sm">
            <p>Powered by AI • Built with Next.js & Tailwind CSS</p>
          </div>
        </div>
      </main>
    </>
  );
}
