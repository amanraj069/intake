import { memo, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { formatChartDate } from "@/lib/formatDate";
import type { WeeklyCaloriePoint } from "@/types/nutrition";

interface CalorieTrendChartProps {
  data: WeeklyCaloriePoint[];
}

/** Daily calorie totals as an area chart with a glowing teal gradient. */
function CalorieTrendChart({ data }: CalorieTrendChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const strokeColour = isDark ? "#34D399" : "#0EA57A";
  const gridColour = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColour = isDark ? "#9CA3AF" : "#6B6659";

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
        Calorie Trend
      </h3>

      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColour} stopOpacity={isDark ? 0.4 : 0.2} />
                <stop offset="95%" stopColor={strokeColour} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              cursor={{ stroke: gridColour, strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="totalCalories"
              name="Calories"
              stroke={strokeColour}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCalories)"
              isAnimationActive={true}
              animationDuration={300}
              activeDot={{ r: 6, fill: strokeColour, stroke: isDark ? "#1A1A1A" : "#FCF8EF", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default memo(CalorieTrendChart);
