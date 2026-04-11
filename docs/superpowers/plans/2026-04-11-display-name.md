# Display Name Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to set a display name shown on the leaderboard instead of their email.

**Architecture:** Add a `profiles` table in Supabase, update all 4 leaderboard RPCs to return `display_name`, add a `/api/profile` route, a `DisplayNameModal` component shown on dashboard when name is unset, and a `/profile` page linked from the navbar.

**Tech Stack:** Next.js App Router, Supabase, Tailwind CSS, TypeScript

---

### Task 1: Database — profiles table + updated RPCs

**Files:**
- Modify: `supabase/functions/rpc.sql` (update all 4 RPCs to join profiles)

- [ ] **Step 1: Run this SQL in the Supabase SQL Editor to create the profiles table and update all RPCs**

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR ALL USING (auth.uid() = user_id);

-- Update season leaderboard to return display_name
CREATE OR REPLACE FUNCTION get_season_leaderboard()
RETURNS TABLE(user_id uuid, email text, display_name text, total_points bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    u.id AS user_id,
    u.email,
    p.display_name,
    COALESCE(SUM(
      CASE
        WHEN ms.is_captain THEN pmp.total_points * 3
        WHEN ms.is_vice_captain THEN pmp.total_points * 2
        ELSE pmp.total_points
      END
    ), 0) AS total_points
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  LEFT JOIN squads s ON s.user_id = u.id AND s.season = 2026
  LEFT JOIN match_selections ms ON ms.squad_id = s.id
  LEFT JOIN player_match_points pmp
    ON pmp.player_id = ms.player_id
    AND pmp.match_id = ms.match_id
  LEFT JOIN matches m ON m.id = ms.match_id AND m.status = 'completed'
  GROUP BY u.id, u.email, p.display_name
  ORDER BY total_points DESC;
$$;

-- Update match leaderboard
CREATE OR REPLACE FUNCTION get_match_leaderboard(p_match_id uuid)
RETURNS TABLE(user_id uuid, email text, display_name text, match_points bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    u.id AS user_id,
    u.email,
    p.display_name,
    COALESCE(SUM(
      CASE
        WHEN ms.is_captain THEN pmp.total_points * 3
        WHEN ms.is_vice_captain THEN pmp.total_points * 2
        ELSE pmp.total_points
      END
    ), 0) AS match_points
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  LEFT JOIN squads s ON s.user_id = u.id AND s.season = 2026
  LEFT JOIN match_selections ms ON ms.squad_id = s.id AND ms.match_id = p_match_id
  LEFT JOIN player_match_points pmp
    ON pmp.player_id = ms.player_id
    AND pmp.match_id = p_match_id
  GROUP BY u.id, u.email, p.display_name
  ORDER BY match_points DESC;
$$;

-- Update league season leaderboard
CREATE OR REPLACE FUNCTION get_league_season_leaderboard(p_league_id uuid)
RETURNS TABLE(user_id uuid, email text, display_name text, total_points bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    u.id AS user_id,
    u.email,
    p.display_name,
    COALESCE(SUM(
      CASE
        WHEN ms.is_captain THEN pmp.total_points * 3
        WHEN ms.is_vice_captain THEN pmp.total_points * 2
        ELSE pmp.total_points
      END
    ), 0) AS total_points
  FROM league_members lm
  JOIN auth.users u ON u.id = lm.user_id
  LEFT JOIN profiles p ON p.user_id = u.id
  LEFT JOIN squads s ON s.user_id = u.id AND s.season = 2026
  LEFT JOIN match_selections ms ON ms.squad_id = s.id
  LEFT JOIN player_match_points pmp
    ON pmp.player_id = ms.player_id
    AND pmp.match_id = ms.match_id
  LEFT JOIN matches m ON m.id = ms.match_id AND m.status = 'completed'
  WHERE lm.league_id = p_league_id
  GROUP BY u.id, u.email, p.display_name
  ORDER BY total_points DESC;
$$;

-- Update league match leaderboard
CREATE OR REPLACE FUNCTION get_league_match_leaderboard(p_league_id uuid, p_match_id uuid)
RETURNS TABLE(user_id uuid, email text, display_name text, match_points bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    u.id AS user_id,
    u.email,
    p.display_name,
    COALESCE(SUM(
      CASE
        WHEN ms.is_captain THEN pmp.total_points * 3
        WHEN ms.is_vice_captain THEN pmp.total_points * 2
        ELSE pmp.total_points
      END
    ), 0) AS match_points
  FROM league_members lm
  JOIN auth.users u ON u.id = lm.user_id
  LEFT JOIN profiles p ON p.user_id = u.id
  LEFT JOIN squads s ON s.user_id = u.id AND s.season = 2026
  LEFT JOIN match_selections ms ON ms.squad_id = s.id AND ms.match_id = p_match_id
  LEFT JOIN player_match_points pmp
    ON pmp.player_id = ms.player_id
    AND pmp.match_id = p_match_id
  WHERE lm.league_id = p_league_id
  GROUP BY u.id, u.email, p.display_name
  ORDER BY match_points DESC;
$$;
```

- [ ] **Step 2: Verify in SQL Editor**

```sql
SELECT * FROM get_season_leaderboard() LIMIT 3;
```

Expected: table with `user_id`, `email`, `display_name`, `total_points` columns.

---

### Task 2: API route — /api/profile

**Files:**
- Create: `app/api/profile/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/api/profile/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { displayName } = await req.json()
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
    return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 })
  }
  if (displayName.trim().length > 20) {
    return NextResponse.json({ error: 'Display name must be 20 characters or less' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, display_name: displayName.trim() }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ displayName: data?.display_name ?? null })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/profile/route.ts
git commit -m "Add /api/profile GET and POST route"
```

---

### Task 3: DisplayNameModal component

**Files:**
- Create: `components/DisplayNameModal.tsx`

- [ ] **Step 1: Create the file**

```typescript
// components/DisplayNameModal.tsx
'use client'

import { useState } from 'react'

interface Props {
  onSaved: (name: string) => void
}

export default function DisplayNameModal({ onSaved }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }
    onSaved(name.trim())
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <h2 className="text-white font-bold text-lg mb-1">Set your display name</h2>
        <p className="text-gray-400 text-sm mb-5">
          This is how you&apos;ll appear on the leaderboard.
        </p>
        <form onSubmit={handleSave}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. CricketFan99"
            maxLength={20}
            required
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3"
          />
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 transition-colors"
            >
              Later
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/DisplayNameModal.tsx
git commit -m "Add DisplayNameModal component"
```

---

### Task 4: Show modal on dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`
- Create: `components/DashboardClient.tsx`

- [ ] **Step 1: Create DashboardClient to handle modal display**

```typescript
// components/DashboardClient.tsx
'use client'

import { useState } from 'react'
import DisplayNameModal from './DisplayNameModal'

interface Props {
  hasDisplayName: boolean
  children: React.ReactNode
}

export default function DashboardClient({ hasDisplayName, children }: Props) {
  const [showModal, setShowModal] = useState(!hasDisplayName)

  return (
    <>
      {showModal && (
        <DisplayNameModal onSaved={() => setShowModal(false)} />
      )}
      {children}
    </>
  )
}
```

- [ ] **Step 2: Update dashboard page to fetch profile and wrap with DashboardClient**

In `app/dashboard/page.tsx`, add the profile query and wrap the return JSX:

```typescript
// Add this import at the top
import DashboardClient from '@/components/DashboardClient'

// Add this query after the squad query (before nextMatch query):
const { data: profile } = await supabase
  .from('profiles')
  .select('display_name')
  .eq('user_id', user.id)
  .maybeSingle()

// Wrap the return div:
return (
  <DashboardClient hasDisplayName={!!profile?.display_name}>
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* ... existing content unchanged ... */}
    </div>
  </DashboardClient>
)
```

- [ ] **Step 3: Commit**

```bash
git add components/DashboardClient.tsx app/dashboard/page.tsx
git commit -m "Show display name modal on dashboard for users without a name"
```

---

### Task 5: Profile page

**Files:**
- Create: `app/profile/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
// app/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/ProfileForm'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div className="max-w-md mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Profile</h1>
      <p className="text-gray-400 text-sm mb-8">
        Your display name appears on the leaderboard.
      </p>
      <ProfileForm currentDisplayName={profile?.display_name ?? ''} />
    </div>
  )
}
```

- [ ] **Step 2: Create ProfileForm client component**

```typescript
// components/ProfileForm.tsx
'use client'

import { useState } from 'react'

interface Props {
  currentDisplayName: string
}

export default function ProfileForm({ currentDisplayName }: Props) {
  const [name, setName] = useState(currentDisplayName)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setLoading(true)
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      setSaved(true)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <label className="block text-gray-400 text-xs mb-2">Display Name</label>
      <input
        type="text"
        value={name}
        onChange={e => { setName(e.target.value); setSaved(false) }}
        placeholder="e.g. CricketFan99"
        maxLength={20}
        required
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3"
      />
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      {saved && <p className="text-green-400 text-xs mb-3">Saved!</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
      >
        Save
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/profile/page.tsx components/ProfileForm.tsx
git commit -m "Add profile page with display name form"
```

---

### Task 6: Add Profile link to navbar + update leaderboard display

**Files:**
- Modify: `components/Nav.tsx`
- Modify: `components/LeaderboardTable.tsx`
- Modify: `app/dashboard/page.tsx` (leaderboard section)

- [ ] **Step 1: Add Profile link to Nav.tsx**

```typescript
// In components/Nav.tsx, add after the Leagues link:
<Link href="/profile" className="hover:text-white transition-colors">Profile</Link>
```

- [ ] **Step 2: Update LeaderboardTable to accept and show display_name**

```typescript
// components/LeaderboardTable.tsx
interface Row {
  user_id: string
  email: string
  display_name?: string | null
  total_points?: number
  match_points?: number
}

interface Props {
  rows: Row[]
  pointsKey: 'total_points' | 'match_points'
  currentUserId?: string
}

export default function LeaderboardTable({ rows, pointsKey, currentUserId }: Props) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">No scores yet</p>
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="grid grid-cols-12 px-4 py-2 border-b border-gray-800 text-gray-500 text-xs font-medium uppercase tracking-wide">
        <span className="col-span-1">#</span>
        <span className="col-span-9">Player</span>
        <span className="col-span-2 text-right">Pts</span>
      </div>
      {rows.map((row, i) => {
        const displayName = row.display_name ?? row.email.split('@')[0]
        return (
          <div
            key={row.user_id}
            className={`grid grid-cols-12 px-4 py-3 items-center ${
              i < rows.length - 1 ? 'border-b border-gray-800' : ''
            } ${row.user_id === currentUserId ? 'bg-blue-950' : ''}`}
          >
            <span className="col-span-1 text-gray-500 text-sm font-medium">{i + 1}</span>
            <span className="col-span-9 text-white text-sm">
              {displayName}
              {row.user_id === currentUserId && (
                <span className="ml-2 text-blue-400 text-xs">(you)</span>
              )}
            </span>
            <span className="col-span-2 text-white font-bold text-sm text-right">
              {row[pointsKey] ?? 0}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Update dashboard top-5 leaderboard to show display_name**

In `app/dashboard/page.tsx`, update the leaderboard map:

```typescript
// Replace the existing leaderboard row map with:
{(leaderboard ?? []).slice(0, 5).map((row: { user_id: string; email: string; display_name?: string; total_points: number }, i: number) => (
  <div key={row.user_id} className={`flex items-center px-4 py-3 ${i < 4 ? 'border-b border-gray-800' : ''}`}>
    <span className="text-gray-500 text-sm w-6">{i + 1}</span>
    <span className="text-white text-sm flex-1 ml-3">
      {row.display_name ?? row.email.split('@')[0]}
    </span>
    <span className="text-white font-bold text-sm">{row.total_points}</span>
  </div>
))}
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
cd /Users/vihaan/Desktop/vscode/IPL_Fanstasy_League/strike
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit and push**

```bash
git add components/Nav.tsx components/LeaderboardTable.tsx app/dashboard/page.tsx
git commit -m "Show display name on leaderboard, add Profile nav link"
git push
```
