const navigation = [
  ["Overview", "dashboard", "dashboard"],
  ["Trades", "trades", "query_stats"],
  ["Calendar", "calendar", "calendar_month"],
  ["Performance", "performance", "insights"],
  ["Analytics", "analytics", "analytics"],
  ["Discipline", "discipline", "policy"],
  ["Review", "review", "rate_review"],
  ["Data Center", "dataCenter", "storage"],
  ["Settings", "settings", "settings"],
];

function AppShell({
  children,
  page,
  onPageChange,
  onNewTrade
}) {
  // We can use random dummy values matching Stitch UI for presentation if not dynamic yet
  return (
    <div className="flex h-screen overflow-hidden text-body-md font-body-md text-on-surface bg-surface-canvas selection:bg-primary selection:text-on-primary">
      {/* SIDE NAVIGATION */}
      <nav className="fixed left-0 top-0 h-full flex flex-col z-40 bg-surface-container docked w-64 border-r border-outline-variant hidden md:flex shrink-0">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant flex flex-col gap-1">
          <div className="font-headline-md text-headline-md font-black text-primary truncate">
            TRADE JOURNAL
          </div>
          <div className="font-label-caps text-label-caps font-data-mono text-data-mono text-on-surface-variant">
            Institutional Grade
          </div>
        </div>

        {/* Main Nav Links */}
        <div className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto px-3">
          {navigation.map(([label, key, icon]) => {
            const isActive = page === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  onPageChange(key)
                }
                className={`flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ease-in-out cursor-pointer ${isActive
                  ? "bg-primary-container text-on-primary-container border-l-2 border-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                  }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {icon}
                </span>
                <span className="font-label-caps text-label-caps tracking-widest uppercase">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Session/Account Status Footer */}
        <div className="p-4 border-t border-outline-variant flex flex-col gap-2">
          <div className="px-4 py-2">
            <div className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">
              Session Status
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-positive"></span>
              <span className="font-data-mono-sm text-data-mono-sm text-on-surface">
                Active: Local DB
              </span>
            </div>
            <div className="text-xs text-on-surface-variant mt-2 truncate flex items-center justify-between">
              <span>Account: DEMO</span>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col md:ml-64 bg-surface-canvas relative overflow-hidden h-screen w-full min-w-0">
        {/* UNIVERSAL TOP BAR */}
        <header className="flex justify-between items-center w-full px-margin-desktop h-16 z-50 glass-panel docked full-width top-0 border-b border-outline-variant shrink-0 relative">
          {/* Left side: Command Center Title */}
          <div className="flex items-center gap-6">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface hidden md:block">
              Command Center
            </h2>
            <div className="md:hidden font-headline-sm text-headline-sm font-bold tracking-tighter text-on-surface">
              TRADE JOURNAL
            </div>
          </div>

          {/* Center: Command/Search Bar */}
          <div className="flex-1 max-w-2xl px-6 hidden sm:block">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                className="w-full bg-surface-container-high border border-outline-variant rounded-md py-2 pl-9 pr-12 text-sm text-on-surface focus:outline-none focus:border-primary placeholder-on-surface-variant/50 transition-colors"
                placeholder="Search instrument, tag, or note..."
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <kbd className="bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-[10px] font-data-mono text-on-surface-variant">
                  ⌘
                </kbd>
                <kbd className="bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-[10px] font-data-mono text-on-surface-variant">
                  K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Notifications */}
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150 rounded cursor-pointer active:opacity-80 relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
            </button>
            <div className="w-px h-6 bg-outline-variant mx-1"></div>
            {/* Primary Action */}
            <button
              onClick={onNewTrade}
              className="px-4 py-2 text-sm font-medium bg-primary-container text-on-primary-container rounded hover:bg-blue-600 transition-colors duration-150 cursor-pointer active:opacity-80 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>{" "}
              Add Trade
            </button>
            {/* Profile */}
            <div className="ml-1 w-8 h-8 rounded bg-surface-container-highest border border-outline-variant overflow-hidden cursor-pointer shrink-0">
              <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-on-surface-variant text-xl">
                account_circle
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto w-full relative">{children}</div>
      </main>
    </div>
  );
}

export default AppShell;
