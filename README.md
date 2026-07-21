# Confide

**One bedside input. The downstream clinical paperwork, drafted locally.**

Confide is an on-prem workflow agent for clinical teams. A spoken round, photographed prescription, or typed correction goes through a different tool path and updates one living patient record. The result is a reviewable bundle: structured note, safety alerts, evidence-backed billing codes, SBAR handoff, patient summary, and staged orders.

The network can stay off for the entire run. Speech transcription, OCR, inference, deterministic safety checks, and SQLite persistence all run on the hospital's own machine.

## Work & Productivity thesis

Clinical work produces a paperwork trail that is repetitive, fragmented, and expensive to recreate at every handoff. Confide turns one input at the bedside into the drafts the team would otherwise build in separate tools. It makes the orchestration visible, measures conservative workflow impact, and keeps the clinician at the commit boundary.

The central demo is dynamic routing:

1. A spoken round fans out into note, graph facts, Guardian checks, billing codes, handoff, and patient summary.
2. A photographed outside prescription takes a medication-reconciliation path and catches ketorolac against warfarin across modalities.
3. A typed “cancel the EKG” takes a two-tool correction path and supersedes the prior order with an audit edge.

Same **Run** button, three workflows, one patient graph.

## The safety boundary

> **gpt-oss is the language layer. It never makes a clinical decision.**

- gpt-oss extracts stated facts, structures text, proposes coding candidates, and phrases drafts.
- `core/curated.py` owns drug categories, allergy conflicts, interactions, recheck windows, ICD-10 entries, CPT entries, and code validity.
- `core/guardian.py` performs deterministic safety checks. The model is told to trust those results verbatim.
- Facts and safety alerts are observations and may persist during a run.
- Notes, billing codes, handoffs, patient summaries, reminders, and order actions remain drafts until explicit approval.
- Unknown billing codes are removed before review. Labels for approved codes come from curated tables, not model output.
- Public traces contain tool names, semantic arguments, rule/evidence summaries, and status. Private chain-of-thought is not stored or shown.

Confide assists clinical workflow; it does not diagnose, prescribe, or replace a licensed professional.

## Model split

**Build tool:** Codex + GPT-5.6 were used to design, implement, test, review, and document the rebuild.

**Runtime model:** `gpt-oss:20b` runs locally through Ollama. OpenAI describes gpt-oss as text-only, agent-oriented, reasoning-adjustable, and Apache-2.0 licensed. OpenAI also reports strong HealthBench performance and says the 20b model can run with 16 GB of memory; the same release explicitly warns that gpt-oss is not a medical professional and is not intended for diagnosis or treatment. See the official [gpt-oss release](https://openai.com/index/introducing-gpt-oss/) and [model card](https://openai.com/index/gpt-oss-model-card/).

That split is intentional: healthcare privacy is why the runtime is an open-weight model deployed on infrastructure the care organization controls. Images never go to the text-only model; local Tesseract OCR converts them to text first.

## Architecture

```text
speech ── faster-whisper ─┐
image  ── Tesseract OCR ──┼─> gpt-oss tool loop ─> draft artifact bundle ─> human approval
text   ───────────────────┘          │                         │
                                    ├─ language tools         ├─ note / codes / SBAR / summary
                                    ├─ deterministic tools    ├─ Guardian alerts / rule evidence
                                    └─ SQLite record tools    └─ staged order actions
```

`ToolContext` binds `patient_id`, `encounter_id`, source kind, and language on the server. The model receives only semantic tool arguments, such as a drug name. The loop is capped at eight turns, returns tool errors to the model for recovery, and has a repeatable local fallback route if tool calling is unavailable.

Key modules:

- `core/agent.py` — bounded orchestration loop, tool contracts, draft bundle, approval commits, trace, and ROI.
- `core/llm.py` — the only Ollama boundary; free text, JSON, and tool turns with reasoning effort.
- `core/graph.py` — living patient facts, cross-encounter context, corrections, and audit edges.
- `core/guardian.py` — deterministic allergy, interaction, contradiction, and forgotten-order checks.
- `core/curated.py` — auditable clinical and billing lookup tables.
- `core/vision.py` — Tesseract subprocess only; gpt-oss receives text, never pixels.
- `features/agent.py` — run, upload, approval, trace, recent-run, and ROI APIs.
- `web/src/views/AgentRunView.jsx` — unified capture, visible orchestration, review, and three-trace reveal.
- `eval/` — repeatable route, cross-modal safety, and coding evaluation.

## Quick start

Prerequisites:

- Python 3.11+
- Node 22.12+ (the repository includes `.nvmrc`)
- [Ollama](https://ollama.com/download)
- Tesseract (`brew install tesseract` on macOS; `apt install tesseract-ocr` on Debian/Ubuntu)
- At least 16 GB memory for the documented gpt-oss-20b local footprint

```bash
git clone <repository-url> doctor-offline
cd doctor-offline

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

ollama pull gpt-oss:20b

npm --prefix web install
npm --prefix web run build

uvicorn app:app --host 127.0.0.1 --port 8000
```

Open [http://localhost:8000](http://localhost:8000).

Seeded demo accounts:

- Staff: `doctor` / `confide`
- Patient: `maria` / `confide`

For a clean seeded demo, remove or move `data/confide.db` before starting. SQLite is recreated locally on startup.

### Prove it is offline

1. Pull the model and install dependencies while connected.
2. Start Ollama and Confide.
3. Turn off Wi-Fi or disconnect the network cable.
4. Run the María speech → image → correction sequence.

The UI keeps the `NETWORK OFF` indicator and live local-model console visible. No runtime feature has an external API fallback.

## API

```text
POST /api/agent/run
POST /api/agent/upload
POST /api/agent/approve
GET  /api/agent/runs/{encounter_id}/trace
GET  /api/patients/{patient_id}/agent-runs
GET  /api/patients/{patient_id}/roi
GET  /api/model/logs
```

The legacy `/api/gemma/logs` route remains as a compatibility alias.

## Test and evaluation

The tests patch only language/model boundaries and exercise real temporary SQLite databases, graph persistence, Guardian rules, billing validation, approval isolation, and FastAPI contracts.

```bash
source .venv/bin/activate

python -m pytest tests -q
python -m eval.run_eval
python -m compileall -q core features app.py
npm --prefix web run build
```

`python -m eval.run_eval` regenerates `eval/results/latest.json` and fails the process if:

- a required route tool is missing;
- the María prescription no longer creates a critical cross-modal alert;
- expected codes are missing;
- an unexpected or unvalidated code reaches the bundle.

## Demo script (under three minutes)

1. Show `NETWORK OFF`, the local-model console, and María's admission graph: chest pain, atrial fibrillation, penicillin allergy, and warfarin.
2. Speak: “Chest pain better, 2/10. Continue warfarin, recheck troponin in 3 hours, repeat EKG, discharge tomorrow if stable.” Show the six-tool fan-out and the draft bundle. Approve selected artifacts.
3. Select **Photograph**, then **Use sample image**. Show the four-tool prescription route and the critical anticoagulant × NSAID bleeding-risk alert.
4. Type “cancel the EKG.” Show the two-tool route and the retained audit history.
5. Open **ROI & proof** and label every number as an estimate.
6. Run `python -m eval.run_eval` and show the green cross-modal and coding results.
7. Explain the split aloud: Codex/GPT-5.6 built the system; open-weight gpt-oss-20b runs it locally because clinical privacy is the product requirement.

## Collaboration with Codex

Codex accelerated the repository-wide rebuild by mapping the existing graph, Guardian, and feature functions into narrow tool adapters; writing tests before each backend behavior; discovering spec/repository mismatches; and keeping an incremental commit history that mirrors the five build phases.

The human handoff overrode a tempting model-centric design in two important places: image understanding was moved out of the model and into Tesseract because gpt-oss is text-only, and all clinical/billing judgments were moved behind deterministic curated lookups. That is the same collaboration model the product enforces: the model proposes; the human and code-owned rules decide.

The repository did not contain a prior `/feedback` session identifier. Generate the submission feedback record from the Codex session used for the final build and include that identifier in the Devpost submission.

## Honest ROI methodology

- Documentation time: 8 minutes estimated per completed agent run.
- Coding value: $75 nominal estimate per finalized code, explicitly not actual reimbursement.
- Near-misses: count of critical deterministic Guardian alerts.
- Throughput: recorded runs in the current demo dataset.
- Latency: average locally persisted end-to-end run latency.

These are demo estimates, not clinical, operational, or financial outcome claims.

## Submission checklist

- Track: **Work & Productivity**
- Public repository, or share access with the event testing addresses
- README with local run instructions and sample credentials
- Under-three-minute YouTube demo with Codex/GPT-5.6 voiceover
- `/feedback` session identifier
- Category selected in Devpost

## License and data

The bundled patient and prescription are synthetic demo data. gpt-oss licensing and usage are governed by OpenAI's published model terms; see the official model card linked above.
