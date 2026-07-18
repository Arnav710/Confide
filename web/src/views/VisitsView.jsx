import { useEffect, useState } from "react";
import { api } from "../api";
import { ToneChip } from "./ScribeView.jsx";

// Visit history — every captured round for this patient. Each row is one
// encounter saved by the Scribe (transcript -> structured note -> graph).
export default function VisitsView({ pid }) {
  const [visits, setVisits] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    api.scribeEncounters(pid)
      .then((v) => { if (alive) setVisits(v); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [pid]);

  return (
    <div>
      <div className="muted" style={{ fontSize: 13 }}>Visit history · every captured round</div>
      <h1 style={{ fontSize: 26, letterSpacing: "-0.02em", marginBottom: 16 }}>Visits</h1>

      {err && <div className="muted">Could not load visits: {err}</div>}
      {!visits && !err && <span className="spinner" />}
      {visits && visits.length === 0 && (
        <div className="card" style={{ padding: 20 }}>
          <div className="muted">No visits yet. Capture a round in the Scribe tab and it will appear here.</div>
        </div>
      )}

      <div className="col" style={{ gap: 14 }}>
        {(visits || []).map((v) => (
          <div key={v.id} className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <b style={{ fontSize: 15 }}>{v.chief_complaint || "Round note"}</b>
              <div className="row" style={{ gap: 8 }}>
                <ToneChip tone={v.emotional_tone} />
                <span className="muted" style={{ fontSize: 12 }}>{fmt(v.created_at)} · {v.kind}</span>
              </div>
            </div>
            {v.summary && <div style={{ fontSize: 14, marginBottom: 10 }}>{v.summary}</div>}
            <div className="two">
              <ListBlock label="Medications" items={v.medications} />
              <ListBlock label="Follow-ups" items={v.follow_ups} />
            </div>
            {v.raw_transcript && (
              <details style={{ marginTop: 10 }}>
                <summary className="muted" style={{ fontSize: 12, cursor: "pointer" }}>Transcript</summary>
                <div className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{v.raw_transcript}</div>
              </details>
            )}
          </div>
        ))}
      </div>

      <style>{`.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        @media(max-width:640px){.two{grid-template-columns:1fr;}}`}</style>
    </div>
  );
}

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function ListBlock({ label, items }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      {items && items.length ? (
        <ul style={{ marginTop: 4, paddingLeft: 18 }}>
          {items.map((it, i) => <li key={i} style={{ fontSize: 14 }}>{it}</li>)}
        </ul>
      ) : <div className="muted" style={{ marginTop: 2 }}>—</div>}
    </div>
  );
}
