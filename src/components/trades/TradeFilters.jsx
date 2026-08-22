const selectOptions = (values) => [...new Set(values)].map((value) => <option value={value} key={value}>{value}</option>)

function TradeFilters({ trades, filters, onChange, onClear, sort, onSort }) {
  const update = (event) => onChange({ ...filters, [event.target.name]: event.target.value })
  return <section className="trade-filters"><div className="filter-search"><span>⌕</span><input name="search" value={filters.search} onChange={update} placeholder="Search trades..." aria-label="Search trades" /></div><div className="filter-controls">
    <select name="pair" value={filters.pair} onChange={update}><option value="">All pairs</option>{selectOptions(trades.map((t) => t.pair))}</select>
    <select name="setup" value={filters.setup} onChange={update}><option value="">All setups</option>{selectOptions(trades.map((t) => t.setup))}</select>
    <select name="result" value={filters.result} onChange={update}><option value="">All results</option><option value="win">Wins</option><option value="loss">Losses</option><option value="break-even">Break-even</option></select>
    <select name="direction" value={filters.direction} onChange={update}><option value="">Long / Short</option>{selectOptions(trades.map((t) => t.direction))}</select>
    <select name="timeframe" value={filters.timeframe} onChange={update}><option value="">Timeframe</option>{selectOptions(trades.map((t) => t.timeframe))}</select>
    <select name="session" value={filters.session} onChange={update}><option value="">All sessions</option>{selectOptions(trades.map((t) => t.session))}</select>
    <select name="rules" value={filters.rules} onChange={update}><option value="">Rules</option><option value="yes">Followed</option><option value="no">Not followed</option></select>
    <label className="date-control">From<input name="from" type="date" value={filters.from} onChange={update} /></label><label className="date-control">To<input name="to" type="date" value={filters.to} onChange={update} /></label>
    <button className="btn-secondary btn-sm" type="button" onClick={onClear}>Clear filters</button>
  </div><div className="filter-bottom"><span>Sort by</span><select value={sort} onChange={(event) => onSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highestPnl">Highest P&amp;L</option><option value="lowestPnl">Lowest P&amp;L</option><option value="highestRr">Highest RR</option><option value="lowestRr">Lowest RR</option></select></div></section>
}
export default TradeFilters
