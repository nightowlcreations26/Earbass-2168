# Earbass — Design System

Based on the user's reference (dark podcast app, hot-pink gradients, pill chips, floating "+" in bottom nav).

## Vibe
After-hours club. Near-black canvas, neon-pink/magenta glow, chunky rounded cards, big display type. Feels like a flyer for a warehouse rave, not a SaaS dashboard.

## Color
- `--bg` #0B0A0F (canvas), `--surface` #16141C, `--surface-2` #221F2B, `--line` rgba(255,255,255,0.08)
- `--pink` #FF3DA5 (primary), `--magenta` #C026D3, `--blush` #FFB3DA (soft gradient end)
- Primary gradient: linear-gradient(135deg, #FF7AC6 0%, #FF3DA5 45%, #C026D3 100%)
- Soft card gradient (featured banner): linear-gradient(120deg, #FFD1EA, #FF8AC8 60%, #E15BD6)
- Accent (sparingly): acid lime #C6FF3D for "live"/active steps on the beat pad
- Text: #FFFFFF, muted #A39FB0, dim #6B6778

## Typography
- Display: **Unbounded** (600/700/800) — headings, logo, big numbers
- Body/UI: **Poppins** (400/500/600)
- Section titles 18–20px Unbounded 700; body 14px; meta 12px muted

## Shape & spacing
- Radius: cards 22px, chips/buttons full pill, pads 14px
- Spacing scale 4/8/12/16/24/32
- Horizontal rows scroll with snap; cards 160–180px wide
- Max content width on desktop 1180px; phone-first layout that widens to 2-column on lg

## Components
- Bottom nav (mobile): Home · Studio · (+) Upload FAB (gradient circle, glow) · Library · Profile. Desktop: left sidebar same items.
- Genre chips: dark pill with icon bubble + "N tracks"; active = primary gradient.
- Track card: square cover 22px radius, title 600, artist muted, AI/Original badge top-left.
- Mini player: floating glass bar above nav, gradient progress line.
- Pads: dark squares with inner glow when active; playing column highlighted lime.

## Motion
Staggered fade-up on page load (Motion), subtle glow pulse on FAB, pad hit flash. No scattered micro-animations.

## Mobile (Expo)
Same tokens in `packages/mobile/constants/theme.ts`; system fonts fall back if custom fonts not loaded.
