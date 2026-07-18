import { useMemo } from "react";

// A hand-rolled SVG force-ish graph. Real graph libs (react-flow, vis-network) are
// overkill for the demo — we only need one hub (the patient) with a modest number
// of leaves grouped by kind. The layout is deterministic radial-by-kind so the
// same patient always paints the same shape.

const KIND_COLOR = {
  patient: "#2563eb",
  allergy: "#dc2626",
  drug: "#0ea5e9",
  symptom: "#f59e0b",
  procedure: "#8b5cf6",
  diagnosis: "#14b8a6",
};

// Kind order controls which sector of the ring each group sits in — stable so the
// UI doesn't reflow the whole graph every time a new entity appears.
const KIND_ORDER = ["allergy", "drug", "symptom", "procedure", "diagnosis"];

export default function MemoryGraph({ data, width = 520, height = 420 }) {
  const positioned = useMemo(() => layout(data, width, height), [data, width, height]);

  if (!data || !data.nodes?.length) {
    return <p className="muted">Waiting for the room to say something…</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="memory-graph">
      {positioned.edges.map((e, i) => (
        <line
          key={i}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={e.kind === "contraindicated" ? "#dc2626" : "#94a3b8"}
          strokeWidth={e.kind === "contraindicated" ? 3 : 1.5}
          strokeDasharray={e.kind === "contraindicated" ? "4 4" : undefined}
        />
      ))}
      {positioned.nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
          <circle
            r={n.kind === "patient" ? 26 : 14}
            fill={KIND_COLOR[n.kind] || "#6b7280"}
            opacity={0.9}
          />
          <text
            y={n.kind === "patient" ? 42 : 28}
            textAnchor="middle"
            fontSize={n.kind === "patient" ? 13 : 11}
            fill="currentColor"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function layout(data, width, height) {
  if (!data || !data.nodes?.length) return { nodes: [], edges: [] };
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 60;

  const patient = data.nodes.find((n) => n.kind === "patient") || data.nodes[0];
  const others = data.nodes.filter((n) => n.id !== patient.id);
  const byKind = {};
  for (const n of others) {
    (byKind[n.kind] = byKind[n.kind] || []).push(n);
  }

  const kinds = KIND_ORDER.filter((k) => byKind[k]?.length);
  // extras (unknown kinds we haven't styled): just append
  for (const k of Object.keys(byKind)) if (!kinds.includes(k)) kinds.push(k);

  const positions = { [patient.id]: { x: cx, y: cy } };
  const sectorSize = (2 * Math.PI) / Math.max(kinds.length, 1);

  kinds.forEach((kind, ki) => {
    const items = byKind[kind];
    const sectorStart = ki * sectorSize - Math.PI / 2; // start at top
    items.forEach((n, i) => {
      // Spread evenly within the sector; a lone node sits at the sector midpoint.
      const t = items.length === 1 ? 0.5 : i / (items.length - 1);
      const angle = sectorStart + sectorSize * (0.15 + 0.7 * t);
      positions[n.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  });

  const nodes = data.nodes.map((n) => ({ ...n, ...positions[n.id] }));
  const edges = (data.edges || [])
    .filter((e) => positions[e.from] && positions[e.to])
    .map((e) => ({
      ...e,
      x1: positions[e.from].x,
      y1: positions[e.from].y,
      x2: positions[e.to].x,
      y2: positions[e.to].y,
    }));
  return { nodes, edges };
}
