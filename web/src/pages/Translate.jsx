import { useEffect, useState } from "react";
import { api } from "../api";
import { useApp } from "../context/AppContext";
import RecordButton from "../components/RecordButton";

export default function Translate() {
  const { staff, patientId, patient } = useApp();
  const [direction, setDirection] = useState("staff_to_patient");
  const [targetLang, setTargetLang] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);

  // Target language = "translate the recording into this." It depends on direction, not
  // just the patient: staff_to_patient should target the patient's language; the reverse
  // should target English (the assumed staff/clinical language). Re-derive it whenever
  // direction changes so flipping the dropdown doesn't leave a stale, backwards-looking
  // target — still editable by hand afterward if that assumption is wrong.
  useEffect(() => {
    if (!patient) return;
    setTargetLang(direction === "staff_to_patient" ? patient.primary_language : "English");
  }, [direction, patient]);

  async function loadLogs() {
    setLogs(await api.listTranslationLogs(patientId));
  }

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleRecorded(blob) {
    setStatus("Transcribing and translating...");
    setError("");
    try {
      const res = await api.translateTurn(blob, {
        patient_id: patientId,
        staff_id: staff.id,
        direction,
        target_language: targetLang,
      });
      setResult(res);
      setStatus("");
      await loadLogs();
    } catch (err) {
      setStatus("");
      setError(err.message);
    }
  }

  return (
    <>
      <div className="card">
        <h2>Real-Time Translation</h2>
        <div className="row">
          <div>
            <label>Direction</label>
            <select value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="staff_to_patient">Staff → Patient</option>
              <option value="patient_to_staff">Patient → Staff</option>
            </select>
          </div>
          <div>
            <label>Translate into</label>
            <input value={targetLang} onChange={(e) => setTargetLang(e.target.value)} />
          </div>
        </div>
        <p className="muted">
          {direction === "staff_to_patient"
            ? `Recording will be treated as the staff member speaking, then translated into "${targetLang || "..."}" for the patient to hear.`
            : `Recording will be treated as the patient speaking, then translated into "${targetLang || "..."}" for staff to hear.`}
        </p>
        <RecordButton idleLabel="Record turn" recordingLabel="Stop" onStop={handleRecorded} />
        <div className="muted">{status}</div>

        {result && (
          <div style={{ marginTop: 16 }}>
            <p>
              <strong>Heard:</strong> {result.source_text} <span className="muted">({result.source_language})</span>
            </p>
            <p>
              <strong>Translated:</strong> {result.translated_text}
            </p>
            <audio controls autoPlay src={result.audio_url} />
          </div>
        )}
        {error && <div className="error">{error}</div>}
      </div>

      <div className="card">
        <h3>Conversation log</h3>
        {logs.length ? (
          logs.map((l) => (
            <div className="list-item" key={l.id}>
              <span className="muted">[{l.direction}]</span> {l.source_text} → <strong>{l.translated_text}</strong>
            </div>
          ))
        ) : (
          <p className="muted">No turns recorded yet.</p>
        )}
      </div>
    </>
  );
}
