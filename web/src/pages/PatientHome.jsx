import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { session } from "../lib/session.js";
import NetworkPill from "../components/NetworkPill.jsx";
import GemmaConsole from "../components/GemmaConsole.jsx";

export default function PatientHome() {
  const nav = useNavigate();
  const me = session.patient();
  const [messages, setMessages] = useState([
    { from: "confide", text: `Hi ${me?.name?.split(" ")[0] || "there"}. I'm Confide — I'm here for you. You can ask me anything about what's happening with your care.` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [visits, setVisits] = useState([]);
  const [debrief, setDebrief] = useState(null);
  const scrollRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!me) return;
    api.patientReminders(me.patient_id).then(setReminders).catch(() => {});
    api.scribeEncounters(me.patient_id).then((v) => setVisits(v || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.patient_id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function logout() { session.clearPatient(); nav("/"); }

  function speak(text) {
    try {
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      window.speechSynthesis?.speak(u);
    } catch { /* noop */ }
  }

  async function send(text) {
    const msg = text ?? input;
    if (!msg.trim()) return;
    // Add the user's message plus an empty Confide bubble to stream tokens into.
    setMessages((m) => [...m, { from: "me", text: msg }, { from: "confide", text: "" }]);
    setInput("");
    setBusy(true);
    const fill = (t) =>
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "confide", text: t };
        return copy;
      });
    try {
      const full = await api.patientChatStream(me.patient_id, msg, fill);
      speak(full);
    } catch (e) {
      fill("I'm having trouble right now — please ask your nurse. (" + e.message + ")");
    } finally {
      setBusy(false);
    }
  }

  async function getDebrief() {
    setBusy(true);
    try { const r = await api.patientDebrief(me.patient_id); setDebrief(r.debrief); speak(r.debrief); }
    catch (e) { alert(e.message); } finally { setBusy(false); }
  }

  const SUGGEST = ["What's happening to me?", "Why am I here?", "What are my medications for?", "Is it serious?"];

  function fmtVisit(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  }

  return (
    <div className="ph">
      <div className="ph-top">
        <div className="row" style={{ gap: 10 }}>
          <span style={{ color: "var(--teal)", fontSize: 20 }}>◈</span>
          <b>Confide</b>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <NetworkPill />
          <button className="btn btn-ghost" style={{ padding: "7px 12px" }} onClick={logout}>Sign out</button>
        </div>
      </div>

      <div className="ph-body">
        <div className="ph-chat card">
          <div className="ph-chat-head">
            <div className="orb" />
            <div>
              <b>Confide is with you</b>
              <div className="muted" style={{ fontSize: 12 }}>Calm, plain answers — entirely on your side, on this device.</div>
            </div>
          </div>
          <div className="ph-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.from}`}>
                {m.text || (m.from === "confide" ? <span className="typing"><i /><i /><i /></span> : "")}
              </div>
            ))}
          </div>
          <div className="ph-suggest">
            {SUGGEST.map((s) => <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>)}
          </div>
          <div className="ph-input">
            <input className="input" placeholder="Ask me anything…" value={input}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <button className="btn btn-primary" onClick={() => send()} disabled={busy}>Send</button>
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}><span style={{ fontSize: 16 }}>💊</span><b>My reminders</b></div>
            {reminders.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No reminders yet. They'll appear here after discharge.</div>}
            <div className="col" style={{ gap: 8 }}>
              {reminders.map((r) => (
                <div key={r.id} className="reminder">
                  <b style={{ fontSize: 14 }}>{r.description}</b>
                  {r.schedule_text && <div className="muted" style={{ fontSize: 12 }}>{r.schedule_text}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}><span style={{ fontSize: 16 }}>🗓</span><b>My visits</b></div>
            {visits.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No visits recorded yet. They'll appear here after your care team sees you.</div>}
            <div className="ph-timeline">
              {visits.map((v) => (
                <div key={v.id} className="ph-visit">
                  <div className="ph-visit-dot" />
                  <div style={{ flex: 1 }}>
                    <div className="row between" style={{ gap: 8 }}>
                      <b style={{ fontSize: 14 }}>{v.chief_complaint || "Check-in"}</b>
                      <span className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{fmtVisit(v.created_at)}</span>
                    </div>
                    {v.summary && <div className="muted" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{v.summary}</div>}
                    {v.medications && v.medications.length > 0 && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>💊 {v.medications.join(", ")}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="row" style={{ gap: 8, marginBottom: 8 }}><span style={{ fontSize: 16 }}>📋</span><b>Recap my visit</b></div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>One plain-language summary of your whole stay.</p>
            <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={getDebrief} disabled={busy}>
              Give me the recap
            </button>
            {debrief && <div className="soft-note fade-up">{debrief}</div>}
          </div>
        </div>
      </div>
      <audio ref={audioRef} style={{ display: "none" }} />
      <GemmaConsole />

      <style>{`
        .ph { min-height:100vh; }
        .ph-top { display:flex; justify-content:space-between; align-items:center; padding:16px 28px;
          border-bottom:1px solid var(--line); position:sticky; top:0; background:rgba(10,14,26,0.7);
          backdrop-filter:blur(10px); z-index:10; }
        .ph-body { max-width:1040px; margin:0 auto; padding:26px; display:grid;
          grid-template-columns:1.5fr 1fr; gap:16px; align-items:start; }
        .ph-chat { display:flex; flex-direction:column; height:72vh; }
        .ph-chat-head { display:flex; gap:12px; align-items:center; padding:16px 18px; border-bottom:1px solid var(--line); }
        .orb { width:34px; height:34px; border-radius:50%;
          background:radial-gradient(circle at 35% 30%, #6ffbe4, var(--teal-dim));
          box-shadow:0 0 18px var(--teal-glow); animation:breathe 3s ease-in-out infinite; }
        @keyframes breathe { 0%,100%{transform:scale(1);opacity:0.9;} 50%{transform:scale(1.08);opacity:1;} }
        .ph-messages { flex:1; overflow-y:auto; padding:18px; display:flex; flex-direction:column; gap:10px; }
        .bubble { max-width:82%; padding:12px 15px; border-radius:16px; font-size:15px; line-height:1.55; animation:fadeUp 0.3s ease both; }
        .bubble.me { align-self:flex-end; background:var(--panel-hi); border:1px solid var(--line);
          border-bottom-right-radius:4px; }
        .bubble.confide { align-self:flex-start; background:linear-gradient(180deg,rgba(47,230,200,0.1),rgba(47,230,200,0.04));
          border:1px solid var(--teal-dim); border-bottom-left-radius:4px; }
        .typing { display:inline-flex; gap:4px; }
        .typing i { width:7px; height:7px; border-radius:50%; background:var(--teal); animation:blink 1.2s infinite; }
        .typing i:nth-child(2){animation-delay:0.2s;} .typing i:nth-child(3){animation-delay:0.4s;}
        @keyframes blink { 0%,60%,100%{opacity:0.3;} 30%{opacity:1;} }
        .ph-suggest { display:flex; flex-wrap:wrap; gap:6px; padding:0 18px 12px; }
        .chip { font-size:12px; padding:7px 12px; border-radius:999px; background:var(--panel-2);
          border:1px solid var(--line); color:var(--text-dim); }
        .chip:hover { border-color:var(--teal-dim); color:var(--text); }
        .ph-input { display:flex; gap:8px; padding:14px 18px; border-top:1px solid var(--line); }
        .reminder { padding:10px 12px; background:var(--bg-soft); border:1px solid var(--line-soft); border-radius:8px; }
        .ph-timeline { display:flex; flex-direction:column; gap:14px; max-height:340px; overflow-y:auto; padding-right:4px; }
        .ph-visit { display:flex; gap:12px; position:relative; }
        .ph-visit:not(:last-child)::before { content:""; position:absolute; left:4px; top:16px; bottom:-14px; width:1px; background:var(--line); }
        .ph-visit-dot { width:9px; height:9px; border-radius:50%; margin-top:5px; flex:none;
          background:var(--teal); box-shadow:0 0 8px var(--teal-glow); }
        .soft-note { margin-top:12px; background:rgba(47,230,200,0.06); border:1px solid var(--teal-dim);
          border-radius:10px; padding:12px 14px; font-size:14px; line-height:1.6; }
        @media (max-width:900px){ .ph-body{grid-template-columns:1fr;} .ph-chat{height:60vh;} }
      `}</style>
    </div>
  );
}
