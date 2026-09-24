import { motion, useScroll, useSpring } from 'framer-motion';
import { useRef } from 'react';

const navigation = [
  ["Gallery", "trades", "photo_library"],
  ["Dashboard", "dashboard", "dashboard"],
  ["Analytics", "analytics", "analytics"],
];

function AppShell({
  children,
  page,
  onPageChange
}) {
  const scrollRef = useRef(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="flex h-screen overflow-hidden text-body-md font-body-md text-on-surface bg-[#0a0a0b] selection:bg-primary selection:text-on-primary">
      {/* SIDE NAVIGATION */}
      <nav className="fixed left-0 top-0 h-full flex flex-col z-40 bg-[#0a0a0b] border-r border-white/5 hidden md:flex shrink-0 w-56">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="p-8 pb-12 flex flex-col gap-2"
        >
          <div className="font-headline-sm text-headline-sm font-semibold text-white tracking-wide">
            JOURNAL.
          </div>
          <div className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest">
            Trading Archive
          </div>
        </motion.div>

        {/* Main Nav Links */}
        <motion.div
          initial="hidden" animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
          }}
          className="flex-1 flex flex-col gap-2 px-6"
        >
          {navigation.map(([label, key, icon]) => {
            const isActive = page === key;
            return (
              <motion.button
                key={key}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
                }}
                type="button"
                onClick={() => onPageChange(key)}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors duration-300 ease-in-out cursor-pointer group relative ${isActive
                  ? "text-white"
                  : "text-on-surface-variant hover:text-white"
                  }`}
              >
                {isActive && (
                  <motion.div layoutId="nav-active" className="absolute inset-0 bg-white/5 rounded-lg z-0" transition={{ type: "spring", stiffness: 200, damping: 25 }} />
                )}
                <span
                  className="material-symbols-outlined text-[18px] opacity-80 group-hover:opacity-100 transition-opacity z-10 relative"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {icon}
                </span>
                <span className="font-label-caps text-xs tracking-widest uppercase z-10 relative">
                  {label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Minimal Footer */}
        <div className="p-8">
          <div className="text-[10px] text-white/20 font-data-mono uppercase tracking-widest">
            EST. 2026
          </div>
        </div>
      </nav>

      {/* MOBILE NAVIGATION - Simple Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[#0a0a0b]/90 backdrop-blur-md border-t border-white/5 z-50 flex items-center justify-around px-4">
        {navigation.map(([label, key, icon]) => {
          const isActive = page === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPageChange(key)}
              className={`flex flex-col items-center justify-center p-2 rounded transition-all duration-200 ${isActive ? "text-white" : "text-on-surface-variant"}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {icon}
              </span>
              <span className="text-[9px] uppercase tracking-widest font-label-caps mt-1">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col md:ml-56 relative overflow-hidden h-screen w-full min-w-0 bg-transparent">
        {/* Subtle scroll progress line at top of main area */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[1px] bg-white/20 origin-left z-50 md:h-[2px]"
          style={{ scaleX }}
        />
        {/* PAGE CONTENT */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto w-full relative custom-scrollbar pb-16 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppShell;
