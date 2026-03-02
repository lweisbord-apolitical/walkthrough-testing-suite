#!/usr/bin/env python3
"""
Walkthrough Testing Suite — Renderer

Takes output JSON files and produces a styled HTML page matching the Futura walkthrough UI.

Usage:
    python render.py --dir outputs/v3
    python render.py --file outputs/v3/pm-user-research.json
"""

import argparse
import html
import json
import sys
from datetime import datetime
from pathlib import Path


def load_output(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def load_outputs_from_dir(dir_path: Path) -> list[dict]:
    outputs = []
    for f in sorted(dir_path.glob("*.json")):
        try:
            outputs.append(load_output(f))
        except (json.JSONDecodeError, KeyError) as e:
            print(f"  ⚠ Skipping {f.name}: {e}")
    return outputs


def esc(text: str) -> str:
    """HTML-escape text."""
    return html.escape(str(text)) if text else ""


def render_card(data: dict, index: int) -> str:
    """Render a single walkthrough card."""
    meta = data.get("meta", {})
    inp = data.get("input", {})
    out = data.get("output", {})

    category = esc(inp.get("category", "OPPORTUNITY"))
    time_badge = esc(inp.get("time", ""))
    task = esc(inp.get("task", ""))
    role = esc(inp.get("role", ""))
    tool = inp.get("tool", "not specified")
    workspace = inp.get("workspace", "not specified")
    scenario = esc(out.get("scenario", ""))

    phases = out.get("phases", [])
    total_phases = len(phases)

    # Tool/workspace badges
    badges_html = ""
    if tool and tool != "not specified":
        badges_html += f'<span class="tool-badge">{esc(tool)}</span>'
    if workspace and workspace != "not specified":
        badges_html += f'<span class="workspace-badge">{esc(workspace)}</span>'

    phases_html = ""
    for i, phase in enumerate(phases):
        is_last = i == total_phases - 1
        has_prompt = "promptExample" in phase and phase["promptExample"]
        has_human_edge = "humanEdge" in phase and phase["humanEdge"]

        # Circle style
        if has_prompt:
            circle_class = "phase-circle prompt-phase"
        elif is_last:
            circle_class = "phase-circle last-phase"
        else:
            circle_class = "phase-circle"

        # Connector line (not on last phase)
        connector = '<div class="phase-connector"></div>' if not is_last else ""

        # Phase content sections
        manual = esc(phase.get("manualApproach", ""))
        with_ai = esc(phase.get("withAI", ""))
        eval_check = esc(phase.get("evaluationCheck", ""))

        sections_html = f"""
            <div class="phase-section">
                <span class="phase-label today-label">Today:</span> {manual}
            </div>
            <div class="phase-section">
                <span class="phase-label withai-label">With AI:</span> {with_ai}
            </div>
            <div class="phase-section">
                <span class="phase-label check-label">Check for:</span> {eval_check}
            </div>
        """

        # Prompt example block
        prompt_html = ""
        if has_prompt:
            pe = phase["promptExample"]
            initial = esc(pe.get("initialPrompt", ""))
            followup = esc(pe.get("followUp", ""))
            pattern = esc(pe.get("refinementPattern", ""))

            prompt_html = f"""
            <div class="prompt-block">
                <div class="prompt-text">{initial}</div>
                <div class="copy-btn" onclick="copyPrompt(this)">Copy prompt</div>
            </div>
            """

            if followup:
                prompt_html += f"""
            <div class="prompt-block followup-block">
                <div class="followup-label">FOLLOW-UP</div>
                <div class="prompt-text">{followup}</div>
                <div class="copy-btn" onclick="copyPrompt(this)">Copy prompt</div>
            </div>
                """

            if pattern:
                prompt_html += f"""
            <div class="refinement-pattern">{pattern}</div>
                """

        # Human edge
        edge_html = ""
        if has_human_edge:
            edge_html = f"""
            <div class="human-edge">
                <span class="edge-label">Your edge:</span> {esc(phase["humanEdge"])}
            </div>
            """

        phases_html += f"""
        <div class="phase">
            <div class="phase-marker">
                <div class="{circle_class}">{i + 1}</div>
                {connector}
            </div>
            <div class="phase-content">
                <div class="phase-title">{esc(phase.get("title", f"Phase {i+1}"))}</div>
                {sections_html}
                {prompt_html}
                {edge_html}
            </div>
        </div>
        """

    return f"""
    <div class="card">
        <div class="card-header">
            <div class="card-header-top">
                <span class="card-category">#{index} {category}</span>
                {f'<span class="time-badge">{time_badge}</span>' if time_badge else ''}
            </div>
            <div class="card-task">{task}</div>
            {f'<div class="card-badges">{badges_html}</div>' if badges_html else ''}
        </div>
        <div class="card-scenario">
            As a {role.lower()}, {scenario[0].lower() + scenario[1:] if scenario else ''}
        </div>
        <div class="phases-container">
            {phases_html}
        </div>
    </div>
    """


def render_page(outputs: list[dict], prompt_version: str = "") -> str:
    """Render all cards into a full HTML page."""
    # Extract metadata from first output
    model = ""
    if outputs:
        model = outputs[0].get("meta", {}).get("model", "")
        if not prompt_version:
            prompt_version = outputs[0].get("meta", {}).get("promptVersion", "")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    cards_html = ""
    for i, data in enumerate(outputs, 1):
        cards_html += render_card(data, i)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Walkthrough Results — {esc(prompt_version)}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            background: #f5f5f7;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #333;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }}

        .page-container {{
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }}

        .page-header {{
            text-align: center;
            margin-bottom: 40px;
            color: #999;
            font-size: 13px;
        }}

        .page-header .version {{
            font-weight: 600;
            color: #7c3aed;
            font-size: 14px;
        }}

        .page-header .meta {{
            margin-top: 4px;
        }}

        .card {{
            background: #fff;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
            padding: 32px;
            margin-bottom: 32px;
        }}

        .card-header {{
            margin-bottom: 16px;
        }}

        .card-header-top {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }}

        .card-category {{
            color: #7c3aed;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1.5px;
            font-weight: 600;
        }}

        .time-badge {{
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 12px;
            padding: 2px 10px;
            font-size: 12px;
            color: #666;
        }}

        .card-task {{
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            line-height: 1.4;
        }}

        .card-badges {{
            margin-top: 8px;
            display: flex;
            gap: 8px;
        }}

        .tool-badge, .workspace-badge {{
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 500;
        }}

        .tool-badge {{
            background: #f3e8ff;
            color: #7c3aed;
        }}

        .workspace-badge {{
            background: #ecfdf5;
            color: #16a34a;
        }}

        .card-scenario {{
            color: #555;
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.6;
        }}

        .phases-container {{
            margin-top: 16px;
        }}

        .phase {{
            display: flex;
            gap: 16px;
            margin-bottom: 0;
        }}

        .phase-marker {{
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
            width: 28px;
        }}

        .phase-circle {{
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid #7c3aed;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: #7c3aed;
            flex-shrink: 0;
        }}

        .phase-circle.prompt-phase {{
            background: #7c3aed;
            color: #fff;
        }}

        .phase-circle.last-phase {{
            border-color: #16a34a;
            color: #16a34a;
        }}

        .phase-connector {{
            width: 2px;
            flex-grow: 1;
            background: #e5e7eb;
            min-height: 20px;
        }}

        .phase-content {{
            flex-grow: 1;
            padding-bottom: 24px;
        }}

        .phase-title {{
            font-size: 15px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 10px;
        }}

        .phase-section {{
            font-size: 14px;
            margin-bottom: 8px;
            line-height: 1.5;
        }}

        .phase-label {{
            font-weight: 600;
        }}

        .today-label {{
            color: #999;
            font-style: italic;
        }}

        .withai-label {{
            color: #333;
        }}

        .check-label {{
            color: #d97706;
            font-style: italic;
        }}

        .prompt-block {{
            background: #1a1a2e;
            border-radius: 8px;
            padding: 20px;
            margin: 12px 0;
            position: relative;
        }}

        .prompt-text {{
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 13px;
            color: #e2e8f0;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }}

        .copy-btn {{
            text-align: right;
            color: #94a3b8;
            font-size: 12px;
            margin-top: 10px;
            cursor: pointer;
            user-select: none;
        }}

        .copy-btn:hover {{
            color: #cbd5e1;
        }}

        .followup-block {{
            margin-top: 8px;
        }}

        .followup-label {{
            color: #d97706;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 1px;
            font-weight: 600;
            margin-bottom: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }}

        .refinement-pattern {{
            color: #7c3aed;
            font-style: italic;
            font-size: 14px;
            margin: 8px 0 12px 0;
            line-height: 1.5;
        }}

        .human-edge {{
            color: #16a34a;
            font-size: 14px;
            margin-top: 8px;
            line-height: 1.5;
        }}

        .edge-label {{
            font-weight: 700;
        }}

        .toast {{
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: #1a1a2e;
            color: #e2e8f0;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 13px;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
        }}

        .toast.show {{
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }}
    </style>
</head>
<body>
    <div class="page-container">
        <div class="page-header">
            <div class="version">Prompt: {esc(prompt_version)}</div>
            <div class="meta">Model: {esc(model)} &middot; Rendered: {timestamp} &middot; {len(outputs)} cases</div>
        </div>
        {cards_html}
    </div>
    <div class="toast" id="toast">Copied to clipboard</div>
    <script>
        function copyPrompt(btn) {{
            const text = btn.previousElementSibling.textContent || btn.parentElement.querySelector('.prompt-text').textContent;
            navigator.clipboard.writeText(text.trim()).then(() => {{
                const toast = document.getElementById('toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 1500);
            }});
        }}
    </script>
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser(description="Walkthrough Testing Suite — Renderer")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dir", help="Directory of output JSON files to render")
    group.add_argument("--file", help="Single output JSON file to render")

    args = parser.parse_args()

    if args.file:
        path = Path(args.file)
        if not path.exists():
            print(f"  ✗ File not found: {path}")
            sys.exit(1)
        outputs = [load_output(path)]
        # Derive version from path (outputs/v3/file.json -> v3)
        prompt_version = path.parent.name
        out_name = path.stem
    else:
        dir_path = Path(args.dir)
        if not dir_path.exists():
            print(f"  ✗ Directory not found: {dir_path}")
            sys.exit(1)
        outputs = load_outputs_from_dir(dir_path)
        if not outputs:
            print(f"  ✗ No valid JSON files found in {dir_path}")
            sys.exit(1)
        prompt_version = dir_path.name
        out_name = prompt_version

    html_content = render_page(outputs, prompt_version)

    renders_dir = Path("renders")
    renders_dir.mkdir(exist_ok=True)
    out_path = renders_dir / f"{out_name}.html"

    with open(out_path, "w") as f:
        f.write(html_content)

    print(f"  ✓ Rendered {len(outputs)} cards → {out_path}")


if __name__ == "__main__":
    main()
