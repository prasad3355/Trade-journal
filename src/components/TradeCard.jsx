import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPrice,
  formatSigned,
} from "../utils/formatters";

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

function TradeCard({ trade, onSelect, onEdit, onDuplicate, onDelete }) {
  const isWin = trade.pnl > 0;
  const isLoss = trade.pnl < 0;
  const pnlColor = isWin ? "text-positive" : isLoss ? "text-negative" : "text-text-muted";

  const image = trade.images?.[0] || trade.image;

  return (
    <div className="bg-surface-panel border border-border-slate rounded-lg overflow-hidden flex flex-col h-full shadow-sm hover:border-text-muted transition-colors">
      {/* Header */}
      <div className="p-3 border-b border-border-slate flex justify-between items-center bg-surface shrink-0 cursor-pointer" onClick={() => onSelect(trade)}>
        <div className="flex items-center gap-3">
          <span className="font-data-mono-sm text-text-muted">
            #{String(trade.id).replace("trade-", "").slice(-4)}
          </span>
          <span className="font-data-mono-md text-text-high-contrast font-bold border-l border-border-slate pl-3">
            {normalizePair(trade.pair)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`font-data-mono-md font-bold ${pnlColor}`}>
            {formatSigned(formatCurrency(trade.pnl))}
          </span>
        </div>
      </div>

      {/* Sub-header status strip */}
      <div className="flex border-b border-border-slate text-[10px] uppercase font-bold tracking-widest shrink-0 cursor-pointer" onClick={() => onSelect(trade)}>
        <div className={`px-3 py-1.5 flex-1 border-r border-border-slate flex justify-center items-center ${trade.direction?.toLowerCase() === 'long' ? 'text-positive bg-positive/5' : 'text-negative bg-negative/5'}`}>
          {trade.direction?.toUpperCase() || "—"}
        </div>
        <div className="px-3 py-1.5 flex-1 border-r border-border-slate flex justify-center items-center text-text-high-contrast bg-surface-container">
          {isWin ? "TP HIT" : isLoss ? "SL HIT" : "BE"}
        </div>
        <div className={`px-3 py-1.5 flex-1 flex justify-center items-center bg-surface-container ${pnlColor}`}>
          {trade.rr ? `${isWin ? '+' : ''}${formatNumber(trade.rr)}R` : '—'}
        </div>
      </div>

      {/* Image thumbnail (approx 16:9) */}
      <div
        className="w-full aspect-[16/9] border-b border-border-slate relative bg-surface-canvas bg-cover bg-center shrink-0 cursor-pointer group"
        onClick={() => onSelect(trade)}
        style={{
          backgroundImage: `url('${image || "https://via.placeholder.com/800x450/0c1324/dce1fb?text=No+Chart+Attached"}')`,
        }}
      >
        <div className="absolute inset-0 bg-surface-panel/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
          <span className="bg-surface border border-border-slate text-text-high-contrast px-5 py-2 rounded-sm font-label-caps text-xs tracking-widest uppercase shadow-xl">
            View Trade
          </span>
        </div>
      </div>

      {/* Detailed Meta */}
      <div className="flex-1 p-3 flex flex-col gap-3 bg-surface cursor-pointer" onClick={() => onSelect(trade)}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex justify-between items-center sm:items-end border-b border-border-slate/50 pb-1">
            <span className="text-text-muted">Setup</span>
            <span className="font-data-mono-sm text-text-high-contrast truncate max-w-[80px]" title={trade.setup}>{trade.setup || "—"}</span>
          </div>
          <div className="flex justify-between items-center sm:items-end border-b border-border-slate/50 pb-1">
            <span className="text-text-muted">Session</span>
            <span className="font-data-mono-sm text-text-high-contrast">{(trade.session || "").replace("_", " ") || "—"}</span>
          </div>
          <div className="flex justify-between items-center sm:items-end border-b border-border-slate/50 pb-1">
            <span className="text-text-muted">Timeframe</span>
            <span className="font-data-mono-sm text-text-high-contrast">{trade.timeframe || "—"}</span>
          </div>
          <div className="flex justify-between items-center sm:items-end border-b border-border-slate/50 pb-1">
            <span className="text-text-muted">Risk</span>
            <span className="font-data-mono-sm text-text-high-contrast">{trade.risk || "—"}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-[10px] border border-border-slate bg-surface-panel rounded-sm overflow-hidden text-center mt-auto">
          <div className="p-1.5 flex flex-col border-r border-border-slate">
            <span className="text-text-muted mb-0.5">Entry</span>
            <span className="font-data-mono-sm text-text-high-contrast truncate">{formatPrice(trade.entry) || "—"}</span>
          </div>
          <div className="p-1.5 flex flex-col border-r border-border-slate">
            <span className="text-text-muted mb-0.5">Exit</span>
            <span className="font-data-mono-sm text-text-high-contrast truncate">{formatPrice(trade.exit) || "—"}</span>
          </div>
          <div className="p-1.5 flex flex-col border-r border-border-slate">
            <span className="text-text-muted mb-0.5">SL</span>
            <span className="font-data-mono-sm text-text-muted truncate">{formatPrice(trade.stopLoss) || "—"}</span>
          </div>
          <div className="p-1.5 flex flex-col">
            <span className="text-text-muted mb-0.5">TP</span>
            <span className="font-data-mono-sm text-text-muted truncate">{formatPrice(trade.target) || "—"}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-2 border-t border-border-slate flex justify-between bg-surface-panel shrink-0 gap-2">
        <button
          onClick={() => onSelect(trade)}
          className="flex-1 py-1.5 text-[10px] uppercase font-bold tracking-wider hover:bg-surface-container-high border border-transparent rounded-sm text-text-muted hover:text-text-high-contrast transition-colors flex items-center justify-center gap-1"
        >
          View <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
        </button>
        <button
          onClick={() => onEdit && onEdit(trade)}
          className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider hover:bg-surface-container-high border border-border-slate rounded-sm text-text-high-contrast transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDuplicate && onDuplicate(trade)}
          className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider hover:bg-surface-container-high border border-border-slate rounded-sm text-text-high-contrast transition-colors"
        >
          Dupe
        </button>
        <button
          onClick={() => onDelete && onDelete(trade)}
          className="px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider hover:bg-negative/10 border border-transparent hover:border-negative/30 rounded-sm text-negative transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[12px]">delete</span>
        </button>
      </div>
    </div>
  );
}

export default TradeCard;
