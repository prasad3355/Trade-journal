import { useEffect, useMemo, useState } from 'react'
import TradeCard from '../components/TradeCard'
import TradeFilters from '../components/trades/TradeFilters'
import TradeList from '../components/trades/TradeList'
import { tradeSummary } from '../utils/calculations'
import { filterTrades, sortTrades } from '../utils/filters'
import { formatCurrency, formatSigned } from '../utils/formatters'

const emptyFilters = { search: '', pair: '', direction: '', result: '', setup: '', timeframe: '', session: '', rules: '', from: '', to: '' }
function Trades({ trades, onSelectTrade, initialFilters }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState(() => localStorage.getItem('trade-view') || 'cards')
  useEffect(() => localStorage.setItem('trade-view', view), [view])
  useEffect(() => { if (initialFilters) setFilters({ ...emptyFilters, ...initialFilters }) }, [initialFilters])
  const filtered = useMemo(() => sortTrades(filterTrades(trades, filters), sort), [trades, filters, sort])
  const summary = tradeSummary(trades)
  const select = (trade) => onSelectTrade(trade, filtered)
  return <div className="trades-page"><section className="trades-intro"><p className="eyebrow">Trade explorer</p><h1>Trade Journal</h1><p>Review every decision, not just every result.</p></section><section className="journal-summary"><div><span>Total trades</span><strong>{trades.length}</strong></div><div><span>Wins</span><strong className="profit">{summary.wins}</strong></div><div><span>Losses</span><strong className="loss">{summary.losses}</strong></div><div><span>Break-even</span><strong>{summary.breakEven}</strong></div><div><span>Net P&amp;L</span><strong className={summary.netPnl >= 0 ? 'profit' : 'loss'}>{formatSigned(formatCurrency(summary.netPnl))}</strong></div></section><TradeFilters trades={trades} filters={filters} onChange={setFilters} onClear={() => setFilters(emptyFilters)} sort={sort} onSort={setSort} /><div className="trade-explorer-heading"><p><b>{filtered.length}</b> {filtered.length === 1 ? 'trade' : 'trades'} shown</p><div className="view-toggle"><button className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')} type="button">▦ Cards</button><button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} type="button">☷ List</button></div></div><div className={`trade-view trade-view--${view}`}>{view === 'cards' ? <div className="trades-grid">{filtered.map((trade) => <TradeCard key={trade.id} trade={trade} onSelect={select} />)}{!filtered.length && <div className="empty-state"><span>◌</span><h3>No trades match these filters</h3><p>Try widening the criteria or clear filters.</p></div>}</div> : <TradeList trades={filtered} onSelect={select} />}</div></div>
}
export default Trades
