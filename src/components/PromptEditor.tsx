"use client";

import { useState } from "react";

export default function PromptEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-n-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-n-50 hover:bg-n-100 transition-colors text-left"
      >
        <span className="text-sm font-bold text-n-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-n-500">{value.length} chars</span>
          <svg
            className={`w-4 h-4 text-n-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 text-sm font-mono border-t border-n-100 focus:outline-none resize-y min-h-[200px] bg-n-900 text-n-100"
          style={{ minHeight: 300 }}
          spellCheck={false}
        />
      )}
    </div>
  );
}
