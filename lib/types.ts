export interface TestCase {
  id: string;
  role: string;
  task: string;
  time: string;
  category: "ANALYSIS" | "OUTPUT" | "COORDINATION";
  tool?: string;
  workspace?: string;
}

export interface PromptExample {
  initialPrompt: string;
  followUp: string;
  refinementPattern: string;
}

export interface Phase {
  title: string;
  manualApproach: string;
  withAI: string;
  evaluationCheck: string;
  promptExample?: PromptExample;
  humanEdge?: string;
}

export interface WalkthroughOutput {
  scenario: string;
  phases: Phase[];
}

export interface OutputEnvelope {
  meta: {
    caseId: string;
    promptVersion: string;
    model: string;
    generatedAt: string;
    temperature: number;
  };
  input: TestCase;
  output: WalkthroughOutput;
}

export interface PromptVersion {
  id: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
}

export type ModelId =
  | "claude-sonnet-4-5-20250929"
  | "claude-opus-4-5-20250918"
  | "gpt-4o"
  | "gpt-4o-mini";

export interface RunConfig {
  promptVersion: string;
  model: ModelId;
  temperature: number;
  caseIds: string[];
}

export interface RunProgress {
  caseId: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}
