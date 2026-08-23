import {
  formatCurrency,
  formatDate,
  formatSigned,
  formatNumber
} from "../../utils/formatters";

function EquityChart({ points, mode, onSelect }) {
  if (!points || points.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
        <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">show_chart</span>
        <span className="font-label-caps text-xs tracking-widest uppercase">No Data Available</span>
      </div>
    );
  }

  // Determine what value we are charting
  const getValue = (point) => {
    switch (mode) {
      case "DRAWDOWN": return point.drawdown;
      case "R-MULTIPLE": return point.cumulativeRr;
      case "EQUITY":
      case "P&L":
      default: return point.cumulative;
    }
  };

  const formatModeValue = (val) => {
    if (mode === "R-MULTIPLE") return `${formatSigned(formatNumber(val))}R`;
    return formatSigned(formatCurrency(val));
  };

  const values = points.map(getValue);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);

  // Add some vertical padding to the domain
  const padding = (rawMax - rawMin) * 0.1 || 10;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const range = max - min;

  // ViewBox dimensions
  const vbW = 1000;
  const vbH = 300;

  const insetX = 20; // prevent circle clipping
  const insetY = 20;

  const chartW = vbW - insetX * 2;
  const chartH = vbH - insetY * 2;

  const coords = points.map((point, index) => {
    const val = getValue(point);
    return {
      ...point,
      val,
      x: insetX + (points.length === 1 ? chartW / 2 : (index * chartW) / (points.length - 1)),
      y: insetY + (chartH - ((val - min) / range) * chartH),
    };
  });

  const zeroY = insetY + (chartH - ((0 - min) / range) * chartH);

  return (
    <div className="w-full h-full relative cursor-crosshair">
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        {/* Drawdown area representation if we are NOT in drawdown mode 
            actually let's just make the chart gradient fill */}

        <defs>
          <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="negativeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-negative)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-negative)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        <path d={`M${insetX} ${insetY} H${vbW - insetX}`} className="stroke-border-slate opacity-20" strokeWidth="1" />
        <path d={`M${insetX} ${insetY + chartH / 2} H${vbW - insetX}`} className="stroke-border-slate opacity-20" strokeWidth="1" />
        <path d={`M${insetX} ${insetY + chartH} H${vbW - insetX}`} className="stroke-border-slate opacity-20" strokeWidth="1" />

        {/* Zero line */}
        {min < 0 && max > 0 && (
          <path
            d={`M${insetX} ${zeroY}H${vbW - insetX}`}
            className="stroke-text-muted opacity-50"
            strokeWidth="1"
            strokeDasharray="4 4"
            fill="none"
          />
        )}

        {/* Fill Area */}
        {points.length > 1 && (
          <polygon
            points={`${coords[0].x},${zeroY} ${coords.map(p => `${p.x},${p.y}`).join(" ")} ${coords[coords.length - 1].x},${zeroY}`}
            fill={mode === 'DRAWDOWN' ? "url(#negativeGrad)" : "url(#primaryGrad)"}
          />
        )}

        {/* Line */}
        <polyline
          points={coords.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke={mode === 'DRAWDOWN' ? "var(--color-negative)" : "var(--color-primary)"}
          strokeWidth="2"
          fill="none"
          className="opacity-90"
        />

        {/* Points */}
        {coords.map((point) => {
          const isDrawdownMode = mode === 'DRAWDOWN';
          const isWin = point.pnl > 0;
          return (
            <circle
              key={point.trade.id}
              cx={point.x}
              cy={point.y}
              r="4"
              className={`cursor-pointer transition-all hover:r-[6] ${isDrawdownMode ? "fill-negative" : (isWin ? "fill-positive" : "fill-border-slate")}`}
              onClick={() => onSelect(point.trade)}
            >
              <title>
                Trade {point.index} · {formatDate(point.trade.date)}
                {"\n"}Net: {formatSigned(formatCurrency(point.pnl))}
                {"\n"}{mode}: {formatModeValue(point.val)}
              </title>
            </circle>
          )
        })}
      </svg>
    </div>
  );
}

export default EquityChart;
