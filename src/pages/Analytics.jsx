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
    <div className="flex-1 overflow-x-hidden overflow-y-auto bg-surface w-full">
      <div className="max-w-[1920px] mx-auto p-4 md:p-6 flex flex-col gap-4 animate-fade-in">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border-slate pb-4 shrink-0">
          <div>
            <h2 className="font-headline-md text-3xl font-semibold text-text-high-contrast uppercase tracking-widest">
              Performance Analytics
            </h2>
            <p className="font-data-mono-sm text-text-muted mt-1">
              Historical performance, risk dynamics, and edge tracking
            </p>
          </div>
          <div className="flex bg-surface-panel border border-border-slate rounded-sm overflow-hidden p-0.5">
            {['ALL', 'YTD', '90D', '30D', '1W'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 text-xs font-label-caps uppercase transition-colors rounded-sm ${activeFilter === filter
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-text-muted hover:text-text-high-contrast border border-transparent"
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* PRIMARY WORKSPACE (Asymmetric Grid) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-none">
          {/* MAIN PANEL: Chart */}
          <div className="lg:col-span-9 bg-surface-panel border border-border-slate flex flex-col relative rounded-sm shrink-0 min-h-[450px]">
            <div className="border-b border-border-slate/50 px-5 py-4 flex flex-col lg:flex-row justify-between lg:items-center bg-surface-container rounded-t-sm gap-4">
              <h3 className="font-label-caps text-text-high-contrast uppercase border-l-2 border-primary pl-2 tracking-widest text-[13px]">
                Cumulative P&L / Equity
              </h3>

              <div className="flex bg-surface rounded-sm p-0.5 text-[10px] border border-border-slate">
                {['EQUITY', 'P&L', 'DRAWDOWN', 'R-MULTIPLE'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setChartMode(mode)}
                    className={`px-3 py-1.5 uppercase rounded-sm font-bold tracking-widest transition-colors ${chartMode === mode ? 'bg-primary/20 text-primary border border-primary/30' : 'text-text-muted hover:text-text-high-contrast border border-transparent'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 relative p-4 flex flex-col group min-h-[350px]">

              {/* Chart Intelligence Header inside panel */}
              <div className="flex justify-between items-start mb-2 px-2 shrink-0">
                <div className="font-data-mono-md text-4xl font-bold text-text-high-contrast tracking-tight flex items-center gap-4">
                  {chartMode === 'R-MULTIPLE' ? `${formatSigned(formatNumber(currentRr))}R` : formatSigned(formatCurrency(currentEquity))}
                  <span className={`text-sm font-normal px-2 py-1 rounded bg-surface/50 border border-border-slate ${data.summary.netPnl >= 0 ? "text-positive" : "text-negative"}`}>
                    {formatSigned(formatCurrency(data.summary.netPnl))} Net Change
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 font-data-mono-sm text-xs">
                  <div className="flex gap-4">
                    <span className="text-text-muted">Start</span>
                    <span className="text-text-high-contrast w-16 text-right">{formatSigned(formatCurrency(startingValue))}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-text-muted">Peak</span>
                    <span className="text-text-high-contrast w-16 text-right">{formatSigned(formatCurrency(peak))}</span>
                  </div>
                </div>
              </div>

              {/* Chart container */}
              <div className="flex-1 mt-4">
                <EquityChart points={data.equity} mode={chartMode} onSelect={(trade) => onSelectTrade(trade, filteredTrades)} />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Chart Intelligence Stack */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-surface-panel border border-border-slate rounded-sm p-4 flex-1 flex flex-col justify-center shadow-sm">
              <h3 className="font-label-caps text-[11px] font-bold text-text-muted uppercase mb-4 tracking-widest border-b border-border-slate/50 pb-2">
                Execution Stats
              </h3>
              <div className="space-y-4 font-data-mono-sm text-xs font-bold">
                <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                  <span className="text-text-muted font-normal tracking-widest uppercase font-label-caps text-[10px]">Total Trades</span>
                  <span className="text-text-high-contrast">{data.summary.trades}</span>
                </div>
                <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                  <span className="text-text-muted font-normal tracking-widest uppercase font-label-caps text-[10px]">Winning Trades</span>
                  <span className="text-positive">{filteredTrades.filter(t => t.pnl > 0).length}</span>
                </div>
                <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                  <span className="text-text-muted font-normal tracking-widest uppercase font-label-caps text-[10px]">Losing Trades</span>
                  <span className="text-negative">{filteredTrades.filter(t => t.pnl < 0).length}</span>
                </div>
                <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                  <span className="text-text-muted font-normal tracking-widest uppercase font-label-caps text-[10px]">Win Rate</span>
                  <span className="text-primary">{Math.round(data.summary.winRate * 100)}%</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-text-muted font-normal tracking-widest uppercase font-label-caps text-[10px]">Average R</span>
                  <span className="text-text-high-contrast">
                    {data.summary.trades ? formatSigned(formatNumber(filteredTrades.reduce((sum, t) => sum + (Number(t.rr) || 0), 0) / data.summary.trades)) : 0}R
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-surface-panel border border-border-slate rounded-sm p-4 flex-1 flex flex-col justify-center shadow-sm">
              <h3 className="font-label-caps text-[11px] font-bold text-text-muted uppercase mb-4 tracking-widest border-b border-border-slate/50 pb-2">
                Risk & Drawdown
              </h3>
              <div className="space-y-4 font-data-mono-sm text-xs font-bold">
                <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                  <span className="text-text-muted font-normal tracking-widest uppercase font-label-caps text-[10px]">Max Drawdown</span>
                  <span className="text-negative text-sm">{formatSigned(formatCurrency(maxDrawdown))}</span>
                </div>
                <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                  <span className="text-text-muted font-normal tracking-widest uppercase font-label-caps text-[10px]">Current DD</span>
                  <span className="text-text-high-contrast">{formatSigned(formatCurrency(currentDrawdown))}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-text-muted font-normal tracking-widest uppercase font-label-caps text-[10px]">Longest Loss Streak</span>
                  <span className="text-negative">{data.streaks.maxLoss}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-panel border border-border-slate rounded-sm p-4 shadow-sm">
              <h3 className="font-label-caps text-[10px] text-text-high-contrast uppercase mb-2 tracking-widest">
                Performance State
              </h3>
              <div className={`text-[10px] font-data-mono-sm p-2 rounded border ${data.summary.netPnl >= 0 ? "bg-positive/10 border-positive/30 text-positive" : "bg-negative/10 border-negative/30 text-negative"}`}>
                {data.summary.netPnl >= 0 ? "System is currently profitable and functioning near expected baseline." : "System is in a drawdown phase. Ensure risk thresholds are not being breached."}
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM TABLES: Performance Breakdowns */}
        <section className="bg-surface border border-border-slate rounded-sm flex flex-col flex-1 shrink-0 overflow-hidden min-h-[400px]">
          <div className="border-b border-border-slate p-4 bg-surface-panel flex items-center">
            <h3 className="font-label-caps text-[13px] text-text-high-contrast uppercase border-l-2 border-primary pl-2 tracking-widest">
              Distribution & Breakdowns
            </h3>
          </div>
          <div className="flex-1 p-5 overflow-y-auto no-scrollbar grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 bg-surface-panel shadow-sm">
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
            <PerformanceTable
              title="Rules Adherence"
              rows={data.rules}
              onSelect={(rulesFollowed) =>
                onFilterTrades({
                  rules: rulesFollowed.toLowerCase().startsWith("yes") ? "yes" : "no",
                })
              }
            />
            <PerformanceTable title="Risk Distribution" rows={data.money} />
          </div>
        </section>
      </div>
    </div>
  );
}

export default Analytics;
