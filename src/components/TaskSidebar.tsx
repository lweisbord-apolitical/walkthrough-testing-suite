"use client";

import { TaskInput, GenerationResult, QualityRating, AIExposure, GWACategory, Tier, determineTier } from "@/types";

interface Filters {
  category: GWACategory | "";
  aiFrequency: string;
  aiExposure: AIExposure | "";
  rating: QualityRating | "unrated" | "";
  tier: Tier | "";
}

export default function TaskSidebar({
  tasks,
  results,
  reviews,
  selectedTaskId,
  onSelectTask,
  filters,
  onFiltersChange,
}: {
  tasks: TaskInput[];
  results: Map<number, GenerationResult>;
  reviews: Map<number, { rating: QualityRating }>;
  selectedTaskId: number | null;
  onSelectTask: (id: number) => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}) {
  const uniqueFrequencies = [...new Set(tasks.map((t) => t.aiFrequency))].sort();

  const filteredTasks = tasks.filter((t) => {
    if (filters.category && t.category !== filters.category) return false;
    if (filters.aiFrequency && t.aiFrequency !== filters.aiFrequency) return false;
    if (filters.aiExposure && t.aiExposure !== filters.aiExposure) return false;
    if (filters.tier) {
      const taskTier = determineTier(t.aiFrequency);
      if (taskTier !== filters.tier) return false;
    }
    if (filters.rating) {
      const review = reviews.get(t.id);
      if (filters.rating === "unrated" && review?.rating) return false;
      if (filters.rating !== "unrated" && review?.rating !== filters.rating) return false;
    }
    return true;
  });

  const ratingDot = (taskId: number) => {
    const review = reviews.get(taskId);
    if (!review?.rating) return null;
    const colors: Record<string, string> = {
      good: "bg-g-500",
      "needs-work": "bg-am-600",
      bad: "bg-red-500",
    };
    return <span className={`w-2 h-2 rounded-full ${colors[review.rating] || ""}`} />;
  };

  const categoryLabels: Record<string, string> = {
    workOutput: "Work Output",
    mentalProcesses: "Mental Processes",
    informationInput: "Information Input",
    interactingWithOthers: "Interacting With Others",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 border-b border-n-100 space-y-2">
        <select
          value={filters.category}
          onChange={(e) => onFiltersChange({ ...filters, category: e.target.value as GWACategory | "" })}
          className="w-full text-xs border border-n-100 rounded-lg px-2 py-1.5 bg-white text-n-700 focus:outline-none focus:ring-2 focus:ring-v-300"
        >
          <option value="">All categories</option>
          {Object.entries(categoryLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            value={filters.aiFrequency}
            onChange={(e) => onFiltersChange({ ...filters, aiFrequency: e.target.value })}
            className="flex-1 text-xs border border-n-100 rounded-lg px-2 py-1.5 bg-white text-n-700 focus:outline-none focus:ring-2 focus:ring-v-300"
          >
            <option value="">All AI frequency</option>
            {uniqueFrequencies.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            value={filters.aiExposure}
            onChange={(e) => onFiltersChange({ ...filters, aiExposure: e.target.value as AIExposure | "" })}
            className="flex-1 text-xs border border-n-100 rounded-lg px-2 py-1.5 bg-white text-n-700 focus:outline-none focus:ring-2 focus:ring-v-300"
          >
            <option value="">All exposure</option>
            <option value="E0">E0</option>
            <option value="E1">E1</option>
            <option value="E2">E2</option>
          </select>
        </div>

        <div className="flex gap-2">
          <select
            value={filters.tier}
            onChange={(e) => onFiltersChange({ ...filters, tier: e.target.value as Tier | "" })}
            className="flex-1 text-xs border border-n-100 rounded-lg px-2 py-1.5 bg-white text-n-700 focus:outline-none focus:ring-2 focus:ring-v-300"
          >
            <option value="">All tiers</option>
            <option value="beginner">Beginner</option>
            <option value="proficient">Proficient</option>
          </select>

          <select
            value={filters.rating ?? ""}
            onChange={(e) => onFiltersChange({ ...filters, rating: e.target.value as Filters["rating"] })}
            className="flex-1 text-xs border border-n-100 rounded-lg px-2 py-1.5 bg-white text-n-700 focus:outline-none focus:ring-2 focus:ring-v-300"
          >
            <option value="">All ratings</option>
            <option value="good">Good</option>
            <option value="needs-work">Needs Work</option>
            <option value="bad">Bad</option>
            <option value="unrated">Unrated</option>
          </select>
        </div>

        <p className="text-xs text-n-500">{filteredTasks.length} of {tasks.length} tasks</p>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.map((t) => {
          const hasResult = results.has(t.id);
          const tier = determineTier(t.aiFrequency);
          return (
            <button
              key={t.id}
              onClick={() => onSelectTask(t.id)}
              className={`w-full text-left px-3 py-2 border-b border-n-100/50 hover:bg-n-50 transition-colors ${
                selectedTaskId === t.id ? "bg-v-50 border-l-2 border-l-v-500" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-n-500 w-5 shrink-0">#{t.id}</span>
                {ratingDot(t.id)}
                {hasResult && <span className="w-1.5 h-1.5 rounded-full bg-v-500" title="Generated" />}
                <span
                  className={`ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                    tier === "beginner"
                      ? "bg-g-50 text-g-500 border border-g-300/30"
                      : "bg-v-50 text-v-700 border border-v-100"
                  }`}
                >
                  {tier === "beginner" ? "B" : "P"}
                </span>
              </div>
              <p className="text-xs text-n-800 line-clamp-2 mt-0.5">{t.task}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-n-500">{t.timePercentage}%</span>
                <span className="text-[10px] text-n-200">&middot;</span>
                <span className="text-[10px] text-n-500">{t.aiFrequency}</span>
                {t.aiExposure && (
                  <>
                    <span className="text-[10px] text-n-200">&middot;</span>
                    <span className="text-[10px] text-n-500">{t.aiExposure}</span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { Filters };
