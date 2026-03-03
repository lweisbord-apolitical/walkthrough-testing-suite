#!/usr/bin/env python3
"""
Walkthrough Testing Suite — Runner

Takes test cases + prompt templates, calls the API, saves structured output.

Usage:
    python run.py --cases cases.json --prompt v3
    python run.py --cases cases.json --prompt v3 --only pm-user-research
    python run.py --cases cases.json --prompt v2,v3
    python run.py --cases cases.json --prompt v3 --model gpt-4o --temp 0.7
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import openai
except ImportError:
    openai = None


def load_cases(path: str) -> list[dict]:
    with open(path) as f:
        return json.load(f)


def load_prompt(prompt_version: str) -> tuple[str, str]:
    base = Path("prompts") / prompt_version
    system_path = base / "system.txt"
    user_path = base / "user.txt"

    if not system_path.exists():
        print(f"  ✗ Prompt directory not found: {base}")
        sys.exit(1)

    with open(system_path) as f:
        system_text = f.read()
    with open(user_path) as f:
        user_text = f.read()

    return system_text, user_text


def interpolate(template: str, case: dict) -> str:
    return template.format(
        role=case.get("role", ""),
        task=case.get("task", ""),
        time=case.get("time", ""),
        category=case.get("category", ""),
        tool=case.get("tool", "not specified"),
        workspace=case.get("workspace", "not specified"),
    )


def extract_json(text: str) -> dict | None:
    """Extract JSON from model response, handling markdown fences and other wrapping."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try stripping markdown code fences
    patterns = [
        r"```json\s*\n?(.*?)\n?\s*```",
        r"```\s*\n?(.*?)\n?\s*```",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue

    # Try finding first { to last }
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace : last_brace + 1])
        except json.JSONDecodeError:
            pass

    return None


def validate_output(data: dict) -> bool:
    """Basic validation: has scenario and phases."""
    if not isinstance(data, dict):
        return False
    if "scenario" not in data:
        return False
    if "phases" not in data or not isinstance(data["phases"], list):
        return False
    if len(data["phases"]) == 0:
        return False
    for phase in data["phases"]:
        if "title" not in phase:
            return False
        if "today" not in phase:
            return False
        if "withAI" not in phase:
            return False
        if "evaluationCheck" not in phase:
            return False
    return True


def call_anthropic(system: str, user: str, model: str, temperature: float, max_tokens: int) -> str:
    if anthropic is None:
        print("  ✗ anthropic package not installed. Run: pip install anthropic")
        sys.exit(1)

    client = anthropic.Anthropic()
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return message.content[0].text


def call_openai(system: str, user: str, model: str, temperature: float, max_tokens: int) -> str:
    if openai is None:
        print("  ✗ openai package not installed. Run: pip install openai")
        sys.exit(1)

    client = openai.OpenAI()
    response = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response.choices[0].message.content


def is_openai_model(model: str) -> bool:
    return model.startswith("gpt-") or model.startswith("o1") or model.startswith("o3")


def run_case(
    case: dict,
    system_template: str,
    user_template: str,
    prompt_version: str,
    model: str,
    temperature: float,
    max_tokens: int,
) -> tuple[bool, str]:
    """Run a single test case. Returns (success, message)."""
    case_id = case["id"]

    system_prompt = interpolate(system_template, case)
    user_prompt = interpolate(user_template, case)

    try:
        if is_openai_model(model):
            raw_response = call_openai(system_prompt, user_prompt, model, temperature, max_tokens)
        else:
            raw_response = call_anthropic(system_prompt, user_prompt, model, temperature, max_tokens)
    except Exception as e:
        return False, f"API error: {e}"

    parsed = extract_json(raw_response)
    if parsed is None:
        # Save raw response for debugging
        output_dir = Path("outputs") / prompt_version
        output_dir.mkdir(parents=True, exist_ok=True)
        debug_path = output_dir / f"{case_id}.raw.txt"
        with open(debug_path, "w") as f:
            f.write(raw_response)
        return False, f"invalid JSON (raw saved to {debug_path})"

    if not validate_output(parsed):
        return False, "JSON valid but missing required fields (scenario/phases)"

    # Build output envelope
    output = {
        "meta": {
            "caseId": case_id,
            "promptVersion": prompt_version,
            "model": model,
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "input": {
            "role": case.get("role", ""),
            "task": case.get("task", ""),
            "time": case.get("time", ""),
            "category": case.get("category", ""),
            "tool": case.get("tool", "not specified"),
            "workspace": case.get("workspace", "not specified"),
        },
        "output": parsed,
    }

    # Save
    output_dir = Path("outputs") / prompt_version
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{case_id}.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    return True, f"saved to {output_path}"


def main():
    parser = argparse.ArgumentParser(description="Walkthrough Testing Suite — Runner")
    parser.add_argument("--cases", required=True, help="Path to test cases JSON file")
    parser.add_argument("--prompt", required=True, help="Prompt version(s), comma-separated (e.g., v3 or v2,v3)")
    parser.add_argument("--only", help="Run only this case ID")
    parser.add_argument("--model", default="claude-sonnet-4-5-20250929", help="Model to use")
    parser.add_argument("--temp", type=float, default=0.6, help="Temperature")
    parser.add_argument("--max-tokens", type=int, default=2000, help="Max tokens")

    args = parser.parse_args()

    cases = load_cases(args.cases)
    prompt_versions = [v.strip() for v in args.prompt.split(",")]

    if args.only:
        cases = [c for c in cases if c["id"] == args.only]
        if not cases:
            print(f"  ✗ No case found with id: {args.only}")
            sys.exit(1)

    for version in prompt_versions:
        print(f"\n{'='*60}")
        print(f"  Prompt: {version}  |  Model: {args.model}  |  Temp: {args.temp}")
        print(f"{'='*60}\n")

        system_template, user_template = load_prompt(version)

        results = []
        for case in cases:
            case_id = case["id"]
            print(f"  Running {case_id}...", end=" ", flush=True)
            success, msg = run_case(
                case, system_template, user_template, version, args.model, args.temp, args.max_tokens
            )
            status = "✓" if success else "✗"
            print(f"{status} {msg}")
            results.append((case_id, success, msg))

        # Summary
        passed = sum(1 for _, s, _ in results if s)
        total = len(results)
        print(f"\n  {'─'*40}")
        print(f"  {passed}/{total} passed")

        if passed < total:
            print("\n  Failed:")
            for cid, s, msg in results:
                if not s:
                    print(f"    ✗ {cid}: {msg}")

    print()


if __name__ == "__main__":
    main()
