import { getResult, tradeSummary } from './calculations'

const byDate = (trades) => [...trades].sort((a, b) => a.date.localeCompare(b.date))
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

export function performanceSummary(trades) {
  const summary = tradeSummary(trades)
  const winners = trades.filter((trade) => getResult(trade) === 'Win')
  const losers = trades.filter((trade) => getResult(trade) === 'Loss')
  const grossProfit = winners.reduce((sum, trade) => sum + trade.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.pnl, 0))
  return { ...summary, trades: trades.length, winRate: trades.length ? summary.wins / trades.length : 0, averagePnl: average(trades.map((trade) => trade.pnl)), profitFactor: grossLoss ? grossProfit / grossLoss : null, averageWinner: average(winners.map((trade) => trade.pnl)), averageLoser: average(losers.map((trade) => trade.pnl)), best: winners.sort((a, b) => b.pnl - a.pnl)[0], worst: losers.sort((a, b) => a.pnl - b.pnl)[0] }
}

export function equityData(trades) { let cumulative = 0; let peak = 0; return byDate(trades).map((trade, index) => { cumulative += trade.pnl; peak = Math.max(peak, cumulative); return { trade, index: index + 1, pnl: trade.pnl, cumulative, drawdown: cumulative - peak } }) }

export function groupedPerformance(trades, field) {
  const groups = new Map()
  trades.forEach((trade) => { const key = trade[field] || 'Unspecified'; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(trade) })
  return [...groups.entries()].map(([label, items]) => ({ label, ...performanceSummary(items), long: items.filter((t) => t.direction?.toLowerCase() === 'long').length, short: items.filter((t) => t.direction?.toLowerCase() === 'short').length })).sort((a, b) => b.netPnl - a.netPnl)
}

export function monthlyPerformance(trades) { return groupedPerformance(trades, 'month').map((item) => item) }

export function monthGroups(trades) { const groups = new Map(); trades.forEach((trade) => { const key = trade.date.slice(0, 7); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(trade) }); return [...groups.entries()].map(([label, items]) => ({ label, ...performanceSummary(items) })).sort((a,b) => a.label.localeCompare(b.label)) }

export function streakStats(trades) { let win = 0, loss = 0, maxWin = 0, maxLoss = 0; byDate(trades).forEach((trade) => { const result = getResult(trade); if (result === 'Win') { win++; loss = 0; maxWin = Math.max(maxWin, win) } else if (result === 'Loss') { loss++; win = 0; maxLoss = Math.max(maxLoss, loss) } else { win = 0; loss = 0 } }); return { currentWin: win, currentLoss: loss, maxWin, maxLoss } }

export function dailyGroups(trades) { const groups = new Map(); trades.forEach((trade) => { const key = trade.date.slice(0, 10); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(trade) }); return [...groups.entries()].map(([date, items]) => ({ date, ...performanceSummary(items) })).sort((a,b) => a.date.localeCompare(b.date)) }
