import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useApp } from "../context/AppContext";

const FEATURES = [
  ["/live", "Live Room", "Always-listening single-screen. This is where the demo happens."],
  ["/tools/scribe", "Clinical Scribe", "Record rounds. Structure the note on-device."],
  ["/tools/consent", "Consent Explainer", "Scan a form. Ground answers in the paper."],
];

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function VisitCard({ visit, isCurrent }) {
  const h = visit.highlights;
  return (
    <div className="list-item" style={{ borderLeft: isCurrent ? "3px solid #4ade80" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong>{isCurrent ? "Current visit" : `Visit ${formatDate(visit.admitted_at)}`}</strong>
        <span className="muted">
          {visit.status === "discharged" ? `Discharged ${formatDate(visit.discharged_at)}` : "In progress"}
        </span>
      </div>
      {h ? (
        <>
          {h.one_line_summary && <p style={{ marginTop: 6 }}>{h.one_line_summary}</p>}
          {h.key_findings?.length ? (
            <>
              <div className="muted" style={{ marginTop: 6 }}>Key findings</div>
              <ul style={{ margin: "4px 0 0 18px" }}>
                {h.key_findings.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </>
          ) : null}
          {h.medications_started?.length ? (
            <>
              <div className="muted" style={{ marginTop: 6 }}>Meds started/changed</div>
              <ul style={{ margin: "4px 0 0 18px" }}>
                {h.medications_started.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </>
          ) : null}
          {h.active_follow_ups?.length ? (
            <>
              <div className="muted" style={{ marginTop: 6 }}>Active follow-ups</div>
              <ul style={{ margin: "4px 0 0 18px" }}>
                {h.active_follow_ups.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </>
          ) : null}
          {h.watch_for?.length ? (
            <>
              <div className="muted" style={{ marginTop: 6 }}>Watch for</div>
              <ul style={{ margin: "4px 0 0 18px" }}>
                {h.watch_for.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        <p className="muted" style={{ marginTop: 6 }}>
          {isCurrent ? "Highlights will be generated when this visit is discharged." : "No highlights yet."}
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { staff, patientId, patient, refreshPatient } = useApp();
  const [visits, setVisits] = useState([]);
  const [dischargeError, setDischargeError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    if (!patientId) return;
    const v = await api.listVisits(patientId);
    setVisits(v);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (!patient) return <p className="muted">Loading patient...</p>;

  const currentVisit = visits.find((v) => v.status === "admitted");
  const priorVisits = visits.filter((v) => v.status === "discharged");

  async function discharge() {
    if (!confirm(`Discharge ${patient.name}? Highlights will be generated on-device.`)) return;
    setBusy(true);
    setDischargeError("");
    try {
      await api.dischargePatient(patientId, staff.id);
      await refreshPatient();
      await reload();
    } catch (err) {
      setDischargeError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ margin: 0 }}>
            {patient.name} <span className="muted">({patient.status})</span>
          </h2>
          {priorVisits.length > 0 && (
            <span className="badge ok">
              Returning · {priorVisits.length} prior visit{priorVisits.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <p className="muted" style={{ marginTop: 4 }}>
          Room {patient.room || "-"} · MRN {patient.mrn || "-"} · Language {patient.primary_language}
          {patient.known_allergies ? ` · Allergies: ${patient.known_allergies}` : ""}
        </p>
        {patient.status === "admitted" ? (
          <button className="danger" onClick={discharge} disabled={busy}>
            {busy ? "Discharging & summarizing..." : "Discharge patient"}
          </button>
        ) : (
          <span className="badge ok">Discharged {formatDate(patient.discharged_at)}</span>
        )}
        {dischargeError && <div className="error">{dischargeError}</div>}
      </div>

      <div className="card">
        <h3>Features</h3>
        <div className="feature-grid">
          {FEATURES.map(([path, label, blurb]) => (
            <Link key={path} to={path}>
              <button style={{ width: "100%", textAlign: "left", padding: "12px 14px" }}>
                <div><strong>{label}</strong></div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{blurb}</div>
              </button>
            </Link>
          ))}
        </div>
      </div>

      {currentVisit && (
        <div className="card">
          <h3>Current visit</h3>
          <VisitCard visit={currentVisit} isCurrent />
        </div>
      )}

      {priorVisits.length > 0 && (
        <div className="card">
          <h3>Prior visits</h3>
          {priorVisits.map((v) => (
            <VisitCard key={v.id} visit={v} isCurrent={false} />
          ))}
        </div>
      )}
    </>
  );
}
