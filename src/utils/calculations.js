export function tradeSummary(trades) {
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const losses = trades.filter((trade) => trade.pnl < 0).length;
  return {
    wins,
    losses,
    breakEven: trades.length - wins - losses,
    netPnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
  };
}

export const getResult = (trade) =>
  trade.pnl > 0 ? "Win" : trade.pnl < 0 ? "Loss" : "Break-even";
