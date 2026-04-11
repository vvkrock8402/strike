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
