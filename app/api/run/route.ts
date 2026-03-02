import { NextRequest, NextResponse } from "next/server";
import { TestCase, ModelId, WalkthroughOutput } from "@/lib/types";

interface RunRequestBody {
  testCase: TestCase;
  systemPrompt: string;
  userPrompt: string;
  model: ModelId;
  temperature: number;
}

function fillTemplate(template: string, testCase: TestCase): string {
  return template
    .replace(/\{role\}/g, testCase.role)
    .replace(/\{task\}/g, testCase.task)
    .replace(/\{time\}/g, testCase.time)
    .replace(/\{category\}/g, testCase.category)
    .replace(/\{tool\}/g, testCase.tool || "a general-purpose AI assistant")
    .replace(/\{workspace\}/g, testCase.workspace || "standard office tools");
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number
): Promise<WalkthroughOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content[0].text;
  return JSON.parse(text);
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number
): Promise<WalkthroughOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices[0].message.content;
  // Strip markdown fences if present
  const cleaned = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "");
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const body: RunRequestBody = await req.json();
    const { testCase, systemPrompt, userPrompt, model, temperature } = body;

    const filledSystem = fillTemplate(systemPrompt, testCase);
    const filledUser = fillTemplate(userPrompt, testCase);

    let output: WalkthroughOutput;

    if (model.startsWith("claude") || model.startsWith("claude")) {
      output = await callAnthropic(filledSystem, filledUser, model, temperature);
    } else {
      output = await callOpenAI(filledSystem, filledUser, model, temperature);
    }

    return NextResponse.json({ success: true, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
