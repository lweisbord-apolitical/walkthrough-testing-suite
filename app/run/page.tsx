"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TestCase, PromptVersion, ModelId, OutputEnvelope, RunProgress } from "@/lib/types";
import { getCases, getPrompts, addResult } from "@/lib/store";

const MODELS: { id: ModelId; label: string }[] = [
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { id: "claude-opus-4-5-20250918", label: "Claude Opus 4.5" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
];

export default function RunPage() {
  const router = useRouter();
  const [cases, setCases] = useState<TestCase[]>([]);
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [mounted, setMounted] = useState(false);

  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [promptVersion, setPromptVersion] = useState("");
  const [model, setModel] = useState<ModelId>("claude-sonnet-4-5-20250929");
  const [temperature, setTemperature] = useState(0.6);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<RunProgress[]>([]);

  useEffect(() => {
    const c = getCases();
    const p = getPrompts();
    setCases(c);
    setPrompts(p);
    setSelectedCases(new Set(c.map((tc) => tc.id)));
    setPromptVersion(p[p.length - 1]?.id || "v2");
    setMounted(true);
  }, []);

  const toggleCase = (id: string) => {
    setSelectedCases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedCases(new Set(cases.map((c) => c.id)));
  const selectNone = () => setSelectedCases(new Set());

  const runTests = useCallback(async () => {
    const prompt = prompts.find((p) => p.id === promptVersion);
    if (!prompt) return;

    const caseList = cases.filter((c) => selectedCases.has(c.id));
    if (caseList.length === 0) return;

    setRunning(true);
    const initial: RunProgress[] = caseList.map((c) => ({
      caseId: c.id,
      status: "pending",
    }));
    setProgress(initial);

    for (let i = 0; i < caseList.length; i++) {
      const tc = caseList[i];

      setProgress((prev) =>
        prev.map((p) =>
          p.caseId === tc.id ? { ...p, status: "running" } : p
        )
      );

      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testCase: tc,
            systemPrompt: prompt.systemPrompt,
            userPrompt: prompt.userPrompt,
            model,
            temperature,
          }),
        });

        const data = await res.json();

        if (data.success) {
          const envelope: OutputEnvelope = {
            meta: {
              caseId: tc.id,
              promptVersion,
              model,
              generatedAt: new Date().toISOString(),
              temperature,
            },
            input: tc,
            output: data.output,
          };
          addResult(envelope);
          setProgress((prev) =>
            prev.map((p) =>
              p.caseId === tc.id ? { ...p, status: "done" } : p
            )
          );
        } else {
          setProgress((prev) =>
            prev.map((p) =>
              p.caseId === tc.id
                ? { ...p, status: "error", error: data.error }
                : p
            )
          );
        }
      } catch (err) {
        setProgress((prev) =>
          prev.map((p) =>
            p.caseId === tc.id
              ? {
                  ...p,
                  status: "error",
                  error: err instanceof Error ? err.message : "Unknown error",
                }
              : p
          )
        );
      }
    }

    setRunning(false);

    // Auto-navigate to results after a short delay
    setTimeout(() => router.push("/results"), 1500);
  }, [cases, prompts, selectedCases, promptVersion, model, temperature, router]);

  if (!mounted) {
    return (
      <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>
    );
  }

  const doneCount = progress.filter((p) => p.status === "done").length;
  const errorCount = progress.filter((p) => p.status === "error").length;
  const totalCount = progress.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Runner</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select cases and config, then run.
          </p>
        </div>
      </div>

      {/* Config */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Prompt Version
            </label>
            <select
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
              value={promptVersion}
              onChange={(e) => setPromptVersion(e.target.value)}
              disabled={running}
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Model
            </label>
            <select
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
              value={model}
              onChange={(e) => setModel(e.target.value as ModelId)}
              disabled={running}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full mt-1"
              disabled={running}
            />
          </div>
        </div>
      </div>

      {/* Case Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Select Cases ({selectedCases.size} of {cases.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-purple-600 hover:underline"
              disabled={running}
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="text-xs text-gray-500 hover:underline"
              disabled={running}
            >
              Select None
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {cases.map((c) => {
            const p = progress.find((p) => p.caseId === c.id);
            return (
              <label
                key={c.id}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                  selectedCases.has(c.id)
                    ? "bg-purple-50 border border-purple-200"
                    : "bg-gray-50 border border-transparent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCases.has(c.id)}
                  onChange={() => toggleCase(c.id)}
                  disabled={running}
                  className="accent-purple-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{c.task}</p>
                  <span className="text-[10px] text-gray-500">{c.id}</span>
                </div>
                {p && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      p.status === "done"
                        ? "bg-green-100 text-green-700"
                        : p.status === "error"
                        ? "bg-red-100 text-red-700"
                        : p.status === "running"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.status === "running" ? "Running..." : p.status}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Run Button + Progress */}
      <div className="flex items-center gap-4">
        <button
          onClick={runTests}
          disabled={running || selectedCases.size === 0}
          className={`text-sm font-medium px-6 py-2.5 rounded-md transition-colors ${
            running || selectedCases.size === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
          {running
            ? `Running... (${doneCount + errorCount}/${totalCount})`
            : `Run ${selectedCases.size} case${selectedCases.size !== 1 ? "s" : ""}`}
        </button>

        {progress.length > 0 && !running && (
          <span className="text-sm text-gray-500">
            Done: {doneCount} passed, {errorCount} failed
          </span>
        )}
      </div>

      {/* Error Details */}
      {progress.some((p) => p.status === "error") && (
        <div className="mt-4 space-y-2">
          {progress
            .filter((p) => p.status === "error")
            .map((p) => (
              <div
                key={p.caseId}
                className="bg-red-50 border border-red-200 rounded-md p-3"
              >
                <p className="text-sm font-medium text-red-800">{p.caseId}</p>
                <p className="text-xs text-red-600 mt-1">{p.error}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
