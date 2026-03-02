"use client";

import { TestCase, PromptVersion, OutputEnvelope } from "./types";
import { DEFAULT_CASES, DEFAULT_PROMPTS } from "./defaults";

const KEYS = {
  cases: "wt-cases",
  prompts: "wt-prompts",
  results: "wt-results",
} as const;

function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Cases ---
export function getCases(): TestCase[] {
  return get(KEYS.cases, DEFAULT_CASES);
}

export function saveCases(cases: TestCase[]): void {
  set(KEYS.cases, cases);
}

export function resetCases(): void {
  set(KEYS.cases, DEFAULT_CASES);
}

// --- Prompts ---
export function getPrompts(): PromptVersion[] {
  return get(KEYS.prompts, DEFAULT_PROMPTS);
}

export function savePrompts(prompts: PromptVersion[]): void {
  set(KEYS.prompts, prompts);
}

export function resetPrompts(): void {
  set(KEYS.prompts, DEFAULT_PROMPTS);
}

// --- Results ---
export function getResults(): OutputEnvelope[] {
  return get(KEYS.results, []);
}

export function saveResults(results: OutputEnvelope[]): void {
  set(KEYS.results, results);
}

export function addResult(result: OutputEnvelope): void {
  const existing = getResults();
  // Replace if same caseId + promptVersion + model, otherwise append
  const idx = existing.findIndex(
    (r) =>
      r.meta.caseId === result.meta.caseId &&
      r.meta.promptVersion === result.meta.promptVersion &&
      r.meta.model === result.meta.model
  );
  if (idx >= 0) {
    existing[idx] = result;
  } else {
    existing.push(result);
  }
  saveResults(existing);
}

export function clearResults(): void {
  set(KEYS.results, []);
}

// --- Export/Import ---
export function exportAll(): string {
  return JSON.stringify(
    {
      cases: getCases(),
      prompts: getPrompts(),
      results: getResults(),
    },
    null,
    2
  );
}

export function importAll(json: string): void {
  const data = JSON.parse(json);
  if (data.cases) saveCases(data.cases);
  if (data.prompts) savePrompts(data.prompts);
  if (data.results) saveResults(data.results);
}
