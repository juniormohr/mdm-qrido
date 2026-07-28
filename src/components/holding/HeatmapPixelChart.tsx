"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export function HeatmapPixelChart({
  data,
  startDate,
  endDate,
  title = "Mapa de Venda",
  subtitle = "Mapa de calor do movimento diário de vendas",
}: HeatmapPixelChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    sales: number;
    transactions: number;
    level: "high" | "medium" | "low" | "none";
    isInSelectedPeriod: boolean;
  } | null>(null);

  // Parse initial view month based on endDate or current date
  const initialDateObj = endDate ? new Date(endDate + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initialDateObj.getFullYear()) ? new Date().getFullYear() : initialDateObj.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initialDateObj.getMonth()) ? new Date().getMonth() : initialDateObj.getMonth()
  );

  // Map input data by date string for quick lookup
  const dataMap = new Map<string, DailyDataPoint>();
  data.forEach((item) => dataMap.set(item.date, item));

  // Determine max sales volume across dataset for color intensity threshold
  const maxSales = Math.max(...data.map((d) => d.sales), 1);

  // Helper to categorize sales volume
  const getPerformanceLevel = (sales: number, transactions: number): "high" | "medium" | "low" | "none" => {
    if (sales === 0 && transactions === 0) return "none";
    const ratio = sales / maxSales;
    if (ratio >= 0.6) return "high";
    if (ratio >= 0.25) return "medium";
    return "low";
  };

  // Color mapping according to exact Qrido Brand Palette
  const getColor = (level: "high" | "medium" | "low" | "none", isInSelectedPeriod: boolean) => {
    if (!isInSelectedPeriod) {
      return "#e2e8f0"; // Neutral grey for days outside selected period
    }
    switch (level) {
      case "high":
        return "#167657";
      case "medium":
        return "#f7aa1c";
      case "low":
        return "#e9592c";
      case "none":
      default:
        return "#cbd5e1";
    }
  };

  // Calendar logic for viewYear and viewMonth
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Days in previous month to fill grid
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Create grid items
  const calendarCells = [];

  // Previous month padding days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthDate = new Date(viewYear, viewMonth - 1, dayNum);
    const dateStr = prevMonthDate.toISOString().split("T")[0];
    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const monthFormatted = String(viewMonth + 1).padStart(2, "0");
    const dayFormatted = String(dayNum).padStart(2, "0");
    const dateStr = `${viewYear}-${monthFormatted}-${dayFormatted}`;
    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: true,
    });
  }

  // Next month padding days to complete grid rows
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const nextMonthDate = new Date(viewYear, viewMonth + 1, dayNum);
    const dateStr = nextMonthDate.toISOString().split("T")[0];
    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
    });
  }

  // Check if date falls in requested filter range
  const isDateInFilterRange = (dateStr: string) => {
    if (!startDate || !endDate) return true;
    return dateStr >= startDate && dateStr <= endDate;
  };

  // Calculate statistics for counters for current displayed view or filtered dataset
  let countHigh = 0;
  let countMedium = 0;
  let countLow = 0;
  let countNone = 0;

  const processedCells = calendarCells.map((cell) => {
    const item = dataMap.get(cell.dateStr);
    const sales = item ? item.sales : 0;
    const transactions = item ? item.transactions : 0;
    const level = getPerformanceLevel(sales, transactions);
    const isInSelectedPeriod = isDateInFilterRange(cell.dateStr);

    if (cell.isCurrentMonth && isInSelectedPeriod) {
      if (level === "high") countHigh++;
      else if (level === "medium") countMedium++;
      else if (level === "low") countLow++;
      else countNone++;
    }

    return {
      ...cell,
      sales,
      transactions,
      level,
      isInSelectedPeriod,
    };
  });

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Selected date state
  const [selectedDay, setSelectedDay] = useState<{
    dateStr: string;
    sales: number;
    transactions: number;
    level: "high" | "medium" | "low" | "none";
    isInSelectedPeriod: boolean;
  } | null>(null);

  // Calculate monthly totals for the current viewMonth & viewYear
  const monthCellsCurrentMonth = processedCells.filter((c) => c.isCurrentMonth);
  const monthTotalSales = monthCellsCurrentMonth.reduce((acc, curr) => acc + curr.sales, 0);
  const monthTotalTransactions = monthCellsCurrentMonth.reduce((acc, curr) => acc + curr.transactions, 0);

  // Active detail item to display in fixed top bar
  const activeSpecificDay = hoveredDay || selectedDay;

  // Helper to format date string from YYYY-MM-DD to DD-MM-YYYY
  const formatDateBR = (isoDateStr: string) => {
    if (!isoDateStr || !isoDateStr.includes("-")) return isoDateStr;
    const parts = isoDateStr.split("-");
    if (parts.length !== 3) return isoDateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="bg-[#fff5ed] border border-[#fbdcc4] rounded-3xl p-6 sm:p-8 shadow-sm text-slate-800 font-sans max-w-4xl mx-auto transition-all">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#fcd5b8] gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <span className="w-3.5 h-3.5 rounded-full bg-[#167657] inline-block animate-pulse shadow-sm"></span>
            {title}
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-[#fcd5b8] rounded-2xl px-4 py-2 shadow-xs">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-[#fff5ed] text-slate-600 hover:text-slate-900 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[130px]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block leading-none">
              {viewYear}
            </span>
            <span className="text-base font-black text-slate-900 capitalize">
              {MONTH_NAMES[viewMonth]}
            </span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-[#fff5ed] text-slate-600 hover:text-slate-900 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Fixed Info Bar (Displays Month Totals by default, or hovered/selected day details) */}
      <div className="mt-4 bg-white/90 border border-[#fcd5b8] px-5 py-3 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs transition-all">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold text-xs">
            {activeSpecificDay ? "Data:" : "Período:"}
          </span>{" "}
          <strong className="text-slate-800 text-sm font-bold font-mono">
            {activeSpecificDay
              ? formatDateBR(activeSpecificDay.dateStr)
              : `${MONTH_NAMES[viewMonth]} / ${viewYear}`}
          </strong>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 font-semibold">Vendas:</span>{" "}
            <strong className="text-[#167657] font-extrabold text-sm sm:text-base ml-1">
              {(activeSpecificDay ? activeSpecificDay.sales : monthTotalSales).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Transações:</span>{" "}
            <strong className="text-[#f7aa1c] font-extrabold text-sm sm:text-base ml-1">
              {activeSpecificDay ? activeSpecificDay.transactions : monthTotalTransactions}
            </strong>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="py-6">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-3 text-center">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2.5">
          {processedCells.map((cell, idx) => {
            const color = getColor(cell.level, cell.isInSelectedPeriod);
            const isDimmed =
              selectedCategory !== null && selectedCategory !== cell.level;
            const isSelected = selectedDay?.dateStr === cell.dateStr;

            return (
              <div
                key={`${cell.dateStr}-${idx}`}
                onMouseEnter={() => setHoveredDay(cell)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => setSelectedDay(cell)}
                className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-[#167657] bg-emerald-50/80 shadow-sm ring-2 ring-[#167657]/30 scale-105"
                    : !cell.isCurrentMonth
                    ? "opacity-30 border-transparent bg-slate-100/40"
                    : cell.isInSelectedPeriod
                    ? "border-white/60 bg-white/70 shadow-xs hover:shadow-md hover:scale-105"
                    : "border-slate-200/50 bg-slate-100/60"
                } ${isDimmed ? "opacity-25" : ""}`}
              >
                {/* Circle Indicator matching Reference UI */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-transform shadow-xs ${
                    cell.isInSelectedPeriod && cell.level !== "none"
                      ? "text-white"
                      : "text-slate-600"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {cell.dayNum}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="pt-6 border-t border-[#fcd5b8] grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Alto Volume */}
        <button
          onClick={() =>
            setSelectedCategory(selectedCategory === "high" ? null : "high")
          }
          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
            selectedCategory === "high"
              ? "bg-[#167657]/15 border-[#167657] shadow-xs"
              : "bg-white/80 border-[#fcd5b8] hover:border-[#167657]/50"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#167657] shadow-sm" />
          <div className="text-left">
            <p className="text-base font-black text-[#167657] leading-none">{countHigh}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Alto volume</p>
          </div>
        </button>

        {/* Médio Volume */}
        <button
          onClick={() =>
            setSelectedCategory(selectedCategory === "medium" ? null : "medium")
          }
          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
            selectedCategory === "medium"
              ? "bg-[#f7aa1c]/15 border-[#f7aa1c] shadow-xs"
              : "bg-white/80 border-[#fcd5b8] hover:border-[#f7aa1c]/50"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#f7aa1c] shadow-sm" />
          <div className="text-left">
            <p className="text-base font-black text-[#f7aa1c] leading-none">{countMedium}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Médio volume</p>
          </div>
        </button>

        {/* Baixo Volume */}
        <button
          onClick={() =>
            setSelectedCategory(selectedCategory === "low" ? null : "low")
          }
          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
            selectedCategory === "low"
              ? "bg-[#e9592c]/15 border-[#e9592c] shadow-xs"
              : "bg-white/80 border-[#fcd5b8] hover:border-[#e9592c]/50"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#e9592c] shadow-sm" />
          <div className="text-left">
            <p className="text-base font-black text-[#e9592c] leading-none">{countLow}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Baixo volume</p>
          </div>
        </button>

        {/* Sem movimento */}
        <button
          onClick={() =>
            setSelectedCategory(selectedCategory === "none" ? null : "none")
          }
          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
            selectedCategory === "none"
              ? "bg-slate-200 border-slate-400 shadow-xs"
              : "bg-white/80 border-[#fcd5b8] hover:border-slate-400"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#cbd5e1] shadow-sm" />
          <div className="text-left">
            <p className="text-base font-black text-slate-600 leading-none">{countNone}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Sem movimento</p>
          </div>
        </button>
      </div>
    </div>
  );
}

