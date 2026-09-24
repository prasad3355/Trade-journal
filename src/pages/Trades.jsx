import React, { useMemo, useState } from "react";
import TradeCard, { normalizePair } from "../components/TradeCard";
import { formatCurrency, formatSigned, parseDateSafely } from "../utils/formatters";
import { tradeSummary, getResult } from "../utils/calculations";
import { Reveal, StaggerContainer, NumberTicker } from "../components/ui/Motion";

function Trades({ trades, onSelectTrade }) {
  const [filterPair, setFilterPair] = useState("");
  const [filterResult, setFilterResult] = useState("");

  const pairs = Array.from(new Set(trades.map(t => normalizePair(t.pair)))).filter(p => p && p !== '—').sort();

  // Sort trades chronologically: oldest -> newest, using the SAFE parser
  const filteredTrades = useMemo(() => {
    return trades
      .filter(t => (filterPair ? normalizePair(t.pair) === filterPair : true))
      .filter(t => {
        if (filterResult === "WIN") return t.pnl > 0;
        if (filterResult === "LOSS") return t.pnl < 0;
        if (filterResult === "EV") return t.pnl === 0;
        return true;
      })
      .sort((a, b) => {
        const dateA = parseDateSafely(a.date)?.getTime() || 0;
        const dateB = parseDateSafely(b.date)?.getTime() || 0;
        return dateA - dateB;
      });
  }, [trades, filterPair, filterResult]);

  const summary = tradeSummary(filteredTrades);

  const totalScreenshots = useMemo(() => {
    let count = 0;
    filteredTrades.forEach(tr => {
      const img = tr.images?.length ? tr.images : (tr.image ? [tr.image] : []);
      count += img.length;
    });
    return count;
  }, [filteredTrades]);

  const winRateStr = filteredTrades.length ? ((summary.wins / filteredTrades.length) * 100).toFixed(1) + "%" : "0%";

  // Group by month chronologically
  const monthGroups = useMemo(() => {
    const groups = new Map();
    filteredTrades.forEach(trade => {
      const dateObj = parseDateSafely(trade.date);
      if (!dateObj) return;

      const monthStr = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

      if (!groups.has(monthStr)) {
        groups.set(monthStr, []);
      }
      groups.get(monthStr).push(trade);
    });
    // Maps iterate in insertion order, and we inserted chronologically oldest -> newest.
    return Array.from(groups.entries());
  }, [filteredTrades]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-[#050505] text-white overflow-y-auto custom-scrollbar">
      {/* Editorial Header */}
      <Reveal once={true}>
        <header className="px-6 md:px-12 pt-24 pb-16 shrink-0 max-w-[2000px] mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 lg:gap-24">
            <div className="max-w-[700px]">
              <h1 className="font-headline-md text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6 leading-[0.9]">
                TRADING<br />ARCHIVE.
              </h1>
              <p className="text-white/40 text-lg md:text-xl font-light leading-relaxed max-w-xl">
                A visual record of every trade, setup, decision, and lesson.
              </p>
            </div>

            <div className="flex flex-wrap gap-8 md:gap-16 text-left md:text-right md:pb-2">
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Records</div>
                <div className="text-2xl font-data-mono font-light"><NumberTicker value={filteredTrades.length} /> TRADES</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Media</div>
                <div className="text-2xl font-data-mono font-light"><NumberTicker value={totalScreenshots} /> IMAGES</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Net P&L</div>
                <div className={`text-2xl font-data-mono font-bold ${summary.netPnl >= 0 ? "text-[#00a572]" : "text-[#ff516a]"}`}>
                  <NumberTicker value={summary.netPnl} isFormatCurrency={true} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Win Rate</div>
                <div className="text-2xl font-data-mono font-light">{winRateStr}</div>
              </div>
            </div>
          </div>

          {/* Minimal Navigation / Filter */}
          <div className="flex items-center gap-8 pt-16 mt-8 border-t border-white/5">
            <div className="flex items-center gap-2">
              {['', 'WIN', 'LOSS', 'EV'].map(res => (
                <button
                  key={res}
                  onClick={() => setFilterResult(res)}
                  className={`text-xs font-label-caps uppercase tracking-widest px-4 py-2 rounded-full transition-colors ${filterResult === res ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white/80'}`}
                >
                  {res === '' ? 'ALL OUTCOMES' : res}
                </button>
              ))}
            </div>
            <div className="w-[1px] h-4 bg-white/10 hidden md:block"></div>
            <select
              value={filterPair}
              onChange={(e) => setFilterPair(e.target.value)}
              className="bg-transparent border-none text-white/40 text-xs font-label-caps uppercase px-0 py-2 hover:text-white outline-none cursor-pointer transition-colors"
            >
              <option value="" className="bg-[#111]">ALL INSTRUMENTS</option>
              {pairs.map(p => <option key={p} value={p} className="bg-[#111]">{p}</option>)}
            </select>
          </div>
        </header>
      </Reveal>

      {/* Main Gallery Archive */}
      <main className="flex-1 w-full max-w-[2000px] mx-auto px-6 md:px-12 pb-32 space-y-32">

        {filteredTrades.length === 0 ? (
          <div className="py-40 flex flex-col items-center justify-center text-white/40">
            <span className="material-symbols-outlined text-[48px] mb-4 opacity-30">photo_library</span>
            <p className="font-label-caps tracking-widest uppercase text-sm">No records found</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: MONTH-WISE TRADES (Chronological) */}
            <div className="space-y-32">
              {monthGroups.map(([monthStr, monthTrades], mIdx) => {
                const mSummary = tradeSummary(monthTrades);
                const mWins = monthTrades.filter(t => getResult(t) === 'Win').length;
                const mWinRate = monthTrades.length ? ((mWins / monthTrades.length) * 100).toFixed(0) + '%' : '0%';

                const [mName, mYear] = monthStr.split(" ");

                return (
                  <Reveal key={monthStr} once={true} delay={0.1}>
                    <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6 mb-12">
                      <h2 className="text-4xl md:text-5xl font-black tracking-widest flex flex-col uppercase font-headline-md">
                        <span className="text-white/40 text-lg mb-1">{mYear}</span>
                        {mName}
                      </h2>
                      <div className="flex gap-8 text-xs font-data-mono uppercase tracking-widest text-white/40">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[9px] text-white/20">Volume</span>
                          <span className="text-sm font-bold text-white"><NumberTicker value={monthTrades.length} /> TRADES</span>
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[9px] text-white/20">Win %</span>
                          <span className="text-sm font-bold text-white/80">{mWinRate}</span>
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[9px] text-white/20">Net Output</span>
                          <span className={`text-sm font-bold ${mSummary.netPnl >= 0 ? "text-[#00a572]" : "text-[#ff516a]"}`}>
                            <NumberTicker value={mSummary.netPnl} isFormatCurrency={true} />
                          </span>
                        </div>
                      </div>
                    </div>

                    <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14 items-start">
                      {monthTrades.map((trade, i) => (
                        <TradeCard
                          key={trade.id}
                          trade={trade}
                          onSelect={(t) => onSelectTrade(t, filteredTrades)}
                        />
                      ))}
                    </StaggerContainer>
                  </Reveal>
                );
              })}
            </div>

            {/* SECTION 2: ALL TRADES */}
            <Reveal once={true}>
              <div className="pt-32 border-t border-white/5">
                <div className="mb-16">
                  <h2 className="text-3xl md:text-5xl font-black tracking-widest uppercase font-headline-md mb-2 text-white">ALL TRADES</h2>
                  <p className="text-sm text-white/40 font-label-caps tracking-widest uppercase">{filteredTrades.length} Trades Unfiltered (Oldest to Newest)</p>
                </div>

                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14 items-start">
                  {filteredTrades.map((trade, i) => (
                    <TradeCard
                      key={trade.id}
                      trade={trade}
                      onSelect={(t) => onSelectTrade(t, filteredTrades)}
                    />
                  ))}
                </StaggerContainer>
              </div>
            </Reveal>
          </>
        )}
      </main>
    </div>
  );
}

export default Trades;
