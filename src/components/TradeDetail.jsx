import { useEffect, useState } from "react";
import { formatCurrency, formatDate, formatSigned } from "../utils/formatters";
import { normalizePair } from "./TradeCard";
import { motion, AnimatePresence } from "framer-motion";

function TradeDetail({ trade, trades, onClose, onSelectTrade }) {
  if (!trade) return null; // Defensive check for empty trade props

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const images = trade.images?.length ? trade.images : (trade.image ? [trade.image] : []);
  const isMulti = images.length > 1;

  // Find index relative to chronologically sorted input `trades` array
  const tradeIndex = trades.findIndex((item) => item.id === trade.id);
  const previous = trades[tradeIndex - 1];
  const next = trades[tradeIndex + 1];

  const navigate = (item) => {
    if (item) {
      setImageIndex(0); // reset screenshot
      onSelectTrade(item, trades);
    }
  };

  const selectImage = (index) => {
    setImageIndex(index);
    setZoom(1);
  };

  useEffect(() => {
    setImageIndex(0);
    setZoom(1);
  }, [trade.id]);

  useEffect(() => {
    const handler = (event) => {
      if (!trade) return;
      // Do not capture keyboard if editing input (defensive approach)
      const activeTag = document.activeElement?.tagName;
      if (
        (activeTag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      if (event.key === "Escape") return isFullscreen ? setIsFullscreen(false) : onClose();

      // Screenshots control (Left/Right)
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (imageIndex > 0) selectImage(imageIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (imageIndex < images.length - 1) selectImage(imageIndex + 1);
      }

      // Time-series / Trade control (Up/Down) -> Up = older, Down = newer. 
      // Based on chronological order: previous is index-1, next is index+1
      if (!isFullscreen && event.key === "ArrowUp") {
        event.preventDefault();
        if (previous) navigate(previous);
      }
      if (!isFullscreen && event.key === "ArrowDown") {
        event.preventDefault();
        if (next) navigate(next);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const isWin = trade.pnl > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 w-full h-full flex flex-col items-center overflow-y-auto bg-[#0a0a0b]/95 backdrop-blur-2xl text-white z-[100]"
      role="presentation"
      onMouseDown={onClose}
    >
      <motion.article
        initial={{ opacity: 0, scale: 0.96, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.98, y: -10, filter: "blur(4px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1400px] flex flex-col pt-12 sm:pt-24 pb-32 px-6 sm:px-12 md:px-16 mx-auto bg-[#0a0a0b] min-h-full border-x border-white/5 relative shadow-2xl"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Navigation & Close */}
        <div className="absolute top-8 right-8 z-50 flex items-center gap-6 text-[10px] font-label-caps tracking-widest uppercase">
          <div className="flex gap-4">
            <button disabled={!previous} onClick={() => navigate(previous)} className="text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hidden md:block transition-colors">↑ Prev Trade</button>
            <span className="text-white/20 hidden md:block">|</span>
            <button disabled={!next} onClick={() => navigate(next)} className="text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hidden md:block transition-colors">↓ Next Trade</button>
          </div>
          <button
            className="flex items-center justify-center p-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* METADATA HEADER */}
        <header className="grid grid-cols-2 md:flex md:flex-row justify-between items-start md:items-end gap-12 border-b border-white/5 pb-12 mb-12 px-4">
          <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Pair</span>
            <h2 className="font-headline-md text-5xl md:text-6xl font-black uppercase tracking-tighter">
              {normalizePair(trade.pair)}
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Direction</span>
            <div className={`text-2xl font-bold uppercase ${trade.direction === 'LONG' ? 'text-[#00a572]' : 'text-[#ff516a]'}`}>
              {trade.direction || "—"}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Output</span>
            <div className={`text-4xl font-data-mono font-light ${isWin ? 'text-[#00a572]' : 'text-[#ff516a]'}`}>
              {formatSigned(formatCurrency(trade.pnl))}
            </div>
          </div>

          <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Date Executed</span>
            <div className="text-xl font-data-mono font-light text-white/80">
              {formatDate(trade.date, true)}
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={trade.id}
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col w-full"
          >

            {/* SETUP & LEARNING */}
            <section className="flex flex-col gap-12 px-4 mb-20 w-full max-w-[1000px]">

              {/* Setup Block */}
              <div className="flex flex-col gap-4 font-light text-white/80">
                <h3 className="text-[11px] font-label-caps tracking-widest text-[#00a572] uppercase">
                  SETUP
                </h3>
                <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                  {trade.setup || <span className="text-white/20 italic">No setup text logged.</span>}
                </div>
              </div>

              {/* Learning Block */}
              <div className="flex flex-col gap-4 font-light text-white/80 mt-4">
                <h3 className="text-[11px] font-label-caps tracking-widest text-white/40 uppercase border-l-2 border-[#00a572] pl-3">
                  LEARNING
                </h3>
                <div className="text-[18px] md:text-[24px] leading-[1.65] font-serif tracking-wide whitespace-pre-wrap text-white/95">
                  {trade.learning || <span className="text-white/20 italic">No learning text logged.</span>}
                </div>
              </div>

            </section>

            {/* IMAGE GALLERY */}
            <section className="px-4 w-full">
              <h3 className="text-[11px] font-label-caps tracking-widest text-white/30 uppercase mb-6">
                SCREENSHOTS
              </h3>

              {images.length > 0 ? (
                <div className="flex flex-col gap-8 w-full border border-white/5 bg-[#0e0e0e] rounded-xl p-4 lg:p-6 shadow-2xl">

                  {/* Main Hero Image */}
                  <div
                    className="w-full aspect-[16/9] lg:aspect-[21/9] rounded-lg overflow-hidden relative cursor-zoom-in group border border-white/5"
                    onClick={() => setIsFullscreen(true)}
                  >
                    {/* Embedded Cinematic AnimatePresence for Images */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={imageIndex}
                        initial={{ opacity: 0, x: 20, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.98 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 w-full h-full flex justify-center items-center bg-[#050505]"
                        onDoubleClick={() => setIsFullscreen(true)}
                      >
                        <img
                          src={images[imageIndex]}
                          alt={`Visual record of ${normalizePair(trade.pair)}`}
                          className="max-w-full max-h-full object-contain shadow-2xl rounded-sm cursor-zoom-in group-hover:scale-[1.02] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                          loading="lazy"
                        />
                      </motion.div>
                    </AnimatePresence>
                    <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 rounded-full text-[10px] text-white uppercase tracking-widest border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to expand
                    </div>
                  </div>

                  {/* Thumbnails Strip */}
                  <div className="flex items-center justify-between gap-4">
                    {isMulti ? (
                      <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth p-2">
                        {images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); selectImage(idx); }}
                            aria-label={`View screenshot ${idx + 1}`}
                            className={`h-20 w-32 shrink-0 rounded overflow-hidden border-2 transition-all ${idx === imageIndex ? 'border-primary scale-105 shadow-xl opacity-100' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'
                              }`}
                          >
                            <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    ) : <div />}

                    <span className="shrink-0 text-xs font-data-mono tracking-widest text-white/40">
                      {images.length > 0 ? `${imageIndex + 1} / ${images.length}` : '0 / 0'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-64 flex flex-col items-center justify-center border border-white/5 bg-[#0e0e0e] rounded-xl text-white/20">
                  <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">visibility_off</span>
                  <span className="text-[10px] uppercase font-label-caps tracking-widest">No screenshots archived</span>
                </div>
              )}
            </section>
          </motion.div>
        </AnimatePresence>

      </motion.article>

      {/* FULLSCREEN IMAGE OVERLAY */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in"
          onMouseDown={() => setIsFullscreen(false)}
        >
          <div className="h-16 px-8 flex items-center justify-between shrink-0 absolute top-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <span className="text-[10px] uppercase font-label-caps tracking-widest text-white/50 drop-shadow-md">
              {normalizePair(trade.pair)} | Chart {imageIndex + 1}/{images.length}
            </span>
            <button
              className="pointer-events-auto text-[10px] font-label-caps tracking-widest uppercase text-white hover:text-white drop-shadow-md transition-colors bg-white/10 px-4 py-2 rounded-full border border-white/20 hover:bg-white/20"
              onClick={() => setIsFullscreen(false)}
            >
              Close Viewer
            </button>
          </div>

          {/* Navigation Arrows Fullscreen */}
          {isMulti && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); if (imageIndex > 0) selectImage(Math.max(0, imageIndex - 1)); }}
                disabled={imageIndex === 0}
                className={`absolute left-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/50 text-white backdrop-blur border border-white/10 z-50 transition-all ${imageIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
              >
                <span className="material-symbols-outlined text-[32px]">chevron_left</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (imageIndex < images.length - 1) selectImage(Math.min(images.length - 1, imageIndex + 1)); }}
                disabled={imageIndex === images.length - 1}
                className={`absolute right-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/50 text-white backdrop-blur border border-white/10 z-50 transition-all ${imageIndex === images.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
              >
                <span className="material-symbols-outlined text-[32px]">chevron_right</span>
              </button>
            </>
          )}

          <div
            className="flex-1 w-full h-full flex items-center justify-center p-8 overflow-auto"
            style={{ cursor: zoom > 1 ? "grab" : "zoom-in" }}
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault();
              setZoom((v) =>
                Math.min(3, Math.max(0.75, v + (e.deltaY < 0 ? 0.1 : -0.1))),
              );
            }}
          >
            <motion.img
              key={imageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
              src={images[imageIndex]}
              alt="Fullscreen chart"
              className="max-w-[100vw] max-h-[100vh] object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            />
          </div>
        </div>
      )
      }
    </motion.div>
  );
}

export default TradeDetail;
