"use client";

import React, { useState } from "react";

export interface DailyDataPoint {
  date: string; // YYYY-MM-DD
  sales: number;
  transactions: number;
}

interface HeatmapPixelChartProps {
  data: DailyDataPoint[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  title?: string;
  subtitle?: string;
}

export function HeatmapPixelChart({
  data,
  startDate,
  endDate,
  title = "Performance em Pixels",
  subtitle = "Mapa de calor do movimento diário de vendas",
}: HeatmapPixelChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    sales: number;
    transactions: number;
    level: "high" | "medium" | "low" | "none";
  } | null>(null);

  // Map input data by date string for quick lookup
  const dataMap = new Map<string, DailyDataPoint>();
  data.forEach((item) => dataMap.set(item.date, item));

  // Determine max sales volume across range to scale thresholds dynamically
  const maxSales = Math.max(...data.map((d) => d.sales), 1);

  // Helper to categorize sales volume for a date
  const getPerformanceLevel = (sales: number, transactions: number): "high" | "medium" | "low" | "none" => {
    if (sales === 0 && transactions === 0) return "none";
    const ratio = sales / maxSales;
    if (ratio >= 0.6) return "high";
    if (ratio >= 0.25) return "medium";
    return "low";
  };

  // Color mapping according to exact Qrido Brand Palette
  // High: #167657, Medium: #f7aa1c, Low: #e9592c, None: #2f2f2f
  const getColor = (level: "high" | "medium" | "low" | "none") => {
    switch (level) {
      case "high":
        return "#167657";
      case "medium":
        return "#f7aa1c";
      case "low":
        return "#e9592c";
      case "none":
      default:
        return "#2f2f2f";
    }
  };

  // Generate date points between startDate and endDate
  const daysList: { dateStr: string; dayNum: number; monthStr: string }[] = [];
  const curr = new Date(startDate);
  const end = new Date(endDate);
  
  while (curr <= end) {
    const dateStr = curr.toISOString().split("T")[0];
    const dayNum = curr.getDate();
    const monthStr = curr.toLocaleDateString("pt-BR", { month: "short" });
    daysList.push({ dateStr, dayNum, monthStr });
    curr.setDate(curr.getDate() + 1);
  }

  // Calculate statistics for counters
  let countHigh = 0;
  let countMedium = 0;
  let countLow = 0;
  let countNone = 0;

  const processedDays = daysList.map((day) => {
    const item = dataMap.get(day.dateStr);
    const sales = item ? item.sales : 0;
    const transactions = item ? item.transactions : 0;
    const level = getPerformanceLevel(sales, transactions);

    if (level === "high") countHigh++;
    else if (level === "medium") countMedium++;
    else if (level === "low") countLow++;
    else countNone++;

    return {
      ...day,
      date: day.dateStr,
      sales,
      transactions,
      level,
    };
  });

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 shadow-xl text-white font-sans max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-800 gap-2">
        <div>
          <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#167657] inline-block animate-pulse"></span>
            {title}
          </h3>
          <p className="text-sm text-zinc-400 mt-0.5">{subtitle}</p>
        </div>
        
        {hoveredDay && (
          <div className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-lg text-xs flex items-center gap-4">
            <div>
              <span className="text-zinc-400">Data:</span>{" "}
              <strong className="text-zinc-200">{hoveredDay.date}</strong>
            </div>
            <div>
              <span className="text-zinc-400">Vendas:</span>{" "}
              <strong className="text-[#167657]">
                {hoveredDay.sales.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400">Transações:</span>{" "}
              <strong className="text-[#f7aa1c]">{hoveredDay.transactions}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Grid Display */}
      <div className="py-6 overflow-x-auto">
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-31 gap-2.5 min-w-[320px]">
          {processedDays.map((day) => {
            const color = getColor(day.level);
            const isDimmed =
              selectedCategory !== null && selectedCategory !== day.level;

            return (
              <div
                key={day.dateStr}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`relative group flex flex-col items-center cursor-pointer transition-all duration-200 transform hover:scale-125 ${
                  isDimmed ? "opacity-20" : "opacity-100"
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full shadow-inner border border-white/10 transition-colors"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-zinc-500 mt-1 font-mono">
                  {day.dayNum}
                </span>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-20">
                  <div className="bg-zinc-950 text-zinc-100 text-[11px] py-1.5 px-3 rounded-md shadow-2xl border border-zinc-700 whitespace-nowrap">
                    <p className="font-semibold text-zinc-300">{day.dateStr}</p>
                    <p className="text-emerald-400">
                      R$ {day.sales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-zinc-400">{day.transactions} transações</p>
                  </div>
                  <div className="w-2 h-2 bg-zinc-950 rotate-45 border-r border-b border-zinc-700 -mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Legend with Exact Qrido Brand Palette */}
      <div className="pt-6 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Alto Volume */}
        <button
          onClick={() =>
            setSelectedCategory(selectedCategory === "high" ? null : "high")
          }
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            selectedCategory === "high"
              ? "bg-[#167657]/20 border-[#167657]"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#167657] shadow-sm" />
          <div className="text-left">
            <p className="text-lg font-bold text-[#167657] leading-none">{countHigh}</p>
            <p className="text-xs text-zinc-400 mt-1">Alto volume</p>
          </div>
        </button>

        {/* Médio Volume */}
        <button
          onClick={() =>
            setSelectedCategory(selectedCategory === "medium" ? null : "medium")
          }
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            selectedCategory === "medium"
              ? "bg-[#f7aa1c]/20 border-[#f7aa1c]"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#f7aa1c] shadow-sm" />
          <div className="text-left">
            <p className="text-lg font-bold text-[#f7aa1c] leading-none">{countMedium}</p>
            <p className="text-xs text-zinc-400 mt-1">Médio volume</p>
          </div>
        </button>

        {/* Baixo Volume */}
        <button
          onClick={() =>
            setSelectedCategory(selectedCategory === "low" ? null : "low")
          }
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            selectedCategory === "low"
              ? "bg-[#e9592c]/20 border-[#e9592c]"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#e9592c] shadow-sm" />
          <div className="text-left">
            <p className="text-lg font-bold text-[#e9592c] leading-none">{countLow}</p>
            <p className="text-xs text-zinc-400 mt-1">Baixo volume</p>
          </div>
        </button>

        {/* Sem movimento */}
        <button
          onClick={() =>
            setSelectedCategory(selectedCategory === "none" ? null : "none")
          }
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            selectedCategory === "none"
              ? "bg-zinc-700/30 border-zinc-600"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#2f2f2f] border border-zinc-700 shadow-sm" />
          <div className="text-left">
            <p className="text-lg font-bold text-zinc-400 leading-none">{countNone}</p>
            <p className="text-xs text-zinc-400 mt-1">Sem movimento</p>
          </div>
        </button>
      </div>
    </div>
  );
}
