"""Local text-to-speech using Piper."""
from __future__ import annotations

import wave
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from piper import PiperVoice

from src.config import AUDIO_DIR, PIPER_CONFIG, PIPER_VOICE


@lru_cache(maxsize=1)
def _voice() -> PiperVoice:
    if not PIPER_VOICE.exists():
        raise FileNotFoundError(
            f"Piper voice not found at {PIPER_VOICE}. "
            "Run scripts/download_voice.sh to fetch it."
        )
    return PiperVoice.load(str(PIPER_VOICE), config_path=str(PIPER_CONFIG))


def speak(text: str, out_path: str | Path | None = None) -> Path:
    """Synthesize text and return the path to the WAV file."""
    voice = _voice()
    if out_path is None:
        out_path = AUDIO_DIR / f"tts_{uuid4().hex[:8]}.wav"
    out_path = Path(out_path)

    with wave.open(str(out_path), "wb") as wav_file:
        voice.synthesize_wav(text, wav_file)
    return out_path
