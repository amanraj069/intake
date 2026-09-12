"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import type { MicroSummaryPoint } from "@/types/nutrition";

interface MicroSummaryChartProps {
  data: MicroSummaryPoint[];
}

/** Subtle alternating fills for the horizontal bars. */
const PALETTE_LIGHT = ["#0EA57A", "#E05555", "#D4930D", "#8B6FC0", "#3B7A57", "#6B6659"];
const PALETTE_DARK = ["#34D399", "#FF8787", "#FFC97A", "#B4A0FF", "#468E66", "#9CA3AF"];

function formatNutrientName(raw: string): string {
  if (raw.includes(" ")) return raw.trim();
  return raw
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** Horizontal bar chart showing summed micronutrients across the date range. */
export default function MicroSummaryChart({ data }: MicroSummaryChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textColour = isDark ? "#9CA3AF" : "#6B6659";
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;

  if (data.length === 0) {
    return (
      <section className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-6 sm:p-7">
        <h3 className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary mb-6">
          Micronutrients
        </h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          No micronutrient data for this period. Log meals with micronutrient details to see them here.
        </p>
      </section>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: `${formatNutrientName(d.nutrient)} (${d.unit})`,
  }));

  return (
    <section className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-6 sm:p-7">
      <h3 className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary mb-6">
        Micronutrients
      </h3>

      <div style={{ height: Math.max(160, data.length * 32) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formatted}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: textColour }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 10, fill: textColour }}
              tickLine={false}
              axisLine={false}
              width={140}
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
              formatter={(value: any, _name: any, props: any) =>
                [`${value} ${props.payload.unit}`, "Amount"]
              }
            />
            <Bar dataKey="amount" name="Amount" barSize={16} radius={[0, 4, 4, 0]}>
              {formatted.map((_, index) => (
                <Cell key={index} fill={palette[index % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
