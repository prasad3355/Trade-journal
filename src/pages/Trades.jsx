import React, { useEffect, useMemo, useState } from "react";
import TradeCard, { normalizePair } from "../components/TradeCard";
import { tradeSummary } from "../utils/calculations";
import { filterTrades, sortTrades } from "../utils/filters";
import { formatCurrency, formatSigned, formatDate, formatPrice, formatNumber } from "../utils/formatters";
import { useTrades } from "../context/TradeContext";

function getGroupKeys(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const monthName = d.toLocaleString("en-US", { month: "long" }).toUpperCase();
  const monthKey = `${monthName} ${year}`;
  const dateNum = d.getDate();
  const dayOfWeek = d.getDay();
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  const startOffset = dateNum - isoDay + 1;
  let startOfWeek = new Date(year, month, startOffset);
  let endOfWeek = new Date(year, month, startOffset + 6);
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  if (startOfWeek < firstDayOfMonth) startOfWeek = firstDayOfMonth;
  if (endOfWeek > lastDayOfMonth) endOfWeek = lastDayOfMonth;
  const firstDayOfMonthIsoDay =
    firstDayOfMonth.getDay() === 0 ? 7 : firstDayOfMonth.getDay();
  const firstSundayDate = 8 - firstDayOfMonthIsoDay;
  let weekNum;
  if (dateNum <= firstSundayDate) {
    weekNum = 1;
  } else {
    weekNum = Math.ceil((dateNum - firstSundayDate) / 7) + 1;
  }
  const shortMonthStart = startOfWeek.toLocaleString("en-US", {
    month: "short",
  });
  const shortMonthEnd = endOfWeek.toLocaleString("en-US", { month: "short" });
  let weekRangeStr =
    shortMonthStart === shortMonthEnd
      ? `${shortMonthStart} ${startOfWeek.getDate()}–${endOfWeek.getDate()}`
      : `${shortMonthStart} ${startOfWeek.getDate()} – ${shortMonthEnd} ${endOfWeek.getDate()}`;
  return {
    monthKey,
    weekKey: `WEEK ${weekNum} | ${weekRangeStr.toUpperCase()}`,
    monthSortValue: new Date(year, month, 1).getTime(),
    weekSortValue: weekNum,
  };
}

const emptyFilters = {
  search: "",
  pair: "",
  direction: "",
  result: "",
  setup: "",
  timeframe: "",
  session: "",
  rules: "",
  from: "",
  to: "",
};

function Trades({ trades, onSelectTrade, initialFilters, onEdit, onDuplicate }) {
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState("CARDS"); // CARDS | TABLE
  const [collapsedMonths, setCollapsedMonths] = useState({});
  const [collapsedWeeks, setCollapsedWeeks] = useState({});

  useEffect(() => {
    if (initialFilters) setFilters({ ...emptyFilters, ...initialFilters });
  }, [initialFilters]);

  const { deleteTrade } = useTrades();

  const toggleMonth = (id) => setCollapsedMonths(p => ({ ...p, [id]: !p[id] }));
  const toggleWeek = (id) => setCollapsedWeeks(p => ({ ...p, [id]: !p[id] }));

  // Build filter options
  const pairs = Array.from(new Set(trades.map(t => normalizePair(t.pair)))).filter(p => p && p !== '—').sort();
  const setups = Array.from(new Set(trades.map(t => t.setup))).filter(Boolean).sort();
  const sessions = Array.from(new Set(trades.map(t => t.session))).filter(Boolean).sort();

  // Normalize pair in filterTrades if Pair is searched
  const normalizedFilteredTrades = useMemo(() => {
    return trades.filter(t => {
      if (filters.pair && normalizePair(t.pair) !== filters.pair) return false;
      return true;
    });
  }, [trades, filters.pair]);

  const filtered = useMemo(
    () => sortTrades(filterTrades(normalizedFilteredTrades, { ...filters, pair: "" }), sort),
    [normalizedFilteredTrades, filters, sort],
  );

  const groupedMonths = useMemo(() => {
    const monthMap = {};
    filtered.forEach((trade) => {
      const keys = getGroupKeys(trade.date);
      if (!monthMap[keys.monthKey])
        monthMap[keys.monthKey] = {
          id: keys.monthKey,
          sortValue: keys.monthSortValue,
          weeks: {},
        };
      if (!monthMap[keys.monthKey].weeks[keys.weekKey])
        monthMap[keys.monthKey].weeks[keys.weekKey] = {
          id: keys.weekKey,
          sortValue: keys.weekSortValue,
          trades: [],
        };
      monthMap[keys.monthKey].weeks[keys.weekKey].trades.push(trade);
    });
    return Object.values(monthMap)
      .sort((a, b) => b.sortValue - a.sortValue)
      .map((m) => ({
        ...m,
        weeks: Object.values(m.weeks).sort((a, b) => b.sortValue - a.sortValue),
      }));
  }, [filtered]);

  const summary = tradeSummary(trades); // Overall totals based on ALL trades
  const bestTrade = [...trades].sort((a, b) => b.pnl - a.pnl)[0]?.pnl || 0;
  const worstTrade = [...trades].sort((a, b) => a.pnl - b.pnl)[0]?.pnl || 0;

  const select = (trade) => onSelectTrade(trade, filtered);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-surface">
      {/* View Header */}
      <header className="px-6 py-5 border-b border-border-slate bg-surface-panel shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="font-headline-md text-2xl text-text-high-contrast mb-1 tracking-widest uppercase">
              Trade Archive
            </h1>
            <p className="font-data-mono-sm text-xs text-text-muted">
              Review, filter and analyze every execution.
            </p>
          </div>

          <div className="flex gap-2 lg:gap-4 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 hide-scrollbar">
            <div className="bg-surface border border-border-slate px-4 py-2 rounded-sm flex flex-col min-w-[120px]">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Total Trades</span>
              <span className="font-data-mono-lg text-lg text-text-high-contrast">{trades.length}</span>
            </div>
            <div className="bg-surface border border-border-slate px-4 py-2 rounded-sm flex flex-col min-w-[120px]">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Net P&L</span>
              <span className={`font-data-mono-lg text-lg ${summary.netPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{formatSigned(formatCurrency(summary.netPnl))}</span>
            </div>
            <div className="bg-surface border border-border-slate px-4 py-2 rounded-sm flex flex-col min-w-[120px]">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Win Rate</span>
              <span className="font-data-mono-lg text-lg text-text-high-contrast">{trades.length ? Math.round((summary.wins / trades.length) * 100) : 0}%</span>
            </div>
            <div className="bg-surface border border-border-slate px-4 py-2 rounded-sm flex flex-col min-w-[120px]">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Avg R</span>
              <span className={`font-data-mono-lg text-lg ${summary.avgR >= 0 ? 'text-positive' : 'text-negative'}`}>
                {summary.avgR ? `${formatSigned(Number(summary.avgR.toFixed(2)))}R` : '—'}
              </span>
            </div>
            <div className="bg-surface border border-border-slate px-4 py-2 rounded-sm flex flex-col min-w-[120px]">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Best Trade</span>
              <span className="font-data-mono-lg text-lg text-positive">{formatSigned(formatCurrency(bestTrade))}</span>
            </div>
            <div className="bg-surface border border-border-slate px-4 py-2 rounded-sm flex flex-col min-w-[120px]">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Worst Trade</span>
              <span className="font-data-mono-lg text-lg text-negative">{formatSigned(formatCurrency(worstTrade))}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Advanced Filter Command Bar */}
      <section className="px-6 py-3 border-b border-border-slate bg-surface-container sticky top-0 z-20 shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-col xl:flex-row justify-between gap-4 xl:gap-8 items-start xl:items-center">

          {/* Filter Groups */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[16px]">search</span>
              <input
                type="text"
                placeholder="Search queries..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="bg-surface border border-border-slate rounded-sm text-text-high-contrast text-xs font-data-mono-sm pl-8 pr-3 py-1.5 focus:border-primary w-48 outline-none"
              />
            </div>

            <div className="w-px h-5 bg-border-slate hidden md:block"></div>

            <select
              value={filters.pair} onChange={(e) => setFilters(f => ({ ...f, pair: e.target.value }))}
              className="bg-surface border border-border-slate rounded-sm text-text-high-contrast text-xs font-label-caps uppercase px-3 py-1.5 focus:border-primary outline-none min-w-[110px]"
            >
              <option value="">INSTRUMENTS (ALL)</option>
              {pairs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={filters.direction} onChange={(e) => setFilters(f => ({ ...f, direction: e.target.value }))}
              className="bg-surface border border-border-slate rounded-sm text-text-high-contrast text-xs font-label-caps uppercase px-3 py-1.5 focus:border-primary outline-none"
            >
              <option value="">DIRECTION (ALL)</option>
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>

            <select
              value={filters.result} onChange={(e) => setFilters(f => ({ ...f, result: e.target.value }))}
              className="bg-surface border border-border-slate rounded-sm text-text-high-contrast text-xs font-label-caps uppercase px-3 py-1.5 focus:border-primary outline-none"
            >
              <option value="">RESULT (ALL)</option>
              <option value="win">WIN</option>
              <option value="loss">LOSS</option>
              <option value="break-even">BREAK-EVEN</option>
            </select>

            <select
              value={filters.setup} onChange={(e) => setFilters(f => ({ ...f, setup: e.target.value }))}
              className="bg-surface border border-border-slate rounded-sm text-text-high-contrast text-xs font-label-caps uppercase px-3 py-1.5 focus:border-primary outline-none max-w-[140px] truncate"
            >
              <option value="">SETUP (ALL)</option>
              {setups.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={filters.session} onChange={(e) => setFilters(f => ({ ...f, session: e.target.value }))}
              className="bg-surface border border-border-slate rounded-sm text-text-high-contrast text-xs font-label-caps uppercase px-3 py-1.5 focus:border-primary outline-none"
            >
              <option value="">SESSION (ALL)</option>
              {sessions.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>

            <div className="flex items-center text-[10px] text-text-muted ml-auto md:ml-0 gap-2 font-data-mono-sm uppercase">
              <span>Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-surface border border-border-slate rounded-sm text-text-high-contrast text-xs font-data-mono-sm px-2 py-1 outline-none cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highestPnl">Highest P&L</option>
                <option value="lowestPnl">Lowest P&L</option>
                <option value="highestRr">Highest R</option>
                <option value="lowestRr">Lowest R</option>
              </select>
            </div>

            <button
              onClick={() => setFilters(emptyFilters)}
              className="text-xs text-text-muted hover:text-text-high-contrast underline decoration-border-slate hover:decoration-text-muted transition-all"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-1 border border-border-slate bg-surface p-1 rounded-sm shrink-0">
            <button
              onClick={() => setViewMode("CARDS")}
              className={`px-4 py-1 text-[10px] tracking-widest font-bold uppercase rounded-sm flex items-center gap-1.5 transition-colors ${viewMode === "CARDS" ? "bg-surface-container-high text-text-high-contrast shadow-sm" : "text-text-muted hover:text-text-high-contrast"}`}
            >
              <span className="material-symbols-outlined text-[14px]">grid_view</span> Cards
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`px-4 py-1 text-[10px] tracking-widest font-bold uppercase rounded-sm flex items-center gap-1.5 transition-colors ${viewMode === "TABLE" ? "bg-surface-container-high text-text-high-contrast shadow-sm" : "text-text-muted hover:text-text-high-contrast"}`}
            >
              <span className="material-symbols-outlined text-[14px]">table_rows</span> Table
            </button>
          </div>

        </div>
      </section>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-[1920px] mx-auto p-6">

          {groupedMonths.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border-slate rounded-lg bg-surface-panel mx-auto max-w-2xl mt-10 shadow-sm animate-fade-in-up">
              <span className="material-symbols-outlined text-[48px] text-border-slate mb-4">terminal</span>
              <h3 className="font-headline-sm text-text-high-contrast tracking-widest uppercase mb-2">No Executions Found</h3>
              <p className="font-data-mono-sm text-text-muted text-sm text-center mb-6">
                Current filters do not math any records in the archive.
              </p>
              <button
                onClick={() => setFilters(emptyFilters)}
                className="px-6 py-2 text-xs font-bold tracking-widest uppercase border border-border-slate bg-surface-container hover:bg-surface-container-high text-text-high-contrast rounded-sm transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}

          {groupedMonths.map((month) => {
            const allTrades = month.weeks.flatMap((w) => w.trades);
            const mSum = tradeSummary(allTrades);
            const mIsCollapsed = collapsedMonths[month.id];

            return (
              <div key={month.id} className="mb-10 last:mb-0 bg-surface">
                {/* Month Header */}
                <div
                  className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b-2 border-border-slate pb-2 cursor-pointer group"
                  onClick={() => toggleMonth(month.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[20px] text-text-muted group-hover:text-text-high-contrast transition-transform ${mIsCollapsed ? '-rotate-90' : ''}`}>
                      expand_more
                    </span>
                    <h2 className="font-headline-md text-xl text-text-high-contrast uppercase tracking-wider font-bold">
                      {month.id}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 font-data-mono-sm text-xs mt-2 md:mt-0 pl-7 md:pl-0">
                    <span className="text-text-muted">TRADES <span className="text-text-high-contrast">{allTrades.length}</span></span>
                    <span className="text-text-muted">WINS <span className="text-text-high-contrast">{mSum.wins}</span></span>
                    <span className="text-text-muted">LOSSES <span className="text-text-high-contrast">{mSum.losses}</span></span>
                    <span className="text-text-muted">BE <span className="text-text-high-contrast">{mSum.breakEven}</span></span>
                    <span className="text-text-muted">WIN RATE <span className="text-text-high-contrast">{allTrades.length ? Math.round((mSum.wins / allTrades.length) * 100) : 0}%</span></span>
                    <span className="text-text-muted">
                      NET P&L <span className={mSum.netPnl >= 0 ? "text-positive font-bold" : "text-negative font-bold"}>{formatSigned(formatCurrency(mSum.netPnl))}</span>
                    </span>
                  </div>
                </div>

                {!mIsCollapsed && month.weeks.map((week) => {
                  const wSum = tradeSummary(week.trades);
                  const wIsCollapsed = collapsedWeeks[week.id];

                  return (
                    <div
                      key={week.id}
                      className="mb-8 last:mb-2 md:pl-2"
                    >
                      {/* Week Header */}
                      <div
                        className="flex flex-col md:flex-row md:items-center justify-between mb-4 bg-surface-panel border border-border-slate rounded-sm px-4 py-2 cursor-pointer group"
                        onClick={() => toggleWeek(week.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined text-[16px] text-text-muted group-hover:text-text-high-contrast transition-transform ${wIsCollapsed ? '-rotate-90' : ''}`}>
                            expand_more
                          </span>
                          <h3 className="font-label-caps text-xs tracking-widest uppercase font-bold text-text-muted group-hover:text-text-high-contrast transition-colors">
                            {week.id}
                          </h3>
                        </div>
                        <div className="font-data-mono-sm text-[11px] uppercase tracking-widest mt-2 md:mt-0 pl-7 md:pl-0 flex flex-wrap gap-4">
                          <span className="text-text-muted">{week.trades.length} TRADES</span>
                          <span className="text-text-muted">{week.trades.length ? Math.round((wSum.wins / week.trades.length) * 100) : 0}% WIN</span>
                          <span className={wSum.netPnl >= 0 ? "text-positive" : "text-negative"}>
                            {formatSigned(formatCurrency(wSum.netPnl))}
                          </span>
                        </div>
                      </div>

                      {/* Trades Grid/Table */}
                      {!wIsCollapsed && (
                        viewMode === "CARDS" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {week.trades.map((trade) => (
                              <TradeCard
                                key={trade.id}
                                trade={trade}
                                onSelect={select}
                                onEdit={onEdit}
                                onDuplicate={onDuplicate}
                                onDelete={async () => {
                                  if (window.confirm("Delete this execution?")) await deleteTrade(trade.id);
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-border-slate rounded-sm bg-surface-panel shadow-sm">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                              <thead>
                                <tr className="bg-surface-container border-b border-border-slate">
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest">ID</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest">Date / Time</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest">Instrument</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest">Dir</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest">Setup</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest">Session</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest">Entry</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest">Exit</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest">R:R</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest text-right">P&L</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest text-center">Result</th>
                                  <th className="p-3 text-[10px] font-label-caps uppercase text-text-muted font-bold tracking-widest text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-slate/50">
                                {week.trades.map((trade) => {
                                  const isWin = trade.pnl > 0;
                                  const isLoss = trade.pnl < 0;
                                  const pnlColor = isWin ? "text-positive" : isLoss ? "text-negative" : "text-text-muted";
                                  return (
                                    <tr key={trade.id} className="hover:bg-surface-container/50 transition-colors group cursor-pointer" onClick={() => select(trade)}>
                                      <td className="p-3 text-xs font-data-mono-sm text-text-muted">#{String(trade.id).replace("trade-", "").slice(-4)}</td>
                                      <td className="p-3 text-xs font-data-mono-sm text-text-high-contrast whitespace-nowrap">{formatDate(trade.date, true)}</td>
                                      <td className="p-3 text-xs font-data-mono-md text-text-high-contrast font-bold bg-surface-container-high/50">{normalizePair(trade.pair)}</td>
                                      <td className="p-3">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-widest ${trade.direction?.toLowerCase() === 'long' ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'}`}>
                                          {trade.direction?.toUpperCase() || "—"}
                                        </span>
                                      </td>
                                      <td className="p-3 text-xs font-data-mono-sm text-text-high-contrast max-w-[120px] truncate" title={trade.setup}>{trade.setup || "—"}</td>
                                      <td className="p-3 text-xs font-data-mono-sm text-text-high-contrast">{(trade.session || "").replace("_", " ")}</td>
                                      <td className="p-3 text-xs font-data-mono-sm text-text-muted">{formatPrice(trade.entry) || "—"}</td>
                                      <td className="p-3 text-xs font-data-mono-sm text-text-muted">{formatPrice(trade.exit) || "—"}</td>
                                      <td className={`p-3 text-xs font-data-mono-sm font-bold ${pnlColor}`}>{trade.rr ? `${isWin ? '+' : ''}${formatNumber(trade.rr)}R` : '—'}</td>
                                      <td className={`p-3 text-sm font-data-mono-lg font-bold text-right ${pnlColor}`}>{formatSigned(formatCurrency(trade.pnl))}</td>
                                      <td className="p-3 text-center">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest border ${isWin ? 'text-positive border-positive/30 bg-positive/5' : isLoss ? 'text-negative border-negative/30 bg-negative/5' : 'text-text-muted border-border-slate bg-surface'}`}>
                                          {isWin ? "TP HIT" : isLoss ? "SL HIT" : "BE"}
                                        </span>
                                      </td>
                                      <td className="p-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); onEdit && onEdit(trade); }} className="text-text-muted hover:text-text-high-contrast mx-1" title="Edit"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDuplicate && onDuplicate(trade); }} className="text-text-muted hover:text-text-high-contrast mx-1" title="Duplicate"><span className="material-symbols-outlined text-[16px]">content_copy</span></button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

        </div>
      </main>
    </div>
  );
}

export default Trades;
