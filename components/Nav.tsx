import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Nav() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
      <Link href="/dashboard" className="text-lg font-bold text-white tracking-tight">
        Strike
      </Link>
      <div className="flex items-center gap-4 ml-4 text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        <Link href="/squad" className="hover:text-white transition-colors">Squad</Link>
        <Link href="/transfers" className="hover:text-white transition-colors">Transfers</Link>
        <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
        <Link href="/leagues" className="hover:text-white transition-colors">Leagues</Link>
        <Link href="/players" className="hover:text-white transition-colors">Players</Link>
        <Link href="/profile" className="hover:text-white transition-colors">Profile</Link>
      </div>
      <form action="/api/auth/signout" method="post" className="ml-auto">
        <button type="submit" className="text-sm text-gray-400 hover:text-white transition-colors">
          Sign out
        </button>
      </form>
    </nav>
  )
}
