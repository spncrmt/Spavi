import { useState, useRef } from 'react';

export type AIProvider = 'claude' | 'openai' | 'ollama';

interface ManualUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  provider?: AIProvider;
}

export default function ManualUploadModal({ isOpen, onClose, onSuccess, provider }: ManualUploadModalProps) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setInputText('');
    setLoading(false);
    setError(null);
    setUploading(false);
    setUploadProgress('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setError('Please enter or upload clinical text');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a fax record via webhook simulation
      const response = await fetch('/api/faxes/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          fromNumber: 'Manual Upload',
          provider: provider, // Pass selected AI provider
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process fax');
      }

      resetState();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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
    setUploadProgress('Extracting text from PDF...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text from PDF');
      }

      setInputText(data.text || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from PDF');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF, BMP, or TIFF)');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress('Extracting text with OCR...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text from image');
      }

      setInputText(data.text || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from image');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Manual Fax Upload</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Upload Options */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* PDF Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="modal-pdf-upload"
                  disabled={loading || uploading}
                />
                <label
                  htmlFor="modal-pdf-upload"
                  className={`flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                    loading || uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading && uploadProgress.includes('PDF') ? (
                    <>
                      <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-blue-600">{uploadProgress}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Upload PDF</span>
                    </>
                  )}
                </label>
              </div>

              {/* Image Upload */}
              <div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp,image/tiff"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="modal-image-upload"
                  disabled={loading || uploading}
                />
                <label
                  htmlFor="modal-image-upload"
                  className={`flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors ${
                    loading || uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading && uploadProgress.includes('OCR') ? (
                    <>
                      <svg className="animate-spin h-8 w-8 text-green-500 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-green-600">{uploadProgress}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Upload Image</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Text Area */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Text
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Upload a file above or paste clinical text here..."
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 text-sm"
                disabled={loading || uploading}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Info */}
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
              <p className="text-xs text-gray-600">
                📋 The fax will be processed automatically with all sections enabled (Chief Complaint, HPI, ROS, Physical Exam, Assessment, Plan, Disposition).
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                {provider === 'ollama' ? (
                  <><span className="text-violet-600 font-medium">🔒 Local AI (Ollama)</span> - Document processed on-device, ~20s</>
                ) : provider === 'openai' ? (
                  <><span className="text-emerald-600 font-medium">☁️ Cloud AI (OpenAI)</span> - De-identified data sent to API, ~10s</>
                ) : (
                  <><span className="text-sky-600 font-medium">☁️ Cloud AI (Claude)</span> - De-identified data sent to API, ~10s</>
                )}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || uploading || !inputText.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Submit Fax
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
