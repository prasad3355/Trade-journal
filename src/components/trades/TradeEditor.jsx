import React, { useState, useRef, useEffect } from "react";
import { useTrades } from "../../context/TradeContext";
import { classifySession } from "../../utils/sessions";

// QUICK SELECT OPTIONS
const QUICK_INSTRUMENTS = ["XAUUSD", "NAS100", "US30", "BTCUSD", "EURUSD", "GBPUSD"];
const ASSET_CLASSES = ["FOREX", "METALS", "INDICES", "CRYPTO", "STOCKS", "OTHER"];
const EXIT_LOGICS = ["MANUAL CLOSE", "SL HIT", "TP HIT", "BREAKEVEN", "TRAILING SL"];
const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"];
const EMOTIONS = ["CALM", "FOCUSED", "TILTED", "ANXIOUS", "EUPHORIC"];

export default function TradeEditor({ initialData, onClose }) {
  const { addTrade, updateTrade, trades } = useTrades();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState(() => {
    const defaultData = {
      id: `trade-${Date.now()}`,
      date: new Date().toISOString().slice(0, 16),
      pair: "",
      assetClass: "FOREX",
      direction: "LONG",
      lots: "",
      entry: "",
      exit: "",
      stopLoss: "",
      target: "",
      setup: "",
      thesis: "", // pre-trade context
      learning: "", // post-trade notes
      timeframe: "CURRENT",
      exitLogic: "MANUAL CLOSE",
      pnl: "",
      rr: "",
      rulesFollowed: "YES",
      moneyManagement: "YES",
      risk: "HALF",
      confidence: "HIGH",
      emotion: "CALM",
      preTradeBias: "NEUTRAL",
      image: null,
      images: [],
      checklist: {
        setupConfirmed: false,
        riskDefined: false,
        slPlaced: false,
        tpDefined: false,
        sessionValid: false,
        htfAligned: false,
      }
    };

    if (initialData) {
      return {
        ...defaultData,
        ...initialData,
        images: initialData.images || [], // will be combined with lazy fetched below
        checklist: {
          ...defaultData.checklist,
          ...(initialData.checklist || {})
        }
      };
    }
    return defaultData;
  });

  const { resolveTradeImages } = useTrades();
  useEffect(() => {
    let activeUrls = [];
    if (initialData && initialData.id) {
      resolveTradeImages(initialData.id).then(urls => {
        if (urls && urls.length > 0) {
          setFormData(prev => ({
            ...prev,
            images: [...(prev.images || []), ...urls]
          }));
          activeUrls = urls;
        }
      });
    }
    return () => {
      activeUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [initialData]);

  const [detectedSession, setDetectedSession] = useState("UNKNOWN");

  useEffect(() => {
    if (formData.date) {
      const { session } = classifySession(formData.date);
      setDetectedSession(session.replace("_", " "));
    }
  }, [formData.date]);

  // Derived Checklist Effect -> rulesFollowed mapping
  useEffect(() => {
    const vals = Object.values(formData.checklist);
    const checked = vals.filter(Boolean).length;
    let computedRules = "NO";
    if (checked === vals.length) computedRules = "YES";
    else if (checked > 0) computedRules = "PARTIAL";

    // Only update if it drifted, avoiding infinite loop if manually overridden
    if (computedRules !== formData.rulesFollowed) {
      setFormData(prev => ({ ...prev, rulesFollowed: computedRules }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formData.checklist)]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleChecklist = (key) => {
    setFormData((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [key]: !prev.checklist[key]
      }
    }));
  };

  const processFiles = (files) => {
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (!validFiles.length) return;

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => {
          const newImages = [...prev.images, event.target.result];
          return { ...prev, images: newImages, image: newImages[0] };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const removeImage = (index) => {
    setFormData((prev) => {
      const updated = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: updated,
        image: updated.length ? updated[0] : null,
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const processedData = {
      ...formData,
      lots: Number(formData.lots) || null,
      entry: Number(formData.entry) || null,
      exit: Number(formData.exit) || null,
      stopLoss: Number(formData.stopLoss) || null,
      target: Number(formData.target) || null,
      pnl: Number(formData.pnl) || 0,
      rr: Number(formData.rr) || null,
    };

    const isEditing = initialData && trades.some((t) => t.id === initialData.id);

    if (isEditing) updateTrade(processedData);
    else addTrade(processedData);

    onClose();
  };

  // RISK CALCULATIONS FOR DISPLAY ONLY
  const eVal = parseFloat(formData.entry);
  const sVal = parseFloat(formData.stopLoss);
  const tVal = parseFloat(formData.target);
  const lVal = parseFloat(formData.lots) || 1;

  let riskPips = 0;
  let rewardPips = 0;

  if (eVal && sVal) {
    riskPips = formData.direction === "LONG" ? (eVal - sVal) : (sVal - eVal);
  }
  if (eVal && tVal) {
    rewardPips = formData.direction === "LONG" ? (tVal - eVal) : (eVal - tVal);
  }

  const expectedRr = riskPips > 0 && rewardPips > 0 ? (rewardPips / riskPips).toFixed(2) : '—';
  // simple dummy value for amount logic -> assuming 1 standard lot = simple mult
  const estRiskAmt = riskPips > 0 ? (riskPips * lVal).toFixed(2) : '—';
  const estRewardAmt = rewardPips > 0 ? (rewardPips * lVal).toFixed(2) : '—';

  const isEditing = initialData && trades.some((t) => t.id === initialData.id);
  const currentMode = isEditing ? "UPDATE EXECUTION" : "NEW EXECUTION";

  return (
    <div className="fixed inset-0 z-[100] flex justify-center p-0 md:p-4 bg-surface-canvas/90 backdrop-blur" onMouseDown={onClose}>
      <div
        className="bg-surface border-x border-border-slate shadow-2xl w-full max-w-[1400px] h-full flex flex-col md:rounded-xl overflow-hidden md:border-y animate-fade-in-up"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-border-slate flex justify-between items-center bg-surface-panel shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-primary/80 animate-pulse"></div>
            <h2 className="font-headline-md text-headline-md text-text-high-contrast tracking-widest font-bold">
              {currentMode}
            </h2>
          </div>
          <button type="button" className="text-text-muted hover:text-text-high-contrast transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <form className="flex-1 flex flex-col overflow-y-auto min-h-0 bg-surface/50" onSubmit={handleSubmit}>

          <div className="flex-1 p-4 lg:p-6 flex flex-col gap-6">

            {/* MAIN WORKSPACE 3-COL */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

              {/* --------------------------------------------------------- */}
              {/* LEFT: WORKFLOW & CONTEXT */}
              {/* --------------------------------------------------------- */}
              <div className="lg:col-span-1 flex flex-col gap-4 order-2 lg:order-1">
                {/* Asset Class */}
                <div className="bg-surface-panel border border-border-slate rounded-sm p-4">
                  <h3 className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-3">Asset Class</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {ASSET_CLASSES.map(cls => (
                      <button type="button" key={cls}
                        onClick={() => setField('assetClass', cls)}
                        className={`px-2 py-1 text-[9px] font-label-caps uppercase rounded-sm border transition-colors ${formData.assetClass === cls ? 'bg-primary/20 text-primary border-primary/30' : 'border-border-slate text-text-muted hover:text-text-high-contrast hover:bg-surface-container'}`}>
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Setup & Bias */}
                <div className="bg-surface-panel border border-border-slate rounded-sm p-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-2 block">Bias</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['BULLISH', 'NEUTRAL', 'BEARISH'].map(b => (
                        <button type="button" key={b} onClick={() => setField('preTradeBias', b)}
                          className={`py-1.5 text-[9px] font-label-caps uppercase rounded-sm border transition-colors text-center ${formData.preTradeBias === b ? (b === 'BULLISH' ? 'bg-positive/20 text-positive border-positive/30' : b === 'BEARISH' ? 'bg-negative/20 text-negative border-negative/30' : 'bg-primary/20 text-primary border-primary/30') : 'border-border-slate text-text-muted hover:text-text-high-contrast hover:bg-surface-container'}`}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-2 block">Detected Session</label>
                    <div className="bg-surface-container-high border border-border-slate rounded-sm px-3 py-2 text-xs font-data-mono-sm text-text-high-contrast uppercase tracking-wider flex justify-between">
                      {detectedSession}
                      <span className="text-[9px] text-primary">AUTO</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-2">
                      Setup / Model
                    </label>
                    <input type="text" name="setup" value={formData.setup} onChange={handleChange} placeholder="e.g. FVG, Liquidity sweep..."
                      className="w-full bg-surface border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-xs focus:border-primary outline-none" />
                  </div>
                </div>

                {/* Checklist */}
                <div className="bg-surface-panel border border-border-slate rounded-sm p-4">
                  <h3 className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-3 flex justify-between items-center">
                    Pre-Trade Checklist
                    <span className={`text-[9px] ${formData.rulesFollowed === 'YES' ? 'text-positive' : formData.rulesFollowed === 'PARTIAL' ? 'text-primary' : 'text-negative'}`}>{formData.rulesFollowed}</span>
                  </h3>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'setupConfirmed', label: 'Setup Confirmed' },
                      { id: 'riskDefined', label: 'Risk Defined' },
                      { id: 'slPlaced', label: 'Hard SL Placed' },
                      { id: 'tpDefined', label: 'Target Defined' },
                      { id: 'sessionValid', label: 'Optimal Session' },
                      { id: 'htfAligned', label: 'HTF Aligned' }
                    ].map(item => (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${formData.checklist[item.id] ? 'bg-primary border-primary' : 'bg-surface border-border-slate group-hover:border-primary/50'}`}>
                          {formData.checklist[item.id] && <span className="material-symbols-outlined text-[12px] text-on-primary">check</span>}
                        </div>
                        <span className={`text-xs font-label-caps uppercase tracking-wider transition-colors ${formData.checklist[item.id] ? 'text-text-high-contrast' : 'text-text-muted'}`}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------------- */}
              {/* CENTER: INSTRUMENT + EXECUTION (LEAD FOCUS) */}
              {/* --------------------------------------------------------- */}
              <div className="lg:col-span-2 flex flex-col gap-4 order-1 lg:order-2">

                {/* Instrument Select */}
                <div className="bg-surface-panel border border-border-slate rounded-sm p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[11px] font-label-caps text-text-high-contrast uppercase tracking-widest border-l-2 border-primary pl-2">Instrument Selection</h3>
                    <input type="datetime-local" name="date" value={formData.date} onChange={handleChange} required
                      className="bg-surface border border-border-slate rounded-sm text-text-high-contrast px-2 py-1 text-[11px] font-data-mono-sm focus:border-primary outline-none" />
                  </div>

                  <div className="flex gap-2">
                    <input type="text" name="pair" value={formData.pair} onChange={handleChange} placeholder="SYMBOL..." required
                      className="w-1/3 bg-surface-container-high border-2 border-border-slate rounded-sm text-text-high-contrast px-4 py-3 text-lg font-data-mono-md uppercase focus:border-primary outline-none transition-colors" />

                    <div className="flex-1 flex flex-wrap gap-1.5 overflow-hidden">
                      {QUICK_INSTRUMENTS.map(p => (
                        <button type="button" key={p} onClick={() => setField('pair', p)}
                          className="px-3 py-1 flex-1 min-w-[70px] text-xs font-data-mono-sm uppercase rounded-sm border border-border-slate bg-surface hover:bg-surface-container hover:text-text-high-contrast text-text-muted transition-colors">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Direction */}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setField('direction', 'LONG')}
                    className={`py-8 rounded-sm border-2 transition-all group relative overflow-hidden flex flex-col items-center justify-center gap-1 ${formData.direction === 'LONG' ? 'bg-positive/10 border-positive shadow-[0_0_15px_rgba(32,201,151,0.1)]' : 'bg-surface-panel border-border-slate hover:border-positive/50'}`}>
                    <span className={`material-symbols-outlined text-[32px] ${formData.direction === 'LONG' ? 'text-positive' : 'text-text-muted group-hover:text-positive/70'}`}>trending_up</span>
                    <span className={`text-[14px] font-headline-md tracking-[0.2em] font-bold ${formData.direction === 'LONG' ? 'text-positive' : 'text-text-muted'}`}>LONG</span>
                  </button>
                  <button type="button" onClick={() => setField('direction', 'SHORT')}
                    className={`py-8 rounded-sm border-2 transition-all group relative overflow-hidden flex flex-col items-center justify-center gap-1 ${formData.direction === 'SHORT' ? 'bg-negative/10 border-negative shadow-[0_0_15px_rgba(255,107,107,0.1)]' : 'bg-surface-panel border-border-slate hover:border-negative/50'}`}>
                    <span className={`material-symbols-outlined text-[32px] ${formData.direction === 'SHORT' ? 'text-negative' : 'text-text-muted group-hover:text-negative/70'}`}>trending_down</span>
                    <span className={`text-[14px] font-headline-md tracking-[0.2em] font-bold ${formData.direction === 'SHORT' ? 'text-negative' : 'text-text-muted'}`}>SHORT</span>
                  </button>
                </div>

                {/* Execution Numbers Grid */}
                <div className="bg-surface-panel border border-border-slate rounded-sm p-5 shadow-sm">
                  <h3 className="text-[11px] font-label-caps text-text-high-contrast uppercase tracking-widest border-l-2 border-primary pl-2 mb-4">Execution Matrix</h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Entry</label>
                      <input type="number" step="0.00001" name="entry" value={formData.entry} onChange={handleChange}
                        className="w-full bg-surface-container-high border font-bold border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm font-data-mono-sm focus:border-primary outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-label-caps text-negative uppercase tracking-widest">Stop Loss</label>
                      <input type="number" step="0.00001" name="stopLoss" value={formData.stopLoss} onChange={handleChange}
                        className="w-full bg-surface-container-high border font-bold border-negative/30 focus:border-negative rounded-sm text-text-high-contrast px-3 py-2 text-sm font-data-mono-sm outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-label-caps text-positive uppercase tracking-widest">Take Profit</label>
                      <input type="number" step="0.00001" name="target" value={formData.target} onChange={handleChange}
                        className="w-full bg-surface-container-high border font-bold border-positive/30 focus:border-positive rounded-sm text-text-high-contrast px-3 py-2 text-sm font-data-mono-sm outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest">Size (Lots)</label>
                      <input type="number" step="0.01" name="lots" value={formData.lots} onChange={handleChange}
                        className="w-full bg-surface-container-high border font-bold border-border-slate rounded-sm text-text-high-contrast px-3 py-2 text-sm font-data-mono-sm focus:border-primary outline-none" />
                    </div>
                  </div>
                </div>

                {/* Outcome & PnL */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  <div className="bg-surface-panel border border-border-slate rounded-sm p-4 col-span-1 sm:col-span-1">
                    <label className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-2 block">Exit Price</label>
                    <input type="number" step="0.00001" name="exit" value={formData.exit} onChange={handleChange}
                      className="w-full bg-surface-container border border-border-slate rounded-sm text-text-high-contrast px-3 py-2 font-bold text-sm font-data-mono-sm focus:border-primary outline-none" />
                  </div>

                  <div className="bg-surface-panel border border-border-slate rounded-sm p-4 col-span-1 sm:col-span-1 flex flex-col border-l-4 border-l-primary/50 relative overflow-hidden">
                    <label className="text-[11px] font-label-caps text-text-high-contrast uppercase tracking-widest mb-1 shadow-sm block relative z-10">Realized R</label>
                    <div className="relative z-10 flex items-center h-full">
                      <input type="number" step="0.01" name="rr" value={formData.rr} onChange={handleChange} placeholder="e.g. 2.5"
                        className="w-full bg-transparent border-b border-border-slate focus:border-primary text-text-high-contrast py-1 font-bold text-2xl font-data-mono-sm outline-none" />
                      <span className="text-sm font-bold text-text-muted ml-1">R</span>
                    </div>
                  </div>

                  <div className="bg-surface-panel border border-border-slate rounded-sm p-4 col-span-1 sm:col-span-1 flex flex-col relative overflow-hidden">
                    <label className={`text-[11px] font-label-caps uppercase tracking-widest mb-1 shadow-sm block relative z-10 ${formData.pnl > 0 ? 'text-positive' : formData.pnl < 0 ? 'text-negative' : 'text-text-muted'}`}>Net P&L $</label>
                    <div className="relative z-10 flex items-center h-full">
                      <span className="text-xl font-bold text-text-muted mr-1">$</span>
                      <input type="number" step="0.01" name="pnl" value={formData.pnl} onChange={handleChange} required placeholder="0.00"
                        className={`w-full bg-transparent border-b border-border-slate text-text-high-contrast py-1 font-bold text-2xl font-data-mono-sm outline-none ${formData.pnl > 0 ? 'focus:border-positive text-positive' : formData.pnl < 0 ? 'focus:border-negative text-negative' : 'focus:border-primary'}`} />
                    </div>
                  </div>

                </div>
              </div>

              {/* --------------------------------------------------------- */}
              {/* RIGHT: RISK / MGMT (SUMMARY) */}
              {/* --------------------------------------------------------- */}
              <div className="lg:col-span-1 flex flex-col gap-4 order-3 lg:order-3">

                {/* Trade Management */}
                <div className="bg-surface-panel border border-border-slate rounded-sm p-4 shadow-sm">
                  <h3 className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-3">Trade Management</h3>
                  <div className="flex flex-col gap-2">
                    {EXIT_LOGICS.map(logic => (
                      <label key={logic} className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center transition-colors ${formData.exitLogic === logic ? 'border-primary' : 'border-border-slate group-hover:border-primary/50'}`}>
                          {formData.exitLogic === logic && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </div>
                        <span className={`text-[10px] font-label-caps uppercase tracking-wider transition-colors ${formData.exitLogic === logic ? 'text-text-high-contrast font-bold' : 'text-text-muted'}`}>{logic}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Calculated Summary */}
                <div className="bg-surface-panel border border-border-slate rounded-sm p-4 flex-1 shadow-sm">
                  <h3 className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-4">Risk Intel</h3>

                  <div className="space-y-4 font-data-mono-sm text-xs font-bold">
                    <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                      <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted font-normal">Risk Profile</span>
                      <span className="text-negative">{estRiskAmt !== '—' ? estRiskAmt : '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-border-slate/50 pb-2">
                      <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted font-normal">Base Reward</span>
                      <span className="text-positive">{estRewardAmt !== '—' ? estRewardAmt : '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted font-normal">Projected RR</span>
                      <span className="text-text-high-contrast text-sm">{expectedRr !== '—' ? `${expectedRr}R` : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Psychology Quick */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col gap-2">
                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted text-center">Confidence</span>
                    <div className="flex flex-col gap-1">
                      {CONFIDENCE_LEVELS.map(c => (
                        <button type="button" key={c} onClick={() => setField('confidence', c)}
                          className={`py-1 text-[8px] font-label-caps uppercase rounded-sm border transition-colors ${formData.confidence === c ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-border-slate text-text-muted hover:text-text-high-contrast'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-surface-panel border border-border-slate rounded-sm p-3 flex flex-col gap-2">
                    <span className="text-[9px] font-label-caps uppercase tracking-widest text-text-muted text-center">Emotion</span>
                    <div className="flex flex-col gap-1">
                      {EMOTIONS.slice(0, 3).map(c => (
                        <button type="button" key={c} onClick={() => setField('emotion', c)}
                          className={`py-1 text-[8px] font-label-caps uppercase rounded-sm border transition-colors ${formData.emotion === c ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-border-slate text-text-muted hover:text-text-high-contrast'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* BOTTOM: MEDIA & NOTES & REVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 order-4">

              {/* Notes Engine */}
              <div className="flex flex-col gap-4">
                <div className="bg-surface-panel border border-border-slate rounded-sm flex flex-col h-[200px] overflow-hidden group focus-within:border-primary/50 shadow-sm transition-colors">
                  <div className="bg-surface-container px-4 py-2 border-b border-border-slate">
                    <span className="text-[10px] font-label-caps text-text-high-contrast uppercase tracking-widest">Trade Thesis (Pre-execution)</span>
                  </div>
                  <textarea name="thesis" value={formData.thesis} onChange={handleChange} placeholder="What is the narrative? Why this level? Why now?"
                    className="w-full h-full bg-transparent p-4 text-xs font-body-sm text-text-high-contrast resize-none outline-none leading-relaxed" />
                </div>

                <div className="bg-surface-panel border border-border-slate rounded-sm flex flex-col h-[200px] overflow-hidden group focus-within:border-primary/50 shadow-sm transition-colors">
                  <div className="bg-surface-container px-4 py-2 border-b border-border-slate">
                    <span className="text-[10px] font-label-caps text-text-high-contrast uppercase tracking-widest">After-Action Review (Post-execution)</span>
                  </div>
                  <textarea name="learning" value={formData.learning} onChange={handleChange} placeholder="What did you execute well? Did emotion drive decision making? What is the edge refinement here?"
                    className="w-full h-full bg-transparent p-4 text-xs font-body-sm text-text-high-contrast resize-none outline-none leading-relaxed" />
                </div>
              </div>

              {/* Screenshots Workspace */}
              <div className="bg-surface-panel border border-border-slate rounded-sm p-4 flex flex-col h-full min-h-[400px]">
                <h3 className="text-[11px] font-label-caps text-text-high-contrast uppercase tracking-widest flex items-center justify-between mb-4 border-l-2 border-primary pl-2 shadow-sm">
                  Visual Evidence
                  <span className="text-[9px] text-primary">{formData.images.length} Attached</span>
                </h3>

                <div
                  onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  className={`flex-1 border border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer transition-all bg-surface min-h-[200px] ${isDragging ? 'border-primary bg-primary/5' : 'border-border-slate hover:border-text-muted hover:bg-surface-container-high'}`}>
                  <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleImageUpload} hidden />
                  <span className={`material-symbols-outlined text-[32px] mb-2 ${isDragging ? 'text-primary' : 'text-text-muted'}`}>add_photo_alternate</span>
                  <span className="text-[11px] font-label-caps tracking-widest uppercase text-text-muted">Click or Drop Screenshots</span>
                </div>

                {formData.images.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border-slate flex gap-3 overflow-x-auto snap-x h-[140px]">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative w-48 h-full rounded-sm border border-border-slate overflow-hidden shrink-0 group snap-center shadow-md bg-surface">
                        <img src={img} alt={`Visual ${idx}`} className="w-full h-full object-cover mix-blend-screen" style={{ clipPath: 'inset(0 0 0 0 round 2px)' }} />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-surface/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                            className="w-10 h-10 bg-negative/80 text-white rounded-full flex items-center justify-center hover:bg-negative transition-colors shadow-lg">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

          <footer className="px-6 py-4 border-t border-border-slate bg-surface-panel flex justify-between items-center shrink-0 z-10 sticky bottom-0">
            <div className="flex gap-4 items-center">
              <span className="font-data-mono-sm text-xs text-text-muted border border-border-slate bg-surface px-2 py-0.5 rounded-sm">
                {formData.id.split('-').pop()}
              </span>
              <span className="font-label-caps text-[9px] uppercase tracking-widest text-text-muted hidden sm:inline-block">Status: Ready</span>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="px-6 py-2 text-[11px] font-label-caps tracking-widest uppercase bg-surface border border-border-slate hover:bg-surface-container-high hover:text-text-high-contrast text-text-muted rounded-sm transition-colors">
                Discard
              </button>
              <button type="submit"
                className="px-8 py-2 text-[11px] font-label-caps tracking-widest uppercase bg-primary hover:bg-primary/90 text-on-primary rounded-sm transition-colors shadow-[0_0_15px_rgba(40,110,250,0.3)]">
                Commit Trade
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
