import { useState, useMemo } from 'react';

interface SectionCardProps {
  title: string;
  content: string;
  sources?: string[];
  originalText?: string;
  isEmpty?: boolean;
}

/**
 * Highlights source phrases in the original text
 */
function highlightSources(text: string, sources: string[]): React.ReactNode[] {
  if (!sources || sources.length === 0) {
    return [text];
  }

  // Find all matches and their positions
  interface Match {
    start: number;
    end: number;
    text: string;
  }

  const matches: Match[] = [];
  const lowerText = text.toLowerCase();

  for (const source of sources) {
    if (!source || source.trim().length === 0) continue;
    
    const lowerSource = source.toLowerCase();
    let startIndex = 0;
    
    // Find all occurrences of this source
    while (true) {
      const index = lowerText.indexOf(lowerSource, startIndex);
      if (index === -1) break;
      
      matches.push({
        start: index,
        end: index + source.length,
        text: text.substring(index, index + source.length)
      });
      
      startIndex = index + 1;
    }
  }

  if (matches.length === 0) {
    return [text];
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Merge overlapping matches
  const mergedMatches: Match[] = [];
  for (const match of matches) {
    if (mergedMatches.length === 0) {
      mergedMatches.push(match);
    } else {
      const last = mergedMatches[mergedMatches.length - 1];
      if (match.start <= last.end) {
        // Overlapping - extend the last match
        last.end = Math.max(last.end, match.end);
        last.text = text.substring(last.start, last.end);
      } else {
        mergedMatches.push(match);
      }
    }
  }

  // Build the highlighted text
  const result: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < mergedMatches.length; i++) {
    const match = mergedMatches[i];
    
    // Add text before this match
    if (match.start > lastEnd) {
      result.push(text.substring(lastEnd, match.start));
    }
    
    // Add highlighted match
    result.push(
      <mark 
        key={`highlight-${i}`} 
        className="bg-yellow-200 px-0.5 rounded"
      >
        {match.text}
      </mark>
    );
    
    lastEnd = match.end;
  }

  // Add remaining text
  if (lastEnd < text.length) {
    result.push(text.substring(lastEnd));
  }

  return result;
}

/**
 * Renders a SmartSection card with title, content, copy-to-clipboard, and source viewing functionality
 */
export default function SectionCard({ title, content, sources, originalText, isEmpty }: SectionCardProps) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const hasSources = sources && sources.length > 0 && originalText;

  const highlightedText = useMemo(() => {
    if (!originalText || !sources) return null;
    return highlightSources(originalText, sources);
  }, [originalText, sources]);

  return (
    <div className={`bg-white border rounded-lg p-6 shadow-sm transition-shadow ${
      isEmpty 
        ? 'border-gray-100 bg-gray-50' 
        : 'border-gray-200 hover:shadow-md'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className={`text-lg font-semibold ${isEmpty ? 'text-gray-400' : 'text-gray-800'}`}>
          {title}
        </h3>
        {!isEmpty && (
          <div className="flex gap-2">
            {hasSources && (
              <button
                onClick={() => setShowSources(!showSources)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  showSources
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
                aria-label={`${showSources ? 'Hide' : 'View'} sources for ${title}`}
              >
                {showSources ? '✕ Hide' : '🔍 Sources'}
              </button>
            )}
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
        )}
      </div>
      
      {isEmpty ? (
        <div className="flex items-center gap-2 text-gray-400 italic">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          <span>No information found in document</span>
        </div>
      ) : (
        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      )}

      {/* Source Panel */}
      {showSources && hasSources && !isEmpty && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600">📄 Source Text</span>
            <span className="text-xs text-gray-400">
              ({sources.length} source{sources.length !== 1 ? 's' : ''} highlighted)
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {highlightedText}
          </div>
        </div>
      )}
    </div>
  );
}
