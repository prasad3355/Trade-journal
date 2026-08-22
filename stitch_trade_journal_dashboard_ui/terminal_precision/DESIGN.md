---
name: Terminal Precision
colors:
  surface: '#0c1324'
  surface-dim: '#0c1324'
  surface-bright: '#33394c'
  surface-container-lowest: '#070d1f'
  surface-container-low: '#151b2d'
  surface-container: '#191f31'
  surface-container-high: '#23293c'
  surface-container-highest: '#2e3447'
  on-surface: '#dce1fb'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dce1fb'
  inverse-on-surface: '#2a3043'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff516a'
  on-tertiary-container: '#5b0017'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#0c1324'
  on-background: '#dce1fb'
  surface-variant: '#2e3447'
  surface-canvas: '#020617'
  surface-panel: '#0f172a'
  border-slate: '#1e293b'
  text-high-contrast: '#f8fafc'
  text-muted: '#94a3b8'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-mono-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 20px
  data-mono-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  data-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  col-gap: 12px
---

## Brand & Style

This design system is a professional financial intelligence framework engineered for high-stakes analysis and rapid execution. It adopts a **Corporate / Modern** aesthetic with **Minimalist** and **Technical** influences, prioritizing extreme data density and cognitive clarity over decorative elements.

The visual narrative is that of a "Digital Command Center"—authoritative, precise, and silent. It is designed for professional traders and analysts who operate in low-light environments for extended periods. The UI evokes a sense of "Calm Control," stripping away all non-essential visual noise to focus the user's attention on critical P&L metrics, market movements, and execution workflows. The aesthetic is defined by its deep obsidian base, strict grid-based alignment, and a "HUD" (Heads-Up Display) feel.

## Colors

The palette is optimized for professional dark-mode environments to minimize eye strain and maximize the pop of color-coded financial data.

- **Primary (Cobalt Blue)**: Reserved for high-intent actions, primary buttons, and active selection states.
- **Success (Emerald)**: Exclusively used for positive P&L, "Long" positions, and successful transaction states.
- **Destructive (Rose)**: Used for negative P&L, "Short" positions, losses, and critical system errors.
- **Neutral (Obsidian & Slate)**: A tiered system of deep blues and grays. `#020617` serves as the base canvas, while lighter slates are used for borders and secondary text hierarchy.

Color application must be disciplined: chromatic colors are only used to signal directionality (up/down) or interaction. All structural elements remain monochromatic.

## Typography

This system uses a dual-font strategy to separate interface logic from financial data.

- **Inter**: The primary UI typeface. It is used for all navigation, labels, and instructional text. Headlines are set with tight letter-spacing to appear more compact and technical.
- **JetBrains Mono**: The data typeface. Used for all numerical values, P&L figures, timestamps, and ticker symbols. The monospaced nature ensures that numbers align perfectly in high-density tables, allowing for easier vertical scanning of values.

**Usage Rules:**
- All currency and percentage values must use `JetBrains Mono`.
- Use `label-caps` for table headers and small category descriptors to distinguish them from interactive content.

## Layout & Spacing

The layout is a **Fixed Grid** system that prioritizes information density. It is designed to maximize the volume of data visible on a single screen without overwhelming the user.

- **Desktop (12-column)**: Uses a 1440px max-width container with 24px outer margins and 16px gutters. Components are often "slotted" into fixed-height containers to maintain a consistent dashboard feel.
- **Tablet (8-column)**: Reflows sidebars into collapsible drawers or compact icons.
- **Mobile (4-column)**: Fluid layout with 16px margins. Complex tables shift to card-based summaries or prioritized 2-column views.

The rhythm is strictly based on a 4px (0.25rem) scale. Components utilize "tight" padding (8px or 12px) to maintain the professional terminal aesthetic.

## Elevation & Depth

This design system rejects shadows in favor of **Tonal Layers** and **Strict Outlines** to maintain a flat, professional appearance.

- **Canvas**: The lowest level (`#020617`), used for the background of the application.
- **Containers**: Cards, tables, and sidebars use a slightly lighter surface (`#0f172a`) to create subtle separation.
- **Borders**: All depth is communicated through 1px solid borders. Use `#1e293b` (Slate) for standard separators and the Primary color for focused or active states.
- **Progressive Disclosure**: High-density forms use "Ghost" layers (transparent backgrounds with borders) until interaction, reducing visual noise.

## Shapes

The shape language is disciplined and geometric. While the system uses a **Rounded** (0.5rem) base for major containers to soften the technical edge, internal interactive elements remain sharp and efficient.

- **Main Containers**: Use `rounded-lg` (1rem) for primary dashboard widgets and main content areas.
- **Interactive Elements**: Buttons, inputs, and chips use the base `rounded` (0.5rem) setting.
- **Data Rows**: Table rows and list items use sharp corners (0px) to ensure they sit flush against one another, reinforcing the grid-based alignment.

## Components

- **High-Density Tables**: The heart of the system. Borders are horizontal-only (1px Slate). Cells use `data-mono` for numerical values. Right-align all currency and percentage columns. 
- **TradingView Containers**: Charts should be framed by a 1px Slate border with no padding. Controls are placed in a thin top-bar within the container.
- **Buttons**:
  - *Primary*: Solid Cobalt Blue, white text, 8px padding-y.
  - *Secondary*: Outline Slate border, muted text, ghost background.
  - *Actionable Items*: Table rows should have a subtle background-color shift on hover.
- **Multi-Step Forms**: Use a vertical stepper on the left and progressive disclosure (fading in new sections) to manage complexity.
- **P&L Badges**:
  - *Positive*: Emerald text on a 10% opacity Emerald background.
  - *Negative*: Rose text on a 10% opacity Rose background.
- **Global Navigation**: A persistent, slim sidebar (64px collapsed, 240px expanded) on the left, using High-Contrast typography for active states and Muted Slate for inactive states.