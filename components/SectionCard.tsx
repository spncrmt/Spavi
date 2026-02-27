import { useState } from 'react';

interface SectionCardProps {
  title: string;
  content: string;
  sources?: string[];
  originalText?: string;
  isEmpty?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function SectionCard({ title, content, sources, originalText, isEmpty, isSelected, onSelect }: SectionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const hasSources = sources && sources.length > 0;
  const isClickable = hasSources && onSelect;

  return (
    <div 
      className={`bg-white border rounded-lg p-5 shadow-sm transition-all ${
        isEmpty 
          ? 'border-gray-100 bg-gray-50' 
          : isSelected
            ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
            : isClickable
              ? 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
              : 'border-gray-200 hover:shadow-md'
      }`}
      onClick={isClickable ? onSelect : undefined}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <h3 className={`text-base font-semibold ${isEmpty ? 'text-gray-400' : 'text-gray-800'}`}>
            {title}
          </h3>
          {isSelected && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              Viewing sources
            </span>
          )}
          {hasSources && !isSelected && (
            <span className="text-xs text-gray-400">
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!isEmpty && (
          <button
            onClick={handleCopy}
            className={`px-3 py-1 text-sm rounded-md transition-colors flex-shrink-0 ${
              copied
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
            }`}
            aria-label={`Copy ${title} to clipboard`}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        )}
      </div>
      
      {isEmpty ? (
        <div className="flex items-center gap-2 text-gray-400 italic text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          <span>No information found in document</span>
        </div>
      ) : (
        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
          {content}
        </div>
      )}
    </div>
  );
}
