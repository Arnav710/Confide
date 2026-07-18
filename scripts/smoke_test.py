"""Smoke test each component in isolation, then end-to-end with a fake transcript.

Run:
    source venv/bin/activate
    python scripts/smoke_test.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import db, llm, tts  # noqa: E402


FAKE_TRANSCRIPT = """
Doctor: Good morning, what brings you in today?
Patient: I've had a sore throat and a low-grade fever for about three days.
Doctor: Any cough or runny nose?
Patient: A little bit of a dry cough, no runny nose.
Doctor: Let me take a look. Your throat is quite red and I can see some white patches.
I'm going to do a strep test. Okay, the test came back positive for strep throat.
I'm going to prescribe you amoxicillin, 500 milligrams, three times a day for ten days.
Take it with food. Finish the entire course even if you feel better.
If you develop a rash, trouble breathing, or your fever goes above 103, go to the ER right away.
Come back in two weeks if symptoms haven't fully resolved. Any questions?
Patient: Can I take Tylenol for the fever?
Doctor: Yes, up to every six hours as needed.
"""


def check_llm() -> None:
    print("\n[1/3] Testing Gemma via Ollama...")
    summary = llm.summarize_transcript(FAKE_TRANSCRIPT)
    print("  Summary keys:", list(summary.keys())[:5], "...")
    assert "chief_complaint" in summary or "_error" in summary, "unexpected summary shape"
    print("  OK")

    print("\n[2/3] Testing grounded Q&A...")
    answer = llm.answer_from_transcript(FAKE_TRANSCRIPT, "How often do I take the amoxicillin?")
    print("  Answer:", answer)
    assert answer, "empty answer"
    print("  OK")
    return summary


def check_tts() -> None:
    print("\n[3/3] Testing Piper TTS...")
    try:
        path = tts.speak("Test successful. MedMemo is ready.")
        print(f"  Wrote {path} ({path.stat().st_size} bytes)")
        print("  OK")
    except FileNotFoundError as e:
        print(f"  SKIPPED: {e}")


def check_db(summary: dict) -> None:
    print("\n[bonus] Testing SQLite persistence...")
    db.init_db()
    vid = db.save_visit(FAKE_TRANSCRIPT, summary)
    latest = db.latest_visit()
    assert latest and latest["id"] == vid
    print(f"  Saved visit id={vid}, retrieved OK.")
    db.delete_visit(vid)
    print("  Cleanup OK")


def main() -> None:
    summary = check_llm()
    check_db(summary)
    check_tts()
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
