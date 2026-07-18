"""MedMemo — On-device doctor visit recorder + summarizer.

Gradio UI: Record, Ask, History.
"""
from __future__ import annotations

import json
from typing import Any

import gradio as gr

from src import db, pipeline, tts

DISCLAIMER = (
    "MedMemo is a note-taking tool, not medical advice. "
    "All processing happens on your device — nothing is uploaded."
)


# ---------- Formatters ----------

def _format_summary(summary: dict[str, Any]) -> str:
    if "_error" in summary:
        return f"**Summary parse failed.**\n\n```\n{summary.get('_raw', '')}\n```"

    def _bullets(items: list[str]) -> str:
        return "\n".join(f"- {i}" for i in items) if items else "_None noted._"

    meds = summary.get("medications") or []
    if meds:
        med_lines = []
        for m in meds:
            parts = [m.get("name", "?")]
            if m.get("dosage"):
                parts.append(m["dosage"])
            if m.get("frequency"):
                parts.append(m["frequency"])
            if m.get("duration"):
                parts.append(f"for {m['duration']}")
            line = " · ".join(parts)
            if m.get("notes"):
                line += f"  \n  _Note: {m['notes']}_"
            med_lines.append(f"- {line}")
        meds_md = "\n".join(med_lines)
    else:
        meds_md = "_No medications discussed._"

    return f"""### Chief complaint
{summary.get('chief_complaint', '_Not noted._') or '_Not noted._'}

### Diagnosis / assessment
{summary.get('diagnosis_or_assessment', '_Not noted._') or '_Not noted._'}

### Medications
{meds_md}

### What to do
{_bullets(summary.get('instructions') or [])}

### Follow-ups
{_bullets(summary.get('follow_ups') or [])}

### Red flags — call your doctor or go to the ER if:
{_bullets(summary.get('red_flags') or [])}

### Questions to ask next visit
{_bullets(summary.get('questions_patient_should_ask_next_time') or [])}
"""


# ---------- Handlers ----------

def handle_recording(audio_path: str | None):
    if not audio_path:
        return "Please record or upload audio first.", "", None

    result = pipeline.process_recording(audio_path)
    if "error" in result:
        return result["error"], "", None

    transcript = result["transcript"]
    summary_md = _format_summary(result["summary"])
    return transcript, summary_md, result["visit_id"]


def handle_question(question: str, speak_answer: bool):
    question = (question or "").strip()
    if not question:
        return "Please type a question first.", None

    result = pipeline.ask_about_latest_visit(question)
    if "error" in result:
        return result["error"], None

    answer = result["answer"]
    audio_out = None
    if speak_answer:
        try:
            audio_out = str(tts.speak(answer))
        except FileNotFoundError as e:
            answer += f"\n\n_(TTS unavailable: {e})_"
    return answer, audio_out


def refresh_history():
    visits = db.list_visits()
    if not visits:
        return "_No visits recorded yet._"
    rows = []
    for v in visits:
        cc = v["summary"].get("chief_complaint", "") if isinstance(v["summary"], dict) else ""
        rows.append(f"| {v['id']} | {v['created_at']} | {cc or '_(no complaint noted)_'} |")
    return "| # | Date | Chief complaint |\n|---|------|-----------------|\n" + "\n".join(rows)


def view_visit(visit_id_str: str):
    if not visit_id_str or not visit_id_str.strip().isdigit():
        return "Enter a numeric visit ID.", ""
    v = db.get_visit(int(visit_id_str.strip()))
    if not v:
        return "No visit with that ID.", ""
    return v["transcript"], _format_summary(v["summary"])


def delete_visit(visit_id_str: str):
    if not visit_id_str or not visit_id_str.strip().isdigit():
        return refresh_history()
    db.delete_visit(int(visit_id_str.strip()))
    return refresh_history()


# ---------- UI ----------

def build_ui() -> gr.Blocks:
    with gr.Blocks(title="MedMemo") as demo:
        gr.Markdown("# MedMemo")
        gr.Markdown(f"_{DISCLAIMER}_")

        with gr.Tabs():
            with gr.Tab("Record visit"):
                gr.Markdown(
                    "Record or upload a doctor-patient conversation. "
                    "It will be transcribed and summarized locally."
                )
                audio_in = gr.Audio(
                    sources=["microphone", "upload"],
                    type="filepath",
                    label="Appointment audio",
                )
                process_btn = gr.Button("Transcribe & summarize", variant="primary")
                transcript_out = gr.Textbox(label="Transcript", lines=6)
                summary_out = gr.Markdown(label="Structured summary")
                visit_id_state = gr.Number(label="Visit ID (saved)", interactive=False)

                process_btn.click(
                    handle_recording,
                    inputs=[audio_in],
                    outputs=[transcript_out, summary_out, visit_id_state],
                )

            with gr.Tab("Ask about your visit"):
                gr.Markdown(
                    "Ask a question about your **most recent** visit. "
                    "Answers come only from what was said in the recording."
                )
                question_in = gr.Textbox(
                    label="Your question",
                    placeholder="e.g., What did the doctor say about the dosage?",
                )
                speak_toggle = gr.Checkbox(label="Read the answer aloud", value=True)
                ask_btn = gr.Button("Ask", variant="primary")
                answer_out = gr.Markdown(label="Answer")
                answer_audio = gr.Audio(label="Spoken answer", autoplay=True)
                ask_btn.click(
                    handle_question,
                    inputs=[question_in, speak_toggle],
                    outputs=[answer_out, answer_audio],
                )

            with gr.Tab("History"):
                history_md = gr.Markdown(refresh_history())
                with gr.Row():
                    visit_id_in = gr.Textbox(label="Visit ID", scale=1)
                    view_btn = gr.Button("View", scale=1)
                    delete_btn = gr.Button("Delete", variant="stop", scale=1)
                    refresh_btn = gr.Button("Refresh", scale=1)
                viewed_transcript = gr.Textbox(label="Transcript", lines=6)
                viewed_summary = gr.Markdown()

                view_btn.click(view_visit, inputs=[visit_id_in], outputs=[viewed_transcript, viewed_summary])
                delete_btn.click(delete_visit, inputs=[visit_id_in], outputs=[history_md])
                refresh_btn.click(refresh_history, outputs=[history_md])

    return demo


def main() -> None:
    db.init_db()
    demo = build_ui()
    demo.launch(
        server_name="127.0.0.1",
        server_port=7860,
        inbrowser=True,
        theme=gr.themes.Soft(),
    )


if __name__ == "__main__":
    main()
