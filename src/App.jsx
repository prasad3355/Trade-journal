import { useState, useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import Trades from './pages/Trades'
import Analytics from './pages/Analytics'
import TradeDetail from './components/TradeDetail'
import { useTrades } from './context/TradeContext'
import TradeEditor from './components/trades/TradeEditor'
import { useRef } from 'react'

function App() {
  const { trades, isLoading, importBackup } = useTrades()
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [reviewTrades, setReviewTrades] = useState([])
  const [page, setPage] = useState('overview')
  const [tradeFilters, setTradeFilters] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [tradeToEdit, setTradeToEdit] = useState(null)
  const fileReaderRef = useRef(null)

  useEffect(() => {
    if (!isLoading) setReviewTrades(trades);
  }, [isLoading, trades])

  const openTrade = (trade, visibleTrades = trades) => { setReviewTrades(visibleTrades); setSelectedTrade(trade) }

  if (isLoading) {
    return <div className="loading-state">Loading journal...</div>
  }

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trades));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "tradefolio_backup.json");
    dlAnchorElem.click();
  }

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            await importBackup(imported);
            alert("Backup imported gracefully.");
          }
        } catch (err) {
          alert("Invalid backup file.");
        }
      };
      reader.readAsText(file);
    }
  }

  return (
    <main className="app-shell">
      <AppShell page={page} onPageChange={setPage} onNewTrade={() => { setTradeToEdit(null); setIsEditorOpen(true) }} onExport={handleExport} onImportClick={() => fileReaderRef.current?.click()} >
        <input type="file" accept=".json" ref={fileReaderRef} onChange={handleImport} hidden />
        {page === 'trades' ? <Trades trades={trades} onSelectTrade={openTrade} initialFilters={tradeFilters} /> : page === 'analytics' ? <Analytics trades={trades} onSelectTrade={openTrade} onFilterTrades={(filters) => { setTradeFilters(filters); setPage('trades') }} /> : <Dashboard trades={trades} onSelectTrade={openTrade} onViewTrades={() => setPage('trades')} />}
      </AppShell>
      {selectedTrade && (
        <TradeDetail trade={selectedTrade} trades={reviewTrades} onClose={() => setSelectedTrade(null)} onSelectTrade={setSelectedTrade}
          onEdit={() => { setTradeToEdit(selectedTrade); setSelectedTrade(null); setIsEditorOpen(true) }}
          onDuplicate={() => {
            const cloned = { ...selectedTrade, id: `trade-${Date.now()}`, date: new Date().toISOString().slice(0, 16) }
            setTradeToEdit(cloned); setSelectedTrade(null); setIsEditorOpen(true);
          }}
        />
      )}
      {isEditorOpen && (
        <TradeEditor initialData={tradeToEdit} onClose={() => { setIsEditorOpen(false); setTradeToEdit(null) }} />
      )}
    </main>
  )
}

export default App
