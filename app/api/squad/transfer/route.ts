import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateTransfer } from '@/lib/squad'
import type { Player } from '@/lib/types'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerOutId, playerInId, isFirstMatch } = await req.json()

  const { data: liveMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'live')
    .limit(1)
    .maybeSingle()

  if (liveMatch) {
    return NextResponse.json({ error: 'Transfers locked during live match' }, { status: 400 })
  }

  let { data: squad } = await supabase
    .from('squads')
    .select('id, transfers_used')
    .eq('user_id', user.id)
    .eq('season', 2026)
    .maybeSingle()

  if (!squad) {
    const { data: newSquad } = await supabase
      .from('squads')
      .insert({ user_id: user.id, season: 2026, transfers_used: 0 })
      .select('id, transfers_used')
      .single()
    squad = newSquad
  }

  if (!squad) return NextResponse.json({ error: 'Failed to get squad' }, { status: 500 })

  const { data: squadPlayerRows } = await supabase
    .from('squad_players')
    .select('player_id, players(*)')
    .eq('squad_id', squad.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentPlayers: Player[] = (squadPlayerRows ?? []).map((sp: any) => sp.players as Player)

  const { data: playerIn } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerInId)
    .single()

  if (!playerIn) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const isInitialSetup = currentPlayers.length < 11

  if (!isInitialSetup) {
    const { data: playerOut } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerOutId)
      .single()

    if (!playerOut) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const transferResult = validateTransfer(currentPlayers, playerOut as Player, playerIn as Player)
    if (!transferResult.valid) {
      return NextResponse.json({ error: transferResult.error }, { status: 400 })
    }

    await supabase
      .from('squad_players')
      .delete()
      .eq('squad_id', squad.id)
      .eq('player_id', playerOutId)
  }

  await supabase
    .from('squad_players')
    .insert({ squad_id: squad.id, player_id: playerInId })

  if (!isFirstMatch && !isInitialSetup) {
    await supabase
      .from('squads')
      .update({ transfers_used: squad.transfers_used + 1 })
      .eq('id', squad.id)
  }

  return NextResponse.json({ ok: true })
}
