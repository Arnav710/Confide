"""End-to-end pipeline: audio → transcript → summary → DB."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from src import db, llm, stt


def process_recording(audio_path: str | Path) -> dict[str, Any]:
    """Full pipeline: transcribe, summarize, persist."""
    transcript = stt.transcribe(audio_path)
    if not transcript:
        return {"error": "No speech detected in the recording."}

    summary = llm.summarize_transcript(transcript)
    visit_id = db.save_visit(transcript=transcript, summary=summary, audio_path=str(audio_path))

    return {
        "visit_id": visit_id,
        "transcript": transcript,
        "summary": summary,
    }


def ask_about_latest_visit(question: str) -> dict[str, Any]:
    """Answer a question grounded in the most recent visit transcript."""
    visit = db.latest_visit()
    if not visit:
        return {"error": "No visits recorded yet. Record a conversation first."}

    answer = llm.answer_from_transcript(visit["transcript"], question)
    db.log_qa(visit["id"], question, answer)
    return {"visit_id": visit["id"], "question": question, "answer": answer}
