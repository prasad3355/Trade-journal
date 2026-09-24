import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trades as initialTrades } from "../data/trades";
import { classifySession } from "../utils/sessions";

const normalizeInstrument = (pair) => {
  if (!pair) return "";
  const clean = String(pair).trim().toUpperCase();
  if (["GOLD", "XAUUSD", "XAU/USD", "XAU-USD"].includes(clean)) {
    return "XAUUSD";
  }
  return pair;
};

const TradeContext = createContext();

export function TradeProvider({ children }) {
  const [tradesList, setTradesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 100% Static runtime mapping, no IndexedDB
    const mapped = initialTrades.map(t => ({
      ...t,
      ...classifySession(t.date),
      pair: normalizeInstrument(t.pair),
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    setTradesList(mapped);
    setIsLoading(false);
  }, []);

  // Dummy functions to prevent crashes if anything tries to call them
  const addTrade = async () => { console.warn("Static Mode: Add Trade disabled."); };
  const updateTrade = async () => { console.warn("Static Mode: Update Trade disabled."); };
  const deleteTrade = async () => { console.warn("Static Mode: Delete Trade disabled."); };
  const clearData = async () => { console.warn("Static Mode: Clear Data disabled."); };
  const reloadTrades = async () => { console.log("Static Mode: Reloaded static json."); };

  // Static images are now natively inside the object at trade.images[], so they resolve immediately
  const resolveTradeImages = useCallback(async (tradeId) => {
    const t = initialTrades.find(x => x.id === tradeId);
    return t && Array.isArray(t.images) ? t.images : [];
  }, []);

  return (
    <TradeContext.Provider
      value={{
        trades: tradesList,
        isLoading,
        addTrade,
        updateTrade,
        deleteTrade,
        clearData,
        reloadTrades,
        resolveTradeImages
      }}
    >
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  return useContext(TradeContext);
}
