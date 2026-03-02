"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TestCase } from "@/lib/types";
import { getCases, saveCases, resetCases, getResults, exportAll, importAll } from "@/lib/store";
import CaseEditor from "@/components/CaseEditor";

export default function Dashboard() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCases(getCases());
    setResultCount(getResults().length);
    setMounted(true);
  }, []);

  const handleSaveCases = (updated: TestCase[]) => {
    saveCases(updated);
    setCases(updated);
  };

  const handleReset = () => {
    resetCases();
    setCases(getCases());
  };

  const handleExport = () => {
    const json = exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `walkthrough-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      importAll(text);
      setCases(getCases());
      setResultCount(getResults().length);
    };
    input.click();
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
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {cases.length} test cases &middot; {resultCount} results
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-100"
          >
            Export JSON
          </button>
          <button
            onClick={handleImport}
            className="text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-100"
          >
            Import JSON
          </button>
          <button
            onClick={handleReset}
            className="text-xs text-red-500 border border-red-300 px-3 py-1.5 rounded-md hover:bg-red-50"
          >
            Reset Cases
          </button>
          <Link
            href="/run"
            className="text-xs bg-purple-600 text-white px-4 py-1.5 rounded-md hover:bg-purple-700 transition-colors font-medium"
          >
            Run All &rarr;
          </Link>
        </div>
      </div>

      <CaseEditor cases={cases} onSave={handleSaveCases} />
    </div>
  );
}
