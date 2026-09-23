# Bescheiben Design System

This file is the implementation source of truth. It supersedes the generic black/gold recommendation generated during exploration.

## Brand premise

Bescheiben reduces uncertainty before prescribing execution. The interface feels investigative, calm, exact, and editorial: clear hierarchy, deliberate whitespace, evidence-led structure, and geometric artwork used only to create direction.

## Tokens

### Primitive

- Midnight: `#0A0718`
- Deep purple: `#4B27A8`
- Violet: `#7D3CFF`
- Lavender: `#C4B5FD`
- White: `#FFFFFF`
- Paper: `#FCFBFE`
- Subtle: `#F5F2FA`
- Border: `#E5E0EC`
- Muted: `#6E687B`

### Semantic

- Background base: Paper
- Background surface: White
- Background inverse: Midnight
- Text primary: Midnight
- Text secondary: Muted
- Text inverse: White
- Action primary: Deep purple
- Action hover: Midnight
- Action accent/focus: Violet
- Border default: Border

### Component

- Primary button: Deep purple, white text, Midnight hover, 6px radius, minimum 44px height.
- Secondary button: transparent, Midnight text, 1px Border; inverse variants use white.
- Content rule: 1px Border on light surfaces and low-opacity Lavender on dark surfaces.
- Form control: white or Paper, 1px Border, 6px radius, Violet focus ring.

## Typography

- Plus Jakarta Sans Variable with system fallbacks.
- Weights: 400 body, 600 labels/actions, 700 display.
- Display tracking: approximately `-0.045em`; body tracking normal.
- One H1 per page; headings are statements, never decoration.

## Layout

- Base spacing uses 4px and 8px multiples.
- Maximum editorial container: 1200px.
- Gutter: 20px mobile, fluid to 48px desktop.
- Sections prefer asymmetric 5/7 or 4/8 grids when contrast helps meaning.
- Radii: 6px controls, 10px bounded surfaces, full only for compact status markers.
- Avoid shadows; depth comes from contrast, rules, and artwork.

## Imagery

- Use only approved light/dark geometric background pairs and official brand SVGs.
- Art-direct desktop/mobile sources and keep focal geometry outside the reading column.
- Add overlays when necessary for WCAG AA contrast.
- No generic 3D, stock photography, CSS art, gradients, or approximate SVG drawings.

## Motion

- 160-240ms for opacity, color, and small transforms.
- One composed hero reveal per page; no repeated scroll spectacle.
- Remove nonessential movement for `prefers-reduced-motion`.

## Anti-patterns

No glassmorphism, floating-card mosaics, excessive pills, gradient text, oversized rounded containers, faux dashboards, decorative eyebrows on every section, or generic AI-generated copy.
