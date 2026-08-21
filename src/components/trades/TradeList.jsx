import { formatCurrency, formatNumber, formatSigned } from '../../utils/formatters'
import { getResult } from '../../utils/calculations'

function TradeList({ trades, onSelect }) {
  if (!trades.length) return <div className="empty-state"><span>◌</span><h3>No trades match these filters</h3><p>Try widening the criteria or clear the filters to return to your journal.</p></div>
  return <div className="trade-list"><div className="trade-list__head"><span># / Date</span><span>Instrument</span><span>Result</span><span>P&amp;L</span><span>RR</span><span>Setup</span><span>Timeframe</span></div>{trades.map((trade) => <button className="trade-list__row" type="button" onClick={() => onSelect(trade)} key={trade.id}><span><b>#{trade.id.slice(-3)}</b><small>{trade.date}</small></span><span><strong>{trade.pair}</strong><i className={`direction direction--${trade.direction.toLowerCase()}`}>{trade.direction}</i></span><span className={`result-badge result-badge--${getResult(trade).toLowerCase()}`}>{getResult(trade)}</span><strong className={trade.pnl > 0 ? 'profit' : trade.pnl < 0 ? 'loss' : ''}>{formatSigned(formatCurrency(trade.pnl))}</strong><span>{formatNumber(trade.rr)}R</span><span>{trade.setup}</span><span>{trade.timeframe}</span></button>)}</div>
}
export default TradeList
