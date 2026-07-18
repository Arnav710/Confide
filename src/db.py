"""SQLite storage for transcripts and summaries."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from typing import Any

from src.config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    audio_path TEXT,
    transcript TEXT NOT NULL,
    summary_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qa_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    FOREIGN KEY (visit_id) REFERENCES visits(id)
);
"""


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.executescript(SCHEMA)


def save_visit(transcript: str, summary: dict[str, Any], audio_path: str | None = None) -> int:
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO visits (created_at, audio_path, transcript, summary_json) VALUES (?, ?, ?, ?)",
            (datetime.now().isoformat(timespec="seconds"), audio_path, transcript, json.dumps(summary)),
        )
        return cur.lastrowid


def list_visits() -> list[dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT id, created_at, transcript, summary_json FROM visits ORDER BY id DESC"
        ).fetchall()
    return [
        {
            "id": r["id"],
            "created_at": r["created_at"],
            "transcript": r["transcript"],
            "summary": json.loads(r["summary_json"]),
        }
        for r in rows
    ]


def get_visit(visit_id: int) -> dict[str, Any] | None:
    with _conn() as conn:
        row = conn.execute(
            "SELECT id, created_at, transcript, summary_json FROM visits WHERE id = ?",
            (visit_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "transcript": row["transcript"],
        "summary": json.loads(row["summary_json"]),
    }


def latest_visit() -> dict[str, Any] | None:
    visits = list_visits()
    return visits[0] if visits else None


def delete_visit(visit_id: int) -> None:
    with _conn() as conn:
        conn.execute("DELETE FROM qa_log WHERE visit_id = ?", (visit_id,))
        conn.execute("DELETE FROM visits WHERE id = ?", (visit_id,))


def log_qa(visit_id: int, question: str, answer: str) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO qa_log (visit_id, created_at, question, answer) VALUES (?, ?, ?, ?)",
            (visit_id, datetime.now().isoformat(timespec="seconds"), question, answer),
        )
