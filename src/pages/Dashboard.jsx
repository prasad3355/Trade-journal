import { useMemo, useState } from "react";
import {
  performanceSummary,
  equityData,
  dailyGroups,
  groupedPerformance,
  streakStats
} from "../utils/analytics";
import {
  formatCurrency,
  formatNumber,
  formatSigned,
  formatDate,
} from "../utils/formatters";

function Dashboard({ trades, onSelectTrade, onViewTrades }) {
  const [activeFilter, setActiveFilter] = useState("ALL");

  const filteredTrades = useMemo(() => {
    const now = new Date();
    let cutoff = new Date(0);
    switch (activeFilter) {
      case '1W': cutoff.setDate(now.getDate() - 7); break;
      case '1M': cutoff.setMonth(now.getMonth() - 1); break;
      case '3M': cutoff.setMonth(now.getMonth() - 3); break;
      case 'YTD': cutoff = new Date(now.getFullYear(), 0, 1); break;
    }
    return activeFilter === 'ALL' ? trades : trades.filter(t => new Date(t.date) >= cutoff);
  }, [trades, activeFilter]);

  const data = useMemo(() => {
    const winners = filteredTrades.filter(t => t.pnl > 0);
    const losers = filteredTrades.filter(t => t.pnl < 0);
    const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));

    return {
      summary: performanceSummary(filteredTrades),
      equity: equityData(filteredTrades),
      days: dailyGroups(filteredTrades),
      setups: groupedPerformance(filteredTrades, 'setup'),
      sessions: groupedPerformance(filteredTrades, 'session'),
      instruments: groupedPerformance(filteredTrades, 'pair'),
      streaks: streakStats(filteredTrades),
      grossProfit,
      grossLoss,
      winnersCount: winners.length,
      losersCount: losers.length
    };
  }, [filteredTrades]);

  const maxDrawdown = Math.min(0, ...data.equity.map((p) => p.drawdown));
  const currentDrawdown = data.equity.length ? data.equity[data.equity.length - 1].drawdown : 0;

  const rulesAdherenceCount = filteredTrades.filter((t) => t.rulesFollowed?.toLowerCase().startsWith("yes")).length;
  const rulesAdherencePct = filteredTrades.length ? Math.round((rulesAdherenceCount / filteredTrades.length) * 100) : 0;

  // KPIs
  const expectancy = data.summary.trades > 0
    ? (data.summary.winRate * (data.summary.averageWinner || 0)) - ((1 - data.summary.winRate) * Math.abs(data.summary.averageLoser || 0))
    : 0;

  const avgR = filteredTrades.length
    ? filteredTrades.reduce((sum, t) => sum + (Number(t.rr) || 0), 0) / filteredTrades.length
    : 0;

  const calculateAvgR = (tradeList) => {
    if (!tradeList || tradeList.length === 0) return 0;
    return tradeList.reduce((sum, t) => sum + (Number(t.rr) || 0), 0) / tradeList.length;
  };

  const bestSetup = data.setups.length > 0 ? data.setups[0].label : "—";
  const bestSession = data.sessions.length > 0 ? data.sessions[0].label : "—";
  const bestInstrument = data.instruments.length > 0 ? data.instruments[0].label : "—";

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysPnl = data.days.find(d => d.date === todayStr)?.netPnl || 0;

  // Donut data
  const longs = filteredTrades.filter(t => t.direction?.toLowerCase() === "long");
  const shorts = filteredTrades.filter(t => t.direction?.toLowerCase() === "short");
  const longPct = filteredTrades.length ? Math.round((longs.length / filteredTrades.length) * 100) : 0;
  const shortPct = filteredTrades.length ? Math.round((shorts.length / filteredTrades.length) * 100) : 0;
  const longPnl = longs.reduce((sum, t) => sum + t.pnl, 0);
  const shortPnl = shorts.reduce((sum, t) => sum + t.pnl, 0);

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto w-full relative z-0 bg-surface">
      <div className="max-w-[1920px] mx-auto p-4 md:p-6 space-y-4">

        {/* HEADER & FILTER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-headline-md text-headline-md text-text-high-contrast uppercase font-bold tracking-tight">Traders Command Center</h1>
            <p className="text-text-muted text-xs uppercase tracking-wider mt-1 flex items-center gap-2">
              Live intelligence & Current State
            </p>
          </div>
          <div className="flex bg-surface-panel border border-border-slate rounded-md overflow-hidden p-0.5">
            {['ALL', 'YTD', '3M', '1M', '1W'].map(filter => (
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

        {/* 1. KPI COMMAND STRIP (10 items) */}
        <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-2 md:gap-3">
          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 relative overflow-hidden flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Net P&L</div>
            <div className={`font-data-mono-lg text-xl ${data.summary.netPnl >= 0 ? "text-positive" : "text-negative"}`}>
              {formatSigned(formatCurrency(data.summary.netPnl))}
            </div>
            <div className="text-[10px] text-positive mt-1">+{formatNumber(Math.abs(data.summary.netPnl / (data.summary.trades || 1)))} Avg</div>
          </div>

          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Win Rate</div>
            <div className="font-data-mono-lg text-xl text-text-high-contrast">
              {Math.round(data.summary.winRate * 100)}%
            </div>
            <div className="text-[10px] text-text-muted mt-1">{data.winnersCount}W / {data.losersCount}L</div>
          </div>

          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Profit Factor</div>
            <div className="font-data-mono-lg text-xl text-text-high-contrast">
              {formatNumber(data.summary.profitFactor)}
            </div>
            <div className="text-[10px] text-text-muted mt-1 truncate">Gr: {formatCurrency(data.grossProfit)}</div>
          </div>

          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Expectancy</div>
            <div className={`font-data-mono-lg text-xl ${expectancy >= 0 ? "text-positive" : "text-negative"}`}>
              {formatSigned(formatCurrency(expectancy))}
            </div>
            <div className="text-[10px] text-text-muted mt-1">Per Trade</div>
          </div>

          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Avg R</div>
            <div className="font-data-mono-lg text-xl text-text-high-contrast">
              {formatNumber(avgR)}R
            </div>
            <div className="text-[10px] text-text-muted mt-1">R Multiple</div>
          </div>

          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Max Drawdown</div>
            <div className="font-data-mono-lg text-xl text-negative">
              {formatSigned(formatCurrency(maxDrawdown))}
            </div>
            <div className="text-[10px] text-text-muted mt-1">Peak to Trough</div>
          </div>

          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Execution Total</div>
            <div className="font-data-mono-lg text-xl text-text-high-contrast">
              {data.summary.trades}
            </div>
            <div className="text-[10px] text-text-muted mt-1">Logged</div>
          </div>

          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Best Execution</div>
            <div className="font-data-mono-lg text-xl text-positive">
              {data.summary.best ? formatSigned(formatCurrency(data.summary.best.pnl)) : '—'}
            </div>
            <div className="text-[10px] text-text-muted mt-1 truncate">{data.summary.best?.pair || '—'}</div>
          </div>

          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Worst Execution</div>
            <div className="font-data-mono-lg text-xl text-negative">
              {data.summary.worst ? formatSigned(formatCurrency(data.summary.worst.pnl)) : '—'}
            </div>
            <div className="text-[10px] text-text-muted mt-1 truncate">{data.summary.worst?.pair || '—'}</div>
          </div>

          <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
            <div className="text-[10px] uppercase text-text-muted mb-1 font-bold tracking-widest">Current Streak</div>
            <div className="font-data-mono-lg text-xl text-primary">
              {data.streaks.currentWin > 0 ? `${data.streaks.currentWin}W` : data.streaks.currentLoss > 0 ? `${data.streaks.currentLoss}L` : '0'}
            </div>
            <div className="text-[10px] text-text-muted mt-1">Active Run</div>
          </div>
        </div>

        {/* 2. MIDDLE — LIVE PERFORMANCE + MARKET SIGNALS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Live Performance */}
          <div className="bg-surface-panel border border-border-slate rounded-sm p-5 flex flex-col h-full shadow-sm lg:col-span-1">
            <h3 className="text-[11px] font-label-caps uppercase text-text-high-contrast mb-4 tracking-widest">Live Performance</h3>
            <div className="space-y-4 flex-1 font-data-mono-sm font-bold text-xs">
              <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-widest font-normal">Today's P&L</span>
                <span className={`${todaysPnl >= 0 ? "text-positive" : "text-negative"}`}>{formatSigned(formatCurrency(todaysPnl))}</span>
              </div>
              <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-widest font-normal">Current Drawdown</span>
                <span className="text-negative">{formatSigned(formatCurrency(currentDrawdown))}</span>
              </div>
              <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-widest font-normal">Current Streak</span>
                <span className="text-primary">{data.streaks.currentWin > 0 ? `${data.streaks.currentWin}W` : `${data.streaks.currentLoss}L`}</span>
              </div>
              <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-widest font-normal">Average Trade</span>
                <span className={`${data.summary.averagePnl >= 0 ? "text-positive" : "text-negative"}`}>{formatSigned(formatCurrency(data.summary.averagePnl))}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-widest font-normal">Win Rate</span>
                <span className="text-text-high-contrast">{Math.round(data.summary.winRate * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Execution Quality */}
          <div className="bg-surface-panel border border-border-slate rounded-sm p-5 shadow-sm lg:col-span-1 flex flex-col justify-center">
            <h3 className="text-[11px] font-label-caps uppercase text-text-high-contrast mb-4 tracking-widest flex justify-between items-center">
              Execution Quality
            </h3>
            <div className="space-y-4 font-data-mono-sm text-xs font-bold">
              <div>
                <div className="font-label-caps text-[10px] text-text-muted mb-1 flex justify-between tracking-widest">
                  <span>Rules Adherence</span>
                  <span className={rulesAdherencePct > 80 ? "text-positive" : "text-primary"}>{rulesAdherencePct}%</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-sm overflow-hidden border border-border-slate">
                  <div className="bg-primary h-full transition-all" style={{ width: `${rulesAdherencePct}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between items-end pt-3">
                <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-widest font-normal">Risk Profile</span>
                <span className={maxDrawdown < -1500 ? "text-negative" : "text-positive"}>{maxDrawdown < -1500 ? "AGGRESSIVE" : "CONTROLLED"}</span>
              </div>
            </div>
          </div>

          {/* Market & Trading Signals */}
          <div className="bg-surface-panel border border-border-slate rounded-sm p-5 shadow-sm flex flex-col relative overflow-hidden group lg:col-span-1 border-l-4 border-l-primary/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary mix-blend-overlay opacity-10 filter blur-3xl transform translate-x-10 -translate-y-10"></div>
            <h3 className="text-[11px] font-label-caps uppercase text-primary mb-4 tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">cell_tower</span>
              Market & Trading Signals
            </h3>

            <div className="bg-surface/50 border border-border-slate/50 p-4 rounded-sm flex-1 flex flex-col gap-3 font-data-mono-sm text-xs relative z-10">
              <div className="flex justify-between items-center border-b border-border-slate/30 pb-2">
                <span className="text-text-muted font-label-caps tracking-widest text-[9px] uppercase">Optimal Setup</span>
                <span className="text-positive font-bold">{bestSetup}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border-slate/30 pb-2">
                <span className="text-text-muted font-label-caps tracking-widest text-[9px] uppercase">Optimal Session</span>
                <span className="text-text-high-contrast font-bold uppercase">{bestSession.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border-slate/30 pb-2">
                <span className="text-text-muted font-label-caps tracking-widest text-[9px] uppercase">Best Instrument</span>
                <span className="text-text-high-contrast font-bold">{bestInstrument}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] bg-primary/10 text-primary px-3 py-2 mt-auto rounded-sm">
                <span className="font-label-caps uppercase tracking-widest">Intelligence</span>
                <span className="font-bold">ACTIVE</span>
              </div>
            </div>
          </div>

        </div>

        {/* 3. MIDDLE — DAILY HEATMAP + DISTRIBUTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* HEATMAP */}
          <div className="bg-surface-panel border border-border-slate rounded-sm flex flex-col lg:col-span-2 shadow-sm">
            <div className="px-5 py-4 border-b border-border-slate rounded-t-sm flex justify-between bg-surface/50">
              <h3 className="text-[12px] font-label-caps uppercase text-text-high-contrast tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-text-muted">calendar_month</span>
                Daily Heatmap
              </h3>
            </div>
            <div className="p-5 flex-1 flex flex-col overflow-x-auto justify-center min-h-[160px]">
              <div className="grid grid-cols-7 gap-1.5 flex-1 min-w-[500px]">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
                  <div key={d} className="text-center font-label-caps tracking-widest text-[9px] uppercase text-text-muted mb-1">{d}</div>
                ))}
                {Array.from({ length: 35 }).map((_, idx) => {
                  const blockDate = new Date();
                  blockDate.setDate(blockDate.getDate() - (34 - idx));
                  const dateStr = blockDate.toISOString().slice(0, 10);
                  const dayData = data.days.find(d => d.date === dateStr);
                  const net = dayData ? dayData.netPnl : 0;
                  return (
                    <div
                      key={idx}
                      className={`heatmap-sq flex flex-col items-center justify-center p-0.5 rounded-[2px] border h-[55px] ${net > 0 ? "bg-positive/20 border-positive/40 hover:bg-positive/30"
                        : net < 0 ? "bg-negative/20 border-negative/40 hover:bg-negative/30"
                          : "bg-surface-container border-border-slate hover:bg-surface-container-high"
                        } transition-colors cursor-crosshair`}
                      title={`${dateStr}: ${formatSigned(formatCurrency(net))}`}
                    >
                      <span className={`text-[10px] font-data-mono-sm ${net !== 0 ? 'text-on-surface font-bold' : 'text-text-muted opacity-50'}`}>{blockDate.getDate()}</span>
                      {net !== 0 && (
                        <span className={`text-[8px] font-data-mono-sm font-bold tracking-tighter hidden sm:block ${net > 0 ? 'text-positive' : 'text-negative'}`}>
                          {Math.abs(net) >= 1000 ? Math.round(net / 1000) + 'k' : Math.round(net)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DISTRIBUTION */}
          <div className="bg-surface-panel border border-border-slate rounded-sm flex flex-col shadow-sm">
            <div className="px-5 py-4 border-b border-border-slate rounded-t-sm bg-surface/50">
              <h3 className="text-[12px] font-label-caps uppercase text-text-high-contrast tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-text-muted">pie_chart</span>
                Distribution
              </h3>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-center">
              <div className="flex-1 flex gap-6 items-center">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center ml-2">
                  <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-md">
                    <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-surface border-border-slate"></circle>
                    <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="rgb(255, 107, 107)" strokeWidth="3" strokeDasharray={`${shortPct} ${100 - shortPct}`} strokeDashoffset={0}></circle>
                    <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="rgb(32, 201, 151)" strokeWidth="3" strokeDasharray={`${longPct} ${100 - longPct}`} strokeDashoffset={100 - shortPct}></circle>
                  </svg>
                  <div className="text-center font-data-mono-sm font-bold">
                    <div className="text-positive text-[10px] drop-shadow-sm">{longPct}%</div>
                    <div className="text-negative text-[10px] drop-shadow-sm">{shortPct}%</div>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-positive"></div>
                        <span className="text-text-high-contrast font-label-caps text-[10px] uppercase tracking-widest">Long</span>
                      </div>
                    </div>
                    <div className={`font-data-mono-sm text-xs font-bold ${longPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{formatSigned(formatCurrency(longPnl))}</div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-negative"></div>
                        <span className="text-text-high-contrast font-label-caps text-[10px] uppercase tracking-widest">Short</span>
                      </div>
                    </div>
                    <div className={`font-data-mono-sm text-xs font-bold ${shortPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{formatSigned(formatCurrency(shortPnl))}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. BOTTOM — RECENT EXECUTIONS FEED */}
        <div className="bg-surface-panel border border-border-slate rounded-sm flex flex-col min-h-[350px]">
          <div className="px-5 py-4 border-b border-border-slate flex justify-between items-center rounded-t-sm bg-surface-container">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[16px] text-primary">feed</span>
              <h3 className="text-[12px] font-label-caps uppercase text-text-high-contrast tracking-widest">Recent Executions Feed</h3>
            </div>
            <button onClick={onViewTrades} className="text-[10px] uppercase font-bold tracking-widest bg-surface border border-border-slate hover:bg-surface-container-high px-3 py-1.5 rounded-sm transition-colors text-text-high-contrast">
              Archive
            </button>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1 h-[300px]">
            <table className="w-full text-left text-[11px] whitespace-nowrap min-w-[800px]">
              <thead className="bg-surface text-[10px] uppercase text-text-muted border-b border-border-slate/50 sticky top-0 font-bold tracking-widest shadow-sm">
                <tr>
                  <th className="px-5 py-3 font-medium">Time (Local)</th>
                  <th className="px-4 py-3 font-medium">Instrument</th>
                  <th className="px-4 py-3 font-medium text-center">Dir</th>
                  <th className="px-4 py-3 font-medium">Setup Applied</th>
                  <th className="px-4 py-3 font-medium text-right">R-Mult</th>
                  <th className="px-5 py-3 font-medium text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-slate/30 font-data-mono-sm">
                {filteredTrades.slice(0, 50).map((trade) => (
                  <tr key={trade.id} onClick={() => onSelectTrade(trade, trades)} className="hover:bg-surface-container/50 transition-colors cursor-pointer group">
                    <td className="px-5 py-4 text-text-muted group-hover:text-text-high-contrast transition-colors">{formatDate(trade.date, true)}</td>
                    <td className="px-4 py-4 text-text-high-contrast font-bold">{trade.pair || '—'}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider font-bold ${trade.direction?.toLowerCase() === 'long' ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'}`}>
                        {trade.direction?.toUpperCase() || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-text-muted truncate max-w-[200px]">{trade.setup || '—'}</td>
                    <td className={`px-4 py-4 text-right ${trade.rr ? (trade.rr > 0 ? "text-positive" : trade.rr < 0 ? "text-negative" : "text-text-muted") : "text-text-muted"}`}>{trade.rr ? `${formatNumber(trade.rr)}R` : '—'}</td>
                    <td className={`px-5 py-4 text-right font-bold ${trade.pnl > 0 ? "text-positive" : trade.pnl < 0 ? "text-negative" : "text-text-muted"}`}>{formatSigned(formatCurrency(trade.pnl))}</td>
                  </tr>
                ))}
                {filteredTrades.length === 0 && (
                  <tr><td colSpan="6" className="px-5 py-12 text-center text-text-muted font-body-sm">No Executions Found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
