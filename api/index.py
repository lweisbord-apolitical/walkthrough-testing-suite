"""
Vercel serverless function — serves the walkthrough testing suite.

Routes:
  /                  → landing page with links and run form
  /api/run           → POST: run test cases against a prompt version
  /api/render        → GET: render outputs for a prompt version as HTML
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

# Add parent dir to path so we can import our modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import openai
except ImportError:
    openai = None


def extract_json(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    patterns = [r"```json\s*\n?(.*?)\n?\s*```", r"```\s*\n?(.*?)\n?\s*```"]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace : last_brace + 1])
        except json.JSONDecodeError:
            pass
    return None


def validate_output(data):
    if not isinstance(data, dict):
        return False
    if "scenario" not in data or "phases" not in data:
        return False
    if not isinstance(data["phases"], list) or len(data["phases"]) == 0:
        return False
    return all("title" in p and "withAI" in p for p in data["phases"])


def is_openai_model(model):
    return model.startswith("gpt-") or model.startswith("o1") or model.startswith("o3")


def interpolate(template, case):
    return template.format(
        role=case.get("role", ""),
        task=case.get("task", ""),
        time=case.get("time", ""),
        category=case.get("category", ""),
        tool=case.get("tool", "not specified"),
        workspace=case.get("workspace", "not specified"),
    )


def call_api(system, user, model, temperature, max_tokens):
    if is_openai_model(model):
        if openai is None:
            raise RuntimeError("openai package not available")
        client = openai.OpenAI()
        resp = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        )
        return resp.choices[0].message.content
    else:
        if anthropic is None:
            raise RuntimeError("anthropic package not available")
        client = anthropic.Anthropic()
        msg = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text


def load_prompts():
    """Load all available prompt versions."""
    prompts_dir = Path(__file__).resolve().parent.parent / "prompts"
    versions = {}
    if prompts_dir.exists():
        for d in sorted(prompts_dir.iterdir()):
            if d.is_dir() and (d / "system.txt").exists():
                versions[d.name] = {
                    "system": (d / "system.txt").read_text(),
                    "user": (d / "user.txt").read_text(),
                }
    return versions


def load_cases():
    cases_path = Path(__file__).resolve().parent.parent / "cases.json"
    if cases_path.exists():
        return json.loads(cases_path.read_text())
    return []


def render_card_html(data, index):
    """Render a single walkthrough card to HTML."""
    from html import escape as esc

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

        if has_prompt:
            circle_class = "phase-circle prompt-phase"
        elif is_last:
            circle_class = "phase-circle last-phase"
        else:
            circle_class = "phase-circle"

        connector = '<div class="phase-connector"></div>' if not is_last else ""

        with_ai = esc(phase.get("withAI", ""))
        eval_check = esc(phase.get("evaluationCheck", ""))

        sections = f"""
            <div class="phase-section"><span class="phase-label withai-label">With AI:</span> {with_ai}</div>
            <div class="phase-section"><span class="phase-label check-label">Check for:</span> {eval_check}</div>
        """

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
            </div>"""

            if followup:
                prompt_html += f"""
            <div class="prompt-block followup-block">
                <div class="followup-label">FOLLOW-UP</div>
                <div class="prompt-text">{followup}</div>
                <div class="copy-btn" onclick="copyPrompt(this)">Copy prompt</div>
            </div>"""

            if pattern:
                prompt_html += f'<div class="refinement-pattern">{pattern}</div>'

        edge_html = ""
        if has_human_edge:
            edge_html = f'<div class="human-edge"><span class="edge-label">Your edge:</span> {esc(phase["humanEdge"])}</div>'

        phases_html += f"""
        <div class="phase">
            <div class="phase-marker">
                <div class="{circle_class}">{i + 1}</div>
                {connector}
            </div>
            <div class="phase-content">
                <div class="phase-title">{esc(phase.get("title", f"Phase {i+1}"))}</div>
                {sections}{prompt_html}{edge_html}
            </div>
        </div>"""

    scenario_text = f"As a {role.lower()}, {scenario[0].lower() + scenario[1:]}" if scenario else ""

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
        <div class="card-scenario">{scenario_text}</div>
        <div class="phases-container">{phases_html}</div>
    </div>"""


def render_full_page(outputs, prompt_version="", model_name=""):
    from html import escape as esc

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    if outputs and not model_name:
        model_name = outputs[0].get("meta", {}).get("model", "")
    if outputs and not prompt_version:
        prompt_version = outputs[0].get("meta", {}).get("promptVersion", "")

    cards = ""
    for i, data in enumerate(outputs, 1):
        cards += render_card_html(data, i)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Walkthrough Results — {esc(prompt_version)}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;line-height:1.6;-webkit-font-smoothing:antialiased}}
.page-container{{max-width:800px;margin:0 auto;padding:40px 20px}}
.page-header{{text-align:center;margin-bottom:40px;color:#999;font-size:13px}}
.page-header .version{{font-weight:600;color:#7c3aed;font-size:14px}}
.page-header .meta{{margin-top:4px}}
.card{{background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.08);box-shadow:0 1px 3px rgba(0,0,0,0.06);padding:32px;margin-bottom:32px}}
.card-header{{margin-bottom:16px}}
.card-header-top{{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}}
.card-category{{color:#7c3aed;text-transform:uppercase;font-size:12px;letter-spacing:1.5px;font-weight:600}}
.time-badge{{background:#fff;border:1px solid #ddd;border-radius:12px;padding:2px 10px;font-size:12px;color:#666}}
.card-task{{font-size:18px;font-weight:600;color:#1a1a1a;line-height:1.4}}
.card-badges{{margin-top:8px;display:flex;gap:8px}}
.tool-badge,.workspace-badge{{font-size:11px;padding:2px 8px;border-radius:4px;font-weight:500}}
.tool-badge{{background:#f3e8ff;color:#7c3aed}}
.workspace-badge{{background:#ecfdf5;color:#16a34a}}
.card-scenario{{color:#555;font-size:14px;margin-bottom:24px;line-height:1.6}}
.phases-container{{margin-top:16px}}
.phase{{display:flex;gap:16px}}
.phase-marker{{display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:28px}}
.phase-circle{{width:28px;height:28px;border-radius:50%;border:2px solid #7c3aed;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#7c3aed;flex-shrink:0}}
.phase-circle.prompt-phase{{background:#7c3aed;color:#fff}}
.phase-circle.last-phase{{border-color:#16a34a;color:#16a34a}}
.phase-connector{{width:2px;flex-grow:1;background:#e5e7eb;min-height:20px}}
.phase-content{{flex-grow:1;padding-bottom:24px}}
.phase-title{{font-size:15px;font-weight:600;color:#1a1a1a;margin-bottom:10px}}
.phase-section{{font-size:14px;margin-bottom:8px;line-height:1.5}}
.phase-label{{font-weight:600}}
.today-label{{color:#999;font-style:italic}}
.withai-label{{color:#333}}
.check-label{{color:#d97706;font-style:italic}}
.prompt-block{{background:#1a1a2e;border-radius:8px;padding:20px;margin:12px 0;position:relative}}
.prompt-text{{font-family:'SF Mono','Fira Code',Consolas,monospace;font-size:13px;color:#e2e8f0;line-height:1.6;white-space:pre-wrap;word-wrap:break-word}}
.copy-btn{{text-align:right;color:#94a3b8;font-size:12px;margin-top:10px;cursor:pointer;user-select:none}}
.copy-btn:hover{{color:#cbd5e1}}
.followup-block{{margin-top:8px}}
.followup-label{{color:#d97706;text-transform:uppercase;font-size:11px;letter-spacing:1px;font-weight:600;margin-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}}
.refinement-pattern{{color:#7c3aed;font-style:italic;font-size:14px;margin:8px 0 12px;line-height:1.5}}
.human-edge{{color:#16a34a;font-size:14px;margin-top:8px;line-height:1.5}}
.edge-label{{font-weight:700}}
.toast{{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:#1a1a2e;color:#e2e8f0;padding:10px 20px;border-radius:8px;font-size:13px;opacity:0;transition:all .3s ease;z-index:1000}}
.toast.show{{transform:translateX(-50%) translateY(0);opacity:1}}
.back-link{{display:inline-block;margin-bottom:20px;color:#7c3aed;text-decoration:none;font-size:13px}}
.back-link:hover{{text-decoration:underline}}
</style>
</head>
<body>
<div class="page-container">
    <a href="/" class="back-link">&larr; Back to dashboard</a>
    <div class="page-header">
        <div class="version">Prompt: {esc(prompt_version)}</div>
        <div class="meta">Model: {esc(model_name)} &middot; {len(outputs)} cases</div>
    </div>
    {cards}
</div>
<div class="toast" id="toast">Copied to clipboard</div>
<script>
function copyPrompt(btn){{const t=btn.previousElementSibling.textContent||btn.parentElement.querySelector('.prompt-text').textContent;navigator.clipboard.writeText(t.trim()).then(()=>{{const toast=document.getElementById('toast');toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1500)}})}}
</script>
</body>
</html>"""


def landing_page():
    prompts = load_prompts()
    cases = load_cases()

    versions_options = "".join(f'<option value="{v}">{v}</option>' for v in prompts)
    case_rows = ""
    for c in cases:
        case_rows += f"""<tr>
            <td><code>{c['id']}</code></td>
            <td>{c['role']}</td>
            <td>{c['task'][:60]}{'...' if len(c['task'])>60 else ''}</td>
            <td><span class="cat-badge cat-{c['category'].lower()}">{c['category']}</span></td>
            <td>{c.get('tool', '—')}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Walkthrough Testing Suite</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;line-height:1.6;-webkit-font-smoothing:antialiased}}
.container{{max-width:900px;margin:0 auto;padding:40px 20px}}
h1{{font-size:22px;font-weight:700;margin-bottom:4px}}
.subtitle{{color:#999;font-size:14px;margin-bottom:32px}}
.section{{background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.08);box-shadow:0 1px 3px rgba(0,0,0,0.06);padding:24px;margin-bottom:24px}}
.section h2{{font-size:16px;font-weight:600;margin-bottom:16px;color:#1a1a1a}}
.form-row{{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin-bottom:12px}}
.form-group{{display:flex;flex-direction:column;gap:4px}}
.form-group label{{font-size:12px;color:#666;font-weight:500}}
.form-group select,.form-group input{{padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff}}
.btn{{padding:8px 20px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer}}
.btn:hover{{background:#6d28d9}}
.btn:disabled{{background:#ccc;cursor:not-allowed}}
table{{width:100%;border-collapse:collapse;font-size:13px}}
th{{text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}}
td{{padding:8px;border-bottom:1px solid #f0f0f0}}
code{{background:#f5f5f7;padding:2px 6px;border-radius:4px;font-size:12px}}
.cat-badge{{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}}
.cat-analysis{{background:#f3e8ff;color:#7c3aed}}
.cat-output{{background:#dbeafe;color:#2563eb}}
.cat-coordination{{background:#fef3c7;color:#d97706}}
#status{{margin-top:16px;font-size:13px;color:#666}}
#status .ok{{color:#16a34a}}
#status .fail{{color:#dc2626}}
#results-link{{display:none;margin-top:12px}}
#results-link a{{color:#7c3aed;font-weight:500;text-decoration:none}}
#results-link a:hover{{text-decoration:underline}}
.progress{{margin-top:12px}}
.progress-bar{{height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden}}
.progress-fill{{height:100%;background:#7c3aed;transition:width 0.3s;width:0%}}
</style>
</head>
<body>
<div class="container">
    <h1>Walkthrough Testing Suite</h1>
    <p class="subtitle">Run AI adoption scenarios, review rendered output</p>

    <div class="section">
        <h2>Run Tests</h2>
        <div class="form-row">
            <div class="form-group">
                <label>Prompt Version</label>
                <select id="prompt-version">{versions_options}</select>
            </div>
            <div class="form-group">
                <label>Model</label>
                <select id="model">
                    <option value="claude-sonnet-4-5-20250929">Claude Sonnet (default)</option>
                    <option value="claude-opus-4-5-20250514">Claude Opus</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                </select>
            </div>
            <div class="form-group">
                <label>Temperature</label>
                <input type="number" id="temp" value="0.6" min="0" max="2" step="0.1" style="width:80px">
            </div>
            <div class="form-group">
                <label>Case (blank = all)</label>
                <input type="text" id="only" placeholder="e.g. pm-pricing" style="width:160px">
            </div>
            <button class="btn" id="run-btn" onclick="runTests()">Run</button>
        </div>
        <div class="progress" id="progress" style="display:none">
            <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
        </div>
        <div id="status"></div>
        <div id="results-link"><a href="#" target="_blank">View rendered results &rarr;</a></div>
    </div>

    <div class="section">
        <h2>Test Cases ({len(cases)})</h2>
        <table>
            <tr><th>ID</th><th>Role</th><th>Task</th><th>Category</th><th>Tool</th></tr>
            {case_rows}
        </table>
    </div>

    <div class="section">
        <h2>Prompt Versions</h2>
        <p style="font-size:13px;color:#666">Available: {', '.join(f'<strong>{v}</strong>' for v in prompts) or 'none'}</p>
        <p style="font-size:12px;color:#999;margin-top:4px">Add new versions by creating /prompts/&lt;version&gt;/system.txt + user.txt</p>
    </div>
</div>
<script>
async function runTests(){{
    const btn=document.getElementById('run-btn');
    const status=document.getElementById('status');
    const progress=document.getElementById('progress');
    const fill=document.getElementById('progress-fill');
    const link=document.getElementById('results-link');
    btn.disabled=true;
    status.innerHTML='Running...';
    progress.style.display='block';
    fill.style.width='0%';
    link.style.display='none';

    const body={{
        promptVersion:document.getElementById('prompt-version').value,
        model:document.getElementById('model').value,
        temperature:parseFloat(document.getElementById('temp').value),
        only:document.getElementById('only').value||null
    }};

    try{{
        const resp=await fetch('/api/run',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify(body)}});
        const data=await resp.json();
        if(!resp.ok)throw new Error(data.error||'Request failed');

        let html='';
        let passed=0;
        data.results.forEach((r,i)=>{{
            fill.style.width=((i+1)/data.results.length*100)+'%';
            if(r.success){{html+=`<span class="ok">✓ ${{r.caseId}}</span> `;passed++}}
            else{{html+=`<span class="fail">✗ ${{r.caseId}}: ${{r.error}}</span> `}}
        }});
        status.innerHTML=`${{passed}}/${{data.results.length}} passed<br>${{html}}`;

        if(passed>0){{
            link.style.display='block';
            link.querySelector('a').href=`/api/render?version=${{body.promptVersion}}`;
        }}
    }}catch(e){{
        status.innerHTML=`<span class="fail">Error: ${{e.message}}</span>`;
    }}
    btn.disabled=false;
}}
</script>
</body>
</html>"""


# In-memory store for outputs (Vercel functions are stateless per invocation,
# but within a single invocation we can accumulate results)
_outputs_store = {}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        qs = parse_qs(parsed.query)

        if path == "" or path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(landing_page().encode())

        elif path == "/api/render":
            version = qs.get("version", [""])[0]
            if not version:
                self._json_response(400, {"error": "version parameter required"})
                return

            # Check environment for stored outputs
            store_key = f"outputs_{version}"
            stored = os.environ.get(store_key)
            if stored:
                outputs = json.loads(stored)
            else:
                outputs = []

            if not outputs:
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(f"""<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;color:#666">
                    <p>No outputs found for prompt version <strong>{version}</strong>.</p>
                    <p>Run tests first from the <a href="/">dashboard</a>.</p></body></html>""".encode())
                return

            html = render_full_page(outputs, version)
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(html.encode())

        else:
            self._json_response(404, {"error": "not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/run":
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length)) if content_length else {}

            prompt_version = body.get("promptVersion", "v3")
            model = body.get("model", "claude-sonnet-4-5-20250929")
            temperature = body.get("temperature", 0.6)
            max_tokens = body.get("maxTokens", 2000)
            only = body.get("only")

            prompts = load_prompts()
            if prompt_version not in prompts:
                self._json_response(400, {"error": f"Unknown prompt version: {prompt_version}"})
                return

            system_template = prompts[prompt_version]["system"]
            user_template = prompts[prompt_version]["user"]

            cases = load_cases()
            if only:
                cases = [c for c in cases if c["id"] == only]
                if not cases:
                    self._json_response(400, {"error": f"No case with id: {only}"})
                    return

            results = []
            outputs = []

            for case in cases:
                case_id = case["id"]
                system_prompt = interpolate(system_template, case)
                user_prompt = interpolate(user_template, case)

                try:
                    raw = call_api(system_prompt, user_prompt, model, temperature, max_tokens)
                    parsed_output = extract_json(raw)

                    if parsed_output is None:
                        results.append({"caseId": case_id, "success": False, "error": "invalid JSON"})
                        continue

                    if not validate_output(parsed_output):
                        results.append({"caseId": case_id, "success": False, "error": "missing required fields"})
                        continue

                    output_envelope = {
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
                        "output": parsed_output,
                    }
                    outputs.append(output_envelope)
                    results.append({"caseId": case_id, "success": True})

                except Exception as e:
                    results.append({"caseId": case_id, "success": False, "error": str(e)})

            # Store outputs in env for the render endpoint to pick up
            # (This is a workaround for Vercel's stateless functions)
            store_key = f"outputs_{prompt_version}"
            os.environ[store_key] = json.dumps(outputs)

            self._json_response(200, {"results": results, "outputs": outputs})

        else:
            self._json_response(404, {"error": "not found"})

    def _json_response(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass  # Suppress default logging
