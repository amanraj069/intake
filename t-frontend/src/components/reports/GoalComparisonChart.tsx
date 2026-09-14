import { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { formatChartDate } from "@/lib/formatDate";
import type { GoalComparisonPoint } from "@/types/nutrition";

interface GoalComparisonChartProps {
  data: GoalComparisonPoint[];
}

/** Actual vs. target calories: bars for actual, reference line for target. */
function GoalComparisonChart({ data }: GoalComparisonChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const actualColour = isDark ? "#34D399" : "#0EA57A";
  const targetColour = isDark ? "#9CA3AF" : "#6B6659";
  const gridColour = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColour = isDark ? "#9CA3AF" : "#6B6659";

  const targetCalories = useMemo(
    () => (data.length > 0 ? data[0].targetCalories : null),
    [data]
  );

  const formatted = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: formatChartDate(d.date),
      })),
    [data]
  );

  return (
    <section className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-4 sm:p-7">
      <h3 className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary mb-3.5 sm:mb-6">
        Goal vs Actual
      </h3>

      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColour} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: textColour }}
              tickLine={false}
              axisLine={false}
              dy={8}
              minTickGap={25}
            />
            <YAxis
              tick={{ fontSize: 10, fill: textColour }}
              tickLine={false}
              axisLine={false}
              width={48}
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
            <Bar dataKey="actualCalories" name="Actual" fill={actualColour} radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={300} />
            {targetCalories !== null && (
              <ReferenceLine
                y={targetCalories}
                // Without this the line is dropped whenever every day falls short of the target.
                ifOverflow="extendDomain"
                stroke={targetColour}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Target: ${targetCalories}`,
                  position: "insideTopLeft",
                  style: {
                    fontSize: 10,
                    fontWeight: 700,
                    fill: targetColour,
                  },
                }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default memo(GoalComparisonChart);
