export const filterTrades = (trades, filters) =>
  trades.filter((trade) => {
    const term = filters.search.trim().toLowerCase();
    const searchable =
      `${trade.pair} ${trade.setup} ${trade.learning} ${trade.date} ${trade.session}`.toLowerCase();
    const result =
      trade.pnl > 0 ? "win" : trade.pnl < 0 ? "loss" : "break-even";
    const imageRules = trade.rulesFollowed.toLowerCase().startsWith("yes")
      ? "yes"
      : "no";
    return (
      (!term || searchable.includes(term)) &&
      (!filters.pair || trade.pair === filters.pair) &&
      (!filters.direction || trade.direction === filters.direction) &&
      (!filters.result || result === filters.result) &&
      (!filters.setup || trade.setup === filters.setup) &&
      (!filters.timeframe || trade.timeframe === filters.timeframe) &&
      (!filters.session || trade.session === filters.session) &&
      (!filters.rules || imageRules === filters.rules) &&
      (!filters.from || trade.date >= filters.from) &&
      (!filters.to || trade.date <= filters.to)
    );
  });

export function sortTrades(trades, sort) {
  const copy = [...trades];
  const comparisons = {
    newest: (a, b) => b.date.localeCompare(a.date),
    oldest: (a, b) => a.date.localeCompare(b.date),
    highestPnl: (a, b) => b.pnl - a.pnl,
    lowestPnl: (a, b) => a.pnl - b.pnl,
    highestRr: (a, b) => b.rr - a.rr,
    lowestRr: (a, b) => a.rr - b.rr,
  };
  return copy.sort(comparisons[sort] || comparisons.newest);
}
