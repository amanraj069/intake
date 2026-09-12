"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { formatDayAndMonth } from "@/lib/formatDate";
import type { MacroBreakdownPoint } from "@/types/nutrition";

interface MacroBreakdownChartProps {
  data: MacroBreakdownPoint[];
}

/** Stacked bar chart: protein (coral), carbs (amber), fat (lavender) per day/week. */
export default function MacroBreakdownChart({ data }: MacroBreakdownChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const proteinColour = isDark ? "#FF8787" : "#E05555";
  const carbsColour = isDark ? "#FFC97A" : "#D4930D";
  const fatColour = isDark ? "#B4A0FF" : "#8B6FC0";
  const gridColour = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColour = isDark ? "#9CA3AF" : "#6B6659";

  const formatted = data.map((d) => ({
    ...d,
    label: d.period.includes("-W") ? d.period : formatDayAndMonth(d.period),
  }));

  return (
    <section className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-6 sm:p-7">
      <h3 className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary mb-6">
        Macro Breakdown
      </h3>

      <div className="h-52 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColour} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: textColour }}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 10, fill: textColour }}
              tickLine={false}
              axisLine={false}
              width={48}
              label={{
                value: "grams",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: textColour },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1A1A1A" : "#FCF8EF",
                border: "none",
                borderRadius: "1rem",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                fontSize: 12,
              }}
              labelStyle={{ fontWeight: 700, paddingBottom: 4, color: isDark ? "#fff" : "#000" }}
              itemStyle={{ fontWeight: 500 }}
              cursor={{ fill: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 16 }}
            />
            <Bar dataKey="proteinG" name="Protein" stackId="macros" fill={proteinColour} radius={[2, 2, 0, 0]} />
            <Bar dataKey="carbG" name="Carbs" stackId="macros" fill={carbsColour} radius={[2, 2, 0, 0]} />
            <Bar dataKey="fatG" name="Fat" stackId="macros" fill={fatColour} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
