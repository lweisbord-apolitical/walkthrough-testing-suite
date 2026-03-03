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

// Anthropic with web_search tool — agentic loop
async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number
): Promise<WalkthroughOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
    },
  ];

  let messages: Array<{ role: string; content: unknown }> = [
    { role: "user", content: userPrompt },
  ];

  // Agentic loop — keep going until we get a final text response (end_turn)
  for (let turn = 0; turn < 10; turn++) {
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
        tools,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data = await res.json();

    // If stop reason is end_turn, extract the text block
    if (data.stop_reason === "end_turn") {
      const textBlock = data.content.find(
        (b: { type: string }) => b.type === "text"
      );
      if (!textBlock) throw new Error("No text in final response");
      return JSON.parse(textBlock.text);
    }

    // If the model used tools, add the assistant message and continue
    // The API handles tool results automatically for server-side tools like web_search
    // But we still need to check if there's a text block in a tool_use response
    if (data.stop_reason === "tool_use") {
      // Add the assistant's response to messages
      messages.push({ role: "assistant", content: data.content });

      // For server-side tools (web_search), Anthropic handles execution.
      // We need to provide tool_result blocks for each tool_use.
      // But web_search is a server-side tool — results come back in the same response.
      // Check if there are server_tool_use blocks with results already
      const serverResults = data.content.filter(
        (b: { type: string }) => b.type === "web_search_tool_result"
      );

      if (serverResults.length > 0) {
        // Server-side tool results are already in the content, just continue
        // The model will continue on the next iteration
        messages.push({
          role: "user",
          content: [{ type: "text", text: "Continue generating the JSON output based on your research." }],
        });
      } else {
        // Shouldn't happen with web_search, but handle gracefully
        break;
      }
      continue;
    }

    // Any other stop reason — try to extract text
    const textBlock = data.content.find(
      (b: { type: string }) => b.type === "text"
    );
    if (textBlock) {
      return JSON.parse(textBlock.text);
    }

    break;
  }

  throw new Error("Failed to get final response after tool use loop");
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
      tools: [
        {
          type: "function",
          function: {
            name: "web_search",
            description:
              "Search the web for current information relevant to the task being analyzed",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query",
                },
              },
              required: ["query"],
            },
          },
        },
      ],
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const msg = data.choices[0].message;

  // If tool calls were made, we can't actually execute web search for OpenAI
  // (no built-in server-side execution), so just re-call without tools
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    // Fall back to a plain call without tools
    const fallbackRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
      }
    );

    if (!fallbackRes.ok) {
      const err = await fallbackRes.text();
      throw new Error(`OpenAI API error ${fallbackRes.status}: ${err}`);
    }

    const fallbackData = await fallbackRes.json();
    const text = fallbackData.choices[0].message.content;
    const cleaned = text
      .replace(/^```json?\n?/m, "")
      .replace(/\n?```$/m, "");
    return JSON.parse(cleaned);
  }

  const text = msg.content;
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
