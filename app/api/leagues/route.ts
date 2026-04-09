import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  let inviteCode: string
  let attempts = 0
  // Ensure unique invite code
  while (true) {
    inviteCode = generateInviteCode()
    const { data: existing } = await supabase
      .from('leagues')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle()
    if (!existing) break
    if (++attempts > 10) return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 })
  }

  const { data: league, error } = await supabase
    .from('leagues')
    .insert({ name: name.trim(), invite_code: inviteCode!, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-join creator
  await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })

  return NextResponse.json({ league })
}
