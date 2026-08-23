import {
  formatCurrency,
  formatNumber,
  formatSigned,
} from "../../utils/formatters";

function PerformanceTable({ title, rows, onSelect }) {
  return (
    <section className="bg-surface-panel border border-border-slate flex flex-col rounded overflow-hidden">
      <div className="border-b border-border-slate p-2 flex justify-between items-center bg-surface-container">
        <h3 className="font-label-caps text-label-caps text-text-high-contrast uppercase border-l-2 border-primary pl-2">
          {title}
        </h3>
        <span className="font-label-caps text-label-caps text-text-muted">
          {rows.length} records
        </span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-surface-panel z-10 border-b border-border-slate font-label-caps text-label-caps text-text-muted">
            <tr>
              <th className="p-2 font-normal whitespace-nowrap">GROUP</th>
              <th className="p-2 font-normal text-right whitespace-nowrap">
                TRADES
              </th>
              <th className="p-2 font-normal text-right whitespace-nowrap">
                WIN RATE
              </th>
              <th className="p-2 font-normal text-right whitespace-nowrap">
                NET P&amp;L
              </th>
              <th className="p-2 font-normal text-right whitespace-nowrap">
                AVG P&amp;L
              </th>
            </tr>
          </thead>
          <tbody className="font-data-sm text-data-sm">
            {rows.map((row) => (
              <tr
                key={row.label}
                className={`border-b border-border-slate/50 hover:bg-surface-container-high transition-colors ${onSelect ? "cursor-pointer" : ""}`}
                onClick={() => onSelect?.(row.label)}
              >
                <td
                  className="p-2 font-medium text-text-high-contrast max-w-[120px] truncate"
                  title={row.label}
                >
                  {row.label}
                </td>
                <td className="p-2 text-right text-text-muted">
                  {row.trades ?? row.wins + row.losses + row.breakEven}
                </td>
                <td className="p-2 text-right text-text-muted">
                  {Math.round(row.winRate * 100)}%
                </td>
                <td
                  className={`p-2 text-right ${row.netPnl >= 0 ? "text-positive" : "text-negative"}`}
                >
                  {formatSigned(formatCurrency(row.netPnl))}
                </td>
                <td className="p-2 text-right text-text-muted">
                  {formatSigned(formatCurrency(row.averagePnl))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="p-4 text-center text-text-muted italic"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export default PerformanceTable;
