import {
  formatCurrency,
  formatDate,
  formatSigned,
  formatNumber
} from "../../utils/formatters";

function EquityChart({ points, mode, onSelect }) {
  if (!points || points.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
        <span className="text-xs uppercase font-label-caps tracking-widest">No Data Available</span>
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
        <defs>
          <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="negativeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e53e3e" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        <path d={`M${insetX} ${insetY} H${vbW - insetX}`} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
        <path d={`M${insetX} ${insetY + chartH / 2} H${vbW - insetX}`} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
        <path d={`M${insetX} ${insetY + chartH} H${vbW - insetX}`} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />

        {/* Zero line */}
        {min < 0 && max > 0 && (
          <path
            d={`M${insetX} ${zeroY}H${vbW - insetX}`}
            stroke="#ffffff"
            strokeOpacity="0.2"
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
          stroke={mode === 'DRAWDOWN' ? "#ffffff" : "#ffffff"}
          strokeWidth="1.5"
          fill="none"
          className="opacity-70"
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
              r="3.5"
              className={`cursor-pointer transition-all hover:r-[6] ${isDrawdownMode ? "fill-negative" : (isWin ? "fill-white" : "fill-white/30")}`}
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
