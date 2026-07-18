# MedMemo

On-device doctor visit recorder and summarizer. Fully local: Whisper for STT, Gemma 4 (via Ollama) for summarization and grounded Q&A, Piper for TTS. Nothing leaves your machine.

## Setup

```bash
# 1. venv + deps
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Piper voice model (~60 MB)
bash scripts/download_voice.sh

# 3. Make sure Ollama is running with Gemma
ollama pull gemma4:latest   # if not already present
ollama list                 # verify gemma4:latest is there

# 4. Smoke test
python scripts/smoke_test.py

# 5. Launch app
python app.py
```

Opens at http://127.0.0.1:7860.

## Layout

```
medmemo/
├── app.py                 # Gradio entrypoint (3 tabs)
├── src/
│   ├── config.py          # paths, model names
│   ├── prompts.py         # Gemma system prompts
│   ├── stt.py             # faster-whisper wrapper
│   ├── llm.py             # Ollama / Gemma wrapper
│   ├── tts.py             # Piper wrapper
│   ├── db.py              # SQLite storage
│   └── pipeline.py        # audio → transcript → summary
├── scripts/
│   ├── download_voice.sh  # fetch Piper voice
│   └── smoke_test.py      # verify all components
├── data/                  # SQLite + saved audio (gitignored)
└── models/                # Piper voice files (gitignored)
```

## What it does

- **Record visit** — record or upload a doctor-patient conversation → transcript → structured summary (diagnosis, medications, follow-ups, red flags)
- **Ask about your visit** — grounded Q&A over the transcript, answer read aloud via Piper
- **History** — browse and delete past visits

## Privacy

Every step runs on this device. No network calls for inference. All data lives in a local SQLite database you fully control.
