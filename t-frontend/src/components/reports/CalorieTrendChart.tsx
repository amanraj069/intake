import { memo, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { formatChartDate } from "@/lib/formatDate";
import type { GoalComparisonPoint } from "@/types/nutrition";

interface CalorieTrendChartProps {
  data: GoalComparisonPoint[];
  activeGoal?: number | null;
}

/**
 * Daily calorie totals as bars, with the goal target as a step line.
 * If there is no goal data for a particular day or range (such as days before
 * the first goal was created), the goal is extended to the first date being shown
 * so the target line remains continuous across the visible range.
 */
function CalorieTrendChart({ data, activeGoal }: CalorieTrendChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const barColour = isDark ? "#34D399" : "#0EA57A";
  const targetColour = isDark ? "#9CA3AF" : "#6B6659";
  const gridColour = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColour = isDark ? "#9CA3AF" : "#6B6659";

  const formatted = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Find the latest known target in data, or fall back to activeGoal
    const latestKnownTarget =
      [...data].reverse().find((d) => d.targetCalories !== null)?.targetCalories ??
      activeGoal ??
      null;

    // Find the earliest known target in data, or fall back to latestKnownTarget
    const earliestKnownTarget =
      data.find((d) => d.targetCalories !== null)?.targetCalories ??
      latestKnownTarget;

    // If no target exists anywhere, return formatted data as-is
    if (earliestKnownTarget === null && latestKnownTarget === null) {
      return data.map((d) => ({
        ...d,
        label: formatChartDate(d.date),
      }));
    }

    // Extend goal:
    // Leading days without a goal get the earliest known target (or activeGoal),
    // extending the goal line back to the first date being shown.
    // Subsequent nulls get forward-filled.
    let currentTarget: number | null = earliestKnownTarget;

    return data.map((d) => {
      if (d.targetCalories !== null) {
        currentTarget = d.targetCalories;
      }
      return {
        ...d,
        targetCalories: d.targetCalories ?? currentTarget,
        label: formatChartDate(d.date),
      };
    });
  }, [data, activeGoal]);

  const hasTarget = useMemo(
    () => formatted.some((d) => d.targetCalories !== null),
    [formatted]
  );

  return (
    <section className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-4 sm:p-7">
      <h3 className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary mb-3.5 sm:mb-6">
        Calorie Trend
      </h3>

      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formatted} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColour} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: textColour }}
              tickLine={false}
              axisLine={false}
              dy={8}
              minTickGap={20}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: textColour }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1A1A1A" : "#FCF8EF",
                border: isDark ? "1px solid rgba(255,255,255,0.12)" : "none",
                borderRadius: "1rem",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                fontSize: 12,
                color: isDark ? "#FFFFFF" : "#1A1A1A",
              }}
              labelStyle={{ fontWeight: 700, paddingBottom: 4, color: isDark ? "#FFFFFF" : "#1A1A1A" }}
              itemStyle={{ fontWeight: 500, color: isDark ? "#FFFFFF" : "#1A1A1A" }}
              cursor={{ fill: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}
              formatter={(value, name) => (value === null ? ["No goal set", name] : [`${value} kcal`, name])}
            />
            {hasTarget && (
              <Legend
                wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 16 }}
              />
            )}
            <Bar
              dataKey="actualCalories"
              name="Calories"
              fill={barColour}
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={300}
            />
            {hasTarget && (
              <Line
                type="stepAfter"
                dataKey="targetCalories"
                name="Goal"
                stroke={targetColour}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={true}
                isAnimationActive={true}
                animationDuration={300}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default memo(CalorieTrendChart);
