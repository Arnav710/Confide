"""Local speech-to-text using faster-whisper."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from faster_whisper import WhisperModel

from src.config import WHISPER_COMPUTE_TYPE, WHISPER_DEVICE, WHISPER_MODEL


@lru_cache(maxsize=1)
def _model() -> WhisperModel:
    return WhisperModel(WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)


def transcribe(audio_path: str | Path) -> str:
    """Transcribe an audio file to plain text."""
    segments, _info = _model().transcribe(str(audio_path), beam_size=1, vad_filter=True)
    return " ".join(seg.text.strip() for seg in segments).strip()
