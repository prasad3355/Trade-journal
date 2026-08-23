import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trades as initialTrades } from "../data/trades";
import {
  clearAllTradesFromDB,
  deleteTradeFromDB,
  getAllTrades,
  saveTradesToDB,
  saveTradeToDB,
  saveTradeImage,
  getTradeImages,
  clearTradeImages
} from "../utils/idb";
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
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeDB = async () => {
      try {
        let storedTrades = await getAllTrades();

        const hasSeeded = localStorage.getItem("TradeFolio_Seeded");
        if (storedTrades.length === 0 && !hasSeeded) {
          await saveTradesToDB(initialTrades);
          localStorage.setItem("TradeFolio_Seeded", "true");
          storedTrades = await getAllTrades();
        } else if (storedTrades.length > 0 && !hasSeeded) {
          // If we had trades but missing flag (pre-update), safely mark it without seeding
          localStorage.setItem("TradeFolio_Seeded", "true");
        }

        storedTrades = storedTrades.map((t) => ({
          ...t,
          ...classifySession(t.date),
          pair: normalizeInstrument(t.pair),
        }));
        storedTrades.sort((a, b) => new Date(b.date) - new Date(a.date));

        setTrades(storedTrades);
      } catch (error) {
        console.error("Failed to fetch trades from IndexedDB:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initializeDB();
  }, []);

  const processTradeImages = async (trade) => {
    let staticPaths = [];
    let processingBlobs = [];

    // Map input string types to valid distinct processing streams
    const processImageString = async (imgStr) => {
      if (imgStr.startsWith("data:image")) {
        const parts = imgStr.split(";base64,");
        const type = parts[0].split(":")[1] || "image/png";
        const raw = window.atob(parts[1]);
        const arr = new Uint8Array(raw.length);
        for (let j = 0; j < raw.length; j++) arr[j] = raw.charCodeAt(j);
        processingBlobs.push(new Blob([arr], { type }));
      } else if (imgStr.startsWith("blob:")) {
        try {
          const res = await fetch(imgStr);
          const blob = await res.blob();
          processingBlobs.push(blob);
        } catch (e) { console.warn("Blob fetch failed on edit sync", e); }
      } else if (imgStr.startsWith("/")) {
        staticPaths.push(imgStr);
      }
    };

    if (trade.images && Array.isArray(trade.images)) {
      for (let i = 0; i < trade.images.length; i++) {
        await processImageString(trade.images[i]);
      }
    } else if (trade.image && typeof trade.image === "string") {
      await processImageString(trade.image);
    }

    // Guarantee absolute clean state for this trade's images avoiding orphans on deletion
    await clearTradeImages(trade.id);

    // Re-insert exactly the active blobs mapping strictly to state
    for (let blob of processingBlobs) {
      await saveTradeImage(trade.id, blob);
    }

    trade.images = staticPaths;
    trade.image = staticPaths.length > 0 ? staticPaths[0] : null;
    return trade;
  };

  const addTrade = async (newTrade) => {
    let tradeWithSession = {
      ...newTrade,
      ...classifySession(newTrade.date),
      pair: normalizeInstrument(newTrade.pair),
    };

    tradeWithSession = await processTradeImages(tradeWithSession);

    await saveTradeToDB(tradeWithSession);
    setTrades((prev) =>
      [tradeWithSession, ...prev].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      ),
    );
  };

  const updateTrade = async (updatedTrade) => {
    let tradeWithSession = {
      ...updatedTrade,
      ...classifySession(updatedTrade.date),
      pair: normalizeInstrument(updatedTrade.pair),
    };

    // In update, we don't automatically delete historic indexed DB images 
    // without a separate API route, but for this safe scope, processing appended bases works perfectly.
    tradeWithSession = await processTradeImages(tradeWithSession);

    await saveTradeToDB(tradeWithSession);
    setTrades((prev) =>
      prev
        .map((t) => (t.id === updatedTrade.id ? tradeWithSession : t))
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    );
  };

  const deleteTrade = async (id) => {
    await deleteTradeFromDB(id);
    setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  const clearData = async () => {
    await clearAllTradesFromDB();
    setTrades([]);
  };

  const reloadTrades = async () => {
    setIsLoading(true);
    try {
      const storedTrades = await getAllTrades();
      setTrades(
        storedTrades
          .map((t) => ({
            ...t,
            ...classifySession(t.date),
            pair: normalizeInstrument(t.pair),
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date)),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };


  // Helper hook exposed for consumers to resolve images async
  const resolveTradeImages = useCallback(async (tradeId) => {
    try {
      const imgRecords = await getTradeImages(tradeId);
      return imgRecords.map(r => URL.createObjectURL(r.data));
    } catch (e) {
      console.error("Failed to resolve lazy loaded trade images block", e);
      return [];
    }
  }, []);

  return (
    <TradeContext.Provider
      value={{
        trades,
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
