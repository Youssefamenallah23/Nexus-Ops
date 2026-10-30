"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Transparent ROI Simulator Chart
 * Formula: ((manual minutes - assisted minutes) * volume) / 60
 */
export function ImpactChart() {
  const data = Array.from({ length: 25 }, (_, i) => {
    const volume = (i + 1) * 200;
    return {
      volume,
      hours: Math.round(((12 - 3) * volume) / 60),
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="appleBlueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--highlight)" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="volume"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(v: number) => `${v.toLocaleString()}`}
              stroke="var(--highlight)"
            />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} stroke="var(--highlight)" unit=" h" />
            <Tooltip
              contentStyle={{
                background: "var(--surface-translucent)",
                border: "1px solid var(--highlight)",
                borderRadius: 12,
                boxShadow: "0 10px 30px var(--shadow-deep)",
                color: "var(--foreground)",
                backdropFilter: "blur(20px)",
              }}
              labelFormatter={(v) => `${Number(v).toLocaleString()} documents / year`}
              formatter={(value: unknown) => [`${value} hours`, "Estimated time saved"]}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#appleBlueGradient)"
              isAnimationActive={false}
            />
            <ReferenceLine
              y={150}
              stroke="var(--fault)"
              strokeDasharray="4 4"
              label={{
                value: "Benchmark: 1,000 docs = 150 hours saved",
                fill: "var(--fault)",
                fontSize: 11,
                position: "insideTopRight",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Simulated projections based on standard baseline assumptions (12 min manual vs. 3 min assisted).
      </p>
    </div>
  );
}
