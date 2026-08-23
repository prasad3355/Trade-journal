import React, { useState, useMemo, useEffect } from "react";
import { formatCurrency, formatSigned, formatNumber, formatDate } from "../utils/formatters";
import { useTrades } from "../context/TradeContext";

export default function Review({ trades, onSelectTrade, onEdit }) {
    const { resolveTradeImages } = useTrades();
    const [filter, setFilter] = useState("ALL"); // ALL, WINNERS, LOSERS, WORST, UNREVIEWED
    const [selectedTrade, setSelectedTrade] = useState(null);
    const [lazyImages, setLazyImages] = useState([]);

    // Define what "Unreviewed" means using existing schema logic:
    // A trade with no 'learning' notes and/or no checklist checked.
    const isUnreviewed = (t) => {
        const hasNotes = t.learning && t.learning.trim().length > 0;
        const hasProof = t.images && t.images.length > 0;
        return !hasNotes && !hasProof;
    };

    const filteredQueue = useMemo(() => {
        let sorted = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (filter === "WINNERS") return sorted.filter(t => t.pnl > 0);
        if (filter === "LOSERS") return sorted.filter(t => t.pnl < 0);
        if (filter === "WORST") return sorted.filter(t => t.pnl < 0).sort((a, b) => a.pnl - b.pnl);
        if (filter === "UNREVIEWED") return sorted.filter(isUnreviewed);
        return sorted;
    }, [trades, filter]);

    // Global Review Metrics
    const metrics = useMemo(() => {
        const losers = trades.filter(t => t.pnl < 0);
        const winners = trades.filter(t => t.pnl > 0);
        const unreviewed = trades.filter(isUnreviewed);

        const largestLoss = losers.length ? Math.min(...losers.map(l => l.pnl)) : 0;
        const largestWin = winners.length ? Math.max(...winners.map(w => w.pnl)) : 0;
        const avgR = trades.length ? trades.reduce((sum, t) => sum + (Number(t.rr) || 0), 0) / trades.length : 0;

        const rulesFollowedCount = trades.filter(t => t.rulesFollowed?.toLowerCase().startsWith("yes")).length;
        const ruleAdherence = trades.length ? Math.round((rulesFollowedCount / trades.length) * 100) : 0;

        const docCount = trades.filter(t => !isUnreviewed(t)).length;
        const docRate = trades.length ? Math.round((docCount / trades.length) * 100) : 0;

        // Recent losses (last 10 trades)
        const recent = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        const recentLosses = recent.filter(t => t.pnl < 0).length;

        return {
            tradesToReview: unreviewed.length,
            recentLosses,
            largestLoss,
            largestWin,
            avgR,
            ruleAdherence,
            docRate
        };
    }, [trades]);

    // Handle selected trade next/prev
    const currentIndex = selectedTrade ? filteredQueue.findIndex(t => t.id === selectedTrade.id) : -1;
    const goNext = () => { if (currentIndex < filteredQueue.length - 1) setSelectedTrade(filteredQueue[currentIndex + 1]); };
    const goPrev = () => { if (currentIndex > 0) setSelectedTrade(filteredQueue[currentIndex - 1]); };

    useEffect(() => {
        let activeUrls = [];
        setLazyImages([]);
        if (selectedTrade) {
            if (selectedTrade.images && selectedTrade.images.length > 0) {
                setLazyImages(selectedTrade.images);
            }
            resolveTradeImages(selectedTrade.id).then(urls => {
                if (urls && urls.length > 0) {
                    setLazyImages(prev => [...prev, ...urls]);
                    activeUrls = urls;
                }
            });
        }
        return () => {
            activeUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [selectedTrade, resolveTradeImages]);

    // After-action derived logic
    const getDerivedReport = (t) => {
        if (!t) return {};

        // Result
        let result = "BREAKEVEN";
        if (t.pnl > 0) result = "WIN";
        if (t.pnl < 0) result = "LOSS";

        // Risk Quality
        let riskQuality = "N/A";
        if (t.risk) riskQuality = t.risk;
        if (result === "LOSS" && t.rr <= -1.5) riskQuality = "EXCESSIVE";
        else if (t.moneyManagement === "NO") riskQuality = "VIOLATION";

        // Execution Quality
        let executionQuality = "N/A";
        if (t.rulesFollowed === "YES") executionQuality = "DISCIPLINED";
        if (t.rulesFollowed === "NO") executionQuality = "INDISCIPLINED";
        if (t.rulesFollowed === "PARTIAL") executionQuality = "PARTIAL";

        // Documentation Quality
        let docQuality = "INCOMPLETE";
        const hasNotes = t.learning && t.learning.trim().length > 0;
        const hasProof = t.images && t.images.length > 0;
        if (hasNotes && hasProof) docQuality = "COMPREHENSIVE";
        else if (hasNotes || hasProof) docQuality = "PARTIAL";

        // Thesis Quality
        let thesisQuality = t.thesis && t.thesis.trim().length > 0 ? "RECORDED" : "MISSING";

        return { result, riskQuality, executionQuality, docQuality, thesisQuality };
    };

    const report = getDerivedReport(selectedTrade);

    // Render Master Queue State
    if (!selectedTrade) {
        return (
            <div className="flex-1 overflow-x-hidden overflow-y-auto w-full relative z-0 bg-surface">
                <div className="max-w-[1920px] mx-auto p-4 md:p-6 space-y-4">

                    <header className="flex flex-col gap-2 mb-6">
                        <h1 className="font-headline-md text-headline-md text-text-high-contrast uppercase font-bold tracking-tight">Trade Review</h1>
                        <p className="text-text-muted text-xs uppercase tracking-wider flex items-center gap-2">
                            Execution quality, decision process & lessons
                        </p>
                    </header>

                    {/* Quick Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-text-muted font-bold">To Review</span>
                            <span className="font-data-mono-lg text-xl text-primary">{metrics.tradesToReview}</span>
                        </div>
                        <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Recent Losses</span>
                            <span className="font-data-mono-lg text-xl text-negative">{metrics.recentLosses} / 10</span>
                        </div>
                        <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Largest Loss</span>
                            <span className="font-data-mono-lg text-xl text-negative">{formatSigned(formatCurrency(metrics.largestLoss))}</span>
                        </div>
                        <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Largest Win</span>
                            <span className="font-data-mono-lg text-xl text-positive">{formatSigned(formatCurrency(metrics.largestWin))}</span>
                        </div>
                        <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Avg R</span>
                            <span className="font-data-mono-lg text-xl text-text-high-contrast">{formatNumber(metrics.avgR)}</span>
                        </div>
                        <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Adherence</span>
                            <span className={`font-data-mono-lg text-xl ${metrics.ruleAdherence > 80 ? 'text-positive' : 'text-primary'}`}>{metrics.ruleAdherence}%</span>
                        </div>
                        <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Documentation</span>
                            <span className="font-data-mono-lg text-xl text-text-high-contrast">{metrics.docRate}%</span>
                        </div>
                    </div>

                    <div className="flex border-b border-border-slate mt-8 mb-4">
                        {["ALL", "WINNERS", "LOSERS", "UNREVIEWED", "WORST"].map(f => (
                            <button
                                key={f} onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors border-b-2 ${filter === f ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-high-contrast'}`}>
                                {f === 'ALL' ? 'All Trades' : f === 'WORST' ? 'Worst Execution' : f}
                            </button>
                        ))}
                    </div>

                    {/* QUEUE */}
                    <div className="bg-surface-panel border border-border-slate rounded-sm flex flex-col">
                        <table className="w-full text-left text-[11px] whitespace-nowrap min-w-[800px]">
                            <thead className="bg-surface text-[10px] uppercase text-text-muted border-b border-border-slate/50 font-bold tracking-widest shadow-sm">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Date (Local)</th>
                                    <th className="px-4 py-3 font-medium">Instrument</th>
                                    <th className="px-4 py-3 font-medium text-center">Dir</th>
                                    <th className="px-4 py-3 font-medium">Setup Applied</th>
                                    <th className="px-4 py-3 font-medium text-right">R-Mult</th>
                                    <th className="px-4 py-3 font-medium text-right">Net P&L</th>
                                    <th className="px-5 py-3 font-medium text-right">Quality</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-slate/30 font-data-mono-sm">
                                {filteredQueue.map((trade) => {
                                    let qTag = "LOGGED";
                                    if (isUnreviewed(trade)) qTag = "NEEDS REVIEW";
                                    else if (trade.rulesFollowed === "NO") qTag = "VIOLATION";

                                    return (
                                        <tr key={trade.id} onClick={() => setSelectedTrade(trade)} className="hover:bg-surface-container/50 transition-colors cursor-pointer group">
                                            <td className="px-5 py-4 text-text-muted group-hover:text-text-high-contrast transition-colors">{formatDate(trade.date, true)}</td>
                                            <td className="px-4 py-4 text-text-high-contrast font-bold">{trade.pair || '—'}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider font-bold ${trade.direction?.toLowerCase() === 'long' ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'}`}>
                                                    {trade.direction?.toUpperCase() || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-text-muted truncate max-w-[200px]">{trade.setup || '—'}</td>
                                            <td className={`px-4 py-4 text-right ${trade.rr ? (trade.rr > 0 ? "text-positive" : trade.rr < 0 ? "text-negative" : "text-text-muted") : "text-text-muted"}`}>{trade.rr ? `${formatNumber(trade.rr)}R` : '—'}</td>
                                            <td className={`px-4 py-4 text-right font-bold ${trade.pnl > 0 ? "text-positive" : trade.pnl < 0 ? "text-negative" : "text-text-muted"}`}>{formatSigned(formatCurrency(trade.pnl))}</td>
                                            <td className="px-5 py-4 text-right">
                                                <span className={`px-2 py-1 text-[9px] uppercase tracking-widest font-bold border rounded-sm ${qTag === "NEEDS REVIEW" ? "text-primary border-primary/30 bg-primary/10" : qTag === "VIOLATION" ? "text-negative border-negative/30 bg-negative/10" : "text-text-muted border-border-slate bg-surface-container"}`}>{qTag}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredQueue.length === 0 && (
                                    <tr><td colSpan="7" className="px-5 py-12 text-center text-text-muted font-body-sm">No items in this queue.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        );
    }

    // Render Sub-Workspace (Selected Trade)
    return (
        <div className="flex-1 overflow-x-hidden overflow-y-auto w-full relative z-0 bg-surface">
            <header className="sticky top-0 bg-surface-panel/90 backdrop-blur border-b border-border-slate z-10 px-4 md:px-6 py-4 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
                <div>
                    <button onClick={() => setSelectedTrade(null)} className="text-[10px] font-label-caps uppercase tracking-widest text-text-muted hover:text-text-high-contrast mb-2 flex items-center gap-1 transition-colors">
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        Back to Queue
                    </button>
                    <h2 className="font-headline-md text-headline-md font-bold text-text-high-contrast flex items-center gap-3">
                        {selectedTrade.pair || "UNKNOWN"} <span className={`text-[12px] px-2 py-1 uppercase tracking-widest rounded-sm ${selectedTrade.direction === "LONG" ? "bg-positive/20 text-positive" : "bg-negative/20 text-negative"}`}>{selectedTrade.direction}</span>
                    </h2>
                    <span className="text-[11px] font-data-mono-sm text-text-muted mt-1 inline-block">{formatDate(selectedTrade.date, true)}</span>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button disabled={currentIndex === 0} onClick={goPrev} className="px-4 py-2 border border-border-slate text-text-muted hover:text-text-high-contrast hover:bg-surface-container rounded-sm disabled:opacity-50 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button disabled={currentIndex === filteredQueue.length - 1} onClick={goNext} className="px-4 py-2 border border-border-slate text-text-muted hover:text-text-high-contrast hover:bg-surface-container rounded-sm disabled:opacity-50 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                    <button onClick={() => onSelectTrade(selectedTrade, trades)} className="px-4 py-2 border border-border-slate text-text-muted hover:text-text-high-contrast hover:bg-surface-container rounded-sm uppercase tracking-widest text-[10px] font-bold ml-4">
                        Trade Detail
                    </button>
                    <button onClick={() => onEdit(selectedTrade)} className="px-6 py-2 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 hover:text-on-primary rounded-sm uppercase tracking-widest text-[10px] font-bold transition-colors shadow-[0_0_15px_rgba(40,110,250,0.1)]">
                        Edit
                    </button>
                </div>
            </header>

            <div className="max-w-[1920px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT: VISUAL PROOF */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-surface-panel border border-border-slate rounded-sm flex flex-col h-full shadow-sm">
                        <div className="border-b border-border-slate px-4 py-3 bg-surface/50">
                            <h3 className="text-[11px] font-label-caps tracking-widest uppercase text-text-high-contrast">Visual Proof</h3>
                        </div>
                        <div className="p-4 flex-1 flex flex-col gap-4">
                            {lazyImages && lazyImages.length > 0 ? (
                                lazyImages.map((img, i) => (
                                    <div key={i} className="border border-border-slate rounded-sm overflow-hidden bg-surface-canvas relative group w-full pt-[56.25%]">
                                        <img src={img} alt={`Analysis ${i}`} className="absolute inset-0 w-full h-full object-cover mix-blend-screen" />
                                    </div>
                                ))
                            ) : (
                                <div className="flex-1 min-h-[300px] border border-dashed border-border-slate rounded-sm flex flex-col items-center justify-center p-6 text-center text-text-muted">
                                    <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">hide_image</span>
                                    <span className="text-[11px] font-label-caps uppercase tracking-widest font-bold">No Visual Proof</span>
                                    <span className="text-[10px] mt-2">No chart screenshot attached to this execution.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CENTER: EXECUTION ANALYSIS */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-surface-panel border border-border-slate rounded-sm flex flex-col shadow-sm">
                        <div className="border-b border-border-slate px-4 py-3 bg-surface/50 flex justify-between items-center">
                            <h3 className="text-[11px] font-label-caps tracking-widest uppercase text-text-high-contrast">Execution Analysis</h3>
                            <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm border ${selectedTrade.pnl > 0 ? "text-positive border-positive/30 bg-positive/10" : selectedTrade.pnl < 0 ? "text-negative border-negative/30 bg-negative/10" : "text-text-muted bg-surface-container"}`}>
                                {report.result}
                            </span>
                        </div>
                        <div className="p-5 font-data-mono-sm text-xs flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Instrument</span>
                                    <span className="font-bold text-text-high-contrast">{selectedTrade.pair || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Direction</span>
                                    <span className={`font-bold ${selectedTrade.direction === "LONG" ? "text-positive" : "text-negative"}`}>{selectedTrade.direction || "N/A"}</span>
                                </div>
                            </div>

                            <hr className="border-border-slate/50" />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Entry</span>
                                    <span className="font-bold text-text-high-contrast">{selectedTrade.entry || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Exit</span>
                                    <span className="font-bold text-text-high-contrast">{selectedTrade.exit || "N/A"}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-negative block mb-1">Stop Loss</span>
                                    <span className="font-bold text-text-high-contrast">{selectedTrade.stopLoss || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-positive block mb-1">Take Profit</span>
                                    <span className="font-bold text-text-high-contrast">{selectedTrade.target || "N/A"}</span>
                                </div>
                            </div>

                            <hr className="border-border-slate/50" />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Position Size</span>
                                    <span className="font-bold text-text-high-contrast">{selectedTrade.lots ? `${selectedTrade.lots} Lots` : "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Exit Logic</span>
                                    <span className="font-bold text-text-high-contrast">{selectedTrade.exitLogic || "N/A"}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">R:R Multiple</span>
                                    <span className="font-bold text-text-high-contrast">{selectedTrade.rr ? `${selectedTrade.rr}R` : "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Net P&L</span>
                                    <span className={`font-bold text-sm ${selectedTrade.pnl > 0 ? "text-positive" : selectedTrade.pnl < 0 ? "text-negative" : "text-text-muted"}`}>{formatSigned(formatCurrency(selectedTrade.pnl || 0))}</span>
                                </div>
                            </div>

                            <hr className="border-border-slate/50" />

                            <div className="bg-surface-container-high p-3 rounded-sm border border-border-slate flex flex-col gap-2">
                                <div className="flex justify-between items-center border-b border-border-slate/50 pb-1">
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted">Setup</span>
                                    <span className="font-bold text-text-high-contrast">{selectedTrade.setup || "N/A"}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-border-slate/50 pb-1">
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted">Risk Assignment</span>
                                    <span className={`font-bold text-xs ${report.riskQuality === "EXCESSIVE" || report.riskQuality === "VIOLATION" ? 'text-negative' : 'text-primary'}`}>{report.riskQuality}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted">Execution Status</span>
                                    <span className={`font-bold text-xs ${report.executionQuality === "INDISCIPLINED" ? 'text-negative' : report.executionQuality === "DISCIPLINED" ? 'text-positive' : 'text-primary'}`}>{report.executionQuality}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: DECISION / PSYCHOLOGY & REPORT */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-surface-panel border border-border-slate rounded-sm shadow-sm flex flex-col">
                        <div className="border-b border-border-slate px-4 py-3 bg-surface/50">
                            <h3 className="text-[11px] font-label-caps tracking-widest uppercase text-text-high-contrast">After-Action Report</h3>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                            <div className="bg-surface border border-border-slate p-3 rounded-sm">
                                <span className="text-[9px] mt-0 font-label-caps uppercase tracking-widest text-text-muted block mb-1">Documentation</span>
                                <span className={`text-[10px] font-bold ${report.docQuality === "COMPREHENSIVE" ? "text-positive" : report.docQuality === "PARTIAL" ? "text-primary" : "text-negative"}`}>{report.docQuality}</span>
                            </div>
                            <div className="bg-surface border border-border-slate p-3 rounded-sm">
                                <span className="text-[9px] mt-0 font-label-caps uppercase tracking-widest text-text-muted block mb-1">Thesis Quality</span>
                                <span className={`text-[10px] font-bold ${report.thesisQuality === "RECORDED" ? "text-positive" : "text-negative"}`}>{report.thesisQuality}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-panel border border-border-slate rounded-sm shadow-sm flex flex-col">
                        <div className="border-b border-border-slate px-4 py-3 bg-surface/50">
                            <h3 className="text-[11px] font-label-caps tracking-widest uppercase text-text-high-contrast">Context / Psychology</h3>
                        </div>
                        <div className="p-4 font-data-mono-sm text-xs grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Bias</span>
                                <span className="font-bold text-text-high-contrast">{selectedTrade.preTradeBias || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Emotion</span>
                                <span className="font-bold text-text-high-contrast">{selectedTrade.emotion || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Confidence</span>
                                <span className="font-bold text-text-high-contrast">{selectedTrade.confidence || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-1">Mgmt Followed</span>
                                <span className="font-bold text-text-high-contrast">{selectedTrade.moneyManagement || "N/A"}</span>
                            </div>
                        </div>

                        <div className="px-4 pb-4">
                            <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted block mb-2 border-t border-border-slate pt-3">Trade Thesis</span>
                            <p className="text-xs text-text-high-contrast leading-relaxed font-body-sm whitespace-pre-wrap">
                                {selectedTrade.thesis && selectedTrade.thesis.trim().length > 0 ? selectedTrade.thesis : "N/A"}
                            </p>
                        </div>
                    </div>

                    <div className="bg-surface-panel border border-border-slate rounded-sm shadow-sm flex flex-col flex-1 border-l-4 border-l-primary focus-within:border-primary/50 transition-colors hidden-scroll">
                        <div className="border-b border-border-slate px-4 py-3 bg-surface/50 flex justify-between items-center">
                            <h3 className="text-[11px] font-label-caps tracking-widest uppercase text-text-high-contrast flex items-center gap-2">
                                <span className="material-symbols-outlined text-[14px] text-primary">school</span>
                                Lessons / Notes
                            </h3>
                        </div>
                        <div className="p-4 flex-1">
                            {selectedTrade.learning && selectedTrade.learning.trim().length > 0 ? (
                                <p className="text-sm text-text-high-contrast font-body-md leading-relaxed whitespace-pre-wrap">
                                    {selectedTrade.learning}
                                </p>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center text-text-muted min-h-[150px]">
                                    <span className="text-[11px] font-label-caps uppercase tracking-widest font-bold">No post-trade lesson recorded</span>
                                    <button onClick={() => onEdit(selectedTrade)} className="mt-4 px-4 py-2 border border-border-slate rounded-sm hover:text-primary hover:border-primary/50 text-[10px] uppercase font-bold tracking-widest transition-colors bg-surface-container">
                                        Add Lessons
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
