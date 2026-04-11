# Display Name Feature — Design Spec
**Date:** 2026-04-11

## Overview
Allow users to set a display name that replaces their email on the leaderboard.

## Data Layer
- Add `profiles` table in Supabase with columns: `user_id` (FK to auth.users), `display_name` (text, nullable)
- Row Level Security: users can only read/write their own profile
- Leaderboard RPCs updated to return `display_name` (falling back to email prefix if null)

## Components

### Modal (DisplayNameModal)
- Client component, shown on dashboard when user has no display_name set
- Single text input + save button
- Dismissible but reappears on next visit until name is set
- Calls `/api/profile` POST to save

### Profile Page (/profile)
- Permanent settings page linked from navbar
- Shows current display name with edit input + save button
- Calls same `/api/profile` POST

### API Route (/api/profile)
- POST: upsert display_name for authenticated user into profiles table

### Leaderboard
- Shows display_name if set, otherwise email prefix (before @)

## Flow
1. User signs up → lands on dashboard → modal appears
2. User sets name → modal closes, name saved
3. Leaderboard shows display name for all users who set one
4. Users can update name anytime via /profile
