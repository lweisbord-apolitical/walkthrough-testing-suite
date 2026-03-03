"use client";

import { useState } from "react";
import { TestCase } from "@/lib/types";

export default function CaseEditor({
  cases,
  onSave,
}: {
  cases: TestCase[];
  onSave: (cases: TestCase[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TestCase | null>(null);

  const startEdit = (c: TestCase) => {
    setEditingId(c.id);
    setDraft({ ...c });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!draft) return;
    const updated = cases.map((c) => (c.id === draft.id ? draft : c));
    onSave(updated);
    setEditingId(null);
    setDraft(null);
  };

  const deleteCase = (id: string) => {
    onSave(cases.filter((c) => c.id !== id));
  };

  const addCase = () => {
    const newCase: TestCase = {
      id: `case-${Date.now()}`,
      role: "Product Manager",
      task: "",
      time: "~8 hrs/mo",
      category: "ANALYSIS",
    };
    onSave([...cases, newCase]);
    startEdit(newCase);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Test Cases ({cases.length})
        </h2>
        <button
          onClick={addCase}
          className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition-colors"
        >
          + Add Case
        </button>
      </div>

      <div className="space-y-2">
        {cases.map((c) => {
          if (editingId === c.id && draft) {
            return (
              <div
                key={c.id}
                className="border border-purple-300 rounded-lg p-4 bg-purple-50/50"
              >
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      ID
                    </label>
                    <input
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                      value={draft.id}
                      onChange={(e) =>
                        setDraft({ ...draft, id: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      Role
                    </label>
                    <input
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                      value={draft.role}
                      onChange={(e) =>
                        setDraft({ ...draft, role: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-xs text-gray-500 block mb-1">
                    Task
                  </label>
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 resize-none"
                    rows={2}
                    value={draft.task}
                    onChange={(e) =>
                      setDraft({ ...draft, task: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      Time
                    </label>
                    <input
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                      value={draft.time}
                      onChange={(e) =>
                        setDraft({ ...draft, time: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      Category
                    </label>
                    <select
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                      value={draft.category}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          category: e.target.value as TestCase["category"],
                        })
                      }
                    >
                      <option>ANALYSIS</option>
                      <option>OUTPUT</option>
                      <option>COORDINATION</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-xs text-gray-500 px-3 py-1.5 rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={c.id}
              className="border border-gray-200 rounded-lg p-3 flex items-center justify-between group hover:border-gray-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600">
                    {c.category}
                  </span>
                  <span className="text-[10px] text-gray-400">{c.id}</span>
                </div>
                <p className="text-sm text-gray-800 truncate">{c.task}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] text-gray-500">{c.time}</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(c)}
                  className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteCase(c.id)}
                  className="text-xs text-red-500 px-2 py-1 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
