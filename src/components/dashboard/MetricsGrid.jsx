import {
  formatCurrency,
  formatNumber,
  formatSigned,
} from "../../utils/formatters";

function MetricsGrid({ trades }) {
  const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  const validRr = trades.filter((trade) => trade.rr != null);
  const metrics = [
    ["Total trades", trades.length, ""],
    ["Win rate", `${Math.round((wins.length / trades.length) * 100)}%`, ""],
    [
      "Net P&L",
      formatSigned(formatCurrency(totalPnl)),
      totalPnl >= 0 ? "profit" : "loss",
    ],
    [
      "Average P&L",
      formatSigned(formatCurrency(totalPnl / trades.length)),
      totalPnl >= 0 ? "profit" : "loss",
    ],
    [
      "Average RR",
      validRr.length
        ? `${formatNumber(validRr.reduce((sum, trade) => sum + trade.rr, 0) / validRr.length)}R`
        : "—",
      "",
    ],
    [
      "Profit factor",
      grossLoss ? formatNumber(grossProfit / grossLoss) : "—",
      "",
    ],
  ];
  return (
    <section className="metrics-grid" aria-label="Performance metrics">
      {metrics.map(([label, value, tone], index) => (
        <article
          className="metric-card"
          style={{ "--delay": `${index * 55}ms` }}
          key={label}
        >
          <p>{label}</p>
          <strong className={tone}>{value}</strong>
          <span className="metric-card__spark">
            {tone === "profit" ? "↗" : "—"}
          </span>
        </article>
      ))}
    </section>
  );
}

export default MetricsGrid;
