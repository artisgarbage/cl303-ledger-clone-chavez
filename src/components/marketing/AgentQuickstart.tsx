"use client";

import { useState, useEffect } from "react";

const BASE_URL_PLACEHOLDER = "https://margot.so";

function buildCurlExample(baseUrl: string) {
  return `curl -X POST ${baseUrl}/api/agent/v1/query \\
  -H "Authorization: Bearer $MARGOT_AGENT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "What was gross margin for Q1 2026?",
    "orgId": "org_...",
    "mode": "internal"
  }'`;
}

const TS_EXAMPLE = `import { createMargotClient } from "@margot/agent-sdk";

const margot = createMargotClient({
  token: process.env.MARGOT_AGENT_TOKEN!,
});

const { answer, citations } = await margot.query({
  question: "What was gross margin for Q1 2026?",
  orgId: "org_...",
  mode: "internal",
});

console.log(answer);
// "Q1 gross margin: 34.2% (cash basis, Jan–Mar 2026).
//  COGS: $792K against revenue of $1.2M."`;

type Lang = "curl" | "typescript";

export function AgentQuickstart() {
  const [lang, setLang] = useState<Lang>("curl");
  const [copied, setCopied] = useState(false);
  const [curlExample, setCurlExample] = useState(() =>
    buildCurlExample(BASE_URL_PLACEHOLDER)
  );

  useEffect(() => {
    setCurlExample(buildCurlExample(window.location.origin));
  }, []);

  const code = lang === "curl" ? curlExample : TS_EXAMPLE;

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-stone-950 rounded-lg overflow-hidden border border-stone-800 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <div className="flex gap-1">
          {(["curl", "typescript"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                lang === l
                  ? "bg-stone-700 text-stone-100"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              {l === "typescript" ? "TypeScript" : "cURL"}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="text-xs text-stone-400 hover:text-stone-200 transition-colors px-2 py-1 rounded"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Code */}
      <pre className="p-5 text-xs text-stone-300 leading-relaxed overflow-x-auto font-mono whitespace-pre">
        {code}
      </pre>
    </div>
  );
}
