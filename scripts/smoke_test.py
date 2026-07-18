"""End-to-end smoke test against a running server: one patient through the whole journey.

Run:
    source .venv/bin/activate
    uvicorn app:app --port 8000 &
    python scripts/smoke_test.py
"""
from __future__ import annotations

import sys
import tempfile
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core import voice  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

BASE = "http://localhost:8000"
TMP = Path(tempfile.mkdtemp(prefix="doctor_offline_smoke_"))

# Give every request a default timeout so a stuck backend call fails loudly and fast
# instead of hanging the whole test silently.
_orig_request = requests.Session.request


def _timeout_request(self, method, url, **kwargs):
    # Generous: vision OCR alone takes ~50s on this hardware, and endpoints like
    # consent document ingestion chain two sequential Gemma calls.
    kwargs.setdefault("timeout", 300)
    return _orig_request(self, method, url, **kwargs)


requests.Session.request = _timeout_request


def check(label: str, condition: bool, detail=None) -> None:
    status = "OK" if condition else "FAIL"
    print(f"  [{status}] {label}" + (f" -- {detail}" if detail and not condition else ""))
    if not condition:
        raise AssertionError(f"{label}: {detail}")


def make_test_audio(text: str) -> Path:
    return voice.speak(text, out_path=TMP / f"{abs(hash(text))}.wav")


def make_test_image(text: str, name: str) -> Path:
    img = Image.new("RGB", (900, 400), color="white")
    d = ImageDraw.Draw(img)
    d.multiline_text((20, 20), text, fill="black")
    path = TMP / name
    img.save(path)
    return path


def main() -> None:
    print("[0] Status")
    r = requests.get(f"{BASE}/api/status")
    check("GET /api/status 200", r.status_code == 200, r.text)
    print("     ", r.json())

    print("\n[1] Staff + auth")
    r = requests.post(f"{BASE}/api/staff", json={"name": "Dr. Smoke Test", "pin": "1234"})
    check("POST /api/staff 200", r.status_code == 200, r.text)
    staff = r.json()
    staff_id = staff["id"]

    r = requests.get(f"{BASE}/api/staff")
    check("GET /api/staff includes new staff", any(s["id"] == staff_id for s in r.json()))

    r = requests.post(f"{BASE}/api/auth/login", json={"staff_id": staff_id, "pin": "1234"})
    check("POST /api/auth/login 200", r.status_code == 200, r.text)

    r = requests.post(f"{BASE}/api/auth/login", json={"staff_id": staff_id, "pin": "0000"})
    check("POST /api/auth/login wrong pin -> 401", r.status_code == 401)

    print("\n[2] Patients")
    r = requests.post(
        f"{BASE}/api/patients",
        json={
            "name": "Jane Doe", "staff_id": staff_id, "mrn": f"MRN-{int(time.time())}",
            "room": "204A", "primary_language": "en", "known_allergies": "penicillin",
        },
    )
    check("POST /api/patients 200", r.status_code == 200, r.text)
    patient = r.json()
    patient_id = patient["id"]
    check("patient status is admitted", patient["status"] == "admitted")

    r = requests.get(f"{BASE}/api/patients", params={"status": "admitted"})
    check("GET /api/patients lists new patient", any(p["id"] == patient_id for p in r.json()))

    r = requests.get(f"{BASE}/api/patients/{patient_id}")
    check("GET /api/patients/{id} 200", r.status_code == 200)

    r = requests.put(f"{BASE}/api/patients/{patient_id}", json={"room": "204B"})
    check("PUT /api/patients/{id} updates room", r.json()["room"] == "204B")

    print("\n[3] Clinical Scribe")
    audio_path = make_test_audio(
        "Patient presents with sore throat and low grade fever for three days. "
        "Started on amoxicillin five hundred milligrams three times daily. "
        "Recheck in one week if symptoms persist."
    )
    with open(audio_path, "rb") as f:
        r = requests.post(f"{BASE}/api/voice/transcribe", files={"audio": f})
    check("POST /api/voice/transcribe 200", r.status_code == 200, r.text)
    transcript = r.json()["transcript"]
    check("transcript non-empty", len(transcript) > 0, transcript)
    print("      transcript:", transcript)

    r = requests.post(f"{BASE}/api/scribe/structure", json={"transcript": transcript})
    check("POST /api/scribe/structure 200", r.status_code == 200, r.text)
    structured = r.json()
    print("      structured:", structured)
    check("structured has chief_complaint", "chief_complaint" in structured)

    r = requests.post(
        f"{BASE}/api/notes",
        json={
            "patient_id": patient_id, "staff_id": staff_id, "raw_transcript": transcript,
            "chief_complaint": structured["chief_complaint"], "medications": structured["medications"],
            "follow_ups": structured["follow_ups"], "status": "draft",
        },
    )
    check("POST /api/notes 200", r.status_code == 200, r.text)
    note = r.json()
    note_id = note["id"]

    r = requests.get(f"{BASE}/api/notes", params={"patient_id": patient_id})
    check("GET /api/notes lists note", any(n["id"] == note_id for n in r.json()))

    r = requests.put(f"{BASE}/api/notes/{note_id}", json={"status": "finalized"})
    check("PUT /api/notes/{id} finalizes", r.json()["status"] == "finalized", r.text)

    print("\n[4] Consent Explainer")
    consent_img = make_test_image(
        "CONSENT FOR PROCEDURE\n\nProcedure: Appendectomy\n"
        "Risks: bleeding, infection, reaction to anesthesia\n"
        "You have the right to ask questions before signing.",
        "consent.png",
    )
    with open(consent_img, "rb") as f:
        r = requests.post(
            f"{BASE}/api/consent/forms",
            data={"patient_id": patient_id, "staff_id": staff_id},
            files={"image": f},
        )
    check("POST /api/consent/forms 200", r.status_code == 200, r.text)
    consent_form = r.json()
    form_id = consent_form["id"]
    print("      explanation:", consent_form["plain_language_explanation"][:120], "...")
    check("consent form has ocr_text", len(consent_form["ocr_text"]) > 0)

    r = requests.get(f"{BASE}/api/consent/forms", params={"patient_id": patient_id})
    check("GET /api/consent/forms lists form", any(f["id"] == form_id for f in r.json()))

    r = requests.post(
        f"{BASE}/api/consent/forms/{form_id}/questions",
        data={"patient_id": patient_id, "question_text": "What are the risks of this procedure?"},
    )
    check("POST consent question (text) 200", r.status_code == 200, r.text)
    print("      answer:", r.json()["answer_text"])

    r = requests.get(f"{BASE}/api/consent/forms/{form_id}")
    check("GET consent form detail includes qa_log", len(r.json()["qa_log"]) >= 1)

    print("\n[5] Discharge + visit highlights")
    mrn = patient["mrn"]
    r = requests.post(f"{BASE}/api/patients/{patient_id}/discharge", json={"staff_id": staff_id})
    check("POST /api/patients/{id}/discharge 200", r.status_code == 200, r.text)
    check("patient status now discharged", r.json()["status"] == "discharged")

    r = requests.get(f"{BASE}/api/visits/{patient_id}")
    check("GET /api/visits/{id} 200", r.status_code == 200, r.text)
    visits_list = r.json()
    check("one visit recorded", len(visits_list) == 1, visits_list)
    check("visit is discharged", visits_list[0]["status"] == "discharged")
    check("visit has highlights", visits_list[0]["highlights"] is not None, visits_list[0])
    print("      highlights:", visits_list[0]["highlights"])

    print("\n[6] Returning patient (re-admit by MRN)")
    r = requests.post(
        f"{BASE}/api/patients",
        json={"name": "Jane Doe", "staff_id": staff_id, "mrn": mrn, "room": "301B"},
    )
    check("POST /api/patients (same MRN) 200", r.status_code == 200, r.text)
    returning = r.json()
    check("returning flag set", returning.get("returning") is True, returning)
    check("patient id preserved", returning["id"] == patient_id)
    check("visit_count is 2", returning.get("visit_count") == 2, returning)

    r = requests.get(f"{BASE}/api/visits/{patient_id}")
    visits_after = r.json()
    check("two visits now", len(visits_after) == 2, visits_after)
    check("new visit is admitted", visits_after[0]["status"] == "admitted")

    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
