import React, { useState } from "react";
import { formatCurrency, formatDate, formatNumber, formatSigned } from "../utils/formatters";
import { StaggerItem } from "./ui/Motion";

export function normalizePair(pair) {
  if (!pair) return "—";
  const p = pair.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (p === 'XAUUSD' || p === 'GOLD') return 'XAU/USD';
  if (p === 'NAS100' || p === 'NDX100' || p === 'US100') return 'NAS100';
  if (p === 'US30' || p === 'DJI30') return 'US30';
  if (p === 'BTCUSD' || p === 'BITCOIN') return 'BTC/USD';
  if (p === 'EURUSD') return 'EUR/USD';
  if (p === 'GBPUSD') return 'GBP/USD';
  if (p === 'USDJPY') return 'USD/JPY';
  return pair.toUpperCase(); // Fallback
}

function TradeCard({ trade, onSelect }) {
  const isWin = trade.pnl > 0;
  const pnlColor = isWin ? "text-[#00a572]" : trade.pnl < 0 ? "text-[#ff516a]" : "text-white/60";

  const imageList = trade.images?.length ? trade.images : (trade.image ? [trade.image] : []);
  const hasImages = imageList.length > 0;
  const isMulti = imageList.length > 1;
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const displayImage = hasImages ? imageList[activeImageIndex] : null;

  const handleNextImage = (e) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % imageList.length);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  const imageBadge = isMulti ? (
    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-data-mono font-bold text-white border border-white/10 z-10 flex items-center gap-1.5 shadow-xl">
      <span className="material-symbols-outlined text-[12px]">photo_library</span>
      {activeImageIndex + 1} / {imageList.length}
    </div>
  ) : null;

  return (
    <StaggerItem>
      <div
        className="group cursor-pointer flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[#0c0c0c] border border-white/5 rounded-md hover:border-white/20 h-auto self-start hover:-translate-y-[6px] shadow-sm hover:shadow-2xl overflow-hidden"
        onClick={() => onSelect(trade)}
      >
        {/* Editorial Image Container */}
        <div className="w-full aspect-[16/9] bg-[#050505] relative border-b border-white/5 overflow-hidden">
          {hasImages ? (
            <div className="w-full h-full relative">
              {imageList.map((img, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${idx === activeImageIndex ? "opacity-100 scale-100 group-hover:scale-[1.04]" : "opacity-0 scale-105 pointer-events-none"
                    }`}
                  style={{ backgroundImage: `url('${img}')` }}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/20 transition-transform duration-500 group-hover:scale-105">
              <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">visibility_off</span>
              <span className="font-label-caps tracking-widest uppercase text-xs">No Screenshot</span>
            </div>
          )}

          {imageBadge}

          {/* Carousel arrows */}
          {isMulti && (
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-20">
              <button
                onClick={handlePrevImage}
                aria-label="Previous screenshot"
                className="bg-black/80 hover:bg-black p-1.5 rounded-full text-white backdrop-blur transition-colors duration-300"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button
                onClick={handleNextImage}
                aria-label="Next screenshot"
                className="bg-black/80 hover:bg-black p-1.5 rounded-full text-white backdrop-blur transition-colors duration-300"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>

        {/* Meta Content - Editorial Layout */}
        <div className="flex flex-col p-5 gap-6 relative z-10 bg-[#0c0c0c]">
          {/* Core Info */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-headline-md font-bold text-white tracking-wide">
                  {normalizePair(trade.pair)}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded uppercase transition-colors duration-500 ${trade.direction === 'LONG' ? 'bg-[#00a572]/15 text-[#00a572]' : 'bg-[#ff516a]/15 text-[#ff516a]'}`}>
                    {trade.direction || "—"}
                  </span>
                  <span className="text-[10px] text-white/40 font-label-caps tracking-widest uppercase transition-colors duration-500 group-hover:text-white/60">
                    {formatDate(trade.date, true)}
                  </span>
                </div>
              </div>
              <span className={`font-data-mono text-xl font-bold tracking-tight transition-colors duration-500 ${pnlColor}`}>
                {formatSigned(formatCurrency(trade.pnl))}
              </span>
            </div>
          </div>

          <div className="h-[1px] w-full bg-white/5 transition-colors duration-500 group-hover:bg-white/10" />

          {/* Exact Setup */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase font-label-caps block transition-colors duration-500 group-hover:text-white/50">
              Setup
            </span>
            <div className="text-[15px] leading-relaxed text-white/80 whitespace-pre-wrap transition-colors duration-500 group-hover:text-white">
              {trade.setup || "—"}
            </div>
          </div>

          {/* Exact Learning */}
          <div className="flex flex-col gap-3 mt-2">
            <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase font-label-caps block border-l-2 border-[#00a572]/40 pl-2 transition-colors duration-500 group-hover:border-[#00a572] group-hover:text-white/50">
              Learning
            </span>
            <div className="text-[17px] leading-[1.65] text-white/90 whitespace-pre-wrap font-serif tracking-wide border-l-2 border-white/5 pl-3 transition-colors duration-500 group-hover:border-white/20 group-hover:text-white">
              {trade.learning || "—"}
            </div>
          </div>
        </div>
      </div>
    </StaggerItem>
  );
}

export default TradeCard;
