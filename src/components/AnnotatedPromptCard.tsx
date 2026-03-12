"use client";

import { AnnotatedPrompt, PromptSegment } from "@/types";
import { useState } from "react";

const borderColorMap: Record<string, string> = {
  "v-500": "border-l-v-500",
  "g-500": "border-l-g-500",
  "am-600": "border-l-am-600",
  "v-700": "border-l-v-700",
  "n-700": "border-l-n-700",
};

const labelColorMap: Record<string, string> = {
  "v-500": "text-v-500",
  "g-500": "text-g-500",
  "am-600": "text-am-600",
  "v-700": "text-v-700",
  "n-700": "text-n-700",
};

function renderBrackets(raw: string) {
  const parts = raw.split(/(\[[^\]]+\])/);
  return parts.map((part, j) =>
    part.startsWith("[") ? (
      <span
        key={j}
        className="inline bg-v-800/40 text-v-300 px-1.5 rounded font-bold border-b-2 border-dashed border-v-500/50"
      >
        {part}
      </span>
    ) : (
      <span key={j}>{part}</span>
    )
  );
}

function AnnotationTip({ segment }: { segment: PromptSegment }) {
  return (
    <div className="mb-4">
      <div
        className={`text-[10px] font-black uppercase tracking-[.08em] mb-1 ${
          labelColorMap[segment.color] || "text-am-600"
        }`}
      >
        {segment.label}
      </div>
      <p className="text-[13px] text-n-500 leading-snug">{segment.annotationTip}</p>
    </div>
  );
}

export default function AnnotatedPromptCard({
  prompt,
  label,
}: {
  prompt: AnnotatedPrompt;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const plainText = prompt.segments.map((s) => s.text).join("\n\n");

  const copyPrompt = () => {
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leftSegments = prompt.segments.filter((s) => s.annotationSide === "left");
  const rightSegments = prompt.segments.filter((s) => s.annotationSide === "right");

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-v-700 mb-2.5">
        <span className="text-g-500">&#x2726;</span> {label}
      </div>

      {/* Desktop 3-column layout */}
      <div className="hidden lg:grid grid-cols-[180px_1fr_180px] gap-4 items-start">
        {/* Left annotations */}
        <div className="flex flex-col justify-start pt-2">
          {leftSegments.map((seg, i) => (
            <AnnotationTip key={i} segment={seg} />
          ))}
        </div>

        {/* Center: dark prompt box */}
        <div className="relative bg-n-900 rounded-[10px] py-5 px-5.5">
          <button
            onClick={copyPrompt}
            className={`absolute top-4 right-4 text-[13px] font-bold px-4 py-1.5 rounded-2xl border-none cursor-pointer transition-all duration-150 z-10 ${
              copied
                ? "bg-[#059669] text-white"
                : "bg-v-500 text-white hover:bg-v-400 hover:-translate-y-px"
            }`}
          >
            {copied ? "Copied \u2713" : "Copy prompt"}
          </button>

          <div className="flex flex-col gap-3 pr-28">
            {prompt.segments.map((seg, i) => (
              <div
                key={i}
                className={`border-l-[3px] pl-4 py-1 ${
                  borderColorMap[seg.color] || "border-l-v-500"
                }`}
              >
                <div className="text-[15px] text-n-100 leading-[1.75] whitespace-pre-wrap">
                  {renderBrackets(seg.text)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right annotations */}
        <div className="flex flex-col justify-start pt-2">
          {rightSegments.map((seg, i) => (
            <AnnotationTip key={i} segment={seg} />
          ))}
        </div>
      </div>

      {/* Mobile / narrow layout: annotations inline */}
      <div className="lg:hidden">
        <div className="relative bg-n-900 rounded-[10px] py-5 px-5.5">
          <button
            onClick={copyPrompt}
            className={`absolute top-4 right-4 text-[13px] font-bold px-4 py-1.5 rounded-2xl border-none cursor-pointer transition-all duration-150 z-10 ${
              copied
                ? "bg-[#059669] text-white"
                : "bg-v-500 text-white hover:bg-v-400 hover:-translate-y-px"
            }`}
          >
            {copied ? "Copied \u2713" : "Copy prompt"}
          </button>

          <div className="flex flex-col gap-3 pr-28">
            {prompt.segments.map((seg, i) => (
              <div key={i}>
                <div
                  className={`text-[10px] font-black uppercase tracking-[.08em] mb-1 ${
                    labelColorMap[seg.color] || "text-am-600"
                  }`}
                >
                  {seg.label}
                </div>
                <div
                  className={`border-l-[3px] pl-4 py-1 ${
                    borderColorMap[seg.color] || "border-l-v-500"
                  }`}
                >
                  <div className="text-[15px] text-n-100 leading-[1.75] whitespace-pre-wrap">
                    {renderBrackets(seg.text)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bracket slot legend */}
      {prompt.bracketSlots.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {prompt.bracketSlots.map((slot, i) => (
            <span key={i} className="text-xs text-v-700 bg-v-100 px-2 py-1 rounded-lg">
              <strong>{slot.placeholder}</strong> &mdash; {slot.hint}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
