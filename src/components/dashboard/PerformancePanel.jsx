import { formatCurrency, formatSigned } from '../../utils/formatters'

function PerformancePanel({ trades }) {
  let runningPnl = 0
  const points = trades.slice().reverse().map((trade) => (runningPnl += trade.pnl))
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const coords = points.map((value, index) => `${20 + index * (340 / Math.max(points.length - 1, 1))},${142 - ((value - min) / range) * 104}`).join(' ')
  const wins = trades.filter((trade) => trade.pnl > 0).length
  const losses = trades.filter((trade) => trade.pnl < 0).length
  const long = trades.filter((trade) => trade.direction?.toLowerCase() === 'long').length
  const short = trades.filter((trade) => trade.direction?.toLowerCase() === 'short').length
  const total = points.at(-1) || 0
  const breakdown = [['Wins', wins, 'profit'], ['Losses', losses, 'loss'], ['Break-even', trades.length - wins - losses, ''], ['Long', long, ''], ['Short', short, '']]

  return <section className="performance-layout"><article className="equity-card"><div className="panel-heading"><div><p className="eyebrow">Performance</p><h2>Equity curve</h2></div><strong className={total >= 0 ? 'profit' : 'loss'}>{formatSigned(formatCurrency(total))}</strong></div><div className="equity-chart"><svg viewBox="0 0 380 170" preserveAspectRatio="none" aria-label="Cumulative profit and loss chart"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#57ca9a" stopOpacity=".34"/><stop offset="1" stopColor="#57ca9a" stopOpacity="0"/></linearGradient></defs><path d="M 0 145 H 380 M 0 90 H 380 M 0 35 H 380" className="equity-grid"/><polygon points={`20,150 ${coords} 360,150`} fill="url(#area)"/><polyline points={coords} className="equity-line"/></svg><div className="equity-labels"><span>Trade 1</span><span>Latest</span></div></div></article><article className="breakdown-card"><p className="eyebrow">Trade breakdown</p><h2>At a glance</h2><div className="breakdown-list">{breakdown.map(([label, value, tone]) => <div key={label}><span className={`breakdown-dot ${tone}`} /> <p>{label}</p><strong>{value}</strong></div>)}</div></article></section>
}

export default PerformancePanel
