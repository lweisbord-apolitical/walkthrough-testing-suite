export type GWACategory = "workOutput" | "mentalProcesses" | "informationInput" | "interactingWithOthers";
export type AIExposure = "E0" | "E1" | "E2";

export interface TaskInput {
  id: number;
  csvId: string;
  task: string;
  userDescription: string;
  category: GWACategory;
  timePercentage: number;
  aiFrequency: string;
  aiDescription: string;
  aiExposure: AIExposure | null;
}

// ── v3 Tier System ──────────────────────────────────────────

export type Tier = "beginner" | "proficient";

const BEGINNER_FREQUENCIES = ["Never", "Rarely", "Occasionally"];

export function determineTier(aiFrequency: string): Tier {
  return BEGINNER_FREQUENCIES.includes(aiFrequency) ? "beginner" : "proficient";
}

export const TECHNIQUE_NAMES = {
  keepGoing: "Keep the conversation going",
  giveContext: "Give AI your context",
  checkWork: "Make AI check its own work",
} as const;

// ── Annotated Prompt Types ───────────────────────────────────

export type AnnotationSide = "left" | "right";

export interface PromptSegment {
  label: string;
  text: string;
  annotationSide: AnnotationSide;
  annotationTip: string;
  color: string;
}

export interface AnnotatedPrompt {
  segments: PromptSegment[];
  bracketSlots: { placeholder: string; hint: string }[];
}

export interface PlainPrompt {
  text: string;
  bracketSlots: { placeholder: string; hint: string }[];
}

export type PromptData = PlainPrompt | AnnotatedPrompt;

export function isAnnotatedPrompt(p: PromptData): p is AnnotatedPrompt {
  return "segments" in p && Array.isArray((p as AnnotatedPrompt).segments);
}

// ── v3 Walkthrough Step Types ───────────────────────────────

export interface CheckFor {
  issue: string;
  verify: string;
}

export interface TechniqueSection {
  name: string;
  contextualisation: string;
  example?: string;
}

export interface WalkthroughStep {
  stepNumber: number;
  title: string;
  withAi: string;
  checkFor: CheckFor;
  prompt?: PromptData;
  technique?: TechniqueSection;
  followUps?: string[];
  watchOut?: { warning: string; remedy: string };
}

// ── v3 Card Structures ──────────────────────────────────────

export interface BeginnerCard {
  hook: { number: string; context: string };
  steps: WalkthroughStep[];
  timeComparison: TimeComparison;
}

export interface ProficientCard {
  hook: { number: string; context: string };
  steps: WalkthroughStep[];
  whyThisWorks: string;
  timeComparison: TimeComparison;
}

export interface TimeComparison {
  without: { total: string; breakdown: { activity: string; time: string }[] };
  withAi: { total: string; breakdown: { activity: string; time: string }[] };
  savingsPerInstance: string;
  savingsPerMonth: string;
  speedLabel: string;
}

export interface V3Module {
  task: string;
  userDescription: string;
  category: GWACategory;
  timePercentage: number;
  aiFrequency: string;
  aiDescription: string;
  aiExposure: AIExposure | null;
  beginner: BeginnerCard;
  proficient: ProficientCard;
}

// ── Review Types ────────────────────────────────────────────

export type QualityRating = "good" | "needs-work" | "bad" | null;
export type IssueTag =
  | "prompt-too-generic"
  | "steps-unclear"
  | "tips-not-specific"
  | "time-unrealistic"
  | "tone-mismatch"
  | "technique-not-contextualised"
  | "tiers-too-similar"
  | "watch-outs-weak"
  | "other";

export interface TaskReview {
  taskId: number;
  rating: QualityRating;
  issues: IssueTag[];
  notes: string;
}

export interface GenerationResult {
  taskInput: TaskInput;
  module: V3Module | null;
  error: string | null;
  generatedAt: string;
  promptVersion: string;
}
