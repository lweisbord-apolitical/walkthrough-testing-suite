"use client";

import { useState, useEffect, useMemo } from "react";
import { OutputEnvelope } from "@/lib/types";
import { getResults, clearResults } from "@/lib/store";
import WalkthroughCard from "@/components/WalkthroughCard";

export default function ResultsPage() {
  const [results, setResults] = useState<OutputEnvelope[]>([]);
  const [filterVersion, setFilterVersion] = useState("all");
  const [filterModel, setFilterModel] = useState("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setResults(getResults());
    setMounted(true);
  }, []);

  const versions = useMemo(
    () => [...new Set(results.map((r) => r.meta.promptVersion))],
    [results]
  );
  const models = useMemo(
    () => [...new Set(results.map((r) => r.meta.model))],
    [results]
  );

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (filterVersion !== "all" && r.meta.promptVersion !== filterVersion)
        return false;
      if (filterModel !== "all" && r.meta.model !== filterModel) return false;
      return true;
    });
  }, [results, filterVersion, filterModel]);

  const handleClear = () => {
    clearResults();
    setResults([]);
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
          <h1 className="text-xl font-semibold text-gray-900">Results</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} of {results.length} results
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {versions.length > 0 && (
            <select
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
              value={filterVersion}
              onChange={(e) => setFilterVersion(e.target.value)}
            >
              <option value="all">All Versions</option>
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}
          {models.length > 0 && (
            <select
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
            >
              <option value="all">All Models</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          {results.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-red-500 border border-red-300 px-3 py-1.5 rounded-md hover:bg-red-50"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            No results yet. Go to the{" "}
            <a href="/run" className="text-purple-600 underline">
              Runner
            </a>{" "}
            to generate some.
          </p>
        </div>
      ) : (
        <div className="bg-[#f5f5f7] rounded-xl p-6">
          {filtered.map((envelope, i) => (
            <WalkthroughCard key={`${envelope.meta.caseId}-${envelope.meta.promptVersion}-${envelope.meta.model}`} envelope={envelope} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
