import { useState, useEffect } from "react";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Trades from "./pages/Trades";
import Analytics from "./pages/Analytics";
import TradeDetail from "./components/TradeDetail";
import { useTrades } from "./context/TradeContext";
import { AnimatePresence, motion } from "framer-motion";

function App() {
  const { trades, isLoading } = useTrades();
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [reviewTrades, setReviewTrades] = useState([]);
  const [page, setPage] = useState("trades"); // Default to gallery

  useEffect(() => {
    if (!isLoading) setReviewTrades(trades);
  }, [isLoading, trades]);

  const openTrade = (trade, visibleTrades = trades) => {
    setReviewTrades(visibleTrades);
    setSelectedTrade(trade);
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-[#0a0a0b] text-white/50 font-label-caps uppercase tracking-widest gap-4">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white animate-spin"></div>
        Loading Archive...
      </div>
    );
  }

  const pageVariants = {
    initial: { opacity: 0, filter: "blur(4px)", y: 10 },
    animate: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, filter: "blur(4px)", y: -10, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <main className="w-full h-screen bg-[#0a0a0b] text-white selection:bg-white/20 selection:text-white relative overflow-hidden font-sans">
      <AppShell
        page={page}
        onPageChange={setPage}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full h-full"
          >
            {page === "trades" ? (
              <Trades
                trades={trades}
                onSelectTrade={openTrade}
              />
            ) : page === "analytics" ? (
              <Analytics
                trades={trades}
                onSelectTrade={openTrade}
              />
            ) : (
              <Dashboard
                trades={trades}
                onSelectTrade={openTrade}
                onViewTrades={() => setPage("trades")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </AppShell>

      <AnimatePresence>
        {selectedTrade && (
          <motion.div
            key="trade-detail"
            initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100]"
          >
            <TradeDetail
              trade={selectedTrade}
              trades={reviewTrades}
              onClose={() => setSelectedTrade(null)}
              onSelectTrade={setSelectedTrade}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default App;
