import TradeCard from '../components/TradeCard'
import MetricsGrid from '../components/dashboard/MetricsGrid'
import PerformancePanel from '../components/dashboard/PerformancePanel'

function Dashboard({ trades, onSelectTrade, onViewTrades }) {
  return (
    <div className="dashboard" id="overview">
      <section className="dashboard-intro"><div><p className="eyebrow">Personal performance log</p><h1>Trading Journal</h1><p>Review each decision, protect the process, and compound the lessons.</p></div><div className="period-chip"><span>◷</span> All time <b>⌄</b></div></section>
      <MetricsGrid trades={trades} />
      <PerformancePanel trades={trades} />
      <section className="trades-section"><div className="section-heading"><div><p className="eyebrow">Trade archive</p><h2>Recent trades</h2></div><button type="button" onClick={onViewTrades}>View all <span>→</span></button></div><div className="trades-grid">{trades.map((trade) => <TradeCard key={trade.id} trade={trade} onSelect={onSelectTrade} />)}</div></section>
    </div>
  )
}

export default Dashboard
