"""Central configuration for MedMemo."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"

DB_PATH = DATA_DIR / "medmemo.db"
AUDIO_DIR = DATA_DIR / "audio"

# Ollama / Gemma
OLLAMA_MODEL = "gemma4:latest"
OLLAMA_HOST = "http://localhost:11434"

# Whisper
WHISPER_MODEL = "base.en"  # base.en is fast + good enough for demo
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"

# Piper TTS
PIPER_VOICE = MODELS_DIR / "en_US-lessac-medium.onnx"
PIPER_CONFIG = MODELS_DIR / "en_US-lessac-medium.onnx.json"

# Ensure dirs exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
