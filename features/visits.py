"""Visit history + highlights.

A patient can have multiple visits over time (admit → discharge → re-admit). The Dashboard
uses this to surface prior-visit highlights when a returning patient is selected — the piece
that makes 'Local Memory' concrete for the demo.
"""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from core import db, llm
from core.prompts import VISIT_HIGHLIGHTS_SYSTEM

router = APIRouter(prefix="/api/visits", tags=["visits"])


def _summarize_visit(visit_id: int) -> dict:
    """Ask Gemma to distill a visit into a short highlights card, grounded on the
    visit's clinical notes only. Discharge papers + reminders used to feed in here
    but that feature was removed — notes carry enough signal for the demo."""
    notes = db.list_notes_for_visit(visit_id)

    payload = {
        "notes": [
            {
                "chief_complaint": n.get("chief_complaint"),
                "medications": n.get("medications"),
                "follow_ups": n.get("follow_ups"),
                "transcript_excerpt": (n.get("raw_transcript") or "")[:600],
            }
            for n in notes
        ],
    }

    result = llm.ask_gemma_json(
        prompt=f"Visit material:\n{json.dumps(payload, indent=2)}",
        system=VISIT_HIGHLIGHTS_SYSTEM,
    )

    if "_error" in result:
        # Fall back to a deterministic minimal summary so the UI always has something to show.
        result = {
            "one_line_summary": (notes[0].get("chief_complaint") if notes else "") or "",
            "key_findings": [],
            "medications_started": [],
            "active_follow_ups": [],
            "watch_for": [],
        }
    return result


@router.get("/{patient_id}")
def list_patient_visits(patient_id: int):
    if not db.get_patient(patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    return db.list_visits(patient_id)


@router.post("/{visit_id}/summarize")
def summarize_visit(visit_id: int):
    """Generate and store highlights for a completed visit. Idempotent — safe to re-run."""
    visit = db.get_visit(visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    highlights = _summarize_visit(visit_id)
    return db.set_visit_highlights(visit_id, highlights)
