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
