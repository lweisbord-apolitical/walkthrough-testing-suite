export const DEFAULT_PROMPT_V3 = `You are generating a SPARK v3 micro-learning module that teaches someone how to
use AI for a specific work task. You must generate TWO tiers in a single response:
a BEGINNER tier and a PROFICIENT tier.

Each tier is structured as a STEP-BY-STEP WALKTHROUGH — numbered steps that walk
through the entire process of doing this task with AI. This is NOT a flat list of
sections; it is a cohesive journey from start to finish.

TASK CONTEXT:
- Task: \${task}
- Original user description: \${userDescription}
- Work category: \${category}
- Time spent on this task: \${timePercentage}% of their work time
- AI exposure level: \${aiExposure} (E0 = no exposure; E1 = AI assists human; E2 = AI does most of it)
- Current AI usage frequency: \${aiFrequency}
- How they currently use AI: \${aiDescription}

THREE FIXED TECHNIQUE NAMES (you MUST use these exact names — contextualise them for this task):
1. "Keep the conversation going" — Don't stop at the first AI response. Ask follow-ups, push back, request alternatives.
2. "Give AI your context" — The more specific context you provide, the better and more relevant the output.
3. "Make AI check its own work" — Ask the AI to review, critique, or improve its own output before you accept it.

STEP-BASED WALKTHROUGH RULES:
- Each step represents a PHASE of doing the task with AI (e.g., "Frame your request", "Refine the output", "Verify and finalise")
- Steps flow naturally from preparation → prompting → refining → verifying
- Every step MUST have a "checkFor" with "issue" (what bad output looks like) and "verify" (what to confirm before moving on)
- Exactly ONE step per tier contains the embedded "prompt" field (the annotated prompt)
- Techniques are woven INTO the relevant step, not listed separately
- Watch-outs are distributed across steps where they're most relevant

BEGINNER TIER RULES (3 steps):
- Tone: warm, conversational, encouraging — like a supportive colleague
- The prompt step must have a copy-paste ready prompt with [BRACKET] placeholders
- The prompt MUST use "segments" format with 3-6 segments
  - Each segment has: label (descriptive, e.g. "FRAMING", "YOUR CONTEXT"), text, annotationSide ("left"/"right" alternating), annotationTip (1 sentence why this works), color (from: "v-500", "g-500", "am-600", "v-700", "n-700")
- ONE step has technique: "Keep the conversation going" (contextualised)
- ONE step has followUps: 2-3 natural follow-up questions
- Should feel approachable and low-pressure

PROFICIENT TIER RULES (3-4 steps):
- Tone: structured, peer-level, advanced
- The prompt should be more sophisticated, using "segments" format with 3-6 segments
- Must include "whyThisWorks" at the tier level (prompt design principles)
- TWO steps have techniques: "Give AI your context" and "Make AI check its own work"
- 1-2 steps have watchOut fields (specific pitfalls with remedies)
- Should feel like levelling-up, not repeating beginner content

CRITICAL QUALITY RULES:
1. Tiers MUST feel genuinely different — not the same content reworded
2. Techniques must be contextualised to THIS specific task, not generic advice
3. Beginner prompt must be testable — someone could paste it and get useful output
4. Time estimates must be realistic and conservative
5. Never claim AI output is perfect — always frame as "strong first draft you refine"
6. Watch-outs must be specific to this task, not generic AI warnings
7. checkFor.issue and checkFor.verify must be specific and actionable for each step

Respond with valid JSON matching this structure exactly:

{
  "beginner": {
    "hook": {
      "number": "~X hrs/month",
      "context": "One sentence putting the time savings in relatable terms."
    },
    "steps": [
      {
        "stepNumber": 1,
        "title": "Gather your inputs",
        "withAi": "2-3 sentences describing what to do in this phase and how AI helps.",
        "checkFor": {
          "issue": "What bad output or a common mistake looks like at this step",
          "verify": "What to confirm before moving to the next step"
        },
        "technique": {
          "name": "Keep the conversation going",
          "contextualisation": "2-3 sentences explaining how this technique applies specifically to this task.",
          "example": "An example follow-up prompt they might use"
        }
      },
      {
        "stepNumber": 2,
        "title": "Prompt AI with full context",
        "withAi": "2-3 sentences describing how to use the prompt below.",
        "checkFor": {
          "issue": "What bad output looks like from this prompt",
          "verify": "What to check in the AI response before moving on"
        },
        "prompt": {
          "segments": [
            {
              "label": "FRAMING",
              "text": "The prompt text for this segment. May contain [BRACKET] placeholders.",
              "annotationSide": "left",
              "annotationTip": "One sentence explaining WHY this segment works",
              "color": "v-500"
            }
          ],
          "bracketSlots": [
            { "placeholder": "[your topic]", "hint": "e.g., housing policy, quarterly budget" }
          ]
        },
        "followUps": [
          "A natural follow-up question specific to this task",
          "Another follow-up that pushes for more depth"
        ]
      },
      {
        "stepNumber": 3,
        "title": "Review and refine",
        "withAi": "2-3 sentences on how to evaluate and improve the output.",
        "checkFor": {
          "issue": "What to watch for in the final output",
          "verify": "Final quality check before using the result"
        }
      }
    ],
    "timeComparison": {
      "without": {
        "total": "3.5 hours",
        "breakdown": [{ "activity": "Activity name", "time": "2 hours" }]
      },
      "withAi": {
        "total": "~1 hour",
        "breakdown": [{ "activity": "Activity name", "time": "5 min" }]
      },
      "savingsPerInstance": "~2.5 hours",
      "savingsPerMonth": "~10 hours",
      "speedLabel": "~70% faster"
    }
  },
  "proficient": {
    "hook": {
      "number": "~X hrs/month",
      "context": "One sentence — can be the same or different from beginner."
    },
    "steps": [
      {
        "stepNumber": 1,
        "title": "Set up your context package",
        "withAi": "2-3 sentences on preparing comprehensive context for AI.",
        "checkFor": {
          "issue": "What happens when context is insufficient",
          "verify": "What good preparation looks like"
        },
        "technique": {
          "name": "Give AI your context",
          "contextualisation": "2-3 sentences explaining how providing context helps specifically for this task.",
          "example": "A concrete example of context they should provide"
        }
      },
      {
        "stepNumber": 2,
        "title": "Run your structured prompt",
        "withAi": "2-3 sentences on how to use the advanced prompt below.",
        "checkFor": {
          "issue": "What bad output looks like from this prompt",
          "verify": "Quality signals in the AI response"
        },
        "prompt": {
          "segments": [
            {
              "label": "FRAMING",
              "text": "The prompt text for this segment. May contain [BRACKET] placeholders.",
              "annotationSide": "left",
              "annotationTip": "One sentence explaining WHY this segment works",
              "color": "v-500"
            }
          ],
          "bracketSlots": [
            { "placeholder": "[your context]", "hint": "e.g., specific policy area, stakeholder group" }
          ]
        },
        "watchOut": {
          "warning": "A specific pitfall for this task at this step",
          "remedy": "What to do instead"
        }
      },
      {
        "stepNumber": 3,
        "title": "Make AI check its work",
        "withAi": "2-3 sentences on using AI self-review to improve quality.",
        "checkFor": {
          "issue": "What gets missed without self-review",
          "verify": "Quality bar after AI self-check"
        },
        "technique": {
          "name": "Make AI check its own work",
          "contextualisation": "2-3 sentences explaining how self-checking applies to this task.",
          "example": "An example self-check prompt"
        },
        "watchOut": {
          "warning": "Another specific pitfall",
          "remedy": "What to do instead"
        }
      }
    ],
    "whyThisWorks": "2-3 sentences explaining the prompt design principles used. Reference actual elements from the prompt.",
    "timeComparison": {
      "without": {
        "total": "3.5 hours",
        "breakdown": [{ "activity": "Activity name", "time": "2 hours" }]
      },
      "withAi": {
        "total": "~45 min",
        "breakdown": [{ "activity": "Activity name", "time": "5 min" }]
      },
      "savingsPerInstance": "~2.75 hours",
      "savingsPerMonth": "~11 hours",
      "speedLabel": "~80% faster"
    }
  }
}`;
