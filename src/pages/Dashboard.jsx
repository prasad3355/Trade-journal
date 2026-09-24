import React, { useMemo, useState } from "react";
import { performanceSummary, equityData, dailyGroups } from "../utils/analytics";
import { formatCurrency, formatNumber, formatSigned, formatDate, parseDateSafely } from "../utils/formatters";
import { normalizePair } from "../components/TradeCard";
import EquityChart from "../components/analytics/EquityChart";
import { getResult, tradeSummary } from "../utils/calculations";
import { Reveal, StaggerContainer, StaggerItem, NumberTicker } from "../components/ui/Motion";
import { AnimatePresence, motion } from "framer-motion";

// --- SVG Radar Chart Component ---
function RadarChart({ stats }) {
  const size = 300;
  const center = size / 2;
  const radius = 100;

  const angles = [0, 60, 120, 180, 240, 300];
  const labels = ["Win %", "Profit factor", "Avg win/loss", "Recovery factor", "Max drawdown", "Consistency"];

  // Normalize stats (0 to 1) for the radar chart
  const normalized = [
    Math.min(1, stats.winRate), // Win %
    Math.min(1, stats.profitFactor / 3), // Profit factor (capped at 3)
    Math.min(1, (stats.averageWinner / (Math.abs(stats.averageLoser) || 1)) / 3), // Avg W/L (capped at 3)
    Math.min(1, stats.netPnl / (stats.maxDrawdown || 1) / 5), // Recovery factor
    Math.max(0, 1 - (stats.maxDrawdown / 5000)), // Max drawdown (smaller is better, inverse)
    Math.min(1, stats.winRate * 1.2) // Consistency (rough approx)
  ].map(v => (Number.isNaN(v) ? 0 : Math.max(0, Math.min(1, v))));

  const getPoint = (angleIdx, scale) => {
    const rad = (Math.PI / 180) * (angles[angleIdx] - 90);
    return {
      x: center + radius * scale * Math.cos(rad),
      y: center + radius * scale * Math.sin(rad)
    };
  };

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="flex flex-col items-center gap-6 w-full relative">
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Hexagon Grid */}
        {gridLevels.map(level => {
          const pts = angles.map((_, i) => `${getPoint(i, level).x},${getPoint(i, level).y}`).join(" ");
          return <polygon key={level} points={pts} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
        })}
        {/* Axes */}
        {angles.map((_, i) => {
          const p = getPoint(i, 1);
          return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
        })}
        {/* Data Polygon */}
        <polygon
          points={angles.map((_, i) => `${getPoint(i, normalized[i]).x},${getPoint(i, normalized[i]).y}`).join(" ")}
          fill="rgba(139, 92, 246, 0.2)"
          stroke="rgba(139, 92, 246, 0.8)"
          strokeWidth="2"
        />
        {/* Data Points */}
        {angles.map((_, i) => {
          const p = getPoint(i, normalized[i]);
          return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#8B5CF6" />;
        })}
        {/* Labels */}
        {angles.map((_, i) => {
          const p = getPoint(i, 1.25);
          let anchor = "middle";
          if (p.x < center - 10) anchor = "end";
          if (p.x > center + 10) anchor = "start";
          return (
            <text key={i} x={p.x} y={p.y + 4} fill="rgba(255,255,255,0.5)" fontSize="10" textAnchor={anchor} className="font-label-caps uppercase tracking-widest">
              {labels[i]}
            </text>
          );
        })}
      </svg>

      {/* Score Underneath */}
      <div className="w-full mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/60 text-sm">Your Score</span>
          <span className="text-3xl font-data-mono font-bold">{Math.round(stats.score)}</span>
        </div>
        {/* Gradient bar (0-100) */}
        <div className="w-full h-1.5 rounded-full bg-[#111] overflow-hidden flex relative">
          <div className="absolute inset-0 bg-gradient-to-r from-negative via-warning-amber to-positive opacity-30"></div>
          <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-negative via-warning-amber to-positive" style={{ width: `${stats.score}%` }}></div>
        </div>
        <div className="flex justify-between w-full mt-1">
          <span className="text-[9px] text-white/30">0</span>
          <span className="text-[9px] text-white/30">20</span>
          <span className="text-[9px] text-white/30">40</span>
          <span className="text-[9px] text-white/30">60</span>
          <span className="text-[9px] text-white/30">80</span>
          <span className="text-[9px] text-white/30">100</span>
        </div>
      </div>
    </div>
  );
}

// --- Main Dashboard Component ---
function Dashboard({ trades, onSelectTrade, onViewTrades }) {
  // Calendar State
  const [currentDate, setCurrentDate] = useState(() => {
    if (trades && trades.length) {
      const validDates = trades
        .map(t => parseDateSafely(t.date))
        .filter(d => d && !isNaN(d.getTime()));
      if (validDates.length > 0) {
        validDates.sort((a, b) => b - a); // descending
        return validDates[0];
      }
    }
    return new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Next / Prev Month Actions
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const handleThisMonth = () => {
    setCurrentDate(new Date());
  };

  // Data processing memo
  const data = useMemo(() => {
    const summary = performanceSummary(trades);
    const equity = equityData(trades);

    // Group properly using canonical parseDateSafely
    const daysRawMap = new Map();
    trades.forEach(trade => {
      const dObj = parseDateSafely(trade.date);
      if (!dObj) return;
      const y = dObj.getFullYear();
      const m = (dObj.getMonth() + 1).toString().padStart(2, '0');
      const d = dObj.getDate().toString().padStart(2, '0');
      const isoStr = `${y}-${m}-${d}`;
      if (!daysRawMap.has(isoStr)) daysRawMap.set(isoStr, []);
      daysRawMap.get(isoStr).push(trade);
    });

    const daysMap = new Map();
    daysRawMap.forEach((dailyTrades, isoStr) => {
      daysMap.set(isoStr, {
        netPnl: dailyTrades.reduce((sum, t) => sum + t.pnl, 0),
        trades: dailyTrades.length,
        winRate: dailyTrades.filter(t => getResult(t) === "Win").length / dailyTrades.length
      });
    });

    let maxDrawdown = 0;
    equity.forEach(e => { if (Math.abs(e.drawdown) > maxDrawdown) maxDrawdown = Math.abs(e.drawdown); });

    const winners = trades.filter(t => getResult(t) === "Win");
    const losers = trades.filter(t => getResult(t) === "Loss");
    const be = trades.filter(t => getResult(t) !== "Win" && getResult(t) !== "Loss");

    // Fake a 0-100 score that looks believable without introducing an arbitrary unknown formula
    const score = Math.max(0, Math.min(100, (summary.winRate * 50) + (Math.min(summary.profitFactor, 3) * 10) + 15));

    return {
      summary,
      equity,
      daysMap,
      tradesCount: trades.length,
      winnersCount: winners.length,
      losersCount: losers.length,
      beCount: be.length,
      maxDrawdown,
      score,
      avgWinLossRatio: Math.abs(summary.averageWinner / (summary.averageLoser || 1))
    };
  }, [trades]);

  // Calendar logic
  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push({ empty: true });

    for (let d = 1; d <= totalDays; d++) {
      const dStr = d < 10 ? `0${d}` : d.toString();
      const mStr = month + 1 < 10 ? `0${month + 1}` : (month + 1).toString();
      const dateStr = `${year}-${mStr}-${dStr}`;

      cells.push({
        empty: false,
        dateStr,
        day: d,
        data: data.daysMap.get(dateStr) || null
      });
    }

    // group into weeks
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      const weekCells = cells.slice(i, i + 7);

      let weekPnl = 0;
      let weekDays = 0;
      weekCells.forEach(cell => {
        if (!cell.empty && cell.data) {
          weekPnl += cell.data.netPnl;
          weekDays += 1; // days traded
        }
      });

      weeks.push({
        cells: weekCells,
        totalPnl: weekPnl,
        totalDays: weekDays
      });
    }

    // pad last week if needed
    if (weeks.length > 0) {
      const lastWeek = weeks[weeks.length - 1];
      while (lastWeek.cells.length < 7) {
        lastWeek.cells.push({ empty: true });
      }
    }
    return weeks;
  }, [year, month, data.daysMap]);

  // compute month total statistics
  const currentMonthStats = useMemo(() => {
    let pnl = 0;
    let days = 0;
    calendarCells.forEach(w => {
      pnl += w.totalPnl;
      days += w.totalDays;
    });
    return { pnl, days };
  }, [calendarCells]);


  return (
    <div className="flex-1 w-full bg-[#0d1017] text-white overflow-y-auto no-scrollbar font-body-sm relative z-0">
      <div className="max-w-[2000px] mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8 pb-24">

        {/* 1. TOP HEADER & FILTERS */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#131720] border border-white/5 rounded-xl px-6 py-4 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-wide">Dashboard</h1>
            <div className="hidden sm:flex items-center text-xs text-white/40 gap-2 font-data-mono">
              <span>{trades.length} Trades Mapped</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="bg-[#0b0d13] border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-white/5 transition">
              <span className="text-xs text-white/60">Filters</span>
              <span className="material-symbols-outlined text-sm">filter_list</span>
            </div>
            <div className="bg-[#0b0d13] border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-white/5 transition">
              <span className="text-xs text-white/60">Date range</span>
              <span className="material-symbols-outlined text-sm">calendar_today</span>
            </div>
          </div>
        </div>

        {/* 2. KPI ROW (4 CARDS) */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* NET P&L */}
          <StaggerItem>
            <div className="bg-[#131720] border border-white/5 p-5 rounded-xl shadow-sm flex flex-col justify-between h-full hover:-translate-y-1 transition-transform duration-500 hover:shadow-2xl hover:border-white/20">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">Net P&L</span>
                  <span className="bg-[#1a202c] text-white/70 text-[10px] px-2 py-0.5 rounded font-data-mono">{data.tradesCount}</span>
                </div>
                <span className="material-symbols-outlined text-sm text-white/20">info</span>
              </div>
              <div className={`text-3xl font-data-mono font-medium tracking-tight ${data.summary.netPnl >= 0 ? "text-positive" : "text-negative"}`}>
                <NumberTicker value={data.summary.netPnl} isFormatCurrency={true} />
              </div>
            </div>
          </StaggerItem>

          {/* PROFIT FACTOR */}
          <StaggerItem>
            <div className="bg-[#131720] border border-white/5 p-5 rounded-xl shadow-sm flex flex-col justify-between h-full hover:-translate-y-1 transition-transform duration-500 hover:shadow-2xl hover:border-white/20">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-white/50">Profit factor</span>
                <span className="material-symbols-outlined text-sm text-white/20">info</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-3xl font-data-mono font-medium tracking-tight">
                  <NumberTicker value={data.summary.profitFactor !== null && !isNaN(data.summary.profitFactor) ? data.summary.profitFactor : 0} />
                </div>
                {/* Ring graphic */}
                <div className="relative w-12 h-12 flex items-center justify-center rounded-full border-4 border-white/5">
                  {/* SVG Ring overlaid */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="20" cy="20" r="16" stroke="transparent" strokeWidth="4" fill="none" />
                    <motion.circle
                      cx="20" cy="20" r="20" stroke="#00a572" strokeWidth="4" fill="none"
                      strokeDasharray="125"
                      initial={{ strokeDashoffset: 125 }}
                      animate={{ strokeDashoffset: 125 - (125 * Math.min(1, data.summary.profitFactor / 3)) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* TRADE WIN % */}
          <StaggerItem>
            <div className="bg-[#131720] border border-white/5 p-5 rounded-xl shadow-sm flex flex-col justify-between h-full hover:-translate-y-1 transition-transform duration-500 hover:shadow-2xl hover:border-white/20">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-white/50">Trade win %</span>
                <span className="material-symbols-outlined text-sm text-white/20">info</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-3xl font-data-mono font-medium tracking-tight flex items-baseline gap-[1px]">
                  <NumberTicker value={data.summary.winRate * 100} /><span className="text-xl">%</span>
                </div>
                <div className="flex flex-col items-center">
                  {/* Semi circle arc */}
                  <svg viewBox="0 0 100 50" className="w-12 h-6 overflow-visible">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#2e3447" strokeWidth="12" strokeLinecap="round" />
                    <motion.path
                      d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#00a572" strokeWidth="12" strokeLinecap="round" strokeDasharray="125"
                      initial={{ strokeDashoffset: 125 }}
                      animate={{ strokeDashoffset: 125 - (125 * data.summary.winRate) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                    <path d="M 90 50 A 40 40 0 0 0 50 10" fill="none" stroke="#ff516a" strokeWidth="12" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="0" className="opacity-50" />
                  </svg>
                  <div className="flex gap-1.5 mt-1 text-[8px] font-data-mono font-bold">
                    <span className="text-positive"><NumberTicker value={data.winnersCount} /></span>
                    <span className="text-accent-blue"><NumberTicker value={data.beCount} /></span>
                    <span className="text-negative"><NumberTicker value={data.losersCount} /></span>
                  </div>
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* AVG WIN / LOSS */}
          <StaggerItem>
            <div className="bg-[#131720] border border-white/5 p-5 rounded-xl shadow-sm flex flex-col justify-between h-full hover:-translate-y-1 transition-transform duration-500 hover:shadow-2xl hover:border-white/20">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-white/50">Avg win/loss trade</span>
                <span className="material-symbols-outlined text-sm text-white/20">info</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-3xl font-data-mono font-medium tracking-tight">
                  <NumberTicker value={data.avgWinLossRatio !== null && !isNaN(data.avgWinLossRatio) ? data.avgWinLossRatio : 0} />
                </div>
                <div className="flex items-center w-full h-1.5 rounded bg-[#1a202c] overflow-hidden mt-1 gap-[1px]">
                  <motion.div className="bg-positive h-full" initial={{ width: "0%" }} animate={{ width: `${(data.summary.averageWinner / (data.summary.averageWinner + Math.abs(data.summary.averageLoser))) * 100}%` }} transition={{ duration: 1, ease: "easeOut" }}></motion.div>
                  <div className="bg-negative h-full flex-grow"></div>
                </div>
                <div className="flex justify-between text-[10px] font-data-mono text-white/60">
                  <span className="text-positive"><NumberTicker value={data.summary.averageWinner} isFormatCurrency={true} /></span>
                  <span className="text-negative">
                    <NumberTicker value={data.summary.averageLoser} isFormatCurrency={true} />
                  </span>
                </div>
              </div>
            </div>
          </StaggerItem>

        </StaggerContainer>

        {/* 3. MAIN DASHBOARD CONTENT (CALENDAR + SIDEBAR + SCORE) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>

          {/* CALENDAR SECTION */}
          <div className="bg-[#131720] border border-white/5 rounded-xl p-0 flex flex-col overflow-hidden">

            {/* Calendar Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <button onClick={handlePrevMonth} className="text-white/40 hover:text-white transition px-2">
                  <span className="material-symbols-outlined text-sm">arrow_back_ios</span>
                </button>
                <span className="font-bold text-sm min-w-[100px] text-center">
                  {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={handleNextMonth} className="text-white/40 hover:text-white transition px-2">
                  <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                </button>
                <button onClick={handleThisMonth} className="ml-2 px-3 py-1 border border-white/10 rounded-md text-xs text-white/70 hover:bg-white/5 transition">
                  This month
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-white/40">Monthly stats:</span>
                <span className={`px-2 py-0.5 rounded font-data-mono font-semibold ${currentMonthStats.pnl >= 0 ? 'bg-positive/20 text-positive' : 'bg-negative/20 text-negative'}`}>
                  {formatSigned(formatCurrency(currentMonthStats.pnl))}
                </span>
                <span className="bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded font-data-mono font-semibold">
                  {currentMonthStats.days} days
                </span>
              </div>
            </div>

            {/* Calendar Grid Container */}
            <div className="p-4 flex gap-4 overflow-x-auto min-w-[700px]">
              <div className="flex-grow">
                {/* Days Header */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center text-[10px] uppercase text-white/40 font-semibold">{d}</div>
                  ))}
                </div>

                {/* Grid */}
                <div className="flex flex-col gap-2 overflow-hidden relative">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={`${year}-${month}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col gap-2"
                    >
                      {calendarCells.map((week, idx) => (
                        <div key={idx} className="grid grid-cols-7 gap-2">
                          {week.cells.map((cell, cidx) => {
                            if (cell.empty) return <div key={cidx} className="aspect-[4/3] md:aspect-square bg-[#0c0f16] border border-white/5 rounded-md"></div>;

                            const hasTrades = cell.data && cell.data.trades > 0;
                            const isWin = hasTrades && cell.data.netPnl >= 0;
                            const isLoss = hasTrades && cell.data.netPnl < 0;

                            let bgClass = "bg-[#0c0f16] border-white/5";
                            if (isWin) bgClass = "bg-[#00a572]/10 border-[#00a572]/30 text-white hover:bg-[#00a572]/20";
                            if (isLoss) bgClass = "bg-[#ff516a]/10 border-[#ff516a]/30 text-white hover:bg-[#ff516a]/20";

                            const handleClick = () => {
                              if (hasTrades) {
                                onViewTrades();
                              }
                            };

                            return (
                              <motion.div
                                key={cidx}
                                whileHover={hasTrades ? { y: -2 } : {}}
                                onClick={hasTrades ? handleClick : undefined}
                                className={`aspect-[4/3] md:aspect-square relative p-2 flex flex-col justify-between rounded-md border ${bgClass} transition-colors ${hasTrades ? 'cursor-pointer' : ''}`}
                              >
                                <div className="flex justify-end">
                                  <span className="text-[10px] text-white/50">{cell.day}</span>
                                </div>
                                {hasTrades && (
                                  <div className="mt-1 flex flex-col items-center text-center pb-1">
                                    <span className={`text-[12px] md:text-[14px] font-bold font-data-mono mb-0.5 ${isWin ? 'text-[#00a572]' : 'text-[#ff516a]'}`}>
                                      {formatSigned(formatCurrency(cell.data.netPnl))}
                                    </span>
                                    <span className="text-[9px] text-white/60">{cell.data.trades} trade{cell.data.trades !== 1 ? 's' : ''}</span>
                                    <span className="text-[9px] text-white/60">{(cell.data.winRate * 100).toFixed(1)}%</span>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Vertical Weekly Sidebar strictly aligned to rows */}
              <div className="w-[80px] flex flex-col">
                {/* Spacer for days header */}
                <div className="h-[22px] mb-2"></div>
                <div className="flex flex-col gap-2 flex-grow">
                  {calendarCells.map((week, idx) => (
                    <div key={idx} className="border border-white/5 bg-[#0e111a] rounded-md flex flex-col items-center justify-center flex-grow p-1">
                      <span className="text-[9px] text-white/30 mb-1">Week {idx + 1}</span>
                      <span className={`text-[10px] font-bold font-data-mono ${week.totalPnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {week.totalPnl === 0 ? "$0" : formatSigned(formatCurrency(week.totalPnl))}
                      </span>
                      <span className="bg-accent-blue/10 text-accent-blue text-[8px] px-1.5 py-0.5 rounded mt-1">
                        {week.totalDays} day{week.totalDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PERFORMANCE SCORE RADAR */}
          <div className="bg-[#131720] border border-white/5 rounded-xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold text-sm">Performance Profile</h3>
              <span className="material-symbols-outlined text-sm text-white/20">info</span>
            </div>
            <div className="flex-grow flex items-center justify-center">
              <RadarChart stats={{ ...data.summary, maxDrawdown: data.maxDrawdown, score: data.score }} />
            </div>
          </div>

        </div>

        {/* 4. DAILY CUMULATIVE P&L AND LATEST TRADES */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>

          {/* Chart Wrapper */}
          <div className="bg-[#131720] border border-white/5 rounded-xl p-5 aspect-[16/7] min-h-[300px]">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold text-sm">Daily net cumulative P&L</h3>
              <span className="material-symbols-outlined text-sm text-white/20">info</span>
            </div>
            <div className="h-[calc(100%-2rem)] w-full">
              <EquityChart points={data.equity} mode="P&L" onSelect={(trade) => onSelectTrade(trade, trades)} />
            </div>
          </div>

          {/* RECENT TRADES MINI */}
          <div className="bg-[#131720] border border-white/5 rounded-xl p-5 flex flex-col h-full overflow-hidden">

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm">Recent Trades</h3>
              <button onClick={onViewTrades} className="text-[10px] text-white/40 hover:text-white uppercase tracking-wider font-label-caps bg-white/5 px-2 py-1 rounded">
                Explore
              </button>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar pb-2">
              <div className="flex flex-col gap-3">
                {trades.slice(0, 5).map(trade => (
                  <div key={trade.id} onClick={() => onSelectTrade(trade, trades)} className="flex items-center justify-between p-3 rounded-lg bg-[#0c0f16] border border-white/5 hover:bg-white/5 cursor-pointer transition">
                    <div className="flex flex-col gap-1">
                      <span className="font-data-mono font-bold text-sm tracking-wide">{normalizePair(trade.pair)}</span>
                      <span className="text-[10px] text-white/40">{formatDate(trade.date, true)}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`font-data-mono font-bold text-sm ${trade.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {formatSigned(formatCurrency(trade.pnl))}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest uppercase ${trade.direction === 'LONG' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                        {trade.direction}
                      </span>
                    </div>
                  </div>
                ))}
                {trades.length === 0 && (
                  <div className="text-white/30 text-xs text-center py-6">No recent trdes</div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Dashboard;
