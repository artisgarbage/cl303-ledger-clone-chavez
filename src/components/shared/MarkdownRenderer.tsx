"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Inline token types
// ---------------------------------------------------------------------------
type InlineToken =
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "text"; text: string };

/**
 * Tokenise a single line into typed inline tokens.
 * Handles: **bold**, *italic*, `code`.
 * Bold is parsed before italic so ** is never misread as two * delimiters.
 */
function tokeniseInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;

  while (i < input.length) {
    // Bold: **...**
    if (input[i] === "*" && input[i + 1] === "*") {
      const end = input.indexOf("**", i + 2);
      if (end !== -1) {
        tokens.push({ kind: "bold", text: input.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // Italic: *...* (but not **)
    if (input[i] === "*" && input[i + 1] !== "*") {
      const end = input.indexOf("*", i + 1);
      // Only treat as italic if the closing * is not part of **
      if (end !== -1 && input[end - 1] !== "*") {
        tokens.push({ kind: "italic", text: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // Inline code: `...`
    if (input[i] === "`") {
      const end = input.indexOf("`", i + 1);
      if (end !== -1) {
        tokens.push({ kind: "code", text: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // Plain text — accumulate until the next potential token delimiter
    let j = i + 1;
    while (j < input.length && input[j] !== "*" && input[j] !== "`") j++;
    tokens.push({ kind: "text", text: input.slice(i, j) });
    i = j;
  }

  return tokens;
}

function renderInline(text: string, baseKey: string): React.ReactNode {
  const tokens = tokeniseInline(text);
  return (
    <>
      {tokens.map((tok, idx) => {
        const key = `${baseKey}-t${idx}`;
        if (tok.kind === "bold") {
          return (
            <strong
              key={key}
              className="font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {tok.text}
            </strong>
          );
        }
        if (tok.kind === "italic") {
          return (
            <em
              key={key}
              className="italic"
              style={{ color: "var(--foreground-muted)" }}
            >
              {tok.text}
            </em>
          );
        }
        if (tok.kind === "code") {
          return (
            <code
              key={key}
              className="font-mono text-[0.85em] px-1.5 py-0.5 rounded"
              style={{
                color: "var(--accent-blue)",
                background: "rgba(79,142,247,0.1)",
              }}
            >
              {tok.text}
            </code>
          );
        }
        return <React.Fragment key={key}>{tok.text}</React.Fragment>;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Block types
// ---------------------------------------------------------------------------
type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "hr" }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "p"; text: string }
  | { type: "empty" };

function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule: ---, ***, ___
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    const h3m = trimmed.match(/^### (.+)/);
    if (h3m) {
      blocks.push({ type: "h3", text: h3m[1] });
      i++;
      continue;
    }
    const h2m = trimmed.match(/^## (.+)/);
    if (h2m) {
      blocks.push({ type: "h2", text: h2m[1] });
      i++;
      continue;
    }
    const h1m = trimmed.match(/^# (.+)/);
    if (h1m) {
      blocks.push({ type: "h1", text: h1m[1] });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      blocks.push({ type: "blockquote", text: trimmed.slice(2) });
      i++;
      continue;
    }

    // Unordered list — collect consecutive items
    if (/^[-*+] /.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+] /, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list — collect consecutive items
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph — collect until blank line or block-level element
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const ln = lines[i];
      const lt = ln.trim();
      if (!lt) break;
      if (
        /^[-*_]{3,}$/.test(lt) ||
        /^#{1,3} /.test(lt) ||
        /^[-*+] /.test(lt) ||
        /^\d+\.\s/.test(lt) ||
        lt.startsWith("> ")
      )
        break;
      paragraphLines.push(ln);
      i++;
    }
    if (paragraphLines.length) {
      blocks.push({ type: "p", text: paragraphLines.join(" ") });
    }
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const blocks = parseBlocks(content);

  if (!blocks.length) return null;

  return (
    <div
      className={cn("space-y-3 text-sm leading-relaxed", className)}
      style={{ color: "var(--foreground-muted)" }}
    >
      {blocks.map((block, idx) => {
        const key = `b${idx}`;

        switch (block.type) {
          case "h1":
            return (
              <h1
                key={key}
                className="text-xl font-bold tracking-tight pt-2 first:pt-0"
                style={{ color: "var(--foreground)" }}
              >
                {renderInline(block.text, key)}
              </h1>
            );

          case "h2":
            return (
              <h2
                key={key}
                className={cn(
                  "text-base font-semibold tracking-tight",
                  idx > 0 && "mt-5 pt-5 border-t",
                )}
                style={{
                  color: "var(--foreground)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {renderInline(block.text, key)}
              </h2>
            );

          case "h3":
            return (
              <h3
                key={key}
                className="text-sm font-semibold mt-4 first:mt-0"
                style={{ color: "var(--foreground)" }}
              >
                {renderInline(block.text, key)}
              </h3>
            );

          case "hr":
            return (
              <hr
                key={key}
                className="my-4 border-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--border), transparent)",
                }}
              />
            );

          case "blockquote":
            return (
              <blockquote
                key={key}
                className="pl-4 border-l-2 py-0.5 italic text-sm"
                style={{
                  borderColor: "var(--accent-blue)",
                  color: "var(--foreground-muted)",
                }}
              >
                {renderInline(block.text, key)}
              </blockquote>
            );

          case "ul":
            return (
              <ul key={key} className="space-y-1.5 pl-1">
                {block.items.map((item, ii) => (
                  <li key={ii} className="flex items-start gap-2.5">
                    <span
                      className="mt-2 h-1 w-1 rounded-full shrink-0"
                      style={{ background: "var(--accent-blue)" }}
                    />
                    <span>{renderInline(item, `${key}-li${ii}`)}</span>
                  </li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={key} className="space-y-1.5 pl-1">
                {block.items.map((item, ii) => (
                  <li key={ii} className="flex items-start gap-2.5">
                    <span
                      className="shrink-0 tabular-nums text-xs font-bold mt-0.5 w-5 text-right"
                      style={{ color: "var(--accent-blue)" }}
                    >
                      {ii + 1}.
                    </span>
                    <span>{renderInline(item, `${key}-li${ii}`)}</span>
                  </li>
                ))}
              </ol>
            );

          case "p":
            return (
              <p key={key} className="leading-relaxed">
                {renderInline(block.text, key)}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
