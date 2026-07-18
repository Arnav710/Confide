import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useApp } from "../context/AppContext";

export default function PatientPicker() {
  const { staff, selectPatient } = useApp();
  const navigate = useNavigate();

  // Show admitted first, then discharged. Returning patients live in the discharged
  // list until they're re-admitted through this same form.
  const [admitted, setAdmitted] = useState([]);
  const [discharged, setDischarged] = useState([]);
  const [search, setSearch] = useState("");
  const searchTimer = useRef(null);

  const [name, setName] = useState("");
  const [mrn, setMrn] = useState("");
  const [room, setRoom] = useState("");
  const [lang, setLang] = useState("en");
  const [allergies, setAllergies] = useState("");
  const [admitError, setAdmitError] = useState("");
  const [admitting, setAdmitting] = useState(false);

  async function loadPatients(q) {
    const [a, d] = await Promise.all([
      api.listPatients({ status: "admitted", search: q }),
      api.listPatients({ status: "discharged", search: q }),
    ]);
    setAdmitted(a);
    setDischarged(d);
  }

  useEffect(() => {
    loadPatients("");
  }, []);

  function onSearchChange(value) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadPatients(value), 250);
  }

  async function pick(id) {
    await selectPatient(id);
    // LiveRoom is the demo's home base — a returning patient's memory graph loads
    // there too, so we skip Dashboard on the initial pick.
    navigate("/live");
  }

  async function readmit(patient) {
    setAdmitError("");
    setAdmitting(true);
    try {
      // Re-admit by POSTing the same MRN — the backend detects the match and opens a fresh visit.
      await api.createPatient({
        name: patient.name,
        staff_id: staff.id,
        mrn: patient.mrn,
        primary_language: patient.primary_language || "en",
        room: patient.room || null,
        known_allergies: patient.known_allergies || null,
      });
      await pick(patient.id);
    } catch (err) {
      setAdmitError(err.message);
    } finally {
      setAdmitting(false);
    }
  }

  async function admit() {
    setAdmitError("");
    if (!name.trim()) {
      setAdmitError("Name is required.");
      return;
    }
    setAdmitting(true);
    try {
      const patient = await api.createPatient({
        name: name.trim(),
        staff_id: staff.id,
        mrn: mrn.trim() || null,
        room: room.trim() || null,
        primary_language: lang.trim() || "en",
        known_allergies: allergies.trim() || null,
      });
      await pick(patient.id);
    } catch (err) {
      setAdmitError(err.message);
    } finally {
      setAdmitting(false);
    }
  }

  function PatientRow({ p, returning }) {
    const priorVisits = p.visit_count ? p.visit_count - (p.status === "admitted" ? 1 : 0) : 0;
    return (
      <div className="list-item" key={p.id}>
        <strong>{p.name}</strong>{" "}
        <span className="muted">Room {p.room || "-"} · MRN {p.mrn || "-"}</span>
        {returning && (
          <span className="badge ok" style={{ marginLeft: 8 }}>
            Returning
          </span>
        )}
        <span style={{ float: "right" }}>
          {p.status === "admitted" ? (
            <button onClick={() => pick(p.id)}>Open</button>
          ) : (
            <>
              <button onClick={() => pick(p.id)} style={{ marginRight: 6 }}>
                View history
              </button>
              <button className="primary" onClick={() => readmit(p)} disabled={admitting}>
                Re-admit
              </button>
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Select a patient</h2>
        <input
          placeholder="Search by name or MRN"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <h3 style={{ marginTop: 16 }}>Admitted</h3>
        {admitted.length ? (
          admitted.map((p) => <PatientRow key={p.id} p={p} returning={false} />)
        ) : (
          <p className="muted">No admitted patients match.</p>
        )}

        {discharged.length > 0 && (
          <>
            <h3 style={{ marginTop: 16 }}>Returning (discharged)</h3>
            <p className="muted" style={{ marginTop: -6 }}>
              Highlights from prior visits are ready — re-admit to start a new visit.
            </p>
            {discharged.map((p) => (
              <PatientRow key={p.id} p={p} returning />
            ))}
          </>
        )}
      </div>

      <div className="card">
        <h3>Admit a new patient</h3>
        <p className="muted" style={{ marginTop: -6 }}>
          If the MRN already exists, we&apos;ll reopen that patient and start a fresh visit.
        </p>
        <div className="row">
          <div>
            <label>Name</label>
            <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label>MRN</label>
            <input
              placeholder="Medical record number"
              value={mrn}
              onChange={(e) => setMrn(e.target.value)}
            />
          </div>
        </div>
        <div className="row">
          <div>
            <label>Room</label>
            <input placeholder="e.g. 204A" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <div>
            <label>Primary language</label>
            <input value={lang} onChange={(e) => setLang(e.target.value)} />
          </div>
        </div>
        <label>Known allergies</label>
        <input
          placeholder="e.g. penicillin"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
        />
        <button className="primary" onClick={admit} disabled={admitting}>
          {admitting ? "Admitting..." : "Admit patient"}
        </button>
        {admitError && <div className="error">{admitError}</div>}
      </div>
    </>
  );
}
