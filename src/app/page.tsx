"use client";

import { useState, useCallback, useRef } from "react";
import { sampleTasks } from "@/data/tasks";
import { DEFAULT_PROMPT_V3 } from "@/data/prompts";
import { GenerationResult, TaskReview, QualityRating, Tier, determineTier } from "@/types";
import OpportunityCard from "@/components/OpportunityCard";
import ReviewPanel from "@/components/ReviewPanel";
import PromptEditor from "@/components/PromptEditor";
import TaskSidebar, { Filters } from "@/components/TaskSidebar";

export default function Home() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT_V3);
  const [results, setResults] = useState<Map<number, GenerationResult>>(new Map());
  const [reviews, setReviews] = useState<Map<number, TaskReview>>(new Map());
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(1);
  const [loading, setLoading] = useState<Set<number>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [tierOverride, setTierOverride] = useState<Tier | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    category: "",
    aiFrequency: "",
    aiExposure: "",
    rating: "",
    tier: "",
  });
  const abortRef = useRef(false);

  const selectedTask = sampleTasks.find((t) => t.id === selectedTaskId) || null;
  const selectedResult = selectedTaskId ? results.get(selectedTaskId) : null;

  // Determine active tier for selected task
  const autoTier = selectedTask ? determineTier(selectedTask.aiFrequency) : "beginner";
  const activeTier: Tier = tierOverride || autoTier;

  const getReview = (taskId: number): TaskReview =>
    reviews.get(taskId) || { taskId, rating: null, issues: [], notes: "" };

  const generateForTask = useCallback(
    async (taskId: number) => {
      const task = sampleTasks.find((t) => t.id === taskId);
      if (!task) return;

      setLoading((prev) => new Set(prev).add(taskId));
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task,
            promptTemplate: prompt,
          }),
        });
        const data: GenerationResult = await res.json();
        setResults((prev) => new Map(prev).set(taskId, data));
      } catch (err) {
        const errorResult: GenerationResult = {
          taskInput: task,
          module: null,
          error: err instanceof Error ? err.message : "Network error",
          generatedAt: new Date().toISOString(),
          promptVersion: "v3",
        };
        setResults((prev) => new Map(prev).set(taskId, errorResult));
      } finally {
        setLoading((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [prompt]
  );

  const runAll = useCallback(async () => {
    setBulkRunning(true);
    abortRef.current = false;

    for (const task of sampleTasks) {
      if (abortRef.current) break;
      await generateForTask(task.id);
    }

    setBulkRunning(false);
  }, [generateForTask]);

  const stopBulk = () => {
    abortRef.current = true;
  };

  const exportResults = () => {
    const data = {
      promptVersion: "v3",
      prompt,
      results: Object.fromEntries(results),
      reviews: Object.fromEntries(reviews),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spark-v3-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    generated: results.size,
    good: [...reviews.values()].filter((r) => r.rating === "good").length,
    needsWork: [...reviews.values()].filter((r) => r.rating === "needs-work").length,
    bad: [...reviews.values()].filter((r) => r.rating === "bad").length,
  };

  // Navigate
  const taskIds = sampleTasks.map((t) => t.id);
  const currentIndex = selectedTaskId ? taskIds.indexOf(selectedTaskId) : -1;
  const goPrev = () => {
    if (currentIndex > 0) setSelectedTaskId(taskIds[currentIndex - 1]);
  };
  const goNext = () => {
    if (currentIndex < taskIds.length - 1) setSelectedTaskId(taskIds[currentIndex + 1]);
  };

  return (
    <div className="h-screen flex flex-col bg-n-50/50">
      {/* Top bar */}
      <header className="bg-white border-b border-n-100 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-v-500" />
            <h1 className="text-lg font-black text-n-900">SPARK v3 Workbench</h1>
          </div>
          <span className="text-xs text-n-500">LRN-225 / Feb 2026</span>

          {/* Tier toggle */}
          <div className="flex items-center gap-1 bg-n-50 rounded-xl border border-n-100 p-0.5">
            {(["beginner", "proficient"] as Tier[]).map((t) => (
              <button
                key={t}
                onClick={() => setTierOverride(tierOverride === t ? null : t)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors capitalize ${
                  activeTier === t
                    ? t === "beginner"
                      ? "bg-g-50 text-g-500 border border-g-300/30"
                      : "bg-v-50 text-v-700 border border-v-100"
                    : "text-n-500 hover:text-n-700"
                }`}
              >
                {t}
              </button>
            ))}
            {tierOverride && (
              <button
                onClick={() => setTierOverride(null)}
                className="text-[10px] px-1.5 py-1 text-n-500 hover:text-n-700"
                title="Reset to auto-detect"
              >
                Auto
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-n-500">
            <span>{stats.generated}/{sampleTasks.length} generated</span>
            <span className="text-n-200">|</span>
            {stats.good > 0 && <span className="text-g-500">{stats.good} good</span>}
            {stats.needsWork > 0 && <span className="text-am-600">{stats.needsWork} needs work</span>}
            {stats.bad > 0 && <span className="text-red-600">{stats.bad} bad</span>}
          </div>
          <button
            onClick={exportResults}
            className="text-xs px-3 py-1.5 rounded-xl bg-n-50 border border-n-100 hover:bg-n-100 text-n-700 font-bold transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors ${
              compareMode
                ? "bg-v-700 text-white border border-v-700"
                : "bg-n-50 border border-n-100 hover:bg-n-100 text-n-700"
            }`}
          >
            {compareMode ? "Exit Compare" : "Compare Tiers"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-n-100 flex flex-col shrink-0">
          <TaskSidebar
            tasks={sampleTasks}
            results={results}
            reviews={reviews as Map<number, { rating: QualityRating }>}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Prompt editor + controls */}
          <div className="p-4 border-b border-n-100 bg-white space-y-3">
            <PromptEditor label="Prompt v3 — Single Generation (Beginner + Proficient)" value={prompt} onChange={setPrompt} />

            <div className="flex items-center gap-3">
              {selectedTask && (
                <button
                  onClick={() => generateForTask(selectedTask.id)}
                  disabled={loading.has(selectedTask.id)}
                  className="text-sm px-4 py-2 rounded-xl bg-v-700 hover:bg-v-800 text-white font-bold disabled:opacity-50 transition-colors"
                >
                  {loading.has(selectedTask.id) ? "Generating..." : `Generate #${selectedTask.id}`}
                </button>
              )}
              <button
                onClick={bulkRunning ? stopBulk : runAll}
                className={`text-sm px-4 py-2 rounded-xl font-bold transition-colors ${
                  bulkRunning
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-n-800 hover:bg-n-900 text-white"
                }`}
              >
                {bulkRunning ? "Stop" : `Run All ${sampleTasks.length}`}
              </button>
              {loading.size > 0 && (
                <span className="text-xs text-n-500 animate-pulse">
                  Generating {loading.size} task(s)...
                </span>
              )}
            </div>
          </div>

          {/* Card display */}
          <div className="p-6">
            {selectedTask ? (
              <div className={compareMode ? "grid grid-cols-2 gap-6" : ""}>
                {/* Main / Beginner result */}
                <div className="bg-white rounded-xl border border-n-100 p-6 shadow-sm">
                  {compareMode && (
                    <p className="text-xs font-bold text-g-500 uppercase tracking-wider mb-4">
                      Beginner
                    </p>
                  )}
                  {selectedResult?.module ? (
                    <OpportunityCard
                      module={selectedResult.module}
                      tier={compareMode ? "beginner" : activeTier}
                      index={sampleTasks.findIndex((t) => t.id === selectedTaskId)}
                    />
                  ) : selectedResult?.error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">Generation Error</p>
                      <p className="text-sm text-red-600 mt-1">{selectedResult.error}</p>
                    </div>
                  ) : loading.has(selectedTask.id) ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-v-300 border-t-v-700 rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-n-500 mt-3">Generating both tiers...</p>
                        <p className="text-xs text-n-500 mt-1">Single API call for beginner + proficient</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-n-500">
                      <p className="text-lg">No result yet</p>
                      <p className="text-sm mt-1">Click &quot;Generate&quot; to create both tier cards</p>
                    </div>
                  )}

                  {selectedResult?.generatedAt && !compareMode && (
                    <p className="text-xs text-n-500 mt-4 pt-4 border-t border-n-100">
                      Generated: {new Date(selectedResult.generatedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Compare: Proficient side */}
                {compareMode && (
                  <div className="bg-white rounded-xl border border-v-200 p-6 shadow-sm">
                    <p className="text-xs font-bold text-v-700 uppercase tracking-wider mb-4">
                      Proficient
                    </p>
                    {selectedResult?.module ? (
                      <OpportunityCard
                        module={selectedResult.module}
                        tier="proficient"
                        index={sampleTasks.findIndex((t) => t.id === selectedTaskId)}
                      />
                    ) : (
                      <div className="text-center py-20 text-n-500">
                        <p className="text-sm">Generate the card first to compare tiers</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-n-500">
                <p className="text-lg">Select a task from the sidebar</p>
              </div>
            )}

            {/* Review panel */}
            {selectedTaskId && selectedResult?.module && (
              <div className="mt-6">
                <ReviewPanel
                  review={getReview(selectedTaskId)}
                  onChange={(r) => setReviews((prev) => new Map(prev).set(selectedTaskId, r))}
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={goPrev}
                disabled={currentIndex <= 0}
                className="text-sm px-4 py-2 rounded-xl bg-white border border-n-100 hover:bg-n-50 disabled:opacity-30 font-bold text-n-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-n-500">
                {currentIndex + 1} of {sampleTasks.length}
              </span>
              <button
                onClick={goNext}
                disabled={currentIndex >= taskIds.length - 1}
                className="text-sm px-4 py-2 rounded-xl bg-white border border-n-100 hover:bg-n-50 disabled:opacity-30 font-bold text-n-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
