const navigation = [
  ['Overview', '◌'],
  ['Trades', '▤'],
  ['Review', '◈'],
  ['Analytics', '⌁'],
]

function AppShell({ children, page, onPageChange }) {
  return (
    <div className="application">
      <aside className="sidebar">
        <a className="logo" href="#overview"><span className="logo-mark">◈</span><span>Trade<span>folio</span></span></a>
        <nav className="sidebar-nav" aria-label="Journal navigation">
          {navigation.map(([label, icon]) => <button className={`nav-item ${page === label.toLowerCase() ? 'nav-item--active' : ''}`} key={label} type="button" onClick={() => onPageChange(label.toLowerCase())}><i>{icon}</i><span>{label}</span></button>)}
        </nav>
        <div className="sidebar-footer"><span className="status-dot" /> Local journal <small>v1.0</small></div>
      </aside>
      <div className="application-main">
        <header className="app-header"><div className="mobile-logo"><span>◈</span> Tradefolio</div><p>Thursday, 21 August 2026</p><button className="header-action" type="button">⌘ <span>Quick review</span></button></header>
        {children}
      </div>
    </div>
  )
}

export default AppShell
