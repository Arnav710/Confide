"""Gemma 4 via Ollama."""
from __future__ import annotations

import json
from typing import Any

import ollama

from src.config import OLLAMA_HOST, OLLAMA_MODEL
from src.prompts import QA_SYSTEM, SUMMARIZE_SYSTEM

_client = ollama.Client(host=OLLAMA_HOST)


def _chat(system: str, user: str, temperature: float = 0.2) -> str:
    resp = _client.chat(
        model=OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        options={"temperature": temperature},
    )
    return resp["message"]["content"].strip()


def summarize_transcript(transcript: str) -> dict[str, Any]:
    """Turn a raw transcript into a structured visit summary."""
    raw = _chat(SUMMARIZE_SYSTEM, f"TRANSCRIPT:\n{transcript}", temperature=0.1)
    raw = _strip_code_fences(raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"_raw": raw, "_error": "Gemma did not return valid JSON"}


def answer_from_transcript(transcript: str, question: str) -> str:
    """Grounded Q&A: answer only from transcript content."""
    user = f"TRANSCRIPT:\n{transcript}\n\nPATIENT QUESTION: {question}"
    return _chat(QA_SYSTEM, user, temperature=0.2)


def _strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s
        if s.endswith("```"):
            s = s.rsplit("```", 1)[0]
    return s.strip()
