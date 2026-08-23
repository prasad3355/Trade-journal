import { useEffect, useState } from "react";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPrice,
  formatSigned,
} from "../utils/formatters";
import ChartFrame from "./ui/ChartFrame";
import { useTrades } from "../context/TradeContext";

function TradeDetail({
  trade,
  trades,
  onClose,
  onSelectTrade,
  onEdit,
  onDuplicate,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const { deleteTrade, resolveTradeImages } = useTrades();
  const [lazyImages, setLazyImages] = useState([]);

  useEffect(() => {
    let activeUrls = [];
    setLazyImages([]);

    // Natively attach structural string images mapped in DB format
    let defaultList = trade.images?.length ? trade.images : (trade.image ? [trade.image] : []);
    setLazyImages(defaultList);

    resolveTradeImages(trade.id).then(urls => {
      if (urls && urls.length > 0) {
        setLazyImages(prev => [...prev, ...urls]);
        activeUrls = urls;
      }
    });

    return () => {
      activeUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [trade.id, resolveTradeImages]);

  const images = lazyImages;
  const tradeIndex = trades.findIndex((item) => item.id === trade.id);
  const previous = trades[tradeIndex - 1];
  const next = trades[tradeIndex + 1];

  const navigate = (item) => item && onSelectTrade(item, trades);
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
      if (event.key === "Escape")
        return isFullscreen ? setIsFullscreen(false) : onClose();
      if (isFullscreen && event.key === "ArrowLeft")
        return selectImage(Math.max(0, imageIndex - 1));
      if (isFullscreen && event.key === "ArrowRight")
        return selectImage(Math.min(images.length - 1, imageIndex + 1));
      if (!isFullscreen && event.key === "ArrowLeft") navigate(previous);
      if (!isFullscreen && event.key === "ArrowRight") navigate(next);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const priceRows = [
    ["Entry", trade.entry],
    ["Exit", trade.exit],
    ["Stop loss", trade.stopLoss],
    ["Target", trade.target],
  ];

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this trade?")) {
      await deleteTrade(trade.id);
      onClose();
    }
  };

  const isWin = trade.pnl >= 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-surface-canvas/90 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <article
        className="bg-surface border border-border-slate shadow-2xl rounded-lg w-full max-w-5xl max-h-full flex flex-col overflow-hidden animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-border-slate flex justify-between items-center bg-surface-panel shrink-0">
          <div className="flex items-center gap-4">
            <span
              className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded-sm border uppercase ${trade.direction?.toLowerCase() === "long" ? "text-positive border-positive/30 bg-positive/10" : "text-negative border-negative/30 bg-negative/10"}`}
            >
              {trade.direction?.toUpperCase() || "—"}
            </span>
            <h2 className="font-headline-md text-xl text-text-high-contrast font-bold uppercase tracking-wider">
              {trade.pair}
            </h2>
            <div className="w-px h-4 bg-border-slate hidden sm:block"></div>
            <span className="font-data-mono-sm text-sm text-text-muted hidden sm:inline-block">
              {formatDate(trade.date, true)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-xs font-label-caps uppercase bg-surface-container hover:bg-surface-container-high text-text-high-contrast border border-border-slate rounded-sm transition-colors"
              onClick={onEdit}
            >
              Edit
            </button>
            <button
              className="px-3 py-1.5 text-xs font-label-caps uppercase bg-surface-container hover:bg-surface-container-high text-text-high-contrast border border-border-slate rounded-sm transition-colors"
              onClick={onDuplicate}
            >
              Duplicate
            </button>
            <div className="w-px h-4 bg-border-slate mx-1 hidden sm:block"></div>
            <button
              className="px-3 py-1.5 text-xs font-label-caps uppercase text-negative hover:bg-negative/10 border border-transparent rounded-sm transition-colors"
              onClick={handleDelete}
            >
              Delete
            </button>
            <button
              className="p-1.5 ml-2 text-text-muted hover:text-text-high-contrast rounded-sm hover:bg-surface-container-high transition-colors flex items-center justify-center"
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[18px]">
                close
              </span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-surface">
          {/* Top Summary Banner */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-0 border border-border-slate rounded-lg overflow-hidden bg-surface-panel shadow-sm">
            <div className="p-4 border-b lg:border-b-0 lg:border-r border-border-slate flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[100%]"></div>
              <span className="text-[10px] font-label-caps text-text-muted uppercase mb-1">
                Net P&amp;L
              </span>
              <span
                className={`font-data-mono-lg text-xl ${isWin ? "text-positive" : "text-negative"}`}
              >
                {formatSigned(formatCurrency(trade.pnl))}
              </span>
            </div>
            <div className="p-4 border-b lg:border-b-0 lg:border-r border-border-slate flex flex-col">
              <span className="text-[10px] font-label-caps text-text-muted uppercase mb-1">
                R-Multiple
              </span>
              <span className="font-data-mono-lg text-xl text-text-high-contrast">
                {trade.rr == null ? "—" : `${formatNumber(trade.rr)}R`}
              </span>
            </div>
            <div className="p-4 border-b lg:border-b-0 lg:border-r border-border-slate flex flex-col">
              <span className="text-[10px] font-label-caps text-text-muted uppercase mb-1">
                Risk
              </span>
              <span className="font-data-mono-lg text-xl text-text-high-contrast">
                {trade.risk || "—"}
              </span>
            </div>
            <div className="p-4 border-r border-border-slate flex flex-col">
              <span className="text-[10px] font-label-caps text-text-muted uppercase mb-1">
                Position Size
              </span>
              <span className="font-data-mono-lg text-xl text-text-high-contrast">
                {trade.lots || "—"}
              </span>
            </div>
            <div className="p-4 flex flex-col">
              <span className="text-[10px] font-label-caps text-text-muted uppercase mb-1">
                Execution ID
              </span>
              <span className="font-data-mono-lg text-xl text-text-muted">
                #{String(trade.id).replace("trade-", "").slice(-4)}
              </span>
            </div>
          </section>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Details */}
            <div className="flex flex-col gap-6">
              <section className="bg-surface-panel border border-border-slate rounded-lg p-5">
                <h3 className="text-xs font-label-caps text-text-high-contrast uppercase tracking-widest mb-4 border-b border-border-slate pb-2">
                  Execution Metrics
                </h3>
                <div className="flex flex-col gap-3">
                  {priceRows.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between items-end border-b border-border-slate/50 pb-1"
                    >
                      <span className="text-xs text-text-muted">{label}</span>
                      <span className="font-data-mono-sm text-text-high-contrast">
                        {formatPrice(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-surface-panel border border-border-slate rounded-lg p-5">
                <h3 className="text-xs font-label-caps text-text-high-contrast uppercase tracking-widest mb-4 border-b border-border-slate pb-2">
                  Context &amp; Process
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end border-b border-border-slate/50 pb-1">
                    <span className="text-xs text-text-muted">Setup</span>
                    <span className="font-data-mono-sm text-text-high-contrast truncate max-w-[120px]">
                      {trade.setup || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-end border-b border-border-slate/50 pb-1">
                    <span className="text-xs text-text-muted">Timeframe</span>
                    <span className="font-data-mono-sm text-text-high-contrast">
                      {trade.timeframe || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-end border-b border-border-slate/50 pb-1">
                    <span className="text-xs text-text-muted">Session</span>
                    <span className="font-data-mono-sm text-text-high-contrast">
                      {(trade.session || "").replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-end border-b border-border-slate/50 pb-1">
                    <span className="text-xs text-text-muted">Rules adhered</span>
                    <span className="font-data-mono-sm text-text-high-contrast">
                      {trade.rulesFollowed || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-text-muted">Mgmt mode</span>
                    <span className="font-data-mono-sm text-text-high-contrast">
                      {trade.moneyManagement || "—"}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Visuals & Notes */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              <section className="bg-surface-panel border border-border-slate rounded-lg p-5">
                <h3 className="text-xs font-label-caps text-text-high-contrast uppercase tracking-widest mb-4 border-b border-border-slate pb-2">
                  After-Action Report
                </h3>
                <div className="p-4 bg-surface border border-border-slate/50 rounded-sm text-xs font-data-mono-sm text-text-muted leading-relaxed whitespace-pre-line min-h-[100px]">
                  {trade.learning || (
                    <span className="italic opacity-50">
                      // No qualitative notes recorded.
                    </span>
                  )}
                </div>
              </section>

              <section className="bg-surface-panel border border-border-slate rounded-lg p-5 flex flex-col flex-1 min-h-[300px]">
                <div className="flex justify-between items-center border-b border-border-slate pb-2 mb-4">
                  <h3 className="text-xs font-label-caps text-text-high-contrast uppercase tracking-widest">
                    Visual Proof
                  </h3>
                  <span className="text-[10px] text-text-muted uppercase">
                    {images.length} attached
                  </span>
                </div>

                {images.length > 0 ? (
                  <div
                    className="flex-1 flex flex-col bg-surface border border-border-slate/50 rounded-sm overflow-hidden relative group cursor-zoom-in"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${images[imageIndex]})` }}
                    />
                    <div className="absolute inset-0 bg-surface-panel/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-surface border border-border-slate px-4 py-2 rounded-sm text-xs text-text-high-contrast shadow-lg uppercase font-bold tracking-widest">
                        Expand View
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border-slate rounded-sm bg-surface/50 text-text-muted text-[10px] uppercase tracking-widest min-h-[200px]">
                    <span className="material-symbols-outlined mb-2 text-[24px]">image_not_supported</span>
                    NO VISUAL PROOF ATTACHED
                  </div>
                )}

                {images.length > 1 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                    {images.map((img, index) => (
                      <button
                        key={index}
                        className={`w-16 h-10 rounded-sm border-2 overflow-hidden shrink-0 transition-opacity ${index === imageIndex ? "border-primary opacity-100" : "border-transparent opacity-50 hover:opacity-100"}`}
                        onClick={() => selectImage(index)}
                        type="button"
                      >
                        <img
                          src={img}
                          alt={`Chart ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <footer className="px-6 py-4 border-t border-border-slate bg-surface-panel flex justify-between items-center shrink-0">
          <button
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-label-caps uppercase text-text-high-contrast disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high border border-border-slate rounded-sm transition-colors"
            disabled={!previous}
            onClick={() => navigate(previous)}
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            <span className="hidden sm:inline">Prev Exec</span>
          </button>

          <span className="font-data-mono-sm text-[10px] text-text-muted">
            {tradeIndex + 1} OF {trades.length}
          </span>

          <button
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-label-caps uppercase text-text-high-contrast disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high border border-border-slate rounded-sm transition-colors"
            disabled={!next}
            onClick={() => navigate(next)}
          >
            <span className="hidden sm:inline">Next Exec</span>
            <span className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </button>
        </footer>
      </article>

      {/* Fullscreen Image Overlay */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[200] bg-surface/95 backdrop-blur-md flex flex-col animate-fade-in"
          onMouseDown={() => setIsFullscreen(false)}
        >
          <div
            className="h-16 px-6 border-b border-border-slate flex items-center justify-between shrink-0 bg-surface-panel"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="font-data-mono-sm text-text-high-contrast uppercase tracking-widest text-xs">
              {trade.pair} <span className="opacity-50 mx-2">|</span> CHART {imageIndex + 1}/{images.length}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1.5 hover:bg-surface-container text-text-muted hover:text-text-high-contrast rounded-sm transition-colors flex items-center justify-center border border-transparent hover:border-border-slate"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              >
                <span className="material-symbols-outlined text-[18px]">
                  zoom_out
                </span>
              </button>
              <span className="font-data-mono-sm text-xs text-text-muted w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="p-1.5 hover:bg-surface-container text-text-muted hover:text-text-high-contrast rounded-sm transition-colors flex items-center justify-center border border-transparent hover:border-border-slate"
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              >
                <span className="material-symbols-outlined text-[18px]">
                  zoom_in
                </span>
              </button>
              <div className="w-px h-6 bg-border-slate mx-2"></div>
              <button
                type="button"
                className="px-4 py-1.5 text-xs font-label-caps uppercase bg-surface-container hover:bg-surface-container-high border border-border-slate text-text-high-contrast rounded-sm transition-colors flex items-center gap-2"
                onClick={() => setIsFullscreen(false)}
              >
                Close
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-8"
            style={{ cursor: zoom > 1 ? "grab" : "zoom-in" }}
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault();
              setZoom((v) =>
                Math.min(3, Math.max(0.5, v + (e.deltaY < 0 ? 0.1 : -0.1))),
              );
            }}
          >
            <img
              src={images[imageIndex]}
              alt="Fullscreen chart"
              className="max-w-none transition-transform shadow-2xl border border-border-slate/50"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TradeDetail;
