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
