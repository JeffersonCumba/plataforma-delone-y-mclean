"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsBarDatum } from "@/services/analyticsService";

export function AnalyticsChart({ data }: { data: AnalyticsBarDatum[] }) {
  console.log("🚀 ~ AnalyticsChart ~ data:", data)
  return (
    <div className="h-105 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
          <YAxis type="category" dataKey="name" width={220} />
          <Tooltip
            formatter={(value) => [Number(value).toFixed(2), "Promedio"]}
          />
          <Bar dataKey="score" radius={[0, 8, 8, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
