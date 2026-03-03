import { TestCase, PromptVersion } from "./types";

export const DEFAULT_CASES: TestCase[] = [
  {
    id: "pm-user-research",
    role: "Product Manager",
    task: "Conduct user research in collaboration with the user research team",
    time: "~12 hrs/mo",
    category: "ANALYSIS",
  },
  {
    id: "pm-pricing",
    role: "Product Manager",
    task: "Develop and implement pricing strategies for products",
    time: "~8 hrs/mo",
    category: "ANALYSIS",
  },
  {
    id: "pm-market-research",
    role: "Product Manager",
    task: "Conduct market research and competitive analysis to inform product strategy",
    time: "~10 hrs/mo",
    category: "ANALYSIS",
  },
  {
    id: "pm-strategic-plan",
    role: "Product Manager",
    task: "Develop and maintain strategic product roadmap documentation",
    time: "~6 hrs/mo",
    category: "OUTPUT",
  },
  {
    id: "pm-feature-specs",
    role: "Product Manager",
    task: "Write detailed feature specifications and acceptance criteria",
    time: "~15 hrs/mo",
    category: "OUTPUT",
  },
  {
    id: "pm-release-notes",
    role: "Product Manager",
    task: "Draft release notes and product update communications",
    time: "~4 hrs/mo",
    category: "OUTPUT",
  },
  {
    id: "pm-stakeholder-updates",
    role: "Product Manager",
    task: "Prepare stakeholder update presentations and status reports",
    time: "~8 hrs/mo",
    category: "OUTPUT",
  },
  {
    id: "pm-sprint-planning",
    role: "Product Manager",
    task: "Facilitate sprint planning and backlog prioritization with engineering",
    time: "~10 hrs/mo",
    category: "COORDINATION",
  },
  {
    id: "pm-cross-team",
    role: "Product Manager",
    task: "Coordinate cross-team dependencies and resolve blockers",
    time: "~8 hrs/mo",
    category: "COORDINATION",
  },
  {
    id: "pm-user-feedback",
    role: "Product Manager",
    task: "Synthesize user feedback from support tickets, surveys, and interviews into actionable insights",
    time: "~10 hrs/mo",
    category: "ANALYSIS",
  },
];

export const DEFAULT_PROMPTS: PromptVersion[] = [
  {
    id: "v2",
    name: "v2 — Base",
    systemPrompt: `You are an AI adoption specialist creating practical walkthrough scenarios for professionals. Your job is to decompose a work task into concrete phases showing how AI tools can be integrated into existing workflows.

You must output valid JSON matching this exact schema:

{{
  "scenario": "string — 1-2 sentences grounding the task in real context",
  "phases": [
    {{
      "title": "string — phase name",
      "manualApproach": "string — how this is done today without AI",
      "withAI": "string — how AI changes this specific sub-task",
      "evaluationCheck": "string — what to watch for in AI output",
      "promptExample": {{
        "initialPrompt": "string — a ready-to-paste prompt",
        "followUp": "string — a refinement prompt referencing initial output",
        "refinementPattern": "string — generalizable lesson about prompt iteration"
      }},
      "humanEdge": "string — what the human uniquely contributes (last phase only)"
    }}
  ]
}}

Rules:
- Output ONLY the JSON object, no markdown fences, no commentary
- Create 3-5 phases that decompose at the level where people actually get stuck
- promptExample appears on exactly ONE phase (the most instructive one)
- humanEdge appears on the LAST phase only
- evaluationCheck appears on EVERY phase with specific, distinct checks
- Phases should not be generic "prepare/do/finish" — they should reflect real workflow steps
- Keep walkthrough AI-tool-agnostic — don't assume a specific AI product, describe techniques that work across tools`,
    userPrompt: `Create an AI adoption walkthrough for this task:

Role: {role}
Task: {task}
Estimated time: {time}
Category: {category}

Break this into phases showing how a {role} would integrate AI into this specific workflow. Be concrete and practical. Do not assume any specific AI tool — describe techniques that work with any capable AI assistant.`,
  },
  {
    id: "v3",
    name: "v3 — Enhanced",
    systemPrompt: `You are an AI adoption specialist who creates detailed, practical walkthrough scenarios for professionals learning to integrate AI into their daily work.

Your output must be valid JSON matching this schema exactly:

{{
  "scenario": "string — 1-2 sentences grounding the task in the person's real working context",
  "phases": [
    {{
      "title": "string — name of this workflow phase",
      "manualApproach": "string — how this is specifically done today, with enough detail that someone unfamiliar could follow along",
      "withAI": "string — the specific AI technique or approach, explaining the clever move not just 'input X receive Y'",
      "evaluationCheck": "string — a specific structural or content pattern to watch for in the AI output, not generic advice",
      "promptExample": {{
        "initialPrompt": "string — a complete, ready-to-paste prompt that would produce useful output right now",
        "followUp": "string — a refinement prompt that references something specific from the initial output",
        "refinementPattern": "string — the generalizable lesson about iterating on AI output"
      }},
      "humanEdge": "string — the specific institutional knowledge, judgment call, or contextual factor that AI cannot replicate"
    }}
  ]
}}

Critical rules:
- Output ONLY the raw JSON object. No markdown code fences. No text before or after.
- Create 3-5 phases that decompose at the level where people actually get stuck — not "research, draft, review" but the specific sub-tasks within those stages
- promptExample appears on exactly ONE phase — whichever is most instructive for learning the AI interaction pattern
- humanEdge appears ONLY on the last phase
- evaluationCheck must be DIFFERENT and SPECIFIC on every phase — name the actual failure mode, not "check for accuracy"
- The withAI description should explain the technique (chain-of-thought, structured output, role-playing, etc.) not just "use AI to..."
- Prompts must be complete enough to paste directly into a chat interface and get useful output
- Keep walkthrough AI-tool-agnostic — describe techniques that work with any capable AI assistant (ChatGPT, Claude, Grok, etc.), not features specific to one product`,
    userPrompt: `Create an AI adoption walkthrough for the following task:

Role: {role}
Task: {task}
Estimated monthly time investment: {time}
Task category: {category}

Decompose this into workflow phases that reflect how a {role} actually approaches "{task}" — not generic phases like "research, draft, review" but the specific sub-tasks where time is spent and where AI can make a measurable difference.

For the prompt example, write a prompt that someone could paste into any AI assistant right now and get genuinely useful output for this exact task. The follow-up should reference something specific that typically appears in the initial AI response and needs refinement.

For evaluation checks, name the specific failure mode on each phase — what does bad AI output actually look like for this particular step?`,
  },
];
