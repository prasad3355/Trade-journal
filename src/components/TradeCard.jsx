import { formatCurrency, formatDate, formatNumber, formatSigned } from '../utils/formatters'
import ChartFrame from './ui/ChartFrame'

function TradeCard({ trade, onSelect }) {
  const isWin = trade.pnl >= 0

  return (
    <button className="trade-card" onClick={() => onSelect(trade)} type="button">
      <div className="trade-card__visual"><ChartFrame trade={trade} /><span className="trade-card__number">#{trade.id.slice(-3)}</span><span className="trade-card__timeframe">{trade.timeframe}</span></div>
      <div className="trade-card__body">
        <div className="trade-card__heading">
          <div>
            <p className="eyebrow">{formatDate(trade.date)}</p>
            <h3>{trade.pair}</h3>
          </div>
          <span className={`direction direction--${trade.direction.toLowerCase()}`}>{trade.direction}</span>
        </div>
        <p className="trade-card__setup">{trade.setup}</p><div className="trade-card__prices"><span>Session <b>{trade.session.replace('_', ' ')}</b></span><span>E <b>{trade.entry ?? '—'}</b></span><span>X <b>{trade.exit ?? '—'}</b></span><span>SL <b>{trade.stopLoss ?? '—'}</b></span></div>
        <div className="trade-card__footer">
          <strong className={isWin ? 'profit' : 'loss'}>{formatSigned(formatCurrency(trade.pnl))}</strong>
          <span>{formatNumber(trade.rr)}R</span>
        </div>
      </div>
    </button>
  )
}

export default TradeCard
