---
name: Obsidian Precision
colors:
  surface: '#0d1516'
  surface-dim: '#0d1516'
  surface-bright: '#333a3c'
  surface-container-lowest: '#080f11'
  surface-container-low: '#151d1e'
  surface-container: '#192122'
  surface-container-high: '#242b2d'
  surface-container-highest: '#2e3638'
  on-surface: '#dce4e5'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#dce4e5'
  inverse-on-surface: '#2a3233'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffeac0'
  on-tertiary: '#3e2e00'
  tertiary-container: '#fec931'
  on-tertiary-container: '#6f5500'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdf96'
  tertiary-fixed-dim: '#f3bf26'
  on-tertiary-fixed: '#251a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#080A0D'
  on-background: '#dce4e5'
  surface-variant: '#2e3638'
  surface-1: '#11151B'
  surface-2: '#151A21'
  surface-3: '#1A2028'
  profit: '#10B981'
  loss: '#F43F5E'
  active-cyan: '#00E5FF'
  warning-amber: '#F59E0B'
  analytics-violet: '#8B5CF6'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 8px
  margin-screen: 12px
  panel-padding: 8px
  component-gap: 4px
---

## Brand & Style

The design system is a high-density, professional workstation environment engineered for market intelligence and technical analysis. It adopts a **Technical / Modern** aesthetic that draws heavily from high-end hardware interfaces and industrial control systems. The personality is clinical, precise, and authoritative, optimized for long-duration focus in mission-critical environments.

The visual style is characterized by a "Hardware HUD" approach:
- **Modular Density:** Information is packed tightly to minimize eye travel, using thin lines rather than white space to define structure.
- **Instrumental Precision:** Every pixel serves a functional purpose. Minimalist decoration is replaced by micro-indicators and tiered surface levels.
- **Tactile Digitalism:** The UI feels like a physical piece of glass-and-steel equipment, utilizing sharp corners and subtle 1px structural borders to create a rigid, dependable grid.

## Colors

The color system is optimized for a high-contrast dark environment, utilizing a "Deep Graphite" foundation to reduce retinal fatigue while allowing functional accents to remain hyper-visible.

- **Foundational Neutrals:** The background uses a deep charcoal (#080A0D). Surfaces are tiered (#11151B through #1A2028) to signify hierarchy and nested containers without the use of shadows.
- **Functional Accents:**
    - **Emerald Green (#10B981):** Reserved strictly for positive financial delta, profit indicators, and "long" signals.
    - **Coral Red (#F43F5E):** Reserved for negative delta, loss, and "short" signals.
    - **Electric Cyan (#00E5FF):** The primary interaction color, used for active states, focus rings, and primary action triggers.
    - **Amber (#F59E0B):** Used for warnings, pending states, or margin calls.
    - **Violet/Magenta (#8B5CF6):** A specialized accent for behavioral analytics, heatmaps, and pattern recognition data.

## Typography

This design system employs a rigorous dual-type strategy to separate UI narrative from raw intelligence.

- **Inter:** The primary interface font. It is used for navigational elements, instructions, and standard text. It is set with tighter tracking in headlines to maintain the technical feel.
- **JetBrains Mono:** The engine of the workstation. It is used for all financial data, timestamps, R values, and ticker symbols. The monospaced nature ensures that columns of numbers remain perfectly vertically aligned, critical for rapid optical scanning.

**Hierarchy Rules:**
- Use `label-caps` for all table headers and metadata descriptors.
- `data-md` is the default size for ticker streams and order books.
- Line heights are intentionally tight (1.2x - 1.4x) to facilitate the high-density requirement.

## Layout & Spacing

The layout utilizes a **Fixed Grid** model optimized for ultra-widescreen and multi-monitor setups. It prioritizes information density over "breathability."

- **Density Scale:** A strict 4px grid. Standard padding within components is 8px (2 units).
- **Layout Model:** A 12-column or 24-column grid for dashboards. Panels are typically fixed-height with internal scrolling to prevent the global page from scrolling, mimicking a hardware console.
- **Dividers:** Use 1px solid lines (#1A2028 or #2E3447) instead of margins to separate content areas. 
- **Reflow:** On smaller viewports (Tablets), secondary analytics panels collapse into icon-only rails. This system is not intended for mobile-first use, but on mobile, it scales to a single-column prioritized feed of active orders and alerts.

## Elevation & Depth

Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines**. Shadows are strictly forbidden to maintain the technical, flat-panel aesthetic.

- **Tiered Surfaces:** 
    - **Level 0 (Background):** #080A0D (The primary workstation canvas).
    - **Level 1 (Panels):** #11151B (Main dashboard widgets).
    - **Level 2 (Active/Inset):** #151A21 (Input fields, nested lists).
    - **Level 3 (Popovers):** #1A2028 (Tooltips, context menus).
- **Structural Outlines:** Every container uses a 1px solid border. Use `#1A2028` for inactive panels and `#00E5FF` (Cyan) for focused or active widgets.
- **Micro-Indicators:** Subtle 2px left-border accents on list items indicate selection or "Active" status.

## Shapes

The shape language is "Hard-Modular." To evoke the feeling of precision hardware, the system uses extremely small radii.

- **Base Radius:** 2px for all standard components (buttons, inputs, chips).
- **Large Radius:** 4px for primary dashboard panels and top-level containers.
- **Sharp Edges:** 0px for table rows and items that sit flush in a list to reinforce the grid-line aesthetic.

## Components

- **Financial Tables:** Ultra-dense rows (24-28px height). Use `JetBrains Mono` for all cell data. Positive values use Emerald text; negative values use Coral. 1px horizontal separators only.
- **Action Buttons:** Small-form factor. Primary buttons use a solid Cyan background with black text. Secondary buttons use a 1px Cyan outline with Cyan text and no background.
- **Input Fields:** Inset appearance using `#151A21` background and a 1px border that turns Cyan on focus. Labels are always `label-caps` positioned above the field.
- **Micro-Chips:** Used for "Buy/Sell" tags or "Order Type." Rectangular with 2px radius, utilizing high-contrast background tints (15% opacity of the accent color).
- **Indicator Lights:** 4px circular pips used for system status (Green = Online, Amber = Latency, Red = Disconnected).
- **Status Bars:** Thin 2px progress bars or trend-lines (sparklines) integrated directly into table rows to show 24h movement without requiring a full chart container.