"use client";

import { useState } from "react";
import { PromptVersion } from "@/lib/types";

const VARIABLES = [
  "{role}",
  "{task}",
  "{time}",
  "{category}",
];

function HighlightedTextarea({
  value,
  onChange,
  rows,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
  label: string;
}) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex gap-1 flex-wrap">
          {VARIABLES.map((v) => {
            const used = value.includes(v);
            return (
              <span
                key={v}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  used
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {v}
              </span>
            );
          })}
        </div>
      </div>
      <textarea
        className="w-full text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none resize-none"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function PromptEditorComponent({
  prompts,
  onSave,
}: {
  prompts: PromptVersion[];
  onSave: (prompts: PromptVersion[]) => void;
}) {
  const [selectedId, setSelectedId] = useState(
    prompts[prompts.length - 1]?.id || "v2"
  );

  const selected = prompts.find((p) => p.id === selectedId) || prompts[0];

  const updatePrompt = (field: "systemPrompt" | "userPrompt" | "name", value: string) => {
    const updated = prompts.map((p) =>
      p.id === selectedId ? { ...p, [field]: value } : p
    );
    onSave(updated);
  };

  const createNew = () => {
    const nextNum = prompts.length + 2;
    const newId = `v${nextNum}`;
    const newPrompt: PromptVersion = {
      id: newId,
      name: `v${nextNum} — Custom`,
      systemPrompt: selected.systemPrompt,
      userPrompt: selected.userPrompt,
    };
    const updated = [...prompts, newPrompt];
    onSave(updated);
    setSelectedId(newId);
  };

  const deleteVersion = () => {
    if (prompts.length <= 1) return;
    const updated = prompts.filter((p) => p.id !== selectedId);
    onSave(updated);
    setSelectedId(updated[updated.length - 1].id);
  };

  if (!selected) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:border-purple-400 outline-none"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {prompts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={createNew}
          className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition-colors"
        >
          + New Version
        </button>
        {prompts.length > 1 && (
          <button
            onClick={deleteVersion}
            className="text-xs text-red-500 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        )}
        <input
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 ml-auto w-48"
          value={selected.name}
          onChange={(e) => updatePrompt("name", e.target.value)}
          placeholder="Version name"
        />
      </div>

      <div className="flex gap-4">
        <HighlightedTextarea
          label="System Prompt"
          value={selected.systemPrompt}
          onChange={(v) => updatePrompt("systemPrompt", v)}
          rows={20}
        />
        <HighlightedTextarea
          label="User Prompt"
          value={selected.userPrompt}
          onChange={(v) => updatePrompt("userPrompt", v)}
          rows={20}
        />
      </div>
    </div>
  );
}
