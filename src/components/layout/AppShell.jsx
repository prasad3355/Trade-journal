const navigation = [
  ['Overview', '◌'],
  ['Trades', '▤'],
  ['Review', '◈'],
  ['Analytics', '⌁'],
]

function AppShell({ children, page, onPageChange, onNewTrade, onExport, onImportClick }) {
  return (
    <div className="application">
      <aside className="sidebar">
        <a className="logo" href="#overview"><span className="logo-mark">◈</span><span>Trade<span>folio</span></span></a>
        <nav className="sidebar-nav" aria-label="Journal navigation">
          {navigation.map(([label, icon]) => <button className={`nav-item ${page === label.toLowerCase() ? 'nav-item--active' : ''}`} key={label} type="button" onClick={() => onPageChange(label.toLowerCase())}><i>{icon}</i><span>{label}</span></button>)}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button className="btn-secondary btn-sm" onClick={onExport} style={{ flex: 1 }}>Export</button>
            <button className="btn-secondary btn-sm" onClick={onImportClick} style={{ flex: 1 }}>Import</button>
          </div>
          <div><span className="status-dot" /> Local journal <small>v1.0</small></div>
        </div>
      </aside>
      <div className="application-main">
        <header className="app-header">
          <div className="mobile-logo"><span>◈</span> Tradefolio</div>
          <p>Thursday, 21 August 2026</p>
          <button className="header-action" type="button" onClick={onNewTrade}>＋ <span>New Trade</span></button>
        </header>
        {children}
      </div>
    </div>
  )
}

export default AppShell
