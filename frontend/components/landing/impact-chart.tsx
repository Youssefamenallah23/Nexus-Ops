"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * The real time-saved formula from the product, plotted across volumes.
 * (manual 12 min - assisted 3 min) * volume / 60. Clearly labeled simulated.
 */
export function ImpactChart() {
  const data = Array.from({ length: 25 }, (_, i) => {
    const volume = (i + 1) * 200;
    return {
      volume,
      hours: Math.round(((12 - 3) * volume) / 60),
      minutes: 3,
    };
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="savedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0297de" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#0297de" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#123246" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="volume"
            tick={{ fill: "#8fb0c4", fontSize: 12 }}
            tickFormatter={(v: number) => `${v.toLocaleString("fr-FR")}`}
            stroke="#123246"
          />
          <YAxis tick={{ fill: "#8fb0c4", fontSize: 12 }} stroke="#123246" unit=" h" />
          <Tooltip
            contentStyle={{ background: "#06121a", border: "1px solid #123246", borderRadius: 4, color: "#e8f2f8" }}
            labelFormatter={(v) => `${Number(v).toLocaleString("fr-FR")} docs / year`}
            formatter={(value: unknown) => [`${value} h`, "Estimated hours saved"]}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#0297de"
            strokeWidth="2"
            fill="url(#savedFill)"
            animationDuration={1400}
          />
          <ReferenceLine
            y={750}
            stroke="#fc734d"
            strokeDasharray="4 4"
            label={{ value: "example: 1 000 docs = 150 h", fill: "#fc734d", fontSize: 11, position: "insideTopRight" }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-[#fc734d]">
        Simulated assumptions (12 min manual vs 3 min assisted per document) — not measured company results.
      </p>
    </div>
  );
}
