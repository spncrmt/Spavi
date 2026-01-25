import { useState, useEffect, useCallback } from 'react';

export type AIProvider = 'claude' | 'openai' | 'ollama';

interface ProviderInfo {
  id: AIProvider;
  name: string;
  description: string;
  icon: string;
  badge: string;
  badgeColor: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'claude',
    name: 'Claude',
    description: 'Fastest, best quality',
    icon: '🧠',
    badge: 'Cloud',
    badgeColor: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Fast, reliable',
    icon: '⚡',
    badge: 'Cloud',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Private, on-device',
    icon: '🦙',
    badge: 'Local',
    badgeColor: 'bg-violet-100 text-violet-700 border-violet-200',
  },
];

interface OllamaStatus {
  available: boolean;
  model?: string;
  models?: string[];
  error?: string;
  baseUrl: string;
}

interface ProviderToggleProps {
  onProviderChange?: (provider: AIProvider) => void;
  className?: string;
}

const STORAGE_KEY = 'spavi-ai-provider';

export default function ProviderToggle({ onProviderChange, className = '' }: ProviderToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);

  // Load saved provider from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AIProvider | null;
    if (saved && ['claude', 'openai', 'ollama'].includes(saved)) {
      setSelectedProvider(saved);
      onProviderChange?.(saved);
    }
  }, [onProviderChange]);

  // Check Ollama status when dropdown opens or ollama is selected
  const checkOllamaStatus = useCallback(async () => {
    setCheckingOllama(true);
    try {
      const response = await fetch('/api/ollama/status');
      const data = await response.json();
      setOllamaStatus(data);
    } catch {
      setOllamaStatus({
        available: false,
        error: 'Failed to check Ollama status',
        baseUrl: 'http://localhost:11434',
      });
    } finally {
      setCheckingOllama(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen || selectedProvider === 'ollama') {
      checkOllamaStatus();
    }
  }, [isOpen, selectedProvider, checkOllamaStatus]);

  const handleSelect = (provider: AIProvider) => {
    setSelectedProvider(provider);
    localStorage.setItem(STORAGE_KEY, provider);
    onProviderChange?.(provider);
    setIsOpen(false);
  };

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider)!;
  const isLocalMode = selectedProvider === 'ollama';

  return (
    <div className={`relative ${className}`}>
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <span className="text-lg">{currentProvider.icon}</span>
        <span className="font-medium text-gray-700">{currentProvider.name}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded border ${currentProvider.badgeColor}`}>
          {currentProvider.badge}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">AI Provider</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose where to process documents
              </p>
            </div>

            <div className="p-2">
              {PROVIDERS.map((provider) => {
                const isSelected = selectedProvider === provider.id;
                const isOllama = provider.id === 'ollama';
                const ollamaUnavailable = isOllama && ollamaStatus && !ollamaStatus.available;

                return (
                  <button
                    key={provider.id}
                    onClick={() => handleSelect(provider.id)}
                    disabled={isOllama && checkingOllama}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    } ${ollamaUnavailable ? 'opacity-75' : ''}`}
                  >
                    <span className="text-2xl mt-0.5">{provider.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{provider.name}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border ${provider.badgeColor}`}
                        >
                          {provider.badge}
                        </span>
                        {isSelected && (
                          <svg
                            className="w-4 h-4 text-blue-600 ml-auto"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{provider.description}</p>

                      {/* Ollama Status */}
                      {isOllama && (
                        <div className="mt-2">
                          {checkingOllama ? (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <svg
                                className="animate-spin h-3 w-3"
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
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Checking Ollama...
                            </span>
                          ) : ollamaStatus?.available ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Ready • {ollamaStatus.model}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Not available
                            </span>
                          )}
                          {ollamaStatus?.error && (
                            <p className="text-xs text-amber-600 mt-1 leading-tight">
                              {ollamaStatus.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                {isLocalMode ? (
                  <>
                    <span className="text-violet-600 font-medium">🔒 Local Mode:</span> Documents
                    processed entirely on your device. ~20s per fax.
                  </>
                ) : (
                  <>
                    <span className="text-sky-600 font-medium">☁️ Cloud Mode:</span> Documents sent
                    to AI provider (de-identified). ~10s per fax.
                  </>
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Export hook for getting current provider
export function useAIProvider(): [AIProvider, (provider: AIProvider) => void] {
  const [provider, setProvider] = useState<AIProvider>('claude');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AIProvider | null;
    if (saved && ['claude', 'openai', 'ollama'].includes(saved)) {
      setProvider(saved);
    }
  }, []);

  const updateProvider = (newProvider: AIProvider) => {
    setProvider(newProvider);
    localStorage.setItem(STORAGE_KEY, newProvider);
  };

  return [provider, updateProvider];
}

