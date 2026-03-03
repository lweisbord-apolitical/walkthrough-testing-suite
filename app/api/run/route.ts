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
    .replace(/\{category\}/g, testCase.category);
}

// Extract JSON from a string that may contain markdown fences or surrounding text
function extractJSON(text: string): string {
  // Try to find JSON in markdown fences first
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenced) return fenced[1].trim();

  // Try to find a JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text;
}

// Anthropic Messages API with server-side web_search tool.
// web_search is a server tool — Anthropic executes it automatically and returns
// the final response in a single call. If stop_reason is "pause_turn" (hit the
// 10-iteration server loop limit), we send the response back to continue.
async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number
): Promise<WalkthroughOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  let messages: Array<{ role: string; content: unknown }> = [
    { role: "user", content: userPrompt },
  ];

  // Normally one call is enough since web_search runs server-side.
  // Loop only handles the rare "pause_turn" case.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        temperature,
        system: systemPrompt,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5,
          },
        ],
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data = await res.json();

    // Extract text from the response content blocks
    const textBlock = data.content.find(
      (b: { type: string }) => b.type === "text"
    );

    if (data.stop_reason === "end_turn" && textBlock) {
      return JSON.parse(extractJSON(textBlock.text));
    }

    // pause_turn means the server-side tool loop hit its limit.
    // Send the response back so Claude can continue.
    if (data.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: data.content });
      messages.push({
        role: "user",
        content: "Continue — finish generating the JSON output.",
      });
      continue;
    }

    // Any other stop reason with text — try to parse
    if (textBlock) {
      return JSON.parse(extractJSON(textBlock.text));
    }

    throw new Error(
      `Unexpected Anthropic response: stop_reason=${data.stop_reason}`
    );
  }

  throw new Error("Anthropic: exceeded max continuation attempts");
}

// OpenAI Responses API with built-in web_search tool.
// web_search executes server-side — one call, results included automatically.
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number
): Promise<WalkthroughOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      instructions: systemPrompt,
      input: userPrompt,
      tools: [
        {
          type: "web_search",
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  // The Responses API returns an output array of items.
  // Find the message item with the text content.
  const messageItem = data.output?.find(
    (item: { type: string }) => item.type === "message"
  );

  if (messageItem) {
    const textContent = messageItem.content?.find(
      (c: { type: string }) => c.type === "output_text"
    );
    if (textContent) {
      return JSON.parse(extractJSON(textContent.text));
    }
  }

  // Fallback: try the top-level output_text if present
  if (data.output_text) {
    return JSON.parse(extractJSON(data.output_text));
  }

  throw new Error("No text content in OpenAI response");
}

export async function POST(req: NextRequest) {
  try {
    const body: RunRequestBody = await req.json();
    const { testCase, systemPrompt, userPrompt, model, temperature } = body;

    const filledSystem = fillTemplate(systemPrompt, testCase);
    const filledUser = fillTemplate(userPrompt, testCase);

    let output: WalkthroughOutput;

    if (model.startsWith("claude")) {
      output = await callAnthropic(
        filledSystem,
        filledUser,
        model,
        temperature
      );
    } else {
      output = await callOpenAI(filledSystem, filledUser, model, temperature);
    }

    return NextResponse.json({ success: true, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
