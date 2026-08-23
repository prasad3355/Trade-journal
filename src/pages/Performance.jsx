import { useState, useMemo } from "react";
import { performanceSummary, groupedPerformance } from "../utils/analytics";

// ─── Constants ─────────────────────────────────────────────────────────────
const MIN_SAMPLE_SIZE = 3;

// ─── Date Thresholds (computed once at module load) ─────────────────────────
const _now = new Date();
const DATE_THRESHOLDS = {
    YTD: new Date(_now.getFullYear(), 0, 1).toISOString().slice(0, 10),
    "3M": new Date(_now.getFullYear(), _now.getMonth() - 3, _now.getDate()).toISOString().slice(0, 10),
    "1M": new Date(_now.getFullYear(), _now.getMonth() - 1, _now.getDate()).toISOString().slice(0, 10),
    "1W": new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() - 7).toISOString().slice(0, 10),
};

// ─── Display normaliser (visual only – never mutates stored value) ──────────
function normalisePair(rawPair) {
    if (!rawPair) return "UNKNOWN";
    const s = String(rawPair).toUpperCase().trim();
    // Insert slash for common 6-char forex/crypto codes only if no slash yet
    if (!s.includes("/") && s.length === 6) return s.slice(0, 3) + "/" + s.slice(3);
    return s;
}

// ─── Safe formatters ────────────────────────────────────────────────────────
const fmtPct = (v) => (v != null && isFinite(v)) ? (v * 100).toFixed(1) + "%" : "---";
const fmtPnl = (v) => (v != null && isFinite(v)) ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}` : "---";
const fmtR = (v) => (v != null && isFinite(v)) ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}R` : "---";
const fmtPF = (v) => (v != null && isFinite(v)) ? v.toFixed(2) : "---";

// Average R-multiple for an array of trades
function avgR(tradesArr) {
    if (!tradesArr?.length) return null;
    const vals = tradesArr.map((t) => Number(t.rr)).filter(isFinite);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ─── Shared grouping helper ──────────────────────────────────────────────────
// Returns sorted array of { label, tradesArr, trades, winRate, netPnl, profitFactor, avgR, best, worst }
function buildGroups(trades, fieldFn, sortKey = "netPnl") {
    const map = new Map();
    trades.forEach((t) => {
        const raw = fieldFn(t);
        const key = raw ? String(raw).trim() : "Unspecified";
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
    });
    return [...map.entries()]
        .map(([label, items]) => {
            const s = performanceSummary(items);
            return { label, tradesArr: items, ...s, avgRVal: avgR(items) };
        })
        .sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
}

// ─── Time-filter helper ──────────────────────────────────────────────────────
function applyTimeFilter(trades, filter) {
    if (filter === "ALL") return trades;
    const threshold = DATE_THRESHOLDS[filter];
    return trades.filter((t) => t.date && t.date.slice(0, 10) >= threshold);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Shared stat cell ────────────────────────────────────────────────────────
function StatCell({ label, value, accent }) {
    return (
        <div className="flex flex-col">
            <span className="text-[8px] font-label-caps text-text-muted uppercase tracking-widest leading-tight">{label}</span>
            <span className={`text-[12px] font-data-mono leading-snug ${accent || "text-text-high-contrast"}`}>{value}</span>
        </div>
    );
}

// ── Insufficient sample banner ───────────────────────────────────────────────
function InsufficientSample({ n }) {
    return (
        <div className="flex items-center gap-1.5 text-[9px] font-label-caps text-text-muted/60 tracking-widest p-1">
            <span className="material-symbols-outlined text-[11px]">warning</span>
            INSUFFICIENT SAMPLE (n={n})
        </div>
    );
}

// ── Group row used in Instruments, Setups, Sessions, etc. ───────────────────
function GroupRow({ display, group, onDrillDown }) {
    const { tradesArr, trades, winRate, netPnl, profitFactor, avgRVal, best, worst } = group;
    const hasData = trades >= MIN_SAMPLE_SIZE;

    return (
        <div className="grid grid-cols-[minmax(100px,1.5fr)_1fr_1fr_1fr_1fr_1fr_minmax(60px,auto)] items-center gap-x-4 gap-y-0 px-3 py-2.5 border-b border-border-slate/30 last:border-0 hover:bg-surface-hover transition-colors group rounded-sm">
            {/* Name */}
            <div className="flex flex-col">
                <span className="text-[11px] font-label-caps text-text-high-contrast truncate">{display}</span>
                <span className="text-[9px] font-data-mono-sm text-text-muted">n={trades}</span>
            </div>

            {hasData ? (
                <>
                    <StatCell label="Win Rate" value={fmtPct(winRate)} accent={winRate >= 0.5 ? "text-positive" : "text-negative"} />
                    <StatCell label="Net P&L" value={fmtPnl(netPnl)} accent={netPnl >= 0 ? "text-positive" : "text-negative"} />
                    <StatCell label="Avg R" value={fmtR(avgRVal)} accent={avgRVal >= 0 ? "text-positive" : "text-negative"} />
                    <StatCell label="Prof. Factor" value={fmtPF(profitFactor)} />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-label-caps text-text-muted uppercase tracking-widest">Best / Worst</span>
                        <span className="text-[10px] font-data-mono text-positive">{best ? fmtPnl(best.pnl) : "---"}</span>
                        <span className="text-[10px] font-data-mono text-negative">{worst ? fmtPnl(worst.pnl) : "---"}</span>
                    </div>
                </>
            ) : (
                <div className="col-span-5 flex items-center">
                    <InsufficientSample n={trades} />
                </div>
            )}

            {/* Drill-down */}
            <div className="flex justify-end">
                {trades > 0 ? (
                    <button
                        onClick={() => onDrillDown(tradesArr)}
                        className="text-[8px] font-label-caps text-primary bg-primary/10 hover:bg-primary hover:text-on-primary px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 whitespace-nowrap"
                        aria-label={`View ${trades} trades for ${display}`}
                    >
                        VIEW&nbsp;{trades}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
    return (
        <div className="bg-surface-panel border border-border-slate rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border-slate flex justify-between items-center">
                <div>
                    <h2 className="text-[11px] font-label-caps text-text-high-contrast tracking-widest uppercase">{title}</h2>
                    {subtitle && <p className="text-[9px] font-data-mono-sm text-text-muted mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

// ── Column headers for GroupRow tables ──────────────────────────────────────
function GroupHeader({ col1 = "Name" }) {
    return (
        <div className="grid grid-cols-[minmax(100px,1.5fr)_1fr_1fr_1fr_1fr_1fr_minmax(60px,auto)] gap-x-4 px-3 py-1.5 bg-surface-canvas border-b border-border-slate">
            {[col1, "Win Rate", "Net P&L", "Avg R", "Prof. Factor", "Best / Worst", ""].map((h, i) => (
                <span key={i} className="text-[8px] font-label-caps text-text-muted uppercase tracking-widest">{h}</span>
            ))}
        </div>
    );
}

// ── Ranking table (top / bottom performers) ─────────────────────────────────
function RankTable({ groups, category, onDrillDown, limit = 5 }) {
    return (
        <div className="flex flex-col divide-y divide-border-slate/30">
            {groups.slice(0, limit).map((g, i) => {
                const display = category === "pair" ? normalisePair(g.label) : g.label;
                const hasData = g.trades >= MIN_SAMPLE_SIZE;
                return (
                    <div key={g.label} className="flex items-center gap-4 px-4 py-2.5 hover:bg-surface-hover transition-colors group">
                        <span className="text-[10px] font-data-mono text-text-muted w-5 shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-label-caps text-text-high-contrast truncate block">{display}</span>
                            <span className="text-[9px] font-data-mono-sm text-text-muted">n={g.trades}</span>
                        </div>
                        {hasData ? (
                            <>
                                <StatCell label="WR" value={fmtPct(g.winRate)} accent={g.winRate >= 0.5 ? "text-positive" : "text-negative"} />
                                <StatCell label="Avg R" value={fmtR(g.avgRVal)} accent={g.avgRVal >= 0 ? "text-positive" : "text-negative"} />
                                <StatCell label="P&L" value={fmtPnl(g.netPnl)} accent={g.netPnl >= 0 ? "text-positive" : "text-negative"} />
                            </>
                        ) : (
                            <InsufficientSample n={g.trades} />
                        )}
                        {g.trades > 0 && (
                            <button
                                onClick={() => onDrillDown(g.tradesArr)}
                                className="text-[8px] font-label-caps text-primary bg-primary/10 hover:bg-primary hover:text-on-primary px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 whitespace-nowrap shrink-0"
                                aria-label={`View trades for ${display}`}
                            >
                                VIEW
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function Performance({ trades, onSelectTrade }) {
    const [timeFilter, setTimeFilter] = useState("ALL");
    const [secFilter, setSecFilter] = useState({ pair: "", setup: "", direction: "", timeframe: "", session: "" });

    // ── 1. Time-filtered base dataset ──────────────────────────────────────
    const timeTrades = useMemo(() => applyTimeFilter(trades, timeFilter), [trades, timeFilter]);

    // ── 2. Secondary filters ───────────────────────────────────────────────
    const filteredTrades = useMemo(() => {
        return timeTrades.filter((t) => {
            if (secFilter.pair && t.pair !== secFilter.pair) return false;
            if (secFilter.setup && t.setup !== secFilter.setup) return false;
            if (secFilter.direction && t.direction !== secFilter.direction) return false;
            if (secFilter.timeframe && t.timeframe !== secFilter.timeframe) return false;
            if (secFilter.session && t.session !== secFilter.session) return false;
            return true;
        });
    }, [timeTrades, secFilter]);

    // ── 3. Global KPIs ─────────────────────────────────────────────────────
    const kpi = useMemo(() => performanceSummary(filteredTrades), [filteredTrades]);
    const kpiAvgR = useMemo(() => avgR(filteredTrades), [filteredTrades]);

    // ── 4. Group datasets ──────────────────────────────────────────────────
    const instrumentGroups = useMemo(() => buildGroups(filteredTrades, (t) => t.pair, "netPnl"), [filteredTrades]);
    const setupGroups = useMemo(() => buildGroups(filteredTrades, (t) => t.setup || "Unspecified", "netPnl"), [filteredTrades]);
    const directionGroups = useMemo(() => buildGroups(filteredTrades, (t) => t.direction || "Unspecified", "netPnl"), [filteredTrades]);
    const timeframeGroups = useMemo(() => buildGroups(filteredTrades, (t) => t.timeframe || "Unspecified", "netPnl"), [filteredTrades]);
    const sessionGroups = useMemo(() => buildGroups(filteredTrades, (t) => t.session || "Unspecified", "netPnl"), [filteredTrades]);

    // ── 5. Instrument × Setup Matrix ──────────────────────────────────────
    // Collect unique instruments and setups (with ≥ MIN_SAMPLE_SIZE total)
    const matrixData = useMemo(() => {
        const instruments = instrumentGroups
            .filter((g) => g.trades >= MIN_SAMPLE_SIZE)
            .map((g) => g.label)
            .slice(0, 8); // cap for readability

        const setups = setupGroups
            .filter((g) => g.trades >= MIN_SAMPLE_SIZE)
            .map((g) => g.label)
            .slice(0, 6);

        // Build cell map: key = `${instrument}|${setup}`
        const cellMap = new Map();
        filteredTrades.forEach((t) => {
            const inst = t.pair || "";
            const setup = t.setup || "";
            const key = `${inst}|${setup}`;
            if (!cellMap.has(key)) cellMap.set(key, []);
            cellMap.get(key).push(t);
        });

        const cells = {};
        instruments.forEach((inst) => {
            setups.forEach((setup) => {
                const arr = cellMap.get(`${inst}|${setup}`) || [];
                cells[`${inst}|${setup}`] = { arr, avgRVal: avgR(arr), n: arr.length };
            });
        });

        return { instruments, setups, cells };
    }, [filteredTrades, instrumentGroups, setupGroups]);

    // ── 6. Ranking ─────────────────────────────────────────────────────────
    const qualifiedInstruments = useMemo(
        () => instrumentGroups.filter((g) => g.trades >= MIN_SAMPLE_SIZE),
        [instrumentGroups]
    );
    const qualifiedSetups = useMemo(
        () => setupGroups.filter((g) => g.trades >= MIN_SAMPLE_SIZE),
        [setupGroups]
    );

    // Best = sorted desc by avgR
    const topInstruments = useMemo(() => [...qualifiedInstruments].sort((a, b) => (b.avgRVal ?? -Infinity) - (a.avgRVal ?? -Infinity)).slice(0, 5), [qualifiedInstruments]);
    const topSetups = useMemo(() => [...qualifiedSetups].sort((a, b) => (b.avgRVal ?? -Infinity) - (a.avgRVal ?? -Infinity)).slice(0, 5), [qualifiedSetups]);
    const lowInstruments = useMemo(() => [...qualifiedInstruments].sort((a, b) => (a.avgRVal ?? Infinity) - (b.avgRVal ?? Infinity)).slice(0, 5), [qualifiedInstruments]);
    const lowSetups = useMemo(() => [...qualifiedSetups].sort((a, b) => (a.avgRVal ?? Infinity) - (b.avgRVal ?? Infinity)).slice(0, 5), [qualifiedSetups]);

    // Best overall single instrument / setup for KPI strip
    const bestInstrument = topInstruments[0];
    const bestSetup = topSetups[0];

    // ── 7. Filter options (unique distinct values) ─────────────────────────
    const filterOptions = useMemo(() => {
        const uniq = (field) => [...new Set(timeTrades.map((t) => t[field]).filter(Boolean))].sort();
        return {
            pair: uniq("pair"),
            setup: uniq("setup"),
            direction: uniq("direction"),
            timeframe: uniq("timeframe"),
            session: uniq("session"),
        };
    }, [timeTrades]);

    // ── Helpers ────────────────────────────────────────────────────────────
    const drillDown = (arr) => {
        if (!arr?.length) return;
        // Pass the first trade as the "selected" trade; the full array as context
        onSelectTrade(arr[0], arr);
    };

    const clearFilters = () => setSecFilter({ pair: "", setup: "", direction: "", timeframe: "", session: "" });
    const hasSecFilter = Object.values(secFilter).some(Boolean);

    // ── Session section guard (only show if meaningful data exists) ─────────
    const hasSessionData = sessionGroups.some(
        (g) => g.label !== "Unspecified" && g.trades >= 1
    );

    // ────────────────────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-surface-canvas w-full overflow-hidden absolute inset-0">
            <div className="flex-1 h-full overflow-y-auto px-4 lg:px-8 py-6 pb-16 custom-scrollbar md:pt-[76px] lg:pt-8 min-w-0">
                <div className="max-w-[1280px] mx-auto w-full flex flex-col gap-6 animate-fade-in-up mt-16 md:mt-0">

                    {/* ── HEADER ─────────────────────────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-slate pb-4">
                        <div>
                            <h1 className="text-2xl font-bold font-headline-md text-text-high-contrast tracking-widest uppercase flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[24px]">insights</span>
                                Performance Center
                            </h1>
                            <p className="text-text-muted text-xs font-data-mono-sm uppercase tracking-wider mt-1">
                                Setup / Instrument / Execution Performance
                            </p>
                        </div>

                        {/* Time filter */}
                        <div className="flex items-center gap-1 bg-surface-panel p-1 rounded border border-border-slate shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                            {["ALL", "YTD", "3M", "1M", "1W"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTimeFilter(t)}
                                    className={`px-4 py-2 rounded text-[10px] font-label-caps tracking-widest transition-all focus:outline-none focus:ring-1 focus:ring-primary
                    ${timeFilter === t ? "bg-primary text-on-primary font-bold shadow-sm" : "text-text-muted hover:text-text-high-contrast hover:bg-surface-hover"}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
                    {filteredTrades.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-28 bg-surface-panel border border-dashed border-border-slate rounded gap-3">
                            <span className="material-symbols-outlined text-[40px] text-text-muted opacity-40">insights</span>
                            <span className="text-text-high-contrast font-label-caps tracking-widest">NO TRADE DATA IN THIS PERIOD</span>
                            <span className="text-xs font-data-mono-sm text-text-muted">Adjust the time filter or add trades.</span>
                        </div>
                    ) : (
                        <>
                            {/* ── KPI COMMAND STRIP ──────────────────────────────────── */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
                                {[
                                    { label: "Total Trades", value: kpi.trades, accent: "text-text-high-contrast" },
                                    { label: "Net P&L", value: fmtPnl(kpi.netPnl), accent: kpi.netPnl >= 0 ? "text-positive" : "text-negative" },
                                    { label: "Win Rate", value: fmtPct(kpi.winRate), accent: kpi.winRate >= 0.5 ? "text-positive" : "text-text-high-contrast" },
                                    { label: "Avg R", value: fmtR(kpiAvgR), accent: kpiAvgR >= 0 ? "text-positive" : "text-negative" },
                                    { label: "Profit Factor", value: fmtPF(kpi.profitFactor), accent: "text-text-high-contrast" },
                                    { label: "Best Instrument", value: bestInstrument ? normalisePair(bestInstrument.label) : "---", accent: "text-primary" },
                                    { label: "Best Setup", value: bestSetup?.label || "---", accent: "text-primary" },
                                ].map((item) => (
                                    <div key={item.label} className="bg-surface-panel border border-border-slate p-3 rounded flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] hover:border-primary/30 transition-colors">
                                        <span className="text-[8px] font-label-caps text-text-muted tracking-widest mb-1.5 uppercase">{item.label}</span>
                                        <span className={`text-[17px] font-data-mono truncate ${item.accent}`}>{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* ── COMPACT SECONDARY FILTERS ──────────────────────────── */}
                            <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-panel border border-border-slate rounded">
                                <span className="text-[9px] font-label-caps text-text-muted tracking-widest mr-1">FILTER:</span>
                                {(["pair", "setup", "direction", "timeframe", "session"]).map((field) => (
                                    filterOptions[field].length > 0 && (
                                        <select
                                            key={field}
                                            value={secFilter[field]}
                                            onChange={(e) => setSecFilter((p) => ({ ...p, [field]: e.target.value }))}
                                            className="bg-surface-canvas border border-border-slate text-[10px] font-data-mono-sm text-text-high-contrast rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary capitalize"
                                            aria-label={`Filter by ${field}`}
                                        >
                                            <option value="">{field.toUpperCase()} — ALL</option>
                                            {filterOptions[field].map((v) => (
                                                <option key={v} value={v}>{field === "pair" ? normalisePair(v) : v}</option>
                                            ))}
                                        </select>
                                    )
                                ))}
                                {hasSecFilter && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-[9px] font-label-caps text-negative hover:text-negative/80 hover:underline ml-2 focus:outline-none"
                                    >
                                        CLEAR
                                    </button>
                                )}
                            </div>

                            {/* ── INSTRUMENT PERFORMANCE ─────────────────────────────── */}
                            <Section title="Instrument Performance" subtitle={`${instrumentGroups.length} instruments · min. sample ${MIN_SAMPLE_SIZE} trades`}>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <div className="min-w-[700px]">
                                        <GroupHeader col1="Instrument" />
                                        <div className="divide-y divide-border-slate/0">
                                            {instrumentGroups.map((g) => (
                                                <GroupRow
                                                    key={g.label}
                                                    display={normalisePair(g.label)}
                                                    group={g}
                                                    onDrillDown={drillDown}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Section>

                            {/* ── SETUP PERFORMANCE ──────────────────────────────────── */}
                            <Section title="Setup Performance" subtitle={`${setupGroups.length} setups · sorted by Net P&L`}>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <div className="min-w-[700px]">
                                        <GroupHeader col1="Setup" />
                                        {setupGroups.map((g) => (
                                            <GroupRow key={g.label} display={g.label} group={g} onDrillDown={drillDown} />
                                        ))}
                                    </div>
                                </div>
                            </Section>

                            {/* ── TWO-COL: DIRECTION + TIMEFRAME ─────────────────────── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Direction */}
                                <Section title="Direction Performance">
                                    <div className="divide-y divide-border-slate/30">
                                        {directionGroups.map((g) => {
                                            const hasData = g.trades >= MIN_SAMPLE_SIZE;
                                            return (
                                                <div key={g.label} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors group">
                                                    <div className="flex flex-col min-w-[80px]">
                                                        <span className="text-[11px] font-label-caps text-text-high-contrast uppercase">{g.label}</span>
                                                        <span className="text-[9px] font-data-mono-sm text-text-muted">n={g.trades}</span>
                                                    </div>
                                                    {hasData ? (
                                                        <div className="flex flex-wrap gap-4 flex-1">
                                                            <StatCell label="Win Rate" value={fmtPct(g.winRate)} accent={g.winRate >= 0.5 ? "text-positive" : "text-negative"} />
                                                            <StatCell label="Net P&L" value={fmtPnl(g.netPnl)} accent={g.netPnl >= 0 ? "text-positive" : "text-negative"} />
                                                            <StatCell label="Avg R" value={fmtR(g.avgRVal)} accent={g.avgRVal >= 0 ? "text-positive" : "text-negative"} />
                                                        </div>
                                                    ) : (
                                                        <InsufficientSample n={g.trades} />
                                                    )}
                                                    {g.trades > 0 && (
                                                        <button
                                                            onClick={() => drillDown(g.tradesArr)}
                                                            className="text-[8px] font-label-caps text-primary bg-primary/10 hover:bg-primary hover:text-on-primary px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ml-auto whitespace-nowrap"
                                                            aria-label={`View ${g.trades} ${g.label} trades`}
                                                        >
                                                            VIEW&nbsp;{g.trades}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Section>

                                {/* Timeframe */}
                                <Section title="Timeframe Performance">
                                    <div className="divide-y divide-border-slate/30">
                                        {timeframeGroups.map((g) => {
                                            const hasData = g.trades >= MIN_SAMPLE_SIZE;
                                            return (
                                                <div key={g.label} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors group">
                                                    <div className="flex flex-col min-w-[80px]">
                                                        <span className="text-[11px] font-label-caps text-text-high-contrast uppercase">{g.label}</span>
                                                        <span className="text-[9px] font-data-mono-sm text-text-muted">n={g.trades}</span>
                                                    </div>
                                                    {hasData ? (
                                                        <div className="flex flex-wrap gap-4 flex-1">
                                                            <StatCell label="Win Rate" value={fmtPct(g.winRate)} accent={g.winRate >= 0.5 ? "text-positive" : "text-negative"} />
                                                            <StatCell label="Net P&L" value={fmtPnl(g.netPnl)} accent={g.netPnl >= 0 ? "text-positive" : "text-negative"} />
                                                            <StatCell label="Avg R" value={fmtR(g.avgRVal)} accent={g.avgRVal >= 0 ? "text-positive" : "text-negative"} />
                                                        </div>
                                                    ) : (
                                                        <InsufficientSample n={g.trades} />
                                                    )}
                                                    {g.trades > 0 && (
                                                        <button
                                                            onClick={() => drillDown(g.tradesArr)}
                                                            className="text-[8px] font-label-caps text-primary bg-primary/10 hover:bg-primary hover:text-on-primary px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ml-auto whitespace-nowrap"
                                                            aria-label={`View ${g.trades} ${g.label} trades`}
                                                        >
                                                            VIEW&nbsp;{g.trades}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Section>
                            </div>

                            {/* ── SESSION PERFORMANCE (conditional) ─────────────────── */}
                            {hasSessionData && (
                                <Section title="Session Performance">
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <div className="min-w-[600px]">
                                            <GroupHeader col1="Session" />
                                            {sessionGroups
                                                .filter((g) => g.label !== "Unspecified")
                                                .map((g) => (
                                                    <GroupRow key={g.label} display={g.label} group={g} onDrillDown={drillDown} />
                                                ))}
                                        </div>
                                    </div>
                                </Section>
                            )}

                            {/* ── INSTRUMENT × SETUP MATRIX ─────────────────────────── */}
                            {(matrixData.instruments.length > 0 && matrixData.setups.length > 0) && (
                                <Section title="Instrument × Setup Performance Matrix" subtitle={`Avg R per cell · '--' = insufficient sample (n < ${MIN_SAMPLE_SIZE})`}>
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="min-w-max w-full text-left border-collapse" role="grid" aria-label="Instrument vs Setup performance matrix">
                                            <thead>
                                                <tr className="bg-surface-canvas border-b border-border-slate">
                                                    <th className="text-[8px] font-label-caps text-text-muted uppercase tracking-widest px-4 py-2 sticky left-0 bg-surface-canvas z-10 min-w-[120px]">Instrument</th>
                                                    {matrixData.setups.map((s) => (
                                                        <th key={s} className="text-[8px] font-label-caps text-text-muted uppercase tracking-widest px-3 py-2 text-center whitespace-nowrap">{s}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {matrixData.instruments.map((inst, ri) => (
                                                    <tr key={inst} className={`border-b border-border-slate/30 hover:bg-surface-hover transition-colors ${ri % 2 === 1 ? "bg-surface-canvas/30" : ""}`}>
                                                        <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10">
                                                            <span className="text-[11px] font-label-caps text-text-high-contrast">{normalisePair(inst)}</span>
                                                        </td>
                                                        {matrixData.setups.map((setup) => {
                                                            const cell = matrixData.cells[`${inst}|${setup}`];
                                                            const hasSample = cell && cell.n >= MIN_SAMPLE_SIZE;
                                                            const cellAvgR = cell?.avgRVal;
                                                            return (
                                                                <td key={setup} className="px-3 py-2.5 text-center">
                                                                    {hasSample ? (
                                                                        <button
                                                                            onClick={() => drillDown(cell.arr)}
                                                                            className={`flex flex-col items-center gap-0.5 w-full hover:bg-surface-hover rounded px-1 py-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-primary group`}
                                                                            aria-label={`${normalisePair(inst)} ${setup}: ${fmtR(cellAvgR)}, n=${cell.n}`}
                                                                        >
                                                                            <span className={`text-[11px] font-data-mono ${cellAvgR >= 0 ? "text-positive" : "text-negative"}`}>{fmtR(cellAvgR)}</span>
                                                                            <span className="text-[8px] font-data-mono-sm text-text-muted">n={cell.n}</span>
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-[9px] font-data-mono-sm text-text-muted/40">
                                                                            {cell && cell.n > 0 ? `n=${cell.n}` : "--"}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Section>
                            )}

                            {/* ── TOP PERFORMERS + LOWEST PERFORMERS ────────────────── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* TOP */}
                                <Section title="Top Historical Performers" subtitle="Ranked by Avg R · min. sample enforced">
                                    <div className="flex flex-col gap-0 divide-y divide-border-slate/30">
                                        <div className="px-5 py-2 bg-surface-canvas border-b border-border-slate">
                                            <span className="text-[9px] font-label-caps text-primary uppercase tracking-widest">INSTRUMENTS</span>
                                        </div>
                                        {topInstruments.length > 0 ? (
                                            <RankTable groups={topInstruments} category="pair" onDrillDown={drillDown} />
                                        ) : (
                                            <p className="text-[9px] font-label-caps text-text-muted p-4 tracking-widest">INSUFFICIENT DATA (n &lt; {MIN_SAMPLE_SIZE})</p>
                                        )}
                                        <div className="px-5 py-2 bg-surface-canvas border-t border-b border-border-slate">
                                            <span className="text-[9px] font-label-caps text-primary uppercase tracking-widest">SETUPS</span>
                                        </div>
                                        {topSetups.length > 0 ? (
                                            <RankTable groups={topSetups} category="setup" onDrillDown={drillDown} />
                                        ) : (
                                            <p className="text-[9px] font-label-caps text-text-muted p-4 tracking-widest">INSUFFICIENT DATA (n &lt; {MIN_SAMPLE_SIZE})</p>
                                        )}
                                    </div>
                                </Section>

                                {/* LOWEST */}
                                <Section title="Lowest Historical Performance" subtitle="Ranked by Avg R · neutral descriptive analysis only">
                                    <div className="flex flex-col gap-0 divide-y divide-border-slate/30">
                                        <div className="px-5 py-2 bg-surface-canvas border-b border-border-slate">
                                            <span className="text-[9px] font-label-caps text-text-muted uppercase tracking-widest">INSTRUMENTS</span>
                                        </div>
                                        {lowInstruments.length > 0 ? (
                                            <RankTable groups={lowInstruments} category="pair" onDrillDown={drillDown} />
                                        ) : (
                                            <p className="text-[9px] font-label-caps text-text-muted p-4 tracking-widest">INSUFFICIENT DATA (n &lt; {MIN_SAMPLE_SIZE})</p>
                                        )}
                                        <div className="px-5 py-2 bg-surface-canvas border-t border-b border-border-slate">
                                            <span className="text-[9px] font-label-caps text-text-muted uppercase tracking-widest">SETUPS</span>
                                        </div>
                                        {lowSetups.length > 0 ? (
                                            <RankTable groups={lowSetups} category="setup" onDrillDown={drillDown} />
                                        ) : (
                                            <p className="text-[9px] font-label-caps text-text-muted p-4 tracking-widest">INSUFFICIENT DATA (n &lt; {MIN_SAMPLE_SIZE})</p>
                                        )}
                                    </div>
                                </Section>
                            </div>

                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
