import React, { useEffect, useMemo, useState } from 'react'
import TradeCard from '../components/TradeCard'
import TradeFilters from '../components/trades/TradeFilters'
import TradeList from '../components/trades/TradeList'
import { tradeSummary } from '../utils/calculations'
import { filterTrades, sortTrades } from '../utils/filters'
import { formatCurrency, formatSigned } from '../utils/formatters'

function getGroupKeys(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const monthName = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const monthKey = `${monthName} ${year}`;

  const dateNum = d.getDate();
  const dayOfWeek = d.getDay();
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  const startOffset = dateNum - isoDay + 1;

  let startOfWeek = new Date(year, month, startOffset);
  let endOfWeek = new Date(year, month, startOffset + 6);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  if (startOfWeek < firstDayOfMonth) startOfWeek = firstDayOfMonth;
  if (endOfWeek > lastDayOfMonth) endOfWeek = lastDayOfMonth;

  const firstDayOfMonthIsoDay = firstDayOfMonth.getDay() === 0 ? 7 : firstDayOfMonth.getDay();
  const firstSundayDate = 8 - firstDayOfMonthIsoDay;

  let weekNum;
  if (dateNum <= firstSundayDate) {
    weekNum = 1;
  } else {
    weekNum = Math.ceil((dateNum - firstSundayDate) / 7) + 1;
  }

  const shortMonthStart = startOfWeek.toLocaleString('en-US', { month: 'short' });
  const startDay = startOfWeek.getDate();
  const shortMonthEnd = endOfWeek.toLocaleString('en-US', { month: 'short' });
  const endDay = endOfWeek.getDate();

  let weekRangeStr = (shortMonthStart === shortMonthEnd) ?
    `${shortMonthStart} ${startDay}–${endDay}` :
    `${shortMonthStart} ${startDay} – ${shortMonthEnd} ${endDay}`;

  return {
    monthKey,
    weekKey: `Week ${weekNum} — ${weekRangeStr}`,
    monthSortValue: new Date(year, month, 1).getTime(),
    weekSortValue: weekNum
  };
}

function WeekGroup({ week, view, onSelect }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const summary = tradeSummary(week.trades);

  return (
    <div className="group-week">
      <div className="group-week__header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>{week.id}</h3>
        <div className="group-summary">
          <span>{week.trades.length} {week.trades.length === 1 ? 'trade' : 'trades'}</span>
          <strong className={summary.netPnl >= 0 ? 'profit' : 'loss'}>{formatSigned(formatCurrency(summary.netPnl))}</strong>
        </div>
      </div>
      {!isCollapsed && (
        <div className="group-week__content">
          {view === 'cards' ? (
            <div className="trades-grid">
              {week.trades.map(trade => <TradeCard key={trade.id} trade={trade} onSelect={onSelect} />)}
            </div>
          ) : (
            <TradeList trades={week.trades} onSelect={onSelect} />
          )}
        </div>
      )}
    </div>
  );
}

function MonthGroup({ month, view, onSelect }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const allTrades = month.weeks.flatMap(w => w.trades);
  const summary = tradeSummary(allTrades);

  return (
    <div className="group-month">
      <div className="group-month__header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h2>{month.id}</h2>
        <div className="group-summary">
          <span>{allTrades.length} {allTrades.length === 1 ? 'trade' : 'trades'}</span>
          <strong className={summary.netPnl >= 0 ? 'profit' : 'loss'}>{formatSigned(formatCurrency(summary.netPnl))}</strong>
          <button type="button" className="collapse-btn">{isCollapsed ? '+' : '–'}</button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="group-month__content">
          {month.weeks.map(week => <WeekGroup key={week.id} week={week} view={view} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}

const emptyFilters = { search: '', pair: '', direction: '', result: '', setup: '', timeframe: '', session: '', rules: '', from: '', to: '' }

function Trades({ trades, onSelectTrade, initialFilters }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState(() => localStorage.getItem('trade-view') || 'cards')

  useEffect(() => localStorage.setItem('trade-view', view), [view])
  useEffect(() => { if (initialFilters) setFilters({ ...emptyFilters, ...initialFilters }) }, [initialFilters])

  const filtered = useMemo(() => sortTrades(filterTrades(trades, filters), sort), [trades, filters, sort])

  const groupedMonths = useMemo(() => {
    const monthMap = {};
    filtered.forEach(trade => {
      const keys = getGroupKeys(trade.date);
      if (!monthMap[keys.monthKey]) {
        monthMap[keys.monthKey] = {
          id: keys.monthKey,
          sortValue: keys.monthSortValue,
          weeks: {}
        };
      }
      if (!monthMap[keys.monthKey].weeks[keys.weekKey]) {
        monthMap[keys.monthKey].weeks[keys.weekKey] = {
          id: keys.weekKey,
          sortValue: keys.weekSortValue,
          trades: []
        };
      }
      monthMap[keys.monthKey].weeks[keys.weekKey].trades.push(trade);
    });

    return Object.values(monthMap)
      .sort((a, b) => b.sortValue - a.sortValue)
      .map(m => ({
        ...m,
        weeks: Object.values(m.weeks).sort((a, b) => b.sortValue - a.sortValue)
      }));
  }, [filtered]);

  const summary = tradeSummary(trades)
  const select = (trade) => onSelectTrade(trade, filtered)

  return (
    <div className="trades-page">
      <section className="trades-intro">
        <p className="eyebrow">Trade explorer</p>
        <h1>Trade Journal</h1>
        <p>Review every decision, not just every result.</p>
      </section>
      <section className="journal-summary">
        <div><span>Total trades</span><strong>{trades.length}</strong></div>
        <div><span>Wins</span><strong className="profit">{summary.wins}</strong></div>
        <div><span>Losses</span><strong className="loss">{summary.losses}</strong></div>
        <div><span>Break-even</span><strong>{summary.breakEven}</strong></div>
        <div><span>Net P&amp;L</span><strong className={summary.netPnl >= 0 ? 'profit' : 'loss'}>{formatSigned(formatCurrency(summary.netPnl))}</strong></div>
      </section>

      <TradeFilters trades={trades} filters={filters} onChange={setFilters} onClear={() => setFilters(emptyFilters)} sort={sort} onSort={setSort} />

      <div className="trade-explorer-heading">
        <p><b>{filtered.length}</b> {filtered.length === 1 ? 'trade' : 'trades'} shown</p>
        <div className="view-toggle">
          <button className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')} type="button">▦ Cards</button>
          <button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} type="button">☷ List</button>
        </div>
      </div>

      <div className={`trade-view trade-view--${view}`}>
        {groupedMonths.length > 0 ? (
          groupedMonths.map(month => (
            <MonthGroup key={month.id} month={month} view={view} onSelect={select} />
          ))
        ) : (
          <div className="empty-state">
            <span>◌</span>
            <h3>No trades match these filters</h3>
            <p>Try widening the criteria or clear filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Trades
