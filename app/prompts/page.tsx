"use client";

import { useState, useEffect } from "react";
import { PromptVersion } from "@/lib/types";
import { getPrompts, savePrompts, resetPrompts } from "@/lib/store";
import PromptEditorComponent from "@/components/PromptEditor";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPrompts(getPrompts());
    setMounted(true);
  }, []);

  const handleSave = (updated: PromptVersion[]) => {
    savePrompts(updated);
    setPrompts(updated);
  };

  const handleReset = () => {
    resetPrompts();
    setPrompts(getPrompts());
  };

  if (!mounted) {
    return (
      <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Prompt Editor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit system and user prompts. Changes saved to localStorage instantly.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-red-500 border border-red-300 px-3 py-1.5 rounded-md hover:bg-red-50"
        >
          Reset to Defaults
        </button>
      </div>

      <PromptEditorComponent prompts={prompts} onSave={handleSave} />
    </div>
  );
}
