import { memo, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Cell
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { formatAmount } from "@/lib/formatNumber";
import { formatChartDate } from "@/lib/formatDate";
import type { NutritionMetric } from "@/lib/nutritionMetrics";
import type { TrendBar } from "@/lib/intakeTrend";

interface TrendColumnsProps {
  bars: TrendBar[];
  targetRatio: number | null;
  target: number | null;
  metric: NutritionMetric;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

function TrendColumns({
  bars,
  target,
  metric,
  selectedDate,
  onSelectDate,
}: TrendColumnsProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  let strokeColour = isDark ? "#34D399" : "#0EA57A";
  if (metric.key === "protein") strokeColour = isDark ? "#FF8787" : "#E05555";
  if (metric.key === "carbs") strokeColour = isDark ? "#FFC97A" : "#D4930D";
  if (metric.key === "fat") strokeColour = isDark ? "#B4A0FF" : "#8B6FC0";
  
  const gridColour = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColour = isDark ? "#9CA3AF" : "#6B6659";

  const formatted = useMemo(
    () =>
      bars.map((bar) => ({
        ...bar,
        label: bar.weekdayLabel,
        fullDate: formatChartDate(bar.date),
      })),
    [bars]
  );

  const handleMouseMove = (state: any) => {
    if (state?.activePayload && state.activePayload.length > 0) {
      onSelectDate(state.activePayload[0].payload.date);
    }
  };

  const isCalories = metric.key === "calories";

  const commonAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={gridColour} vertical={false} />
      <XAxis
        dataKey="label"
        interval={0}
        tick={{ fontSize: 10, fontWeight: 600, fill: textColour }}
        tickLine={false}
        axisLine={false}
        dy={8}
        padding={{ left: 8, right: 8 }}
      />
      <YAxis hide domain={[0, (dataMax: number) => Math.max(dataMax, target || 0) * 1.08]} />
      <Tooltip
        contentStyle={{
          backgroundColor: isDark ? "#1A1A1A" : "#FCF8EF",
          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
          borderRadius: "0.875rem",
          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
          fontSize: 11,
          padding: "8px 12px",
          color: isDark ? "#FFFFFF" : "#1A1A1A",
        }}
        labelStyle={{ fontWeight: 700, paddingBottom: 2, color: isDark ? "#FFFFFF" : "#1A1A1A" }}
        itemStyle={{ fontWeight: 500, color: isDark ? "#FFFFFF" : "#1A1A1A" }}
        cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
        labelFormatter={(_label, payload) =>
          payload && payload.length > 0 ? payload[0].payload.fullDate : _label
        }
      />
    </>
  );

  return (
    <div className="h-44 sm:h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {isCalories ? (
          <AreaChart
            data={formatted}
            onMouseMove={handleMouseMove}
            onClick={handleMouseMove}
            margin={{ top: 20, right: 12, bottom: 4, left: 12 }}
          >
            <defs>
              <linearGradient id="dashGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColour} stopOpacity={isDark ? 0.35 : 0.2} />
                <stop offset="95%" stopColor={strokeColour} stopOpacity={0} />
              </linearGradient>
            </defs>
            {commonAxes}
            <Area
              type="monotone"
              dataKey="actual"
              name={metric.label}
              stroke={strokeColour}
              strokeWidth={2.5}
              fill="url(#dashGradient)"
              isAnimationActive={true}
              animationDuration={250}
              activeDot={{
                r: 5,
                fill: strokeColour,
                stroke: isDark ? "#131C16" : "#FCFAF6",
                strokeWidth: 2,
              }}
            />
            {target !== null && (
              <ReferenceLine
                y={target}
                stroke={textColour}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: `Target: ${formatAmount(target)}`,
                  position: "insideTopLeft",
                  fill: textColour,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}
          </AreaChart>
        ) : (
          <BarChart
            data={formatted}
            onMouseMove={handleMouseMove}
            onClick={handleMouseMove}
            margin={{ top: 20, right: 12, bottom: 4, left: 12 }}
          >
            {commonAxes}
            <Bar dataKey="actual" name={metric.label} radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={true} animationDuration={250}>
              {formatted.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.date === selectedDate ? strokeColour : strokeColour + "80"}
                  className="cursor-pointer"
                  onClick={() => onSelectDate(entry.date)}
                />
              ))}
            </Bar>
            {target !== null && (
              <ReferenceLine
                y={target}
                stroke={textColour}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: `Target: ${formatAmount(target)}`,
                  position: "insideTopLeft",
                  fill: textColour,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default memo(TrendColumns);
