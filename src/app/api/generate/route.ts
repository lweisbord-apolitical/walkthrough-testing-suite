import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { TaskInput, V3Module, TECHNIQUE_NAMES, PromptSegment, WalkthroughStep } from "@/types";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function interpolatePrompt(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
  }
  return result;
}

const categoryLabels: Record<string, string> = {
  workOutput: "Work Output",
  mentalProcesses: "Mental Processes",
  informationInput: "Information Input",
  interactingWithOthers: "Interacting With Others",
};

function normalizeSegments(promptData: Record<string, unknown>): void {
  if (promptData?.segments && Array.isArray(promptData.segments)) {
    (promptData.segments as Partial<PromptSegment>[]).forEach((seg, i) => {
      if (!seg.annotationSide) seg.annotationSide = i % 2 === 0 ? "left" : "right";
      if (!seg.color) seg.color = "v-500";
      if (!seg.label) seg.label = "PROMPT";
      if (!seg.annotationTip) seg.annotationTip = "";
    });
  }
}

function normalizeSteps(steps: Partial<WalkthroughStep>[], tierType: "beginner" | "proficient"): WalkthroughStep[] {
  if (!Array.isArray(steps)) return [];

  return steps.map((step, i) => {
    // Ensure sequential step numbers
    const stepNumber = i + 1;

    // Default missing checkFor
    const checkFor = step.checkFor || {
      issue: "Output may not match your needs",
      verify: "Review the result carefully before proceeding",
    };

    // Normalize prompt segments if present
    if (step.prompt) {
      normalizeSegments(step.prompt as unknown as Record<string, unknown>);
    }

    // Enforce technique names
    if (step.technique) {
      if (tierType === "beginner") {
        step.technique.name = TECHNIQUE_NAMES.keepGoing;
      } else {
        // For proficient, match by position or content
        if (step.technique.name?.toLowerCase().includes("context") ||
            step.technique.name === TECHNIQUE_NAMES.giveContext) {
          step.technique.name = TECHNIQUE_NAMES.giveContext;
        } else if (step.technique.name?.toLowerCase().includes("check") ||
                   step.technique.name === TECHNIQUE_NAMES.checkWork) {
          step.technique.name = TECHNIQUE_NAMES.checkWork;
        }
      }
    }

    return {
      stepNumber,
      title: step.title || `Step ${stepNumber}`,
      withAi: step.withAi || "",
      checkFor,
      prompt: step.prompt,
      technique: step.technique,
      followUps: step.followUps,
      watchOut: step.watchOut,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const { task, promptTemplate } = (await req.json()) as {
      task: TaskInput;
      promptTemplate: string;
    };

    const vars: Record<string, string> = {
      task: task.task,
      userDescription: task.userDescription,
      category: categoryLabels[task.category] || task.category,
      timePercentage: String(task.timePercentage),
      aiExposure: task.aiExposure || "Not specified",
      aiFrequency: task.aiFrequency,
      aiDescription: task.aiDescription || "No description provided",
    };

    const promptText = interpolatePrompt(promptTemplate, vars);
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a pedagogical content generator for the SPARK framework. Always respond with valid JSON containing both 'beginner' and 'proficient' keys. Each tier uses a step-based walkthrough structure.",
        },
        { role: "user", content: promptText },
      ],
    });

    const raw = JSON.parse(response.choices[0].message.content || "{}");

    const emptyTimeComparison = {
      without: { total: "N/A", breakdown: [] },
      withAi: { total: "N/A", breakdown: [] },
      savingsPerInstance: "N/A",
      savingsPerMonth: "N/A",
      speedLabel: "N/A",
    };

    const beginnerSteps = normalizeSteps(raw.beginner?.steps || [], "beginner");
    const proficientSteps = normalizeSteps(raw.proficient?.steps || [], "proficient");

    const module: V3Module = {
      task: task.task,
      userDescription: task.userDescription,
      category: task.category,
      timePercentage: task.timePercentage,
      aiFrequency: task.aiFrequency,
      aiDescription: task.aiDescription,
      aiExposure: task.aiExposure,
      beginner: {
        hook: raw.beginner?.hook || { number: "N/A", context: "" },
        steps: beginnerSteps,
        timeComparison: raw.beginner?.timeComparison || emptyTimeComparison,
      },
      proficient: {
        hook: raw.proficient?.hook || { number: "N/A", context: "" },
        steps: proficientSteps,
        whyThisWorks: raw.proficient?.whyThisWorks || "",
        timeComparison: raw.proficient?.timeComparison || emptyTimeComparison,
      },
    };

    return NextResponse.json({
      taskInput: task,
      module,
      error: null,
      generatedAt: new Date().toISOString(),
      promptVersion: "v3",
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      {
        taskInput: null,
        module: null,
        error: error instanceof Error ? error.message : "Unknown error",
        generatedAt: new Date().toISOString(),
        promptVersion: "v3",
      },
      { status: 500 }
    );
  }
}
