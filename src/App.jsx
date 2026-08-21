import { useState } from 'react'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import Trades from './pages/Trades'
import Analytics from './pages/Analytics'
import TradeDetail from './components/TradeDetail'
import { trades } from './data/trades'

function App() {
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [reviewTrades, setReviewTrades] = useState(trades)
  const [page, setPage] = useState('overview')
  const [tradeFilters, setTradeFilters] = useState(null)
  const openTrade = (trade, visibleTrades = trades) => { setReviewTrades(visibleTrades); setSelectedTrade(trade) }

  return (
    <main className="app-shell">
      <AppShell page={page} onPageChange={setPage}>
        {page === 'trades' ? <Trades trades={trades} onSelectTrade={openTrade} initialFilters={tradeFilters} /> : page === 'analytics' ? <Analytics trades={trades} onSelectTrade={openTrade} onFilterTrades={(filters) => { setTradeFilters(filters); setPage('trades') }} /> : <Dashboard trades={trades} onSelectTrade={openTrade} onViewTrades={() => setPage('trades')} />}
      </AppShell>
      {selectedTrade && (
        <TradeDetail trade={selectedTrade} trades={reviewTrades} onClose={() => setSelectedTrade(null)} onSelectTrade={setSelectedTrade} />
      )}
    </main>
  )
}

export default App
