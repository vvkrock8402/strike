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
