import React, { useMemo, useState } from "react";
import EquityChart from "../components/analytics/EquityChart";
import PerformanceTable from "../components/analytics/PerformanceTable";
import {
  dailyGroups,
  equityData,
  groupedPerformance,
  monthGroups,
  performanceSummary,
  streakStats,
} from "../utils/analytics";
import {
  formatCurrency,
  formatNumber,
  formatSigned,
  formatDate,
} from "../utils/formatters";

function Analytics({ trades, onSelectTrade, onFilterTrades }) {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [chartMode, setChartMode] = useState("P&L"); // EQUITY, DRAWDOWN, P&L, R-MULTIPLE

  const filteredTrades = useMemo(() => {
    const now = new Date();
    let cutoff = new Date(0);
    switch (activeFilter) {
      case '1W': cutoff.setDate(now.getDate() - 7); break;
      case '1M':
      case '30D': cutoff.setDate(now.getDate() - 30); break;
      case '90D':
      case '3M': cutoff.setDate(now.getDate() - 90); break;
      case 'YTD': cutoff = new Date(now.getFullYear(), 0, 1); break;
    }
    return activeFilter === 'ALL' ? trades : trades.filter(t => new Date(t.date) >= cutoff);
  }, [trades, activeFilter]);

  const data = useMemo(
    () => ({
      summary: performanceSummary(filteredTrades),
      equity: equityData(filteredTrades),
      setups: groupedPerformance(filteredTrades, "setup"),
      pairs: groupedPerformance(filteredTrades, "pair"),
      directions: groupedPerformance(filteredTrades, "direction"),
      rules: groupedPerformance(filteredTrades, "rulesFollowed"),
      money: groupedPerformance(filteredTrades, "moneyManagement"),
      months: monthGroups(filteredTrades),
      days: dailyGroups(filteredTrades),
      streaks: streakStats(filteredTrades),
    }),
    [filteredTrades],
  );

  const maxDrawdown = Math.min(0, ...data.equity.map((point) => point.drawdown)) || 0;

  // Calculate Peak
  const allCumulatives = data.equity.map(p => p.cumulative);
  const peak = Math.max(0, ...allCumulatives) || 0;

  const currentEquity = data.equity[data.equity.length - 1]?.cumulative || 0;
  const currentDrawdown = data.equity[data.equity.length - 1]?.drawdown || 0;

  const currentRr = data.equity[data.equity.length - 1]?.cumulativeRr || 0;

  const startingValue = 0; // Cumulative P&L starts at 0

  return (
    <div className="flex-1 w-full relative z-0 bg-[#0a0a0b] text-white overflow-y-auto">
      <div className="max-w-[2000px] mx-auto p-8 space-y-12 pb-24">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-white/10 pb-8 animate-fade-in-up">
          <div>
            <h2 className="font-headline-md text-4xl md:text-5xl font-black tracking-tight mb-2">
              Analytics.
            </h2>
            <p className="text-white/50 text-lg font-light tracking-wide">
              Deep dive into system logic.
            </p>
          </div>
          <div className="flex bg-[#111] rounded-full p-1 border border-white/5">
            {['ALL', 'YTD', '90D', '30D', '1W'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-5 py-2 text-xs font-label-caps uppercase rounded-full transition-all ${activeFilter === filter
                  ? "bg-white text-black font-bold shadow-lg"
                  : "text-white/50 hover:text-white"
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* PRIMARY WORKSPACE */}
        <section className="animate-fade-in-up">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

            {/* LEFT: Stats */}
            <div className="lg:col-span-4 space-y-12">
              <div>
                <h3 className="text-xs font-label-caps tracking-widest uppercase text-white/40 mb-6 border-b border-white/10 pb-3">
                  Aggregated Edge
                </h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center group">
                    <span className="text-sm font-light text-white/70 group-hover:text-white transition-colors">Executions</span>
                    <span className="font-data-mono text-sm tracking-wide text-white">{data.summary.trades}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-sm font-light text-white/70 group-hover:text-white transition-colors">Win Rate</span>
                    <span className="font-data-mono text-sm tracking-wide text-primary">{Math.round(data.summary.winRate * 100)}%</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-sm font-light text-white/70 group-hover:text-white transition-colors">Cumulative RR</span>
                    <span className="font-data-mono text-sm tracking-wide text-white">
                      {data.summary.trades ? formatSigned(formatNumber(filteredTrades.reduce((sum, t) => sum + (Number(t.rr) || 0), 0))) : 0}R
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-label-caps tracking-widest uppercase text-white/40 mb-6 border-b border-white/10 pb-3">
                  Risk Profile
                </h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center group">
                    <span className="text-sm font-light text-white/70 group-hover:text-white transition-colors">Max Drawdown</span>
                    <span className="font-data-mono text-sm tracking-wide text-negative">{formatSigned(formatCurrency(maxDrawdown))}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-sm font-light text-white/70 group-hover:text-white transition-colors">Current DD</span>
                    <span className="font-data-mono text-sm tracking-wide text-white">{formatSigned(formatCurrency(currentDrawdown))}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-sm font-light text-white/70 group-hover:text-white transition-colors">Max Consecutive Loss</span>
                    <span className="font-data-mono text-sm tracking-wide text-negative">{data.streaks.maxLoss}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Main Chart */}
            <div className="lg:col-span-8">
              <div className="flex flex-col sm:flex-row justify-between sm:items-baseline mb-6 border-b border-white/10 pb-3 gap-4">
                <h3 className="text-xs font-label-caps tracking-widest uppercase text-white/40">
                  Equity Curve
                </h3>

                <div className="flex gap-4">
                  {['EQUITY', 'P&L', 'DRAWDOWN', 'R-MULTIPLE'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setChartMode(mode)}
                      className={`text-[10px] uppercase font-label-caps tracking-widest transition-colors ${chartMode === mode ? 'text-primary border-b border-primary pb-1' : 'text-white/30 hover:text-white'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[400px]">
                <div className="flex justify-between items-start mb-6 shrink-0">
                  <div className="font-data-mono text-4xl font-light tracking-tight flex items-center gap-4 text-white">
                    {chartMode === 'R-MULTIPLE' ? `${formatSigned(formatNumber(currentRr))}R` : formatSigned(formatCurrency(currentEquity))}
                    <span className={`text-sm font-normal px-2 py-1 rounded bg-[#111] border border-white/5 ${data.summary.netPnl >= 0 ? "text-positive" : "text-negative"}`}>
                      {formatSigned(formatCurrency(data.summary.netPnl))} Net Change
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 font-data-mono text-xs opacity-50">
                    <div className="flex gap-4">
                      <span>Start</span>
                      <span className="w-16 text-right">{formatSigned(formatCurrency(startingValue))}</span>
                    </div>
                    <div className="flex gap-4">
                      <span>Peak</span>
                      <span className="w-16 text-right">{formatSigned(formatCurrency(peak))}</span>
                    </div>
                  </div>
                </div>

                <div className="h-[350px] w-full mt-4">
                  <EquityChart points={data.equity} mode={chartMode} onSelect={(trade) => onSelectTrade(trade, filteredTrades)} />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* BOTTOM: Breakdowns */}
        <section className="animate-fade-in-up border-t border-white/10 pt-12" style={{ animationDelay: '150ms' }}>
          <h3 className="text-xs font-label-caps tracking-widest uppercase text-white/40 mb-8 border-b border-white/10 pb-3 inline-block">
            Distribution Matrices
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12 lg:gap-16">
            <PerformanceTable
              title="Setup Edge"
              rows={data.setups}
              onSelect={(setup) => onFilterTrades({ setup })}
            />
            <PerformanceTable
              title="Instrument Performance"
              rows={data.pairs}
              onSelect={(pair) => onFilterTrades({ pair })}
            />
            <PerformanceTable
              title="Directional Bias"
              rows={data.directions}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export default Analytics;
