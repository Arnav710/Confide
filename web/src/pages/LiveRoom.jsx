import { useCallback, useEffect, useRef, useState } from "react";
import MemoryGraph from "../components/MemoryGraph";
import { api } from "../api";
import { useApp } from "../context/AppContext";

// The whole demo happens on this page. Three panels:
//   Left   — live transcript ticker (English, translated inline if needed)
//   Center — patient memory graph (SVG)
//   Right  — alerts + document detections + reminders
// Two loops the user never has to touch:
//   * mic loop: MediaRecorder yields ~4s webm chunks; each chunk POSTs to /live/stream
//   * camera loop: on demand, capture a frame and POST to /live/vision
// The graph refetches after every stream response (cheap; nodes are ints in SQLite).

const CHUNK_MS = 4000; // 4-second turns feel snappy without spamming Ollama

export default function LiveRoom() {
  const { patient, patientId } = useApp();

  // Panel state -----------------------------------------------------------
  const [transcriptLines, setTranscriptLines] = useState([]); // {id, text, translated, lang}
  const [alerts, setAlerts] = useState([]); // {id, kind, message, severity, at}
  const [documents, setDocuments] = useState([]); // {id, kind, ocr, at}
  const [graph, setGraph] = useState({ nodes: [], edges: [] });

  // Mic loop --------------------------------------------------------------
  const [micOn, setMicOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunkTimerRef = useRef(null);

  // Camera --------------------------------------------------------------
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Load the graph up front so a returning patient has memory even before speech.
  const refreshGraph = useCallback(async () => {
    if (!patientId) return;
    try {
      const g = await api.liveGraph(patientId);
      setGraph(g);
    } catch (e) {
      // Non-fatal — leave the last known graph.
      console.warn("graph refresh failed:", e.message);
    }
  }, [patientId]);

  useEffect(() => {
    refreshGraph();
  }, [refreshGraph]);

  // --- mic -------------------------------------------------------------
  const startMic = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // We restart the recorder every CHUNK_MS instead of using .requestData(). That
      // way each POST gets a self-contained container the backend can decode, rather
      // than a mid-file webm frame that faster-whisper chokes on.
      const beginChunk = () => {
        if (!streamRef.current) return;
        const rec = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" });
        recorderRef.current = rec;
        const parts = [];
        rec.ondataavailable = (ev) => ev.data && ev.data.size > 0 && parts.push(ev.data);
        rec.onstop = async () => {
          const blob = new Blob(parts, { type: "audio/webm" });
          if (blob.size < 1000) return; // near-silence, skip
          try {
            setBusy(true);
            const res = await api.liveStream(blob, patientId);
            handleStreamResponse(res);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        };
        rec.start();
        chunkTimerRef.current = setTimeout(() => rec.state === "recording" && rec.stop(), CHUNK_MS);
      };

      const loop = () => {
        if (!streamRef.current) return;
        beginChunk();
        // recorder.onstop chains via setTimeout; kick the next turn after it fires
        // by re-checking every CHUNK_MS + 200ms (loop scheduler)
      };
      // Kick-off then re-arm every CHUNK_MS + a small pad so we're not overlapping.
      loop();
      const scheduler = setInterval(() => {
        if (streamRef.current && recorderRef.current?.state !== "recording") loop();
      }, CHUNK_MS + 200);
      streamRef.current._scheduler = scheduler;

      setMicOn(true);
    } catch (e) {
      setError(`Mic access failed: ${e.message}`);
    }
  }, [patientId]);

  const stopMic = useCallback(() => {
    if (streamRef.current) {
      clearInterval(streamRef.current._scheduler);
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === "recording") {
      try { recorderRef.current.stop(); } catch { /* already stopped */ }
    }
    clearTimeout(chunkTimerRef.current);
    setMicOn(false);
  }, []);

  const handleStreamResponse = useCallback((res) => {
    if (!res) return;
    if (res.english) {
      setTranscriptLines((prev) => [
        ...prev,
        {
          id: res.event_id ?? `${Date.now()}-${Math.random()}`,
          text: res.english,
          raw: res.transcript,
          translated: !res.is_english,
          lang: res.detected_language,
        },
      ].slice(-50));
    }
    if (res.alerts?.length) {
      setAlerts((prev) => [
        ...res.alerts.map((a) => ({ ...a, id: `${Date.now()}-${Math.random()}`, at: new Date() })),
        ...prev,
      ].slice(0, 20));
    }
    // Refresh graph after any stream response — cheap and keeps the picture current.
    refreshGraph();
  }, [refreshGraph]);

  // --- camera ----------------------------------------------------------
  const startCamera = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (e) {
      setError(`Camera access failed: ${e.message}`);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !patientId) return;
    setScanning(true);
    setError("");
    try {
      const v = videoRef.current;
      const c = canvasRef.current;
      c.width = v.videoWidth || 720;
      c.height = v.videoHeight || 540;
      const ctx = c.getContext("2d");
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const blob = await new Promise((resolve) => c.toBlob(resolve, "image/jpeg", 0.85));
      const res = await api.liveVision(blob, patientId);
      setDocuments((prev) => [
        { id: `${Date.now()}-${Math.random()}`, kind: res.kind, ocr: res.ocr_text, at: new Date() },
        ...prev,
      ].slice(0, 10));
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }, [patientId]);

  // Tear down mic + camera on unmount so leaving the page cuts recording.
  useEffect(() => {
    return () => {
      stopMic();
      stopCamera();
    };
  }, [stopMic, stopCamera]);

  if (!patient) return <p className="muted">Loading patient…</p>;

  return (
    <div className="live-room">
      <div className="live-header">
        <div>
          <h2 style={{ margin: 0 }}>{patient.name}</h2>
          <div className="muted">
            Room {patient.room || "-"} · MRN {patient.mrn || "-"} · Lang {patient.primary_language}
            {patient.known_allergies ? ` · Allergies: ${patient.known_allergies}` : ""}
          </div>
        </div>
        <div className="live-controls">
          <button className={micOn ? "recording" : "primary"} onClick={micOn ? stopMic : startMic}>
            {micOn ? (busy ? "Listening…" : "Stop mic") : "Start listening"}
          </button>
          <button onClick={cameraOn ? stopCamera : startCamera}>
            {cameraOn ? "Stop camera" : "Start camera"}
          </button>
          {cameraOn && (
            <button className="primary" onClick={scanFrame} disabled={scanning}>
              {scanning ? "Reading…" : "Scan document"}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="live-grid">
        {/* Transcript panel ------------------------------------------------ */}
        <div className="card live-panel">
          <h3>Transcript</h3>
          {transcriptLines.length === 0 ? (
            <p className="muted">Room is quiet. {micOn ? "Listening…" : "Start the mic to begin."}</p>
          ) : (
            <div className="transcript-scroll">
              {transcriptLines.map((line) => (
                <div key={line.id} className="transcript-line">
                  {line.translated && (
                    <span className="badge">{line.lang} → en</span>
                  )}
                  <div>{line.text}</div>
                  {line.translated && line.raw && (
                    <div className="muted" style={{ fontSize: 12 }}>{line.raw}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Memory graph --------------------------------------------------- */}
        <div className="card live-panel">
          <h3>Patient memory</h3>
          <MemoryGraph data={graph} />
          <p className="muted" style={{ fontSize: 12 }}>
            Red dashed edges are contraindicated drug/allergy pairs.
          </p>
        </div>

        {/* Alerts + documents -------------------------------------------- */}
        <div className="card live-panel">
          <h3>Actions &amp; alerts</h3>

          {alerts.length === 0 ? (
            <p className="muted">No safety alerts.</p>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className={`alert alert-${a.severity || "high"}`}>
                {a.message}
              </div>
            ))
          )}

          <h4 style={{ marginTop: 16 }}>Documents scanned</h4>
          {documents.length === 0 ? (
            <p className="muted">Point the camera at a form and press Scan document.</p>
          ) : (
            documents.map((d) => (
              <div key={d.id} className="list-item">
                <strong>{d.kind}</strong> <span className="muted">{d.at.toLocaleTimeString()}</span>
                <pre style={{ maxHeight: 100, overflow: "auto", marginTop: 4 }}>{d.ocr}</pre>
              </div>
            ))
          )}

          {/* Hidden camera surfaces used to capture frames. */}
          <div style={{ display: cameraOn ? "block" : "none", marginTop: 12 }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 8 }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
