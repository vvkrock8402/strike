# Power-ups Implementation Design

## Goal

Give each user 5 one-time-per-season power-ups they can activate for a single upcoming match to boost their squad's score. One power-up per match maximum.

## Architecture

Power-up state lives in a new `user_powerups` table. Scoring reads the active power-up at render time and applies it as an extra multiplier on top of the existing captain/VC multipliers. The Supabase realtime subscription in `LivePoints` already re-renders on every score update, so multipliers are applied live during a match automatically.

**Tech Stack:** Supabase (PostgreSQL), Next.js 14 App Router, TypeScript

---

## Database

### New table: `user_powerups`

```sql
create table user_powerups (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references squads(id) not null,
  season int not null,
  type text not null check (type in ('super_captain','double_up','overseas_boost','role_boost','wildcard')),
  match_id_used uuid references matches(id),
  role_used text check (role_used in ('keeper','batsman','allrounder','bowler')),
  unique(squad_id, season, type)
);
```

- One row per power-up type per squad per season (5 rows total per user).
- `match_id_used = null` → power-up unused.
- `match_id_used = <id>` → power-up used on that match (cannot be changed once match goes live).
- `role_used` only populated for `role_boost`.

**Seeding:** Insert 5 rows when a squad is first created (or via a backfill for existing squads).

### Players table change

```sql
alter table players add column is_overseas boolean not null default false;
```

Mark overseas (non-Indian) players by updating this flag. Used by the `overseas_boost` scoring logic.

### RLS

`user_powerups` rows are readable/writable only by the squad owner (same pattern as `squads`).

---

## API

### `POST /api/squad/powerup`

Activates or deactivates a power-up for a match.

**Request body:**
```ts
{
  type: 'super_captain' | 'double_up' | 'overseas_boost' | 'role_boost' | 'wildcard'
  matchId: string | null  // null = deactivate
  role?: 'keeper' | 'batsman' | 'allrounder' | 'bowler'  // required for role_boost
}
```

**Validation:**
- Match must be `upcoming` (reject if `live` or `completed`).
- Power-up must not already be used on a *different* match.
- No other power-up can already be active on this match (1 per match rule).
- `role` required when `type === 'role_boost'`.

**Action:**
- Set `match_id_used = matchId`, `role_used = role` (or clear both if `matchId = null`).

---

## Scoring

The existing pipeline in `lib/scoring.ts`:
1. `calculatePlayerPoints(stats)` → raw points
2. `applyMultiplier(raw, role)` → captain 3×, VC 2×, normal 1×

**Updated pipeline:**
1. `calculatePlayerPoints(stats)` → raw points
2. `applyMultiplier(raw, role, activePowerup, player)` → applies role multiplier then power-up

| Power-up | Effect |
|---|---|
| `super_captain` | Captain gets **5×** instead of 3× (VC and others unchanged) |
| `double_up` | Every player's final score **× 2** (captain effectively gets 3×2 = **6×**) |
| `overseas_boost` | `is_overseas` players' final score **× 2** (stacks with captain/VC) |
| `role_boost` | Players whose `role` matches `role_used` get **× 2** (stacks with captain/VC) |
| `wildcard` | No scoring effect |

`applyMultiplier` gains two new optional params: `activePowerup` (the `user_powerups` row or null) and `player` (needed to check `is_overseas` and `role`).

---

## UI

### Squad page — power-up strip

A compact chip strip appears above the pitch (below the next match info card) when a match is upcoming.

**States per chip:**
- **Available** — grey chip, tappable.
- **Active this match** — amber/coloured chip with "ACTIVE" badge. Tap to deactivate.
- **Used (different match)** — struck-through, not tappable, shows which match it was used on.
- **Locked** — match is live; cannot change.

**Role Boost flow:** Tapping the Role Boost chip when inactive opens a small inline picker (keeper / batsman / allrounder / bowler). Selecting a role immediately activates it via the API.

### Transfers page — Wildcard

When Wildcard is active for the upcoming match, the 110-token budget warning is suppressed and a green "Wildcard active — token limit lifted" banner replaces it.

### Dashboard — Live scoring

`LivePoints` receives the active power-up as a prop (fetched server-side alongside squad data). The `pointsMap` and `totalMatchPoints` calculations pass the power-up into `applyMultiplier`. Because `LivePoints` re-renders on every realtime `player_match_points` update, the boosted scores reflect live — no extra subscription needed.

A small power-up badge appears in the Live Squad header when one is active (e.g. "⚡ Double Up active").

---

## Files Touched

| File | Change |
|---|---|
| `supabase/migrations/YYYYMMDD_powerups.sql` | Create `user_powerups`, alter `players` |
| `lib/types.ts` | Add `PowerupType`, `UserPowerup` types |
| `lib/scoring.ts` | Update `applyMultiplier` signature and logic |
| `app/api/squad/powerup/route.ts` | New API route |
| `app/squad/page.tsx` | Fetch power-ups, pass to `SquadGrid` |
| `components/SquadGrid.tsx` | Render power-up strip, call API on tap |
| `components/PowerupStrip.tsx` | New component — the chip strip + role picker |
| `app/dashboard/page.tsx` | Fetch active power-up for current match |
| `components/LivePoints.tsx` | Accept `activePowerup` prop, apply in scoring |
| `app/transfers/page.tsx` | Read Wildcard state, suppress budget warning |
