// Thin fetch wrapper for every backend endpoint. See SPEC.md section 6 for the full list.
// In dev, Vite proxies /api and /media to the FastAPI server (see vite.config.js);
// in production this is served from the same origin as the built bundle.

// FastAPI validation errors (422) send `detail` as an array of {loc, msg} objects,
// not a string — format those into something readable instead of "[object Object]".
function formatErrorDetail(detail) {
  if (!detail) return undefined;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        if (e && typeof e === "object") {
          const field = Array.isArray(e.loc) ? e.loc.filter((p) => p !== "body").join(".") : "";
          return field ? `${field}: ${e.msg}` : e.msg || JSON.stringify(e);
        }
        return String(e);
      })
      .join("; ");
  }
  return JSON.stringify(detail);
}

async function request(method, path, { json, form, params } = {}) {
  let url = path;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const opts = { method };
  if (json !== undefined) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(json);
  } else if (form !== undefined) {
    opts.body = form; // FormData — browser sets multipart headers itself
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = formatErrorDetail(body.detail) || body.error || detail;
    } catch {
      /* no JSON body */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  status: () => request("GET", "/api/status"),

  // staff
  listStaff: () => request("GET", "/api/staff"),
  createStaff: (name, pin) => request("POST", "/api/staff", { json: { name, pin } }),
  login: (staff_id, pin) => request("POST", "/api/auth/login", { json: { staff_id, pin } }),

  // patients
  listPatients: (params) => request("GET", "/api/patients", { params }),
  createPatient: (body) => request("POST", "/api/patients", { json: body }),
  getPatient: (id) => request("GET", `/api/patients/${id}`),
  updatePatient: (id, body) => request("PUT", `/api/patients/${id}`, { json: body }),
  dischargePatient: (id, staff_id) =>
    request("POST", `/api/patients/${id}/discharge`, { json: { staff_id } }),

  // voice
  transcribe: (audioBlob) => {
    const form = new FormData();
    form.append("audio", audioBlob, "recording.webm");
    return request("POST", "/api/voice/transcribe", { form });
  },

  // scribe / notes
  structureTranscript: (transcript) =>
    request("POST", "/api/scribe/structure", { json: { transcript } }),
  createNote: (body) => request("POST", "/api/notes", { json: body }),
  listNotes: (patient_id) => request("GET", "/api/notes", { params: { patient_id } }),
  getNote: (id) => request("GET", `/api/notes/${id}`),
  updateNote: (id, body) => request("PUT", `/api/notes/${id}`, { json: body }),

  // visits (cross-visit patient memory)
  listVisits: (patient_id) => request("GET", `/api/visits/${patient_id}`),
  summarizeVisit: (visit_id) => request("POST", `/api/visits/${visit_id}/summarize`),

  // consent
  createConsentForm: (imageBlob, patient_id, staff_id) => {
    const form = new FormData();
    form.append("image", imageBlob, "form.jpg");
    form.append("patient_id", patient_id);
    form.append("staff_id", staff_id);
    return request("POST", "/api/consent/forms", { form });
  },
  listConsentForms: (patient_id) =>
    request("GET", "/api/consent/forms", { params: { patient_id } }),
  getConsentForm: (id) => request("GET", `/api/consent/forms/${id}`),
  askConsentQuestion: (formId, patient_id, { questionText, audioBlob }) => {
    const form = new FormData();
    form.append("patient_id", patient_id);
    if (audioBlob) form.append("audio", audioBlob, "question.webm");
    if (questionText) form.append("question_text", questionText);
    return request("POST", `/api/consent/forms/${formId}/questions`, { form });
  },
  listConsentQuestions: (formId) => request("GET", `/api/consent/forms/${formId}/questions`),

  // live room (always-on mic + camera). Streams are short chunks (~3-4s) —
  // the client owns the loop and each chunk is stateless on the server side.
  liveStream: (audioBlob, patient_id, speaker) => {
    const form = new FormData();
    form.append("audio", audioBlob, "chunk.webm");
    form.append("patient_id", patient_id);
    if (speaker) form.append("speaker", speaker);
    return request("POST", "/api/live/stream", { form });
  },
  liveVision: (imageBlob, patient_id) => {
    const form = new FormData();
    form.append("image", imageBlob, "frame.jpg");
    form.append("patient_id", patient_id);
    return request("POST", "/api/live/vision", { form });
  },
  liveGraph: (patient_id) => request("GET", `/api/live/graph/${patient_id}`),
  liveEvents: (patient_id, since) =>
    request("GET", `/api/live/events/${patient_id}`, { params: { since } }),
};
