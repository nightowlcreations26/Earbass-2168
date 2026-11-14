# Song credits, membership, BYOK (in progress)

## Decisions
- Credits (`song_credits`, Autumn consumable): 30s=1, 1m=2, 2m=4, 3m=6.
- Free: 3 credits granted once (balances.create, tracked in credit_accounts.freeGranted).
- Watch ad: 15s sponsored spot (promoted Earbass track) → +1 credit, 5/day, server-timed.
- Packs (one-off add-ons, prepaid): pack_10 $5, pack_25 $10, pack_60 $20.
- Membership group "membership": pro $10/mo (40 credits/mo, PRO badge, >1 min songs), pro_byok $4.20/mo (needs connected key; PRO badge, >1 min songs, no credits).
- Songs > 60s require membership (any). BYOK songs cost 0 credits.
- BYOK providers: elevenlabs, replicate (meta/musicgen), stability (stable-audio-2.5), mubert (customer-id + access-token). Keys AES-GCM encrypted (BETTER_AUTH_SECRET-derived).
- profiles.plan synced from Autumn → PRO badge.

## Status
- [ ] autumn.config + push
- [ ] schema + db push
- [ ] api: credits/keys/ads routes, studio.generateSong rewrite
- [ ] web: /credits page, ai-song engine picker + balance, PRO badge
- [ ] mobile: credits screen, studio song tab, PRO badge
- [ ] test: tsc, lint, build, mb; BYOK elevenlabs with platform key; pack checkout test card
