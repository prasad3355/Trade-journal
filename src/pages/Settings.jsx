import React, { useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import { SETTINGS_VERSION } from "../config/settings";

const ASSET_CLASSES = ["FOREX", "METALS", "INDICES", "CRYPTO", "STOCKS", "OTHER"];
const DIRECTIONS = ["LONG", "SHORT"];
const TIMEFRAMES = ["CURRENT", "1m", "5m", "15m", "30m", "1H", "4H", "1D"];
const RISKS = ["QUARTER", "HALF", "FULL", "OUTSIZED"];
const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"];
const EMOTIONS = ["CALM", "FOCUSED", "TILTED", "ANXIOUS", "EUPHORIC"];
const EXIT_LOGICS = ["MANUAL CLOSE", "SL HIT", "TP HIT", "BREAKEVEN", "TRAILING SL"];
const BIASES = ["BULLISH", "NEUTRAL", "BEARISH"];

export default function Settings() {
    const { settings, updateSettings, resetSettings } = useSettings();
    const [showSaved, setShowSaved] = useState(false);
    const [newInstrument, setNewInstrument] = useState("");

    const triggerSave = () => {
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
    };

    const handleUpdate = (category, key, value) => {
        updateSettings({
            [category]: {
                [key]: value
            }
        });
        triggerSave();
    };

    const addQuickInstrument = (e) => {
        e.preventDefault();
        const clean = newInstrument.trim().toUpperCase();
        if (!clean) return;

        if (settings.instruments.quickSelect.includes(clean)) {
            setNewInstrument("");
            return;
        }

        if (settings.instruments.quickSelect.length >= 12) {
            alert("Maximum 12 quick instruments allowed.");
            return;
        }

        updateSettings({
            instruments: {
                quickSelect: [...settings.instruments.quickSelect, clean]
            }
        });
        setNewInstrument("");
        triggerSave();
    };

    const removeQuickInstrument = (instrument) => {
        updateSettings({
            instruments: {
                quickSelect: settings.instruments.quickSelect.filter((i) => i !== instrument)
            }
        });
        triggerSave();
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset all configurations to defaults? This will NOT affect any saved trades or data.")) {
            resetSettings();
            triggerSave();
        }
    };

    return (
        <div className="dashboard w-full h-full relative overflow-y-auto">
            {/* Save Notification */}
            {showSaved && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-positive/20 text-positive border border-positive/30 px-6 py-2 rounded font-label-caps uppercase tracking-widest text-xs flex items-center gap-2 animate-fade-in-up">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Configuration Saved
                </div>
            )}

            {/* HEADER */}
            <div className="dashboard-intro">
                <div>
                    <p>Global Configuration</p>
                    <h1>Settings / Journal Control Center</h1>
                    <p className="max-w-2xl">
                        Configure how your personal trading journal behaves.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-surface-panel border border-border-slate px-3 py-1.5 rounded-sm shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-positive animate-pulse"></span>
                    <span className="font-data-mono-sm text-[10px] text-text-high-contrast uppercase tracking-wider">
                        STORAGE: BROWSER | SYNC: LOCAL
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-6">
                    {/* TRADING DEFAULTS */}
                    <section className="bg-surface-panel border border-border-slate rounded-lg overflow-hidden flex flex-col h-full shadow-sm">
                        <header className="px-5 py-4 border-b border-border-slate bg-surface-container-low">
                            <h2 className="text-xs font-label-caps text-text-high-contrast uppercase tracking-widest">Trading Defaults</h2>
                        </header>
                        <div className="p-5 flex flex-col gap-5 flex-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Default Instrument</label>
                                    <input
                                        type="text"
                                        value={settings.trading.defaultInstrument}
                                        onChange={(e) => handleUpdate('trading', 'defaultInstrument', e.target.value.toUpperCase())}
                                        placeholder="e.g. BTCUSD"
                                        className="w-full bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors uppercase font-data-mono-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Default Asset Class</label>
                                    <select
                                        value={settings.trading.defaultAssetClass}
                                        onChange={(e) => handleUpdate('trading', 'defaultAssetClass', e.target.value)}
                                        className="w-full bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors uppercase font-data-mono-sm appearance-none"
                                    >
                                        {ASSET_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Default Direction</label>
                                    <select
                                        value={settings.trading.defaultDirection}
                                        onChange={(e) => handleUpdate('trading', 'defaultDirection', e.target.value)}
                                        className="w-full bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors uppercase font-data-mono-sm appearance-none"
                                    >
                                        {DIRECTIONS.map(dir => <option key={dir} value={dir}>{dir}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Default Timeframe</label>
                                    <select
                                        value={settings.trading.defaultTimeframe}
                                        onChange={(e) => handleUpdate('trading', 'defaultTimeframe', e.target.value)}
                                        className="w-full bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors uppercase font-data-mono-sm appearance-none"
                                    >
                                        {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Default Risk Profile</label>
                                    <select
                                        value={settings.trading.defaultRisk}
                                        onChange={(e) => handleUpdate('trading', 'defaultRisk', e.target.value)}
                                        className="w-full bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors uppercase font-data-mono-sm appearance-none"
                                    >
                                        {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Default Emotion</label>
                                    <select
                                        value={settings.trading.defaultEmotion}
                                        onChange={(e) => handleUpdate('trading', 'defaultEmotion', e.target.value)}
                                        className="w-full bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors uppercase font-data-mono-sm appearance-none"
                                    >
                                        {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Default Pre-Trade Bias</label>
                                    <select
                                        value={settings.trading.defaultPreTradeBias}
                                        onChange={(e) => handleUpdate('trading', 'defaultPreTradeBias', e.target.value)}
                                        className="w-full bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors uppercase font-data-mono-sm appearance-none"
                                    >
                                        {BIASES.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Default Exit Logic</label>
                                    <select
                                        value={settings.trading.defaultExitLogic}
                                        onChange={(e) => handleUpdate('trading', 'defaultExitLogic', e.target.value)}
                                        className="w-full bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors uppercase font-data-mono-sm appearance-none"
                                    >
                                        {EXIT_LOGICS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Default Setup</label>
                                <input
                                    type="text"
                                    value={settings.trading.defaultSetup}
                                    onChange={(e) => handleUpdate('trading', 'defaultSetup', e.target.value)}
                                    placeholder="e.g. FVG, Liquidity sweep..."
                                    className="w-full bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </section>

                    {/* QUICK INSTRUMENTS */}
                    <section className="bg-surface-panel border border-border-slate rounded-lg overflow-hidden flex flex-col shadow-sm">
                        <header className="px-5 py-4 border-b border-border-slate bg-surface-container-low flex justify-between items-center">
                            <div>
                                <h2 className="text-xs font-label-caps text-text-high-contrast uppercase tracking-widest">Quick Instruments</h2>
                                <p className="text-[9px] font-label-caps text-text-muted mt-1 uppercase tracking-widest">These appear as one-click choices in TradeEditor</p>
                            </div>
                            <span className="font-data-mono-sm text-[10px] text-text-muted">{settings.instruments.quickSelect.length}/12</span>
                        </header>
                        <div className="p-5 flex flex-col gap-4">
                            <form onSubmit={addQuickInstrument} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newInstrument}
                                    onChange={(e) => setNewInstrument(e.target.value)}
                                    placeholder="ADD SYMBOL..."
                                    className="flex-1 bg-surface-canvas border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm focus:border-primary outline-none transition-colors uppercase font-data-mono-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={!newInstrument.trim() || settings.instruments.quickSelect.length >= 12}
                                    className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-sm font-label-caps text-[10px] uppercase tracking-widest cursor-pointer disabled:opacity-50 transition-colors"
                                >
                                    ADD
                                </button>
                            </form>

                            <div className="flex flex-wrap gap-2 mt-2">
                                {settings.instruments.quickSelect.map((inst) => (
                                    <div key={inst} className="flex items-center gap-1 bg-surface-container border border-border-slate px-2 py-1.5 rounded-sm group hover:border-primary/50 transition-colors">
                                        <span className="font-data-mono-sm text-[11px] text-text-high-contrast">{inst}</span>
                                        <button
                                            onClick={() => removeQuickInstrument(inst)}
                                            className="text-text-muted hover:text-negative ml-1 flex items-center justify-center transition-colors"
                                            title="Remove"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-6">
                    {/* DISPLAY & WORKSPACE */}
                    <section className="bg-surface-panel border border-border-slate rounded-lg overflow-hidden flex flex-col shadow-sm">
                        <header className="px-5 py-4 border-b border-border-slate bg-surface-container-low">
                            <h2 className="text-xs font-label-caps text-text-high-contrast uppercase tracking-widest">Display & Workspace</h2>
                        </header>
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between py-2 border-b border-border-slate/50">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text-high-contrast">Compact Mode</span>
                                    <span className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase">Increase data density across grids</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings.display.compactMode} onChange={(e) => handleUpdate('display', 'compactMode', e.target.checked)} />
                                    <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-high-contrast after:border-border-slate after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text-high-contrast">Advanced Metrics</span>
                                    <span className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase">Show comprehensive R-multiple data</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings.display.showAdvancedMetrics} onChange={(e) => handleUpdate('display', 'showAdvancedMetrics', e.target.checked)} />
                                    <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-high-contrast after:border-border-slate after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* DIAGNOSTIC PANEL */}
                    <section className="bg-surface-panel border border-border-slate rounded-lg overflow-hidden flex flex-col shadow-sm">
                        <header className="px-5 py-4 border-b border-border-slate bg-surface-container-low">
                            <h2 className="text-xs font-label-caps text-text-high-contrast uppercase tracking-widest">Configuration Status</h2>
                        </header>
                        <div className="p-5 flex flex-col gap-3 font-data-mono-sm text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-text-muted font-label-caps tracking-widest uppercase text-[10px]">Settings Version</span>
                                <span className="text-text-high-contrast">v{SETTINGS_VERSION}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-text-muted font-label-caps tracking-widest uppercase text-[10px]">Storage Environment</span>
                                <span className="text-text-high-contrast">LOCAL STORAGE</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-text-muted font-label-caps tracking-widest uppercase text-[10px]">Storage Key</span>
                                <span className="text-text-high-contrast">tradefolio_settings</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-text-muted font-label-caps tracking-widest uppercase text-[10px]">Cloud Sync</span>
                                <span className="bg-surface-container border border-surface-container-highest px-2 py-0.5 rounded text-text-muted text-[10px]">DISABLED</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-text-muted font-label-caps tracking-widest uppercase text-[10px]">Database</span>
                                <span className="text-positive text-[10px]">UNTOUCHED</span>
                            </div>
                        </div>
                    </section>

                    {/* RESET CONFIGURATION */}
                    <section className="bg-surface-panel border border-negative/30 rounded-lg overflow-hidden flex flex-col mt-auto shadow-sm">
                        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <h2 className="text-xs font-label-caps text-negative uppercase tracking-widest mb-1">Factory Reset</h2>
                                <span className="text-[10px] text-text-muted font-label-caps uppercase tracking-widest leading-relaxed">
                                    Restore default config. Does NOT erase trades.
                                </span>
                            </div>
                            <button
                                onClick={handleReset}
                                className="px-5 py-2.5 bg-negative/10 border border-negative/30 text-negative hover:bg-negative/20 rounded-sm font-label-caps text-[10px] uppercase tracking-widest cursor-pointer transition-colors shadow-sm whitespace-nowrap shrink-0"
                            >
                                Reset To Defaults
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
