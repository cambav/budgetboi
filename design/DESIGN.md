---
name: Terra Modern
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1b1b'
  on-surface-variant: '#424843'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#727972'
  outline-variant: '#c2c8c0'
  surface-tint: '#466550'
  primary: '#163422'
  on-primary: '#ffffff'
  primary-container: '#2d4b37'
  on-primary-container: '#99baa1'
  inverse-primary: '#adcfb4'
  secondary: '#7d562d'
  on-secondary: '#ffffff'
  secondary-container: '#ffca98'
  on-secondary-container: '#7a532a'
  tertiary: '#2d2f2c'
  on-tertiary: '#ffffff'
  tertiary-container: '#434542'
  on-tertiary-container: '#b1b2ae'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c8ebd0'
  primary-fixed-dim: '#adcfb4'
  on-primary-fixed: '#022110'
  on-primary-fixed-variant: '#2f4d39'
  secondary-fixed: '#ffdcbd'
  secondary-fixed-dim: '#f0bd8b'
  on-secondary-fixed: '#2c1600'
  on-secondary-fixed-variant: '#623f18'
  tertiary-fixed: '#e2e3de'
  tertiary-fixed-dim: '#c6c7c2'
  on-tertiary-fixed: '#1a1c19'
  on-tertiary-fixed-variant: '#454744'
  background: '#fcf9f8'
  on-background: '#1b1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: auto
  max-width-content: 1200px
---

## Brand & Style

This design system embodies "Rooted Warmth"—a personality that blends the stability of heritage finance with the agility of modern fintech. The aesthetic is a fusion of **Minimalism** and **Tactile Modernism**, prioritizing high-end consumer clarity while maintaining an organic, grounded soul.

The target audience seeks financial empowerment without the clinical coldness of traditional banking. The UI should evoke a sense of calm, growth, and sophistication. Visuals are clean and geometric but softened by an earthy palette and organic radius, creating an interface that feels both technologically advanced and human-centric.

## Colors

The "Terra" palette is the foundation of the experience, utilizing deep forest tones and warm neutrals to differentiate from the typical blue-centric fintech landscape.

- **Primary (Deep Forest):** Used for key branding, primary actions, and high-level navigation. It represents stability and growth.
- **Secondary (Sun-kissed Clay):** Used for accents, interactive highlights, and progress indicators. It provides a warm contrast to the green.
- **Surface (Parchment):** A warm, off-white neutral used for backgrounds to reduce eye strain and enhance the "organic" feel.
- **Semantic Colors:** Success is rendered in a bright sage, warning in a muted ochre, and error in a soft terracotta to maintain the earthy theme.

## Typography

The design system utilizes **Outfit** for its geometric precision and wide apertures, which lend a high-end, contemporary feel to the financial data. 

Headlines use a tighter letter-spacing and medium weights to feel authoritative yet modern. Body text maintains a generous line-height to ensure legibility on mobile devices. Data points (account balances, transaction amounts) should always use the `headline-lg` or `display-md` styles to ensure prominence.

## Layout & Spacing

This design system uses a **Fluid-Fixed Hybrid** grid. 
- **Mobile:** A 4-column fluid grid with 20px outside margins. 
- **Desktop:** A 12-column grid capped at 1200px, centered in the viewport.

The spacing rhythm is based on an 8px scale. Use "Negative Space" as a functional tool to group financial information—larger gaps (lg/xl) are used to separate distinct financial categories, while tighter gaps (xs/sm) are used for metadata and labels within a list item.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** and **Soft Ambient Shadows**. Instead of harsh black shadows, we use "Earth Shadows"—very soft, diffused blurs with a hint of deep green tint.

- **Level 0 (Base):** Parchment background (#FAFAF5).
- **Level 1 (Cards):** White surfaces with a 1px soft-olive border or a very subtle 4% opacity shadow.
- **Level 2 (Modals/Overlays):** Elevated surfaces with a more pronounced, diffused shadow (20px blur, 10% opacity).
- **Glassmorphism:** Used sparingly for sticky headers and navigation bars to provide a sense of place and transparency.

## Shapes

The shape language is defined by **Organic Precision**. We avoid sharp corners entirely to maintain the approachable "Rooted Warmth" personality.

A standard `0.5rem` (8px) radius is used for interactive components like buttons and inputs. Larger containers, such as dashboard cards and modals, utilize a `1.5rem` (24px) radius to emphasize the "soft roundness" requested. Secondary elements like chips and tags are fully pill-shaped.

## Components

- **Buttons:** Primary buttons are solid Deep Forest with white text. Secondary buttons use a Ghost style with a 1px border. All buttons have a subtle 2px vertical lift on hover.
- **Input Fields:** Large, 56px height inputs with a subtle warm-gray background and a 2px bottom-accent color change on focus.
- **Cards:** White containers with a 24px radius. Use for transaction lists, balance summaries, and "Smart Tips."
- **Chips:** Used for transaction categories (e.g., "Groceries," "Rent"). These are pill-shaped with low-saturation backgrounds derived from the category type.
- **Progress Bars:** Thicker, 8px tracks with rounded caps. The track uses a 10% opacity version of the primary color, while the indicator uses the Secondary (Clay) color.
- **Lists:** Clean rows with 16px vertical padding, separated by 1px "Parchment-Dark" dividers. Icons in lists should be enclosed in a soft-rounded "Terra" colored square.