import React, { createContext, useContext, useEffect, useState } from 'react';
import { trades as initialTrades } from '../data/trades';
import { clearAllTradesFromDB, deleteTradeFromDB, getAllTrades, saveTradesToDB, saveTradeToDB } from '../utils/idb';
import { classifySession } from '../utils/sessions';

const normalizeInstrument = (pair) => {
    if (!pair) return '';
    const clean = String(pair).trim().toUpperCase();
    if (['GOLD', 'XAUUSD', 'XAU/USD', 'XAU-USD'].includes(clean)) {
        return 'XAUUSD';
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
                if (storedTrades.length === 0) {
                    // Seed with initial static data
                    await saveTradesToDB(initialTrades);
                    storedTrades = initialTrades;
                }

                // Ensure static items correctly re-calculate sessions and normalize pair
                storedTrades = storedTrades.map(t => ({
                    ...t,
                    ...classifySession(t.date),
                    pair: normalizeInstrument(t.pair)
                }));
                // Sort descending by date
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

    const addTrade = async (newTrade) => {
        const tradeWithSession = {
            ...newTrade,
            ...classifySession(newTrade.date),
            pair: normalizeInstrument(newTrade.pair)
        };
        await saveTradeToDB(tradeWithSession);
        setTrades(prev => [tradeWithSession, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
    };

    const updateTrade = async (updatedTrade) => {
        const tradeWithSession = {
            ...updatedTrade,
            ...classifySession(updatedTrade.date),
            pair: normalizeInstrument(updatedTrade.pair)
        };
        await saveTradeToDB(tradeWithSession);
        setTrades(prev => prev.map(t => t.id === updatedTrade.id ? tradeWithSession : t).sort((a, b) => new Date(b.date) - new Date(a.date)));
    };

    const deleteTrade = async (id) => {
        await deleteTradeFromDB(id);
        setTrades(prev => prev.filter(t => t.id !== id));
    };

    const clearData = async () => {
        await clearAllTradesFromDB();
        setTrades([]);
    };

    const importBackup = async (importedTrades) => {
        await saveTradesToDB(importedTrades);
        const storedTrades = await getAllTrades();
        setTrades(storedTrades.map(t => ({
            ...t,
            ...classifySession(t.date),
            pair: normalizeInstrument(t.pair)
        })).sort((a, b) => new Date(b.date) - new Date(a.date)));
    }

    return (
        <TradeContext.Provider value={{ trades, isLoading, addTrade, updateTrade, deleteTrade, clearData, importBackup }}>
            {children}
        </TradeContext.Provider>
    );
}

export function useTrades() {
    return useContext(TradeContext);
}
