import { useState, useMemo } from "react";
import { performanceSummary } from "../utils/analytics";
import { classifySession } from "../utils/sessions";

// Date Math Helpers
const addMonths = (date, m) => new Date(date.getFullYear(), date.getMonth() + m, 1);
const subMonths = (date, m) => addMonths(date, -m);
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const getMonthName = (date) => date.toLocaleString('default', { month: 'long' });
const getYear = (date) => date.getFullYear();

// Format helper to convert Date to YYYY-MM-DD local time string without timezone shifting bugs
const formatYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
const parseYMD = (ymd) => {
    const [y, m, d] = ymd.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
};

export default function Calendar({ trades, onSelectTrade }) {
    const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
    const [selectedDayObj, setSelectedDayObj] = useState(null);

    // Core navigation
    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const handleToday = () => setCurrentDate(startOfMonth(new Date()));

    // 1. Group all trades by YYYY-MM-DD (local strings from trade logs)
    const tradesByDate = useMemo(() => {
        const map = new Map();
        trades.forEach(t => {
            const d = t.date.slice(0, 10);
            if (!map.has(d)) map.set(d, []);
            map.get(d).push(t);
        });
        return map;
    }, [trades]);

    // 2. Compute bounds for calendar matrix
    const monthDays = useMemo(() => {
        const days = getDaysInMonth(currentDate);
        return Array.from({ length: days }, (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1));
    }, [currentDate]);

    // Compute stats for current month
    const monthTrades = useMemo(() => {
        return monthDays.reduce((acc, day) => {
            const d = formatYMD(day);
            return acc.concat(tradesByDate.get(d) || []);
        }, []);
    }, [monthDays, tradesByDate]);

    const monthSummary = useMemo(() => performanceSummary(monthTrades), [monthTrades]);

    // Daily performance stats to determine intensity color mapping
    const dailyPnLs = monthDays.map(day => {
        const d = formatYMD(day);
        const dayTrades = tradesByDate.get(d) || [];
        return dayTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    });
    const maxProfit = Math.max(0, ...dailyPnLs);
    const minLoss = Math.min(0, ...dailyPnLs);

    const getDayColor = (pnl) => {
        if (pnl === 0) return "bg-surface-panel border-border-slate text-text-high-contrast";
        if (pnl > 0) {
            if (pnl > maxProfit * 0.6) return "bg-positive/20 border-positive/40 text-positive";
            if (pnl > maxProfit * 0.3) return "bg-positive/10 border-positive/30 text-text-high-contrast";
            return "bg-positive/5 border-positive/20 text-text-high-contrast";
        } else {
            if (pnl < minLoss * 0.6) return "bg-negative/20 border-negative/40 text-negative";
            if (pnl < minLoss * 0.3) return "bg-negative/10 border-negative/30 text-text-high-contrast";
            return "bg-negative/5 border-negative/20 text-text-high-contrast";
        }
    };

    // 3. Prefix blank days for calendar alignment
    const firstDayOfWeek = currentDate.getDay();
    // Monday start
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    // DOW calculations
    const dowStats = useMemo(() => {
        const arr = [0, 1, 2, 3, 4, 5, 6].map(i => ({ day: weekdays[i], trades: [] }));
        monthTrades.forEach(t => {
            let dow = new Date(t.date).getDay();
            dow = dow === 0 ? 6 : dow - 1; // map to MON-SUN
            arr[dow].trades.push(t);
        });
        return arr.map(d => ({
            day: d.day,
            ...performanceSummary(d.trades)
        }));
    }, [monthTrades]);

    // Make selected day actual computations
    const selectedDayTrades = selectedDayObj ? (tradesByDate.get(formatYMD(selectedDayObj)) || []) : [];
    const selectedSummary = useMemo(() => performanceSummary(selectedDayTrades), [selectedDayTrades]);

    // Session Breakdown
    const sessionBreakdown = useMemo(() => {
        const map = new Map();
        selectedDayTrades.forEach(t => {
            const sess = classifySession(t.date).session || "Unknown";
            if (!map.has(sess)) map.set(sess, []);
            map.get(sess).push(t);
        });
        return Array.from(map.entries()).map(([session, arr]) => ({
            session,
            ...performanceSummary(arr)
        }));
    }, [selectedDayTrades]);

    // Instrument Breakdown
    const intBreakdown = useMemo(() => {
        const map = new Map();
        selectedDayTrades.forEach(t => {
            const inst = t.pair || "Unknown";
            if (!map.has(inst)) map.set(inst, []);
            map.get(inst).push(t);
        });
        return Array.from(map.entries()).map(([inst, arr]) => ({
            inst,
            ...performanceSummary(arr)
        })).sort((a, b) => b.netPnl - a.netPnl);
    }, [selectedDayTrades]);

    // Direction Breakdown
    const dirBreakdown = useMemo(() => {
        const map = new Map();
        selectedDayTrades.forEach(t => {
            const dir = t.direction || "Unknown";
            if (!map.has(dir)) map.set(dir, []);
            map.get(dir).push(t);
        });
        return Array.from(map.entries()).map(([dir, arr]) => ({
            dir,
            ...performanceSummary(arr)
        }));
    }, [selectedDayTrades]);

    // Psychology Snapshot
    const psychSnapshot = useMemo(() => {
        const p = { confidence: {}, emotion: {}, rules: {} };
        selectedDayTrades.forEach(t => {
            if (t.confidence) p.confidence[t.confidence] = (p.confidence[t.confidence] || 0) + 1;
            if (t.emotion) p.emotion[t.emotion] = (p.emotion[t.emotion] || 0) + 1;
            if (t.rulesFollowed) p.rules[t.rulesFollowed] = (p.rules[t.rulesFollowed] || 0) + 1;
        });
        return p;
    }, [selectedDayTrades]);

    const closeReview = () => setSelectedDayObj(null);


    return (
        <div className="flex flex-col md:flex-row h-full bg-surface-canvas w-full overflow-hidden absolute inset-0">
            {/* CALENDAR MAIN AREA */}
            <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 lg:px-8 py-6 custom-scrollbar pb-24 md:pt-[76px] lg:pt-8 min-w-0">

                <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-6 animate-fade-in-up mt-16 md:mt-0">
                    {/* Header & Nav */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-slate pb-4 mb-2">
                        <div>
                            <h1 className="font-headline-md text-2xl text-text-high-contrast tracking-widest font-bold uppercase">Trading Calendar</h1>
                            <p className="text-text-muted text-xs font-data-mono-sm uppercase tracking-wider mt-1">Review & Analytical Dashboard</p>
                        </div>
                        <div className="flex items-center gap-1 bg-surface-panel p-1 rounded border border-border-slate shadow-sm">
                            <button onClick={handlePrevMonth} className="px-3 py-1.5 hover:bg-surface-hover text-text-muted hover:text-text-high-contrast rounded text-[10px] font-label-caps tracking-widest transition-colors">&lt; PREV</button>
                            <div className="px-4 py-1.5 font-data-mono text-sm text-text-high-contrast tracking-widest min-w-[150px] text-center">
                                {getMonthName(currentDate).toUpperCase()} {getYear(currentDate)}
                            </div>
                            <button onClick={handleNextMonth} className="px-3 py-1.5 hover:bg-surface-hover text-text-muted hover:text-text-high-contrast rounded text-[10px] font-label-caps tracking-widest transition-colors">NEXT &gt;</button>
                            <button onClick={handleToday} className="px-3 py-1.5 ml-1 bg-surface hover:bg-surface-hover text-text-high-contrast border border-border-slate rounded text-[10px] font-label-caps tracking-widest transition-colors shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">TODAY</button>
                        </div>
                    </div>

                    {/* DOW HEADER */}
                    <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-1">
                        {weekdays.map(d => (
                            <div key={d} className="text-center text-[9px] lg:text-[10px] font-label-caps text-text-muted tracking-widest border-b border-border-slate/50 pb-1">{d}</div>
                        ))}
                    </div>

                    {/* CELLS */}
                    <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-8 auto-rows-fr">
                        {Array.from({ length: startOffset }).map((_, i) => (
                            <div key={'blank-' + i} className="min-h-[80px] lg:min-h-[100px] border border-transparent rounded bg-surface/10"></div>
                        ))}
                        {monthDays.map(day => {
                            const dStr = formatYMD(day);
                            const cTrades = tradesByDate.get(dStr) || [];
                            const pnl = cTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
                            const rr = cTrades.reduce((s, t) => s + (Number(t.rr) || 0), 0);
                            const isSel = selectedDayObj && dStr === formatYMD(selectedDayObj);

                            return (
                                <button
                                    key={dStr}
                                    onClick={() => cTrades.length > 0 ? setSelectedDayObj(day) : null}
                                    className={`relative flex flex-col p-1.5 lg:p-2 min-h-[80px] lg:min-h-[100px] border rounded transition-all text-left overflow-hidden group 
                                ${cTrades.length > 0 ? getDayColor(pnl) : "bg-surface-panel border-border-slate/50 opacity-50"}
                                ${cTrades.length > 0 ? "hover:-translate-y-0.5 hover:shadow-md cursor-pointer hover:border-primary/50 hover:bg-surface hover:text-text-high-contrast hover:z-10" : "cursor-default"}
                                ${isSel ? "ring-2 ring-primary border-primary bg-surface z-10 shadow-lg" : ""}
                                `}
                                >
                                    <span className="text-[10px] lg:text-xs font-data-mono-sm mb-1 opacity-80">{day.getDate()}</span>
                                    {cTrades.length > 0 ? (
                                        <div className="mt-auto flex flex-col pt-1">
                                            <span className="text-[8px] lg:text-[10px] uppercase font-label-caps tracking-widest opacity-80 mb-0.5">{cTrades.length} Trade{cTrades.length !== 1 ? 's' : ''}</span>
                                            <span className={`text-[10px] lg:text-sm font-data-mono mb-0.5 ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                                                {pnl > 0 ? '+' : ''}{pnl.toFixed(0)}
                                            </span>
                                            <span className="text-[8px] lg:text-[10px] font-data-mono-sm opacity-60 text-text-muted">{rr > 0 ? '+' : ''}{rr.toFixed(1)}R</span>
                                        </div>
                                    ) : (
                                        <span className="mt-auto text-[7px] lg:text-[9px] uppercase font-label-caps tracking-widest text-text-muted/40 pb-1">No Executions</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* MONTH STATS & DOW */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">

                        {/* Month Summary */}
                        <div className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm">
                            <h3 className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase border-b border-border-slate pb-2 mb-4">Month Summary</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-label-caps text-text-muted uppercase">Trades</span>
                                    <span className="text-sm font-data-mono text-text-high-contrast">{monthSummary.trades}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-label-caps text-text-muted uppercase">Net P&L</span>
                                    <span className={`text-sm font-data-mono ${monthSummary.netPnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                                        {monthSummary.netPnl >= 0 ? '+' : ''}{monthSummary.netPnl?.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-label-caps text-text-muted uppercase">Win Rate</span>
                                    <span className="text-sm font-data-mono text-text-high-contrast">{(monthSummary.winRate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-label-caps text-text-muted uppercase">Avg R</span>
                                    <span className="text-sm font-data-mono text-text-high-contrast">{monthTrades.reduce((s, t) => s + (Number(t.rr) || 0), 0).toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-label-caps text-text-muted uppercase">Profit Factor</span>
                                    <span className="text-sm font-data-mono text-text-high-contrast">{monthSummary.profitFactor?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-label-caps text-text-muted uppercase">Max Drawdown</span>
                                    <span className="text-sm font-data-mono-sm text-negative">-${monthTrades.length ? Math.abs((function () {
                                        let c = 0, p = 0, mdd = 0;
                                        const chronological = [...monthTrades].sort((a, b) => a.date.localeCompare(b.date));
                                        for (const t of chronological) {
                                            c += (Number(t.pnl) || 0);
                                            p = Math.max(p, c);
                                            mdd = Math.min(mdd, c - p);
                                        }
                                        return mdd;
                                    })()).toFixed(2) : '0.00'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-label-caps text-text-muted uppercase">Best P&L</span>
                                    <span className="text-sm font-data-mono-sm text-positive">+${maxProfit.toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-label-caps text-text-muted uppercase">Worst P&L</span>
                                    <span className="text-sm font-data-mono-sm text-negative">-${Math.abs(minLoss).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Day of Week */}
                        <div className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm overflow-x-auto custom-scrollbar">
                            <h3 className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase border-b border-border-slate pb-2 mb-4">Day of Week Statistics</h3>
                            <div className="flex w-full min-w-[360px] justify-between text-left gap-2 sm:gap-4">
                                {dowStats.map(d => (
                                    <div key={d.day} className={`flex flex-col gap-1 flex-1 border-r border-border-slate/30 last:border-0 pr-2 ${d.trades === 0 ? 'opacity-30 grayscale' : ''}`}>
                                        <span className="text-[10px] font-label-caps tracking-widest text-text-high-contrast uppercase">{d.day}</span>
                                        <span className="text-[9px] font-data-mono-sm text-text-muted">{d.trades} {d.trades === 1 ? 'Trade' : 'Trades'}</span>
                                        <span className={`text-xs lg:text-sm font-data-mono ${d.trades > 0 ? (d.netPnl >= 0 ? 'text-positive' : 'text-negative') : 'text-text-muted'}`}>
                                            {d.trades > 0 ? `${d.netPnl > 0 ? '+' : ''}${d.netPnl.toFixed(0)}` : '0'}
                                        </span>
                                        <span className="text-[9px] font-data-mono-sm text-text-muted">{(d.winRate * 100).toFixed(0)}% WR</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DAILY REVIEW SIDE PANEL */}
            {selectedDayObj && selectedDayTrades.length > 0 && (
                <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 md:border-l border-t md:border-t-0 border-border-slate bg-surface flex flex-col h-full absolute bottom-0 md:relative z-40 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] md:shadow-none animate-slide-in-right md:pt-[64px] max-h-[85vh] md:max-h-full">

                    {/* Header */}
                    <div className="p-4 border-b border-border-slate flex justify-between items-center bg-surface-panel shadow-sm shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase">Daily Review</span>
                            <span className="font-data-mono text-lg text-primary">{getMonthName(selectedDayObj)} {selectedDayObj.getDate()}, {getYear(selectedDayObj)}</span>
                        </div>
                        <button onClick={closeReview} className="p-2 text-text-muted hover:bg-surface-hover hover:text-text-high-contrast rounded transition-colors border border-transparent hover:border-border-slate cursor-pointer z-50">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-6 pb-6">

                        {/* Primary Stats */}
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                            <div className="bg-surface-canvas border border-border-slate p-3 rounded flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                                <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted mb-1">Net P&L</span>
                                <span className={`text-xl font-data-mono ${selectedSummary.netPnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                                    {selectedSummary.netPnl >= 0 ? '+' : ''}{selectedSummary.netPnl.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-surface-canvas border border-border-slate p-3 rounded flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                                <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted mb-1">Win Rate</span>
                                <span className="text-xl font-data-mono text-text-high-contrast">
                                    {(selectedSummary.winRate * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="flex flex-col pl-3 bg-surface-canvas border border-border-slate p-2 rounded justify-center">
                                <span className="text-[9px] font-label-caps text-text-muted opacity-80 mb-1">Trades</span>
                                <span className="text-sm font-data-mono text-text-high-contrast">{selectedSummary.trades}</span>
                            </div>
                            <div className="flex flex-col pl-3 bg-surface-canvas border border-border-slate p-2 rounded justify-center">
                                <span className="text-[9px] font-label-caps text-text-muted opacity-80 mb-1">Total R</span>
                                <span className="text-sm font-data-mono text-text-high-contrast">{selectedDayTrades.reduce((s, t) => s + (Number(t.rr) || 0), 0).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Breakdown grids */}
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                            {/* Directions */}
                            <div className="flex flex-col gap-2">
                                <h4 className="text-[10px] font-label-caps uppercase tracking-widest text-text-muted border-b border-border-slate/50 pb-1">Direction</h4>
                                {dirBreakdown.map(d => (
                                    <div key={d.dir} className="flex justify-between items-center bg-surface-canvas border border-border-slate/40 px-2 py-1.5 rounded hover:border-border-slate transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${d.dir.toLowerCase() === 'long' ? 'bg-positive' : 'bg-negative'}`}></span>
                                            <span className="text-[10px] text-text-high-contrast uppercase tracking-wider font-bold">{d.dir}</span>
                                        </div>
                                        <span className={`text-[10px] font-data-mono-sm ${d.netPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{(d.netPnl > 0 ? '+' : '')}${d.netPnl.toFixed(0)}</span>
                                    </div>
                                ))}
                                {dirBreakdown.length === 0 && <span className="text-[9px] text-text-muted">None</span>}
                            </div>

                            {/* Sessions */}
                            <div className="flex flex-col gap-2">
                                <h4 className="text-[10px] font-label-caps uppercase tracking-widest text-text-muted border-b border-border-slate/50 pb-1">Sessions</h4>
                                {sessionBreakdown.map(s => (
                                    <div key={s.session} className="flex justify-between items-center bg-surface-canvas border border-border-slate/40 px-2 py-1.5 rounded hover:border-border-slate transition-colors">
                                        <span className="text-[10px] text-text-high-contrast uppercase tracking-wider font-bold truncate max-w-[100px]">{s.session}</span>
                                        <span className={`text-[10px] font-data-mono-sm ${s.netPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{(s.netPnl > 0 ? '+' : '')}${s.netPnl.toFixed(0)}</span>
                                    </div>
                                ))}
                                {sessionBreakdown.length === 0 && <span className="text-[9px] text-text-muted">None</span>}
                            </div>
                        </div>

                        {/* Instruments */}
                        <div className="flex flex-col gap-2 shrink-0">
                            <h4 className="text-[10px] font-label-caps uppercase tracking-widest text-text-muted border-b border-border-slate/50 pb-1">Instruments</h4>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {intBreakdown.map(i => (
                                    <div key={i.inst} className="flex flex-col bg-surface-canvas border border-border-slate/40 px-2 py-1.5 rounded hover:border-border-slate transition-colors">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="text-[10px] text-text-high-contrast font-data-mono-sm font-bold">{i.inst}</span>
                                            <span className="text-[9px] text-text-muted bg-surface-panel px-1.5 py-0.5 rounded">{i.trades}T</span>
                                        </div>
                                        <span className={`text-[11px] font-data-mono-sm mt-1 ${i.netPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{(i.netPnl > 0 ? '+' : '')}${i.netPnl.toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Psych Snapshot */}
                        <div className="flex flex-col gap-2 bg-surface-panel p-3 rounded-lg border border-border-slate shadow-sm shrink-0">
                            <h4 className="text-[10px] font-label-caps uppercase tracking-widest text-text-muted mb-2 border-b border-border-slate/50 pb-1">Psychology Snapshot</h4>

                            <div className="grid grid-cols-3 gap-3">
                                {['confidence', 'emotion', 'rules'].map(cat => (
                                    <div key={cat} className="flex flex-col gap-1.5">
                                        <span className="text-[9px] uppercase font-label-caps tracking-widest text-text-muted/80">{cat}</span>
                                        {Object.entries(psychSnapshot[cat]).length > 0 ? Object.entries(psychSnapshot[cat]).map(([v, count]) => (
                                            <div key={v} className="flex justify-between items-center">
                                                <span className="text-[9px] capitalize text-text-high-contrast truncate pr-1" title={v}>{v}</span>
                                                <span className="text-[10px] font-data-mono-sm bg-surface-canvas border border-border-slate/50 text-text-muted px-1.5 rounded">{count}</span>
                                            </div>
                                        )) : <span className="text-[9px] text-text-muted italic">---</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Executions */}
                        <div className="flex flex-col gap-3 mt-2 border-t border-border-slate pt-4 shrink-0">
                            <h4 className="text-[10px] font-label-caps uppercase tracking-widest text-text-muted">Executions</h4>
                            <div className="flex flex-col gap-2">
                                {selectedDayTrades.map((trade, i) => (
                                    <button
                                        key={trade.id || i}
                                        onClick={() => onSelectTrade(trade, selectedDayTrades)}
                                        className="flex flex-col border border-border-slate bg-surface hover:border-primary/50 hover:bg-surface-hover hover:scale-[1.01] rounded p-3 transition-all text-left shadow-sm group cursor-pointer"
                                    >
                                        <div className="flex justify-between items-center w-full mb-2 border-b border-border-slate/30 pb-2">
                                            <div className="flex gap-2 items-center">
                                                <span className="text-[10px] font-data-mono-sm text-text-muted bg-surface-panel px-1.5 py-0.5 rounded shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] border border-border-slate/40">{trade.date.slice(11, 16).replace('T', ' ')}</span>
                                                <span className="text-xs font-data-mono-sm text-text-high-contrast font-bold">{trade.pair}</span>
                                                <span className={`text-[9px] font-label-caps uppercase px-1.5 py-0.5 rounded ${trade.direction?.toLowerCase() === 'long' ? 'bg-positive/10 text-positive border border-positive/20' : 'bg-negative/10 text-negative border border-negative/20'}`}>{trade.direction}</span>
                                            </div>
                                            <span className={`text-xs font-data-mono ${trade.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                                                {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center w-full">
                                            <span className="text-[10px] text-text-muted font-body-sm truncate max-w-[200px] flex items-center gap-1"><span className="material-symbols-outlined text-[12px] opacity-70">label</span> {trade.setup || 'No Setup'}</span>
                                            <span className={`text-[10px] font-data-mono-sm px-1.5 py-0.5 rounded font-bold ${(Number(trade.rr) || 0) > 0 ? 'text-text-high-contrast bg-surface-panel' : 'text-text-muted'}`}>{trade.rr ? trade.rr + 'R' : ''}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
