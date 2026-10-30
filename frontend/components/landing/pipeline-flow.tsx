"use client";

/**
 * Animated diagram of the real agent pipeline. Data pulses travel along the
 * connectors (CSS keyframes), the human gate glows fault-orange.
 */

const STAGES = [
  { key: "upload", label: "Upload", desc: "PDF, DOCX, TXT, CSV" },
  { key: "classify", label: "Classification Agent", desc: "type · department · priority" },
  { key: "extract", label: "Intelligence Agent", desc: "structured fields + confidence" },
  { key: "qa", label: "QA Agent", desc: "consistency + missing fields" },
  { key: "human", label: "Human Gate", desc: "edit · approve · reject" },
  { key: "n8n", label: "Automation Agent", desc: "n8n webhooks · tasks" },
];

const WIDTH = 1100;
const STEP = WIDTH / (STAGES.length - 1);
const Y = 60;

export function PipelineFlow() {
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} 140`} className="min-w-[860px] w-full">
        <defs>
          <linearGradient id="flowline" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0297de" stopOpacity="0.9" />
            <stop offset="1" stopColor="#36b5f2" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {STAGES.slice(0, -1).map((s, i) => (
          <line
            key={s.key}
            x1={(i * STEP) + 52}
            y1={Y}
            x2={((i + 1) * STEP) - 52}
            y2={Y}
            stroke="url(#flowline)"
            strokeWidth="2"
            strokeDasharray="6 10"
            className="animate-[dashflow_1.2s_linear_infinite]"
          />
        ))}

        {STAGES.map((s, i) => {
          const x = i * STEP;
          const human = s.key === "human";
          return (
            <g key={s.key}>
              <circle
                cx={x} cy={Y} r={human ? 14 : 11}
                fill={human ? "#fc734d" : "#06121a"}
                stroke={human ? "#fc734d" : "#0297de"}
                strokeWidth="2"
              />
              {human && (
                <circle cx={x} cy={Y} r={20} fill="none" stroke="#fc734d" strokeOpacity="0.5"
                  className="animate-[pulse-ring_2s_ease-out_infinite]" />
              )}
              <text x={x} y={Y - 30} textAnchor="middle" fill="#e8f2f8" fontSize="13" fontWeight="600">
                {s.label}
              </text>
              <text x={x} y={Y + 42} textAnchor="middle" fill="#8fb0c4" fontSize="11">
                {s.desc}
              </text>
            </g>
          );
        })}

        {STAGES.slice(0, -1).map((s, i) => (
          <circle key={`dot-${s.key}`} r="4" fill="#0297de">
            <animateMotion
              dur="2.4s"
              begin={`${i * 0.4}s`}
              repeatCount="indefinite"
              path={`M ${i * STEP + 52} ${Y} L ${(i + 1) * STEP - 52} ${Y}`}
            />
          </circle>
        ))}
      </svg>
    </div>
  );
}
