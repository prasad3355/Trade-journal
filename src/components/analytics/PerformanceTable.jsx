import {
  formatCurrency,
  formatNumber,
  formatSigned,
} from "../../utils/formatters";

function PerformanceTable({ title, rows, onSelect }) {
  return (
    <section className="flex flex-col rounded overflow-hidden">
      <div className="border-b border-white/10 pb-2 mb-2 flex justify-between items-baseline">
        <h3 className="text-[10px] font-label-caps uppercase tracking-widest text-white/40">
          {title}
        </h3>
        <span className="text-[10px] font-label-caps uppercase tracking-widest text-white/30">
          {rows.length} groups
        </span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="text-[9px] uppercase font-label-caps tracking-widest text-white/30">
            <tr>
              <th className="py-2 font-normal whitespace-nowrap">Group</th>
              <th className="py-2 font-normal text-right whitespace-nowrap">
                Vol
              </th>
              <th className="py-2 font-normal text-right whitespace-nowrap">
                W%
              </th>
              <th className="py-2 font-normal text-right whitespace-nowrap">
                Net P&amp;L
              </th>
            </tr>
          </thead>
          <tbody className="font-data-mono text-sm">
            {rows.map((row) => (
              <tr
                key={row.label}
                className={`border-b border-white/5 hover:bg-white/5 transition-colors group ${onSelect ? "cursor-pointer" : ""}`}
                onClick={() => onSelect?.(row.label)}
              >
                <td
                  className="py-3 font-bold text-white group-hover:text-white max-w-[120px] truncate"
                  title={row.label}
                >
                  {row.label}
                </td>
                <td className="py-3 text-right text-white/50">
                  {row.trades ?? row.wins + row.losses + row.breakEven}
                </td>
                <td className="py-3 text-right text-white/50">
                  {Math.round(row.winRate * 100)}%
                </td>
                <td
                  className={`py-3 text-right font-bold ${row.netPnl >= 0 ? "text-positive" : "text-negative"}`}
                >
                  {formatSigned(formatCurrency(row.netPnl))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="py-6 text-center text-white/30 text-xs"
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
