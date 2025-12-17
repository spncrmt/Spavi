import { useState } from 'react';

interface SectionCardProps {
  title: string;
  content: string;
}

/**
 * Renders a SmartSection card with title, content, and copy-to-clipboard functionality
 */
export default function SectionCard({ title, content }: SectionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          onClick={handleCopy}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            copied
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
          }`}
          aria-label={`Copy ${title} to clipboard`}
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
      <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}
