import { Navigate, Route, Routes } from "react-router-dom";
import TopBar from "./components/TopBar";
import RequireStaff from "./components/RequireStaff";
import RequirePatient from "./components/RequirePatient";
import Login from "./pages/Login";
import PatientPicker from "./pages/PatientPicker";
import Dashboard from "./pages/Dashboard";
import LiveRoom from "./pages/LiveRoom";
import Scribe from "./pages/Scribe";
import Consent from "./pages/Consent";

export default function App() {
  return (
    <>
      <TopBar />
      <main id="app">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireStaff />}>
            <Route path="/patients" element={<PatientPicker />} />

            <Route element={<RequirePatient />}>
              {/* LiveRoom is the demo's home base — everything reacts to speech and camera. */}
              <Route path="/live" element={<LiveRoom />} />
              {/* Dashboard shows returning-patient visit highlights. */}
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Manual fallback tools if a demo beat needs to be triggered by hand. */}
              <Route path="/tools/scribe" element={<Scribe />} />
              <Route path="/tools/consent" element={<Consent />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </>
  );
}
