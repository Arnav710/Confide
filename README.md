# Confide

**On-prem clinical AI, powered by Gemma 4. Nothing ever reaches the cloud.**

![Gemma 4](https://img.shields.io/badge/Gemma%204-on--device-blue)
![On-Prem](https://img.shields.io/badge/AI-100%25%20on--prem-success)
![Offline](https://img.shields.io/badge/network-not%20required-important)
![Backend](https://img.shields.io/badge/FastAPI-Python%203.11+-009688)
![Frontend](https://img.shields.io/badge/React-Vite-61dafb)

Confide is a hospital-grade clinical companion where the **entire intelligence stack — every word understood, every document read, every safety check — runs on Gemma 4, on the hospital's own hardware.** It *hears* each conversation, *remembers* it in one living patient record, and *watches over* the care, catching what tired people miss.

The audio, the documents, and the model itself never leave the building. Pull the network cable and it keeps working.

---

## Why on-prem AI

The obvious way to add AI to a hospital ("plug in a cloud scribe") ships the most sensitive audio and documents in medicine to a third-party endpoint. Confide takes the opposite bet: **move the intelligence to the bedside instead of moving the data to the cloud.**

On-prem is load-bearing here, not a checkbox:

- **It removes an entire risk surface.** No data in transit means nothing to intercept, no third-party processor, no breach exposure. The threat model shrinks to the machine in the room.
- **It works with zero connectivity.** Rural clinics, ambulances, and disaster settings don't have reliable networks. Confide doesn't need one.
- **It's verifiable, not promised.** Every core operation runs on `localhost`. A live `NETWORK: OFF` pill and a floating **Gemma console** (prompt → JSON → latency, updating in real time) let anyone *watch* every inference happen locally. The privacy claim is provable in one step: turn off Wi-Fi and keep using the app.
- **It's honest.** HIPAA-compliant cloud scribes exist; we don't claim clinical AI legally *cannot* use the cloud. The narrower, stronger claim: on-prem eliminates the breach-and-connectivity problem entirely for the most sensitive audio in medicine — and Gemma 4 is good enough to make that trade-off free.

## What Gemma 4 does here

One local model, served by Ollama, carries the whole product:

| Capability | How Confide uses it |
|---|---|
| **Structured extraction** | Reads messy transcripts and pulls out discrete, category-tagged facts (`warfarin` → medication, category *anticoagulant*; "not on blood thinners" → statement, polarity *denied*). Grammar-constrained JSON mode makes output syntactically valid every time, with retry fallback. |
| **Multimodal vision** | The *same* model OCRs consent forms, prescriptions, and discharge sheets — no second cloud OCR dependency to leak documents to. |
| **Grounded Q&A** | Consent and discharge questions are answered from the actual document text placed in Gemma's context — not from the model's recollection. |
| **Human phrasing** | Explains procedures in plain language, phrases Guardian alerts calmly, speaks gently to a frightened patient. |
| **Runs warm on one box** | Small enough for full local serving via Ollama (`ollama pull gemma4`), held warm in memory (`keep_alive`) between calls so the UI stays responsive on CPU. |

And one thing it deliberately **never** does:

> ### Gemma is the *language* layer. It is never the *decision* layer.

Every clinical judgment — *does this drug conflict with that allergy? do these two drugs interact? is this recheck overdue?* — is a **deterministic lookup in curated, auditable code** ([core/curated.py](core/curated.py)), not something the model reasons about from memory. That separation is what makes the system auditable, repeatable, and safe to stand behind: identical inputs produce identical alerts, every alert traces to a specific rule and specific facts, and Gemma's known weakness (confidently wrong reasoning) is designed out of the architecture.

---

## What it does

Confide is one product with three capabilities, demonstrated across an entire hospital stay for a single seeded patient (María, 68, chest pain, penicillin-allergic, on warfarin):

| | Capability | What it does |
|---|---|---|
| 🎧 | **Hear** | Turns a spoken round, a consent conversation, or a patient question into structured, understood text — and explains any document in plain language. |
| 🧠 | **Remember** | Builds **one living knowledge graph** of the patient from every interaction — allergies, meds, symptoms, orders, statements — persisted across the whole stay. |
| 🛡 | **Watch over** | **The Guardian** — an always-on layer that checks everything said and done against that graph and **speaks up on its own** when it sees a conflict. |

### The Guardian — the part that speaks up on its own

From a single dictation, the Guardian runs three deterministic checks against the graph:

1. **Allergy / interaction.** Every newly ordered drug is cross-checked against active allergies *and* current meds, including cross-reactivity (penicillin ↔ cephalosporin). Order an NSAID for a patient on warfarin → **critical bleeding-risk alert**, instantly.
2. **Contradiction.** A patient statement that denies something the record asserts. "I'm not on any blood thinners" → flagged against the warfarin on file from admission.
3. **Forgotten order.** An ordered recheck whose window elapsed with nothing marked done. "Recheck troponin in 3 hours" that never got closed → a gentle "before you go…" flag.

Alerts are persisted, flow into the shift handoff, and are **surfaced, never auto-acted-upon** — the clinician stays in the loop.

### The guided visit

A clinician is walked through the whole encounter — **Prepare → Consent → The meeting → Prescription → Handoff → Discharge** — and every stage feeds the same graph and the same Guardian. Completion state is derived from the real record, not click history. A second, patient-facing surface answers "what's happening to me?" grounded strictly in the patient's own recorded facts.

---

## Architecture

```
   messy human speech / documents
                │
          ┌─────▼─────┐   Gemma 4 (local, via Ollama): understand + extract + phrase
          │  GEMMA 4  │   — the language layer, never the judge
          └─────┬─────┘
                │  structured, category-tagged facts
        ┌───────▼────────┐
        │  LIVING GRAPH  │   nodes + edges, persisted per patient (SQLite)
        └───────┬────────┘
        ┌───────▼────────┐
        │  THE GUARDIAN  │   deterministic rules over curated clinical data
        └───────┬────────┘   → allergy · interaction · contradiction · forgotten order
                │
         a calm sentence, phrased by Gemma, shown to the clinician
```

**In one line:** not eight products — three local primitives (Voice, Vision, Memory) pointed at the moments of a hospital stay, with Gemma 4 as the language layer and deterministic code as the judge.

## Tech stack

Everything below runs on the local machine. There is no cloud tier.

| Layer | Choice | Why |
|---|---|---|
| Reasoning + vision | **Gemma 4 via Ollama** (`gemma4`), JSON mode, held warm | One command to serve; multimodal; reliable extraction |
| Speech-to-text | **faster-whisper** (CPU, int8) | Multilingual, fully offline |
| Text-to-speech | **Piper** | Natural local voice |
| Memory | **SQLite** — patients, encounters, graph nodes/edges, alerts | Local, file-based, auditable |
| Safety rules | **Curated clinical tables in code** ([core/curated.py](core/curated.py)) | Deterministic, provenance-clear, swaps 1:1 for RxNorm/DrugBank |
| Backend | **FastAPI** | Serves the API and the built SPA on `localhost` |
| Frontend | **React + Vite** | Guided visit flow, live graph, `NETWORK: OFF` pill, Gemma console |

## Project structure

```
doctor-offline/
├── app.py                  # FastAPI: API routes + serves the built SPA
├── core/
│   ├── llm.py              # the ONLY place that talks to Gemma (Ollama client, JSON mode, call log)
│   ├── vision.py           # Gemma 4 vision OCR
│   ├── voice.py            # faster-whisper STT + Piper TTS
│   ├── graph.py            # the living patient knowledge graph
│   ├── guardian.py         # deterministic safety checks (allergy / interaction / contradiction / overdue)
│   ├── curated.py          # curated clinical tables — the auditable "judgment" layer
│   ├── db.py / repo.py     # SQLite persistence
│   ├── seed.py             # seeded demo patient (María)
│   └── config.py           # model tags, hosts, demo time-scaling
├── features/               # thin modules composing the core: scribe, consent,
│                           # prescription, discharge, handoff, orientation, patient, memory
├── web/                    # React + Vite SPA (clinician + patient surfaces)
└── data/                   # local SQLite DB + media — never leaves the machine
```

## Getting started

**Prerequisites:** Python 3.11+, Node 18+, [Ollama](https://ollama.com), ~10 GB disk for models.

```bash
# 1. Clone
git clone git@github.com:Arnav710/build-with-gemma.git && cd build-with-gemma

# 2. Pull Gemma 4 locally
ollama pull gemma4

# 3. Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 4. Frontend
cd web && npm install && npm run build && cd ..

# 5. Run — everything on localhost
uvicorn app:app --reload
# open http://localhost:8000
```

For frontend development, run `npm run dev` inside `web/` — Vite proxies `/api` and `/media` to the backend on port 8000.

### Prove it's offline

```bash
# turn off Wi-Fi / pull the network cable, then keep using the app:
# dictation, extraction, OCR, Q&A, and Guardian alerts all keep working.
```

The Gemma console in the UI shows each call's prompt, output, and latency — all local.

## Repeatable tests

The seeded patient makes the safety behavior reproducible on any machine (logins: `doctor/confide`, `maria/confide`):

| # | Input (dictate / type) | Expected Guardian behavior |
|---|---|---|
| T1 | "Start her on **ibuprofen** for the pain." | 🔴 Critical: NSAID + anticoagulant (warfarin) bleeding risk |
| T2 | "Let's give **amoxicillin**." | 🔴 Critical: penicillin-class vs. penicillin allergy on file |
| T3 | "She says she's **not on any blood thinners**." | 🟠 Warning: contradicts warfarin recorded at admission |
| T4 | "**Recheck troponin in 3 hours**", then end the encounter | 🟠 Warning: order window elapsed, nothing marked done |
| T5 | "**Continue the warfarin.**" | No duplicate node, no duplicate alert |
| T6 | Any of the above **with Wi-Fi off** | Identical behavior; Gemma console shows local latency |

Because the checks are code, not a model roll of the dice, these pass the same way every run — the property that matters for a safety feature.

## Honest limitations

- The curated drug tables are a **demonstration set**, not a complete formulary; production swaps them 1:1 for RxNorm/DrugBank without touching the architecture.
- Extraction quality is bounded by Gemma and by STT on noisy bedside audio — which is exactly why facts are editable, confidence-scored (`unconfirmed` when unsure), and why judgment is never left to the model.
- Confide **assists** clinical judgment; it does not replace it. Notes are editable drafts, answers are grounded in documents, and alerts are surfaced — never executed.

---

Built for the **Build with Gemma** hackathon (On-Device AI track). Powered by **Gemma 4**, running entirely on-prem.

**Confide — a second clinician in the room that never forgets, and never phones home.**
