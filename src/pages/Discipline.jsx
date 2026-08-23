import { useState, useMemo } from "react";
import { performanceSummary } from "../utils/analytics";

// Helper Date filters
const now = new Date();
const dates = {
    YTD: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
    "3M": new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().slice(0, 10),
    "1M": new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().slice(0, 10),
    "1W": new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().slice(0, 10)
};

const MIN_SAMPLE_SIZE = 3;

export default function Discipline({ trades, onSelectTrade }) {
    const [timeFilter, setTimeFilter] = useState("ALL");

    // Filter dataset based on time
    const filteredTrades = useMemo(() => {
        if (timeFilter === "ALL") return trades;
        const threshold = dates[timeFilter];
        return trades.filter(t => t.date.slice(0, 10) >= threshold);
    }, [trades, timeFilter]);

    // Aggregate base metrics
    const summary = useMemo(() => performanceSummary(filteredTrades), [filteredTrades]);

    // Helper to safely format percentages & R
    const fmtPct = (val) => (val * 100).toFixed(1) + "%";
    const fmtNum = (val) => val != null && !isNaN(val) ? `${val.toFixed(2)}` : "---";
    const fmtPnl = (val) => val != null && !isNaN(val) ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}` : "---";

    // Shared Grouping Logic
    const getGroups = (fieldExtractor) => {
        const map = new Map();
        filteredTrades.forEach(t => {
            const v = fieldExtractor(t);
            if (Array.isArray(v)) {
                v.forEach(val => {
                    const key = val ? String(val).toUpperCase() : "UNKNOWN";
                    if (!map.has(key)) map.set(key, []);
                    map.get(key).push(t);
                });
            } else {
                const key = v ? String(v).toUpperCase() : "UNKNOWN";
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(t);
            }
        });
        return Array.from(map.entries())
            .map(([label, items]) => ({
                label,
                tradesArr: items,
                ...performanceSummary(items)
            }))
            .sort((a, b) => b.tradesArr.length - a.tradesArr.length);
    };

    // Rule Adherence
    const rulesGroups = useMemo(() => getGroups(t => t.rulesFollowed), [filteredTrades]);

    const rulesFollowedGrp = rulesGroups.find(g => g.label === "YES") || { tradesArr: [], trades: 0, winRate: 0, netPnl: 0, rr: 0 };
    const rulesPartialGrp = rulesGroups.find(g => g.label === "PARTIAL") || { tradesArr: [], trades: 0, winRate: 0, netPnl: 0, rr: 0 };
    const rulesViolatedGrp = rulesGroups.find(g => g.label === "NO") || { tradesArr: [], trades: 0, winRate: 0, netPnl: 0, rr: 0 };

    // Money Management
    const mmGroups = useMemo(() => getGroups(t => t.moneyManagement), [filteredTrades]);
    // Confidence Grouping
    const confGroups = useMemo(() => getGroups(t => t.confidence), [filteredTrades]);
    // Emotion Grouping
    const emoGroups = useMemo(() => getGroups(t => t.emotion), [filteredTrades]);

    // Checklist completion mapping
    // Since checklist could be an object if passed down normally, or string.
    const checklistGroups = useMemo(() => {
        const chkMap = {};
        filteredTrades.forEach(t => {
            if (t.checklist && typeof t.checklist === 'object') {
                Object.keys(t.checklist).forEach(k => {
                    if (!chkMap[k]) chkMap[k] = { yes: [], no: [] };
                    if (t.checklist[k]) chkMap[k].yes.push(t);
                    else chkMap[k].no.push(t);
                });
            }
        });

        return Object.entries(chkMap).map(([key, data]) => ({
            key,
            yes: { ...performanceSummary(data.yes), tradesArr: data.yes },
            no: { ...performanceSummary(data.no), tradesArr: data.no }
        })).filter(g => (g.yes.trades + g.no.trades) > 0);
    }, [filteredTrades]);

    // Identify Best and Worst disciplined combinations
    // We combine rules + confidence, or rules + checklist
    const conditions = useMemo(() => {
        const condMap = new Map();
        filteredTrades.forEach(t => {
            const rule = t.rulesFollowed ? String(t.rulesFollowed).toUpperCase() : "";
            const conf = t.confidence ? String(t.confidence).toUpperCase() : "";
            if (rule && conf) {
                const key = `RULES ${rule} + ${conf} CONFIDENCE`;
                if (!condMap.has(key)) condMap.set(key, []);
                condMap.get(key).push(t);
            }
        });
        return Array.from(condMap.entries())
            .map(([name, items]) => ({
                name,
                ...performanceSummary(items),
                tradesArr: items
            }))
            .filter(c => c.trades >= MIN_SAMPLE_SIZE)
            .sort((a, b) => b.netPnl - a.netPnl);
    }, [filteredTrades]);

    const bestCondition = conditions.length > 0 ? conditions[0] : null;
    const worstCondition = conditions.length > 0 ? conditions[conditions.length - 1] : null;

    // Rules X Performance Matrix
    // Matrix format array
    const ruleMatrix = [
        { label: "RULES YES", grp: rulesFollowedGrp },
        { label: "RULES PARTIAL", grp: rulesPartialGrp },
        { label: "RULES NO", grp: rulesViolatedGrp }
    ];

    // Discipline Leaks
    // Find behaviors heavily associated with loss (negative PnL and poor win rate AND sample size >= MIN_SAMPLE_SIZE)
    const disciplineLeaks = useMemo(() => {
        let leaks = [];
        const addIfLeak = (label, items) => {
            const p = performanceSummary(items);
            if (p.trades >= MIN_SAMPLE_SIZE && p.netPnl < 0) {
                leaks.push({ label, ...p, tradesArr: items });
            }
        }

        addIfLeak("RULES VIOLATED", rulesViolatedGrp.tradesArr || []);
        const mmViolations = mmGroups.find(g => g.label === "NO" || g.label === "VIOLATED");
        if (mmViolations) addIfLeak("MONEY MANAGEMENT FAILED", mmViolations.tradesArr);

        // Any emotion strictly mapping to negative PnL? Let data speak:
        emoGroups.forEach(eg => {
            if (eg.label !== "UNKNOWN") addIfLeak(`EMOTION: ${eg.label}`, eg.tradesArr);
        });

        return leaks.sort((a, b) => a.netPnl - b.netPnl).slice(0, 4); // Top 4 worst netPnl behaviors
    }, [rulesViolatedGrp, mmGroups, emoGroups]);

    // Overall KPI
    const checklistCompletionPct = checklistGroups.length > 0
        ? (checklistGroups.reduce((acc, g) => acc + g.yes.trades, 0) / checklistGroups.reduce((acc, g) => acc + (g.yes.trades + g.no.trades), 0)) * 100
        : null;

    const RenderMetrics = ({ label, trades, winRate, pnl, avgR, onDrillDown }) => (
        <div className="flex flex-col bg-surface-canvas border border-border-slate/40 rounded p-4 hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-label-caps text-text-high-contrast tracking-widest truncate">{label}</span>
                {onDrillDown && trades > 0 ? (
                    <button onClick={onDrillDown} className="text-[9px] font-label-caps text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary-light hover:underline tracking-widest uppercase">
                        VIEW TRADES
                    </button>
                ) : null}
            </div>
            {trades >= MIN_SAMPLE_SIZE ? (
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-surface-panel p-1 px-2 rounded">
                        <span className="text-[9px] font-label-caps text-text-muted uppercase">Trades</span>
                        <span className="text-[11px] font-data-mono text-text-high-contrast">{trades}</span>
                    </div>
                    <div className="flex justify-between items-center bg-surface-panel p-1 px-2 rounded">
                        <span className="text-[9px] font-label-caps text-text-muted uppercase">Win Rate</span>
                        <span className="text-[11px] font-data-mono text-text-high-contrast">{fmtPct(winRate)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-surface-panel p-1 px-2 rounded">
                        <span className="text-[9px] font-label-caps text-text-muted uppercase">Net P&L</span>
                        <span className={`text-[11px] font-data-mono ${pnl >= 0 ? "text-positive" : "text-negative"}`}>{fmtPnl(pnl)}</span>
                    </div>
                    {avgR != null && (
                        <div className="flex justify-between items-center bg-surface-panel p-1 px-2 rounded">
                            <span className="text-[9px] font-label-caps text-text-muted uppercase">Avg R</span>
                            <span className="text-[11px] font-data-mono text-text-high-contrast">{fmtNum(avgR)}R</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6 border border-dashed border-border-slate/50 rounded bg-surface/30">
                    <span className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-1">INSUFFICIENT SAMPLE</span>
                    <span className="text-[9px] font-data-mono-sm text-text-muted/60">n={trades} (Minimum: {MIN_SAMPLE_SIZE})</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-surface-canvas w-full overflow-hidden absolute inset-0">
            <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 lg:px-8 py-6 custom-scrollbar pb-24 md:pt-[76px] lg:pt-8 min-w-0">
                <div className="max-w-[1240px] mx-auto w-full flex flex-col gap-6 animate-fade-in-up mt-16 md:mt-0">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-slate pb-4 mb-2">
                        <div>
                            <h1 className="font-headline-md text-2xl text-text-high-contrast tracking-widest font-bold uppercase flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[24px]">policy</span>
                                Discipline Center
                            </h1>
                            <p className="text-text-muted text-xs font-data-mono-sm uppercase tracking-wider mt-1">Rule Adherence & Execution Quality</p>
                        </div>

                        {/* Time Filter Tabs */}
                        <div className="flex items-center gap-1 bg-surface-panel p-1 rounded border border-border-slate shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                            {["ALL", "YTD", "3M", "1M", "1W"].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTimeFilter(t)}
                                    className={`px-4 py-2 rounded text-[10px] font-label-caps tracking-widest transition-all ${timeFilter === t ? 'bg-primary text-on-primary font-bold shadow-sm' : 'text-text-muted hover:text-text-high-contrast hover:bg-surface-hover'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ERROR IF EMPTY */}
                    {filteredTrades.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-24 bg-surface-panel border border-dashed border-border-slate rounded opacity-80 gap-3">
                            <span className="material-symbols-outlined text-4xl text-text-muted opacity-50">gavel</span>
                            <span className="text-text-high-contrast font-label-caps tracking-widest text-lg">NO TRADE DATA IN THIS PERIOD</span>
                            <span className="text-xs font-data-mono-sm text-text-muted">Adjust the time filter or add trades.</span>
                        </div>
                    ) : (
                        <>
                            {/* KPI COMMAND STRIP */}
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                                <div className="bg-surface-panel border border-border-slate p-4 rounded flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] hover:border-primary/30 transition-colors">
                                    <span className="text-[9px] font-label-caps text-text-muted tracking-widest mb-1.5 uppercase">Rule Adherence</span>
                                    <span className={`text-xl font-data-mono ${summary.trades > 0 && rulesFollowedGrp.trades / summary.trades > 0.8 ? 'text-positive' : 'text-text-high-contrast'}`}>{summary.trades > 0 ? fmtPct(rulesFollowedGrp.trades / summary.trades) : "---"}</span>
                                </div>
                                <div className="bg-surface-panel border border-border-slate p-4 rounded flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] hover:border-primary/30 transition-colors">
                                    <span className="text-[9px] font-label-caps text-text-muted tracking-widest mb-1.5 uppercase">Rule Violations</span>
                                    <span className={`text-xl font-data-mono ${rulesViolatedGrp.trades > 0 ? 'text-negative' : 'text-positive'}`}>{rulesViolatedGrp.trades}</span>
                                </div>
                                <div className="bg-surface-panel border border-border-slate p-4 rounded flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] hover:border-primary/30 transition-colors">
                                    <span className="text-[9px] font-label-caps text-text-muted tracking-widest mb-1.5 uppercase">Partial Adherence</span>
                                    <span className="text-xl font-data-mono text-attention">{rulesPartialGrp.trades}</span>
                                </div>
                                <div className="bg-surface-panel border border-border-slate p-4 rounded flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] hover:border-primary/30 transition-colors">
                                    <span className="text-[9px] font-label-caps text-text-muted tracking-widest mb-1.5 uppercase">Checklist Compl.</span>
                                    <span className="text-xl font-data-mono text-text-high-contrast">{checklistCompletionPct != null ? fmtPct(checklistCompletionPct / 100) : "---"}</span>
                                </div>
                                <div className="bg-surface-panel border border-border-slate p-4 rounded flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] hover:border-primary/30 transition-colors">
                                    <span className="text-[9px] font-label-caps text-text-muted tracking-widest mb-1.5 uppercase">Money Management</span>
                                    <span className="text-xl font-data-mono text-text-high-contrast">
                                        {mmGroups.find(g => g.label === "YES") ? fmtPct((mmGroups.find(g => g.label === "YES").trades / summary.trades)) : "---"}
                                    </span>
                                </div>
                                <div className="bg-surface-panel border border-border-slate p-4 rounded flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] hover:border-primary/30 transition-colors">
                                    <span className="text-[9px] font-label-caps text-text-muted tracking-widest mb-1.5 uppercase">Total Trades Filtered</span>
                                    <span className="text-xl font-data-mono text-text-high-contrast">{summary.trades}</span>
                                </div>
                            </div>

                            {/* RULES X PERFORMANCE MATRIX */}
                            <div className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm overflow-x-auto w-full custom-scrollbar">
                                <h3 className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase border-b border-border-slate pb-2 mb-4">Rule Adherence × Historical Performance</h3>
                                <div className="min-w-[700px] grid grid-cols-[minmax(140px,1fr)_1fr_1fr_1fr_1fr] gap-4 mb-2 border-b border-border-slate/50 pb-2">
                                    <div className="text-[9px] font-label-caps text-text-muted uppercase px-2">Status</div>
                                    <div className="text-[9px] font-label-caps text-text-muted uppercase text-right bg-surface-canvas/50 px-2 py-1 rounded">Trades</div>
                                    <div className="text-[9px] font-label-caps text-text-muted uppercase text-right bg-surface-canvas/50 px-2 py-1 rounded">Win Rate</div>
                                    <div className="text-[9px] font-label-caps text-text-muted uppercase text-right bg-surface-canvas/50 px-2 py-1 rounded">Avg R</div>
                                    <div className="text-[9px] font-label-caps text-text-muted uppercase text-right bg-surface-canvas/50 px-2 py-1 rounded">Net P&L</div>
                                </div>
                                {ruleMatrix.map(row => (
                                    <div key={row.label} className="min-w-[700px] grid grid-cols-[minmax(140px,1fr)_1fr_1fr_1fr_1fr] gap-4 py-3 border-b border-border-slate/30 last:border-0 hover:bg-surface-hover items-center transition-colors px-2 rounded mt-1 group">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-[11px] font-label-caps text-text-high-contrast tracking-widest">{row.label}</span>
                                            {row.grp.trades > 0 && <button onClick={() => row.grp.tradesArr[0] && onSelectTrade(row.grp.tradesArr[0], row.grp.tradesArr)} className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase cursor-pointer hover:bg-primary hover:text-on-primary transition-colors opacity-0 group-hover:opacity-100">View All</button>}
                                        </div>
                                        {row.grp.trades >= MIN_SAMPLE_SIZE ? (
                                            <>
                                                <div className="text-sm font-data-mono text-text-high-contrast text-right">{row.grp.trades}</div>
                                                <div className="text-sm font-data-mono text-text-high-contrast text-right">{fmtPct(row.grp.winRate)}</div>
                                                <div className="text-sm font-data-mono text-text-high-contrast text-right">{fmtNum(row.grp.tradesArr?.reduce((a, b) => a + (Number(b.rr) || 0), 0) / row.grp.trades)}</div>
                                                <div className={`text-sm font-data-mono text-right ${row.grp.netPnl >= 0 ? "text-positive" : "text-negative"}`}>{fmtPnl(row.grp.netPnl)}</div>
                                            </>
                                        ) : (
                                            <div className="col-span-4 text-[10px] font-data-mono-sm text-text-muted/50 text-center py-2 bg-surface-canvas/50 rounded flex justify-center items-center gap-2">
                                                <span className="material-symbols-outlined text-[14px]">warning</span> INSUFFICIENT SAMPLE {row.grp.trades > 0 && `(n=${row.grp.trades})`}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* TWO COLUMNS: LEAKS + CONDITIONS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* DISCIPLINE LEAKS */}
                                <div className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm flex flex-col">
                                    <h3 className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase border-b border-border-slate pb-2 mb-4 flex justify-between items-center">
                                        <span>Discipline Leaks</span>
                                        <span className="text-[8px] opacity-60">BEHAVIORS DEGRADING P&L</span>
                                    </h3>

                                    <div className="flex flex-col gap-3 flex-1 justify-center">
                                        {disciplineLeaks.length === 0 ? (
                                            <div className="text-[10px] font-label-caps text-text-muted/60 p-6 border border-dashed border-border-slate/50 rounded flex justify-center items-center bg-surface-canvas">NO CLEAR NEGATIVE LEAKS</div>
                                        ) : disciplineLeaks.map(leak => (
                                            <div key={leak.label} className="flex justify-between items-center p-3 sm:px-4 bg-surface-canvas border border-border-slate/50 rounded hover:border-negative/30 transition-colors group shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-label-caps text-text-high-contrast uppercase tracking-widest">{leak.label}</span>
                                                    <button onClick={() => leak.tradesArr[0] && onSelectTrade(leak.tradesArr[0], leak.tradesArr)} className="text-left text-[8px] font-label-caps text-negative opacity-80 hover:opacity-100 bg-negative/10 px-1.5 py-0.5 rounded inline-block w-fit transition-colors">VIEW {leak.trades} TRADES</button>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[15px] font-data-mono text-negative">{fmtPnl(leak.netPnl)}</span>
                                                    <span className="text-[10px] font-data-mono-sm text-text-muted bg-surface-panel px-1.5 py-0.5 rounded border border-border-slate/60">{fmtPct(leak.winRate)} WR</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* TARGET CONDITIONS */}
                                <div className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm flex flex-col gap-6">
                                    <h3 className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase border-b border-border-slate pb-2 mb-0">Combinations Analysis</h3>

                                    {/* Best */}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[9px] font-label-caps text-text-muted uppercase flex items-center gap-1"><span className="material-symbols-outlined text-positive text-[12px]">trending_up</span> Highest Historical Performance</span>
                                        {bestCondition ? (
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-canvas border border-positive/30 rounded shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
                                                <div className="flex flex-col pb-3 sm:pb-0 gap-1 lg:max-w-[150px] xl:max-w-[200px]">
                                                    <span className="text-[11px] font-label-caps font-bold text-text-high-contrast truncate" title={bestCondition.name}>{bestCondition.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-data-mono-sm text-text-muted bg-surface-panel px-1 rounded">n = {bestCondition.trades}</span>
                                                        <button onClick={() => bestCondition.tradesArr[0] && onSelectTrade(bestCondition.tradesArr[0], bestCondition.tradesArr)} className="text-[8px] font-label-caps text-primary hover:underline uppercase">View</button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between sm:justify-end sm:gap-6 border-t sm:border-t-0 border-border-slate/30 pt-3 sm:pt-0">
                                                    <div className="flex flex-col items-start sm:items-end gap-0.5">
                                                        <span className="text-[8px] font-label-caps text-text-muted uppercase">Win Rate</span>
                                                        <span className="text-sm font-data-mono text-positive">{fmtPct(bestCondition.winRate)}</span>
                                                    </div>
                                                    <div className="flex flex-col items-start sm:items-end gap-0.5">
                                                        <span className="text-[8px] font-label-caps text-text-muted uppercase">Net P&L</span>
                                                        <span className="text-sm font-data-mono text-positive">{fmtPnl(bestCondition.netPnl)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : <div className="text-[9px] text-text-muted font-label-caps p-3 bg-surface-canvas rounded border border-dashed border-border-slate">INSUFFICIENT SAMPLE SIZE (n &lt; {MIN_SAMPLE_SIZE})</div>}
                                    </div>

                                    {/* Worst */}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[9px] font-label-caps text-text-muted uppercase flex items-center gap-1"><span className="material-symbols-outlined text-negative text-[12px]">trending_down</span> Lowest Historical Performance</span>
                                        {worstCondition ? (
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-canvas border border-negative/30 rounded shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
                                                <div className="flex flex-col pb-3 sm:pb-0 gap-1 lg:max-w-[150px] xl:max-w-[200px]">
                                                    <span className="text-[11px] font-label-caps font-bold text-text-high-contrast truncate" title={worstCondition.name}>{worstCondition.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-data-mono-sm text-text-muted bg-surface-panel px-1 rounded">n = {worstCondition.trades} </span>
                                                        <button onClick={() => worstCondition.tradesArr[0] && onSelectTrade(worstCondition.tradesArr[0], worstCondition.tradesArr)} className="text-[8px] font-label-caps text-primary hover:underline uppercase">View</button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between sm:justify-end sm:gap-6 border-t sm:border-t-0 border-border-slate/30 pt-3 sm:pt-0">
                                                    <div className="flex flex-col items-start sm:items-end gap-0.5">
                                                        <span className="text-[8px] font-label-caps text-text-muted uppercase">Win Rate</span>
                                                        <span className="text-sm font-data-mono text-negative">{fmtPct(worstCondition.winRate)}</span>
                                                    </div>
                                                    <div className="flex flex-col items-start sm:items-end gap-0.5">
                                                        <span className="text-[8px] font-label-caps text-text-muted uppercase">Net P&L</span>
                                                        <span className="text-sm font-data-mono text-negative">{fmtPnl(worstCondition.netPnl)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : <div className="text-[9px] text-text-muted font-label-caps p-3 bg-surface-canvas rounded border border-dashed border-border-slate">INSUFFICIENT SAMPLE SIZE (n &lt; {MIN_SAMPLE_SIZE})</div>}
                                    </div>
                                </div>
                            </div>

                            {/* EMOTION & CONFIDENCE SECTIONS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* PERFORMANCE BY EMOTION */}
                                <div className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm">
                                    <h3 className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase border-b border-border-slate pb-2 mb-4">Performance by Emotion</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {emoGroups.length > 0 ? emoGroups.slice(0, 6).map(g => (
                                            <RenderMetrics key={g.label} label={g.label} trades={g.trades} winRate={g.winRate} pnl={g.netPnl} onDrillDown={() => g.tradesArr[0] && onSelectTrade(g.tradesArr[0], g.tradesArr)} />
                                        )) : <div className="text-[10px] font-label-caps tracking-widest text-text-muted italic col-span-2 p-8 border border-dashed border-border-slate rounded flex justify-center bg-surface-canvas">NO EMOTIONAL DATA RECORDED</div>}
                                    </div>
                                </div>

                                {/* PERFORMANCE BY CONFIDENCE */}
                                <div className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm">
                                    <h3 className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase border-b border-border-slate pb-2 mb-4">Performance by Confidence</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {confGroups.length > 0 ? confGroups.map(g => (
                                            <RenderMetrics key={g.label} label={g.label} trades={g.trades} winRate={g.winRate} pnl={g.netPnl} onDrillDown={() => g.tradesArr[0] && onSelectTrade(g.tradesArr[0], g.tradesArr)} />
                                        )) : <div className="text-[10px] font-label-caps tracking-widest text-text-muted italic col-span-2 p-8 border border-dashed border-border-slate rounded flex justify-center bg-surface-canvas">NO CONFIDENCE DATA RECORDED</div>}
                                    </div>
                                </div>
                            </div>

                            {/* MONEY MANAGEMENT STRIP */}
                            <div className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm">
                                <h3 className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase border-b border-border-slate pb-2 mb-4">Money Management Execution</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {mmGroups.find(g => g.label === "YES") ? <RenderMetrics label="YES" {...mmGroups.find(g => g.label === "YES")} onDrillDown={() => onSelectTrade(mmGroups.find(g => g.label === "YES").tradesArr[0], mmGroups.find(g => g.label === "YES").tradesArr)} /> : <div className="text-[9px] font-label-caps text-text-muted opacity-50 border border-dashed border-border-slate p-4 rounded flex items-center justify-center">YES (NO DATA)</div>}
                                    {mmGroups.find(g => g.label === "PARTIAL") ? <RenderMetrics label="PARTIAL" {...mmGroups.find(g => g.label === "PARTIAL")} onDrillDown={() => onSelectTrade(mmGroups.find(g => g.label === "PARTIAL").tradesArr[0], mmGroups.find(g => g.label === "PARTIAL").tradesArr)} /> : <div className="text-[9px] font-label-caps text-text-muted opacity-50 border border-dashed border-border-slate p-4 rounded flex items-center justify-center">PARTIAL (NO DATA)</div>}
                                    {mmGroups.find(g => g.label === "NO") ? <RenderMetrics label="NO" {...mmGroups.find(g => g.label === "NO")} onDrillDown={() => onSelectTrade(mmGroups.find(g => g.label === "NO").tradesArr[0], mmGroups.find(g => g.label === "NO").tradesArr)} /> : <div className="text-[9px] font-label-caps text-text-muted opacity-50 border border-dashed border-border-slate p-4 rounded flex items-center justify-center">NO (NO DATA)</div>}
                                </div>
                            </div>

                            {/* CHECKLIST COMPLIANCE */}
                            {checklistGroups.length > 0 && (
                                <div className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm mb-12">
                                    <h3 className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase border-b border-border-slate pb-2 mb-4">Checklist Condition Analysis</h3>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        {checklistGroups.map(ch => (
                                            <div key={ch.key} className="flex flex-col sm:flex-row gap-4 bg-surface-canvas border border-border-slate p-4 rounded hover:border-primary/20 transition-colors shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
                                                <div className="sm:w-1/3 flex flex-col justify-center border-b sm:border-b-0 border-border-slate/50 pb-3 sm:pb-0">
                                                    <span className="text-[12px] font-label-caps text-text-high-contrast uppercase tracking-widest mb-1.5 truncate" title={ch.key}>{ch.key.replace(/([A-Z])/g, ' $1')}</span>
                                                    <span className="text-[9px] font-data-mono-sm text-text-muted bg-surface-panel px-2 py-0.5 rounded w-fit">{ch.yes.trades + ch.no.trades} trades recorded</span>
                                                </div>
                                                <div className="sm:w-2/3 flex flex-col gap-2.5">
                                                    {/* YES ROW */}
                                                    <div className="grid grid-cols-[60px_1fr_1fr_1fr] sm:grid-cols-4 gap-2 items-center bg-surface-panel py-2 px-3 rounded shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] border border-transparent hover:border-positive/20 relative group">
                                                        {ch.yes.trades > 0 && <button onClick={() => onSelectTrade(ch.yes.tradesArr[0], ch.yes.tradesArr)} className="absolute inset-0 w-full h-full cursor-pointer z-10 opacity-0"></button>}
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-label-caps text-text-muted tracking-wider">YES</span>
                                                            <span className="text-[11px] font-data-mono text-text-high-contrast">{ch.yes.trades}T</span>
                                                        </div>
                                                        {ch.yes.trades >= MIN_SAMPLE_SIZE ? (
                                                            <>
                                                                <div className="flex flex-col text-right z-0">
                                                                    <span className="text-[8px] font-label-caps text-text-muted opacity-80 uppercase">Win Rate</span>
                                                                    <span className="text-[11px] font-data-mono text-text-high-contrast">{fmtPct(ch.yes.winRate)}</span>
                                                                </div>
                                                                <div className="flex flex-col text-right z-0">
                                                                    <span className="text-[8px] font-label-caps text-text-muted opacity-80 uppercase">Avg R</span>
                                                                    <span className="text-[11px] font-data-mono text-text-high-contrast">{fmtNum(ch.yes.tradesArr.reduce((a, b) => a + (Number(b.rr) || 0), 0) / ch.yes.trades)}</span>
                                                                </div>
                                                                <div className="flex flex-col text-right z-0">
                                                                    <span className="text-[8px] font-label-caps text-text-muted opacity-80 uppercase">P&L</span>
                                                                    <span className={`text-[11px] font-data-mono ${ch.yes.netPnl >= 0 ? "text-positive" : "text-negative"}`}>{fmtPnl(ch.yes.netPnl)}</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="col-span-3 text-[9px] font-data-mono-sm text-text-muted text-center flex items-center justify-center z-0">INSUFFICIENT SAMPLE (n={ch.yes.trades})</div>
                                                        )}
                                                    </div>
                                                    {/* NO ROW */}
                                                    <div className="grid grid-cols-[60px_1fr_1fr_1fr] sm:grid-cols-4 gap-2 items-center bg-surface-panel py-2 px-3 rounded shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] border border-transparent hover:border-negative/20 relative group">
                                                        {ch.no.trades > 0 && <button onClick={() => onSelectTrade(ch.no.tradesArr[0], ch.no.tradesArr)} className="absolute inset-0 w-full h-full cursor-pointer z-10 opacity-0"></button>}
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-label-caps text-text-muted tracking-wider">NO</span>
                                                            <span className="text-[11px] font-data-mono text-text-high-contrast">{ch.no.trades}T</span>
                                                        </div>
                                                        {ch.no.trades >= MIN_SAMPLE_SIZE ? (
                                                            <>
                                                                <div className="flex flex-col text-right z-0">
                                                                    <span className="text-[8px] font-label-caps text-text-muted opacity-80 uppercase">Win Rate</span>
                                                                    <span className="text-[11px] font-data-mono text-text-high-contrast">{fmtPct(ch.no.winRate)}</span>
                                                                </div>
                                                                <div className="flex flex-col text-right z-0">
                                                                    <span className="text-[8px] font-label-caps text-text-muted opacity-80 uppercase">Avg R</span>
                                                                    <span className="text-[11px] font-data-mono text-text-high-contrast">{fmtNum(ch.no.tradesArr.reduce((a, b) => a + (Number(b.rr) || 0), 0) / ch.no.trades)}</span>
                                                                </div>
                                                                <div className="flex flex-col text-right z-0">
                                                                    <span className="text-[8px] font-label-caps text-text-muted opacity-80 uppercase">P&L</span>
                                                                    <span className={`text-[11px] font-data-mono ${ch.no.netPnl >= 0 ? "text-positive" : "text-negative"}`}>{fmtPnl(ch.no.netPnl)}</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="col-span-3 text-[9px] font-data-mono-sm text-text-muted text-center flex items-center justify-center z-0">INSUFFICIENT SAMPLE (n={ch.no.trades})</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
