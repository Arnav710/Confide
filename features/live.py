"""LiveRoom — the single always-listening surface for the demo.

Every beat in the demo script is a reaction to either a spoken utterance or a camera
frame. This router owns those two triggers plus the memory graph the UI paints from.

  POST /api/live/stream          form(patient_id, audio)
      transcribe → detect language → translate → extract entities
      → upsert into `entities` → check drug/allergy alerts → append `live_events`

  POST /api/live/vision          form(patient_id, image)
      Gemma vision OCR → classify (consent | discharge | other)
      → return raw OCR text so the frontend can hand off to consent/discharge routers

  GET  /api/live/graph/{id}      returns {nodes, edges} for the memory panel
  GET  /api/live/events/{id}     recent live events (polling; ?since=id)

Design notes:
- Alerts are curated (see core/interactions.py). We do NOT ask Gemma "is this dangerous?"
  live — that's the demo's whole safety story ("we don't invent pharmacology at runtime").
- Entity extraction *does* use Gemma (JSON mode) because natural speech is messy — a
  hardcoded token list would miss "the amox" or "aspirin 81".
- Translation and extraction share the same transcript so we don't re-STT.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from core import db, interactions, voice
from core.deps import require_patient
from core.llm import ask_gemma_json, ask_gemma_vision
from core.prompts import LIVE_EXTRACT_SYSTEM, TRANSLATE_SYSTEM
from core.storage import save_audio_upload, save_image_upload

router = APIRouter(prefix="/api/live", tags=["live"])


# --- helpers -----------------------------------------------------------------

def _patient_allergies(patient: dict) -> list[str]:
    """Union of (patient.known_allergies free text) + entities table 'allergy' rows.
    Splitting on commas covers the common 'penicillin, sulfa' form the admit form uses."""
    raw = (patient.get("known_allergies") or "").strip()
    from_text = [a.strip() for a in raw.split(",") if a.strip()] if raw else []
    from_entities = [e["label"] for e in db.list_entities(patient["id"]) if e["kind"] == "allergy"]
    # de-dup case-insensitively while preserving order
    seen = set()
    out = []
    for a in from_text + from_entities:
        key = a.lower()
        if key not in seen:
            seen.add(key)
            out.append(a)
    return out


def _extract_entities(english_text: str) -> dict:
    """Ask Gemma for drugs/allergies/symptoms/procedures/diagnoses. Falls back to empty
    lists on parse failure so a single bad generation never breaks the stream."""
    if not english_text.strip():
        return {"drugs": [], "allergies": [], "symptoms": [], "procedures": [], "diagnoses": []}
    result = ask_gemma_json(f"UTTERANCE:\n{english_text}", system=LIVE_EXTRACT_SYSTEM)
    if "_error" in result:
        return {"drugs": [], "allergies": [], "symptoms": [], "procedures": [], "diagnoses": []}

    def _clean(v):
        if not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if str(x).strip()]

    return {
        "drugs":      _clean(result.get("drugs")),
        "allergies":  _clean(result.get("allergies")),
        "symptoms":   _clean(result.get("symptoms")),
        "procedures": _clean(result.get("procedures")),
        "diagnoses":  _clean(result.get("diagnoses")),
    }


def _translate(raw_text: str, whisper_lang: str) -> dict:
    """Return {'is_english': bool, 'detected_language': str, 'english': str}.
    Cheap short-circuit when Whisper already says English — Gemma round-trip is ~1s."""
    if whisper_lang == "en":
        return {"is_english": True, "detected_language": "en", "english": raw_text}
    result = ask_gemma_json(f"UTTERANCE:\n{raw_text}", system=TRANSLATE_SYSTEM)
    if "_error" in result:
        # Whisper said non-English but Gemma choked — surface the raw text and mark unknown.
        return {"is_english": False, "detected_language": whisper_lang, "english": raw_text}
    return {
        "is_english":        bool(result.get("is_english", False)),
        "detected_language": str(result.get("detected_language") or whisper_lang),
        "english":           str(result.get("english") or raw_text),
    }


# --- POST /api/live/stream ---------------------------------------------------

@router.post("/stream")
async def live_stream(
    patient_id: int = Form(...),
    audio: UploadFile = File(...),
    speaker: Optional[str] = Form(None),
):
    """Take an audio chunk, return everything the UI needs to update in one shot.

    We deliberately return `entities` (this-utterance) *and* the alerts so the frontend
    can flash the correct nodes/edges without a follow-up graph fetch. It should still
    poll /graph occasionally to stay in sync if multiple clients are watching.
    """
    patient = db.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    audio_path = save_audio_upload(audio)
    raw_text, whisper_lang = voice.transcribe(audio_path)

    # Silence / VAD-filtered chunk. Return early so the caller can drop it.
    if not raw_text.strip():
        return {
            "transcript": "",
            "is_english": True,
            "detected_language": whisper_lang,
            "english": "",
            "entities": {"drugs": [], "allergies": [], "symptoms": [], "procedures": [], "diagnoses": []},
            "alerts": [],
            "event_id": None,
        }

    tr = _translate(raw_text, whisper_lang)
    ents = _extract_entities(tr["english"])

    # Persist entities. Symptoms/diagnoses are also indexed even if not surfaced today —
    # cheap now, useful the moment the Reveal panel wants them.
    for kind_field, kind_name in [
        ("drugs", "drug"),
        ("allergies", "allergy"),
        ("symptoms", "symptom"),
        ("procedures", "procedure"),
        ("diagnoses", "diagnosis"),
    ]:
        for label in ents[kind_field]:
            db.upsert_entity(patient_id, kind_name, label, source="live_stream")

    # Drug/allergy alerts — the demo's must-land beat. Union of already-known allergies
    # plus any brand-new allergy the patient just uttered in this same chunk.
    patient_allergies = _patient_allergies(patient)
    for a in ents["allergies"]:
        if a and a not in patient_allergies:
            patient_allergies.append(a)

    alerts = []
    for drug in ents["drugs"]:
        alert = interactions.check_drug_against_allergies(drug, patient_allergies)
        if alert:
            alerts.append(alert)

    # Record the transcript itself, then each alert as its own event so the audit trail
    # in `live_events` mirrors what showed up on-screen in real time.
    tx_event = db.record_live_event(
        patient_id,
        kind="transcript",
        text=tr["english"],
        speaker=speaker,
        meta={"raw": raw_text, "language": tr["detected_language"], "entities": ents},
    )
    for a in alerts:
        db.record_live_event(patient_id, kind="alert", text=a["message"], meta=a)

    return {
        "transcript": raw_text,
        "is_english": tr["is_english"],
        "detected_language": tr["detected_language"],
        "english": tr["english"],
        "entities": ents,
        "alerts": alerts,
        "event_id": tx_event["id"],
    }


# --- POST /api/live/vision ---------------------------------------------------

_VISION_CLASSIFY_PROMPT = (
    "Look at this image. It is being held up in a hospital room by a nurse or patient. "
    "Return STRICT JSON: {\"kind\": one of \"consent\" | \"discharge\" | \"other\", "
    "\"ocr_text\": full text you can read from the image}. Output only the JSON, no code fences."
)


@router.post("/vision")
async def live_vision(
    patient_id: int = Form(...),
    image: UploadFile = File(...),
):
    """Classify a camera frame as consent/discharge/other and OCR it.

    We do the classify + OCR in one Gemma vision call to save a second round-trip.
    The frontend can then POST the OCR text (plus `kind`) to the existing consent/
    discharge routers to run the full pipeline — no duplication of that logic here.
    """
    if not db.get_patient(patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")

    image_path = save_image_upload(image)
    raw = ask_gemma_vision(_VISION_CLASSIFY_PROMPT, str(image_path))

    # Gemma sometimes wraps JSON in ```json fences even when not asked; strip defensively.
    import json
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()
    try:
        parsed = json.loads(cleaned)
        kind = parsed.get("kind", "other")
        ocr_text = parsed.get("ocr_text", "")
    except json.JSONDecodeError:
        kind, ocr_text = "other", raw

    if kind not in ("consent", "discharge", "other"):
        kind = "other"

    db.record_live_event(
        patient_id,
        kind="document",
        text=(ocr_text[:200] + "…") if len(ocr_text) > 200 else ocr_text,
        meta={"doc_kind": kind, "image_path": str(image_path)},
    )
    return {"kind": kind, "ocr_text": ocr_text, "image_path": str(image_path)}


# --- GET /api/live/graph -----------------------------------------------------

@router.get("/graph/{patient_id}")
def live_graph(patient_id: int):
    """Nodes + edges for the memory panel. The patient node is always id=0; every
    entity is patient→entity. Contraindication edges are computed on the fly by
    running each drug through the curated allergy table — no separate persistence."""
    patient = db.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    ents = db.list_entities(patient_id)
    nodes = [{
        "id": "patient",
        "label": patient["name"],
        "kind": "patient",
    }]
    edges = []
    drugs, allergies = [], []
    for e in ents:
        node_id = f"{e['kind']}:{e['label'].lower()}"
        nodes.append({
            "id": node_id,
            "label": e["label"],
            "kind": e["kind"],
            "created_at": e["created_at"],
        })
        edges.append({"from": "patient", "to": node_id, "kind": e["kind"]})
        if e["kind"] == "drug":
            drugs.append((node_id, e["label"]))
        elif e["kind"] == "allergy":
            allergies.append(e["label"])

    # Also fold in known_allergies free text so the graph reflects the admit-form facts,
    # even if the patient never re-said them out loud during the LiveRoom session.
    raw_allergies = _patient_allergies(patient)
    for a in raw_allergies:
        if a.lower() not in [x.lower() for x in allergies]:
            node_id = f"allergy:{a.lower()}"
            if not any(n["id"] == node_id for n in nodes):
                nodes.append({"id": node_id, "label": a, "kind": "allergy"})
                edges.append({"from": "patient", "to": node_id, "kind": "allergy"})
                allergies.append(a)

    # Red edges: any (drug, allergy) pair that our curated table flags as contraindicated.
    for drug_node, drug_label in drugs:
        alert = interactions.check_drug_against_allergies(drug_label, allergies)
        if alert:
            edges.append({
                "from": drug_node,
                "to": f"allergy:{(alert.get('allergy') or '').lower()}",
                "kind": "contraindicated",
                "severity": alert.get("severity", "high"),
            })

    return {"nodes": nodes, "edges": edges}


# --- GET /api/live/events ----------------------------------------------------

@router.get("/events/{patient_id}")
def live_events(patient_id: int, since: int | None = None, limit: int = 100):
    require_patient(patient_id)
    events = db.list_live_events(patient_id, since_id=since)
    # Client wants newest-first for the transcript ticker; tail on the server so we're
    # not shipping a 5,000-row history when the mic has been on all shift.
    if limit and len(events) > limit:
        events = events[-limit:]
    return events
