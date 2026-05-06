'use client';

import { useState } from 'react';
import { NarrativeType } from '@prisma/client';

interface Narrative {
  id: string;
  type: NarrativeType;
  title: string | null;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  content: string;
}

interface NarrativesClientProps {
  recentNarratives: Narrative[];
}

const NARRATIVE_TYPE_LABELS: Record<NarrativeType, string> = {
  MONTHLY_SUMMARY: 'Monthly Summary',
  QUARTERLY_REVIEW: 'Quarterly Review',
  YEAR_OVER_YEAR: 'Year-over-Year',
  PROJECT_PROFITABILITY: 'Project Profitability',
  MARGIN_ANALYSIS: 'Margin Analysis',
  CASH_VS_ACCRUAL: 'Cash vs. Accrual',
  CUSTOM: 'Custom',
};

export function NarrativesClient({ recentNarratives }: NarrativesClientProps) {
  const [selectedType, setSelectedType] = useState<NarrativeType>('MONTHLY_SUMMARY');
  const [periodStart, setPeriodStart] = useState(() => {
    // Default to first day of prior month
    const now = new Date();
    const priorMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return priorMonth.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    // Default to last day of prior month
    const now = new Date();
    const priorMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return priorMonth.toISOString().split('T')[0];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNarrative, setGeneratedNarrative] = useState<{
    title: string;
    content: string;
    generatedAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedNarrativeId, setExpandedNarrativeId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedNarrative(null);

    try {
      const response = await fetch('/api/narratives/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate narrative');
      }

      const data = await response.json();
      setGeneratedNarrative(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Narratives</h1>
        <p className="text-gray-600 mt-2">
          Generate AI-powered financial summaries and analyses
        </p>
      </div>

      {/* Generation Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Generate Summary</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as NarrativeType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              {Object.entries(NARRATIVE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="periodStart" className="block text-sm font-medium text-gray-700 mb-1">
                Period Start
              </label>
              <input
                type="date"
                id="periodStart"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label htmlFor="periodEnd" className="block text-sm font-medium text-gray-700 mb-1">
                Period End
              </label>
              <input
                type="date"
                id="periodEnd"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {generatedNarrative && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              {generatedNarrative.title}
            </h3>
            <p className="text-sm text-green-700 mb-4">
              Generated {new Date(generatedNarrative.generatedAt).toLocaleString()}
            </p>
            <div
              className="prose prose-sm max-w-none text-gray-800"
              dangerouslySetInnerHTML={{
                __html: formatMarkdown(generatedNarrative.content),
              }}
            />
          </div>
        )}
      </div>

      {/* Recent Narratives */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Narratives</h2>

        {recentNarratives.length === 0 ? (
          <p className="text-gray-600">No narratives generated yet.</p>
        ) : (
          <div className="space-y-3">
            {recentNarratives.map((narrative) => (
              <div
                key={narrative.id}
                className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {narrative.title || NARRATIVE_TYPE_LABELS[narrative.type]}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {NARRATIVE_TYPE_LABELS[narrative.type]} •{' '}
                      {new Date(narrative.periodStart).toLocaleDateString()} -{' '}
                      {new Date(narrative.periodEnd).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Generated {new Date(narrative.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedNarrativeId(
                        expandedNarrativeId === narrative.id ? null : narrative.id
                      )
                    }
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium ml-4"
                  >
                    {expandedNarrativeId === narrative.id ? 'Hide' : 'View'}
                  </button>
                </div>

                {expandedNarrativeId === narrative.id && (
                  <div
                    className="mt-4 pt-4 border-t border-gray-200 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(narrative.content),
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple markdown-to-HTML formatter
 * Supports: headings, bold, lists, paragraphs
 */
function formatMarkdown(markdown: string): string {
  let html = markdown;

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-6 my-2">$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p class="my-2">');
  html = `<p class="my-2">${html}</p>`;

  return html;
}
